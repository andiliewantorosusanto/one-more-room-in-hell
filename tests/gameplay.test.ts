import test from 'node:test';
import assert from 'node:assert/strict';
import { RunRules, WAVES, CAPS, headshotStreakBonus } from '../src/game/run-rules.ts';
import { WeaponRules, WEAPONS, type WeaponId } from '../src/weapons/weapon-rules.ts';
import { WorldGrid, COLS, ROWS, raySphere } from '../src/world/navigation.ts';
function trader(points = 10000) {
    const run = new RunRules();
    run.start();
    run.phase = 'break';
    run.points = points;
    return run;
}
function equip(id: WeaponId) {
    const w = new WeaponRules(), r = trader();
    const required = WEAPONS[id].requires;
    if (required)
        w.buy(required, r);
    if (!w.owns(id))
        assert.ok(w.buy(id, r));
    w.switchTo(id);
    w.tick(.3);
    return w;
}
test('new runs start with pistol and knife; locked guns cannot be equipped', () => {
    const w = new WeaponRules();
    assert.equal(w.current, 'pistol');
    assert.deepEqual(w.inventory, ['pistol', 'knife']);
    assert.equal(w.ammo, 12);
    assert.equal(w.reserve, Infinity);
    assert.ok(!w.switchTo('rifle'));
    assert.equal(w.magazines.rifle, 0);
    assert.equal(w.reserves.rifle, 0);
});
test('kill points, headshot bonuses and capped streak bonuses are awarded once', () => {
    const r = new RunRules();
    r.start();
    r.spawn();
    r.kill();
    assert.equal(r.points, 50);
    const rewards = [75, 85, 95, 105, 115, 125, 125];
    for (const amount of rewards) {
        r.spawn();
        r.kill(true);
        assert.equal(r.lastReward, amount);
    }
    assert.equal(r.headshotStreak, 7);
    assert.equal(r.bestStreak, 7);
    assert.equal(r.headshots, 7);
    assert.equal(r.points, 50 + rewards.reduce((a, b) => a + b, 0));
    assert.equal(headshotStreakBonus(1000), 50);
    const earned = r.points;
    assert.ok(!r.kill(true));
    assert.equal(r.points, earned);
});
test('body-shot kills and damage reset streaks; ordinary shooting does not', () => {
    const r = new RunRules();
    r.start();
    r.spawn();
    r.kill(true);
    r.shots++;
    assert.equal(r.headshotStreak, 1);
    r.spawn();
    r.kill(false);
    assert.equal(r.headshotStreak, 0);
    r.spawn();
    r.kill(true);
    r.damage(10);
    assert.equal(r.headshotStreak, 0);
    assert.equal(r.bestStreak, 1);
    r.start();
    assert.equal(r.points, 0);
    assert.equal(r.totalEarned, 0);
    assert.equal(r.bestStreak, 0);
});
test('shop enforces phase, funds, ownership and upgrade prerequisites', () => {
    const r = new RunRules(), w = new WeaponRules();
    r.start();
    r.points = 10000;
    assert.ok(!w.buy('rifle', r));
    r.phase = 'break';
    r.points = 100;
    assert.ok(!w.buy('rifle', r));
    assert.equal(r.points, 100);
    r.points = 2000;
    assert.ok(!w.buy('plasmaRifle', r));
    assert.match(w.purchaseReason('plasmaRifle', r), /AK-74M/);
    assert.ok(w.buy('rifle', r));
    assert.equal(r.points, 1350);
    assert.equal(w.magazines.rifle, 30);
    assert.equal(w.reserves.rifle, 180);
    assert.ok(!w.buy('rifle', r));
    assert.equal(r.points, 1350);
    r.points = 1600;
    assert.ok(w.buy('plasmaRifle', r));
    assert.equal(r.points, 0);
    assert.equal(w.inventory.filter(id => id === 'plasmaRifle').length, 1);
});
test('shotgun and SMG upgrades require their correct base platform', () => {
    const r = trader(), w = new WeaponRules();
    assert.ok(!w.buy('leverShotgun', r));
    assert.ok(!w.buy('autoShotgun', r));
    assert.ok(!w.buy('heavySmg', r));
    w.buy('shotgun', r);
    assert.ok(w.buy('leverShotgun', r));
    assert.ok(w.buy('autoShotgun', r));
    w.buy('smg', r);
    assert.ok(w.buy('heavySmg', r));
});
test('ammo purchases charge once and refill only the selected owned gun', () => {
    const w = new WeaponRules(), r = trader();
    w.buy('rifle', r);
    w.buy('smg', r);
    assert.ok(!w.refill('rifle', r));
    w.magazines.rifle = 2;
    w.reserves.rifle = 10;
    const points = r.points;
    assert.ok(w.refill('rifle', r));
    assert.equal(r.points, points - 100);
    assert.equal(w.magazines.rifle, 30);
    assert.equal(w.reserves.rifle, 180);
    assert.equal(w.magazines.smg, 32);
    assert.ok(!w.refill('rifle', r));
    assert.ok(!w.refill('pistol', r));
    assert.ok(!w.refill('plasmaRifle', r));
    r.phase = 'wave';
    w.magazines.rifle = 0;
    assert.ok(!w.refill('rifle', r));
});
test('rifle ammunition is conserved; interrupted reload grants no ammunition', () => {
    const w = equip('rifle');
    for (let i = 0; i < 30; i++) {
        assert.ok(w.fire());
        w.tick(.11);
    }
    assert.equal(w.ammo, 0);
    assert.equal(w.reserve, 180);
    assert.ok(!w.fire());
    assert.ok(w.reload());
    w.tick(1);
    w.switchTo('pistol');
    assert.equal(w.magazines.rifle, 0);
    assert.equal(w.reserves.rifle, 180);
    w.switchTo('rifle');
    w.tick(.3);
    w.reload();
    w.tick(2.5);
    assert.equal(w.ammo, 30);
    assert.equal(w.reserve, 150);
    w.reserves.rifle = 5;
    w.magazines.rifle = 20;
    w.reload();
    w.tick(2.5);
    assert.equal(w.ammo, 25);
    assert.equal(w.reserve, 0);
    assert.ok(!w.reload());
});
test('pistol reserve is infinite, but its magazine and reload timing are finite', () => {
    const w = new WeaponRules();
    for (let j = 0; j < 3; j++) {
        for (let i = 0; i < 12; i++) {
            assert.ok(w.fire());
            w.tick(.25);
        }
        assert.ok(!w.fire());
        assert.ok(w.reload());
        w.tick(1);
        assert.ok(!w.fire());
        w.tick(.5);
        assert.equal(w.ammo, 12);
        assert.equal(w.reserve, Infinity);
    }
});
test('shotguns load one shell at a time, preserving inserted shells on switch', () => {
    const w = equip('shotgun');
    w.magazines.shotgun = 0;
    const reserve = w.reserve;
    w.reload();
    w.tick(.61);
    assert.equal(w.ammo, 0);
    w.tick(.02);
    assert.equal(w.ammo, 1);
    assert.equal(w.reserve, reserve - 1);
    assert.ok(w.reloading);
    w.switchTo('pistol');
    assert.equal(w.magazines.shotgun, 1);
    assert.equal(w.reserves.shotgun, reserve - 1);
    w.switchTo('shotgun');
    w.tick(.3);
    w.reload();
    w.tick(10);
    assert.equal(w.ammo, 6);
    assert.equal(w.reserve, reserve - 6);
    assert.ok(!w.reloading);
});
test('a loaded shell can interrupt a tube reload to fire; empty reload cannot', () => {
    const w = equip('leverShotgun');
    w.magazines.leverShotgun = 0;
    w.reload();
    assert.ok(!w.fire());
    w.tick(.71);
    assert.equal(w.ammo, 1);
    assert.ok(w.fire());
    assert.equal(w.ammo, 0);
    assert.ok(!w.reloading);
});
test('knife, automatic SMGs and plasma retain their own cadence and reserves', () => {
    const w = equip('smg');
    assert.ok(w.fire());
    assert.ok(!w.fire());
    w.tick(.075);
    assert.ok(w.fire());
    assert.equal(w.ammo, 30);
    const plasma = equip('plasmaRifle');
    assert.equal(plasma.ammo, 24);
    assert.equal(plasma.reserve, 96);
    assert.ok(plasma.fire());
    assert.equal(plasma.ammo, 23);
    plasma.tick(.2);
    plasma.reload();
    plasma.tick(2.7);
    assert.equal(plasma.ammo, 24);
    assert.equal(plasma.reserve, 95);
    w.switchTo('knife');
    w.tick(.3);
    assert.ok(w.fire());
    assert.ok(!w.fire());
    w.tick(.65);
    assert.ok(w.fire());
});
test('all waves honor caps; trader waits indefinitely for explicit readiness', () => {
    const r = new RunRules();
    r.start();
    r.damage(40);
    for (let wave = 1; wave <= 5; wave++) {
        assert.equal(r.wave, wave);
        let count = 0;
        while (r.phase === 'wave') {
            while (r.canSpawn) {
                r.spawn();
                count++;
                assert.ok(r.alive <= CAPS[wave - 1]);
            }
            r.kill();
        }
        assert.equal(count, WAVES[wave - 1]);
        if (wave < 5) {
            assert.equal(r.phase, 'break');
            assert.equal(r.health, wave === 1 ? 85 : 100);
            const elapsed = r.elapsed;
            r.tick(999);
            assert.equal(r.elapsed, elapsed);
            assert.equal(r.phase, 'break');
            assert.ok(!r.canSpawn);
            assert.ok(r.startNextWave());
            assert.ok(!r.startNextWave());
        }
    }
    assert.equal(r.phase, 'won');
    assert.equal(r.kills, 212);
    assert.equal(r.points, 10600);
    assert.ok(!r.startNextWave());
});
test('death prevents damage, shop readiness and further wave spawns', () => {
    const r = new RunRules();
    r.start();
    r.damage(100);
    assert.equal(r.phase, 'dead');
    assert.ok(!r.canSpawn);
    assert.ok(!r.startNextWave());
    r.tick(100);
    assert.equal(r.wave, 1);
});
test('hospital navigation stays connected; walls obstruct shots and movement', () => {
    const g = new WorldGrid(), target = g.center(13, 11);
    g.rebuild(target);
    for (let z = 0; z < ROWS; z++)
        for (let x = 0; x < COLS; x++)
            if (g.walkable(x, z))
                assert.ok(g.distances[z * COLS + x] >= 0, `Disconnected ${x},${z}`);
    const p = g.center(4, 6), wall = g.center(5, 6);
    assert.ok(!g.lineClear(p, wall));
    const before = {
        ...p
    };
    g.move(p, 1.3, 0);
    assert.deepEqual(p, before);
    assert.ok(g.wallDistance(before, {
        x: 1, z: 0
    }) < 1);
    assert.equal(raySphere(0, 1, 0, 0, 0, 1, 0, 1, 5, .5), 4.5);
    assert.equal(raySphere(0, 1, 0, 0, 0, 1, 2, 1, 5, .5), Infinity);
});
