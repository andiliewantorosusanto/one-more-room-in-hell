import { Vector3 } from '@babylonjs/core';
import type { GameInstance } from '../game/Game.ts';
import { SHOP_WEAPONS, WEAPONS, type WeaponId } from '../weapons/weapon-rules.ts';
export function setupQA(game: GameInstance) {
    const panel = document.createElement('div');
    panel.id = 'qa';
    panel.style.cssText = 'position:fixed;right:10px;top:130px;background:#071108ed;border:1px solid #9fa97e66;padding:10px;color:#cbd5b0;z-index:25;width:240px;max-height:calc(100vh - 145px);overflow:auto;font:10px monospace;pointer-events:auto';
    panel.innerHTML = '<b>LOCAL DEVELOPMENT CHECKS</b><div id="qa-buttons" style="display:flex;flex-wrap:wrap;gap:5px;margin-top:10px"></div><pre id="qa-state" style="white-space:pre-wrap"></pre><pre id="qa-results" style="white-space:pre-wrap;color:#d5e0ad"></pre>';
    document.body.append(panel);
    const wait = (ms: number) => new Promise<void>(r => setTimeout(r, ms));
    const add = (name: string, fn: () => void) => {
        const b = document.createElement('button');
        b.textContent = name;
        b.style.cssText = 'font:9px monospace;padding:5px;';
        b.onclick = fn;
        panel.querySelector('#qa-buttons')!.append(b);
    };
    function start() {
        game.start();
        game.invulnerable = true;
        game.spawnTimer = 99999;
    }
    function target(distance: number) {
        game.enemies.reset();
        game.run.phase = 'wave';
        game.run.spawned = 1;
        game.run.alive = 1;
        const p = game.player.position;
        const point = {
            x: p.x + Math.sin(game.player.yaw) * distance, z: p.z + Math.cos(game.player.yaw) * distance
        };
        game.enemies.spawn(point, false);
        game.enemies.zombies.find(z => z.life === 'alive')!.debugFrozen = true;
        game.player.pitch = 0;
        game.held = false;
        game.pressed = false;
        game.run.health = 100;
        game.invulnerable = true;
        game.spawnTimer = 99999;
    }
    function aim(head: boolean) {
        const z = game.enemies.zombies.find(z => z.life === 'alive');
        if (!z)
            return;
        const p = head ? z.head!.getAbsolutePosition() : new Vector3(z.position.x, 1.08, z.position.z);
        game.player.yaw = Math.atan2(p.x - game.player.position.x, p.z - game.player.position.z);
        game.player.pitch = -Math.atan2(p.y - 1.65, Math.hypot(p.x - game.player.position.x, p.z - game.player.position.z));
    }
    function clearWave() {
        game.enemies.reset();
        game.run.spawned = game.run.total;
        game.run.alive = 1;
        game.run.kill(false);
    }
    function openTrader(points = 5000) {
        clearWave();
        game.run.points = points;
        game.openShop();
    }
    function armory() {
        start();
        game.run.phase = 'break';
        game.run.points = 50000;
        for (const id of SHOP_WEAPONS)
            game.weapons.buy(id, game.run);
        game.run.phase = 'wave';
        game.refreshShop();
        game.switch('pistol');
    }
    add('Start test', start);
    add('Trader', () => openTrader());
    add('Armory', armory);
    add('Target 4m', () => target(4));
    add('Target 1m', () => target(1.05));
    add('Flying target', () => {
        target(4);
        game.enemies.reset();
        game.run.alive = 1;
        const p = game.player.position;
        game.enemies.spawn({
            x: p.x + Math.sin(game.player.yaw) * 4, z: p.z + Math.cos(game.player.yaw) * 4
        }, false, 'flyer');
        game.enemies.zombies.find(z => z.life === 'alive')!.debugFrozen = true;
    });
    add('Mission terminal', () => {
        if (game.run.mode !== 'objective')
            return;
        const goal = game.grid.map.objectives[game.run.wave - 1];
        game.enemies.reset();
        game.run.spawned = game.run.total;
        game.run.alive = 0;
        game.player.position = game.grid.center(...goal.cell);
        game.player.previous = {
            ...game.player.position
        };
        game.spawnTimer = 99999;
    });
    add('Aim head', () => aim(true));
    add('Aim body', () => aim(false));
    add('Fire once', () => {
        game.pressed = true;
    });
    add('Reload', () => game.reload());
    for (const id of Object.keys(WEAPONS) as WeaponId[])
        add(id, () => game.switch(id));
    add('Aim toggle', () => game.aiming = !game.aiming);
    add('Clear wave', clearWave);
    add('Next wave', () => game.nextWave());
    add('Take damage', () => game.run.damage(40));
    add('Fatal damage', () => {
        game.invulnerable = false;
        game.run.damage(100);
    });
    add('Pause', () => game.pause(true));
    add('Resume', () => game.pause(false));
    const stress = () => {
        start();
        game.run.wave = 5;
        game.run.spawned = 32;
        game.run.alive = 32;
        game.spawnTimer = 99999;
        game.enemies.reset();
        game.player.position = game.grid.center(13, 11);
        game.player.previous = {
            ...game.player.position
        };
        game.player.yaw = 0;
        const points = [];
        for (let z = 2; z <= 20; z++)
            for (let x = 2; x <= 24; x++)
                if (game.grid.walkable(x, z)) {
                    const p = game.grid.center(x, z);
                    const d = Math.hypot(p.x - game.player.position.x, p.z - game.player.position.z);
                    if (d > 2 && d < 10)
                        points.push(p);
                }
        for (let i = 0; i < 32; i++)
            game.enemies.spawn(points[Math.floor(i * points.length / 32)], i % 4 === 0, i % 8 === 0 ? 'flyer' : i % 4 === 0 ? 'runner' : 'shambler');
        game.frames = [];
        game.run.elapsed = 0;
        game.showStats = true;
    };
    add('Stress 32', stress);
    add('Inspect reload', () => {
        game.pause(false);
        if (game.weapons.current === 'knife')
            return;
        game.weapons.magazines[game.weapons.current] = WEAPONS[game.weapons.current].capacity - 1;
        game.reload();
        setTimeout(() => {
            game.paused = true;
            game.scene.animationsEnabled = false;
        }, WEAPONS[game.weapons.current].reload * 450);
    });
    add('Inspect shot', () => {
        game.pause(false);
        game.weapons.cooldown = 0;
        game.shoot();
        setTimeout(() => {
            game.paused = true;
            game.scene.animationsEnabled = false;
        }, 330);
    });
    let checking = false;
    async function checks() {
        if (checking)
            return;
        checking = true;
        const output = panel.querySelector('#qa-results')!;
        output.textContent = 'Running local browser checks…\n';
        const expect = (condition: boolean, label: string) => {
            if (!condition)
                throw new Error(label);
            output.textContent += 'PASS ' + label + '\n';
        };
        const click = (selector: string) => {
            const b = document.querySelector<HTMLButtonElement>(selector);
            if (!b || b.disabled)
                throw new Error('Unavailable UI control ' + selector);
            b.click();
        };
        try {
            start();
            await wait(350);
            expect(game.weapons.current === 'pistol' && game.weapons.inventory.join(',') === 'pistol,knife', 'pistol and knife starting loadout');
            game.canvas.dispatchEvent(new MouseEvent('mousedown', {
                button: 0, bubbles: true
            }));
            window.dispatchEvent(new MouseEvent('mouseup', {
                button: 0, bubbles: true
            }));
            await wait(300);
            expect(game.weapons.ammo === 11, 'quick pistol click fires');
            target(4);
            await wait(180);
            aim(true);
            game.shoot();
            await wait(280);
            expect(game.enemies.zombies.find(z => z.life === 'alive')?.health === 50, 'pistol headshot damage 50');
            aim(true);
            game.shoot();
            await wait(280);
            expect(game.run.kills === 1 && game.run.points === 75 && game.run.headshotStreak === 1, 'headshot kill pays base plus bonus');
            target(4);
            await wait(180);
            for (let i = 0; i < 4; i++) {
                aim(false);
                game.shoot();
                await wait(280);
            }
            expect(game.run.kills === 2 && game.run.points === 125 && game.run.headshotStreak === 0, 'body kill awards 50 and breaks streak');
            const points = game.run.points;
            expect(!game.weapons.buy('rifle', game.run) && game.run.points === points, 'cannot buy during combat');
            openTrader(2000);
            await wait(120);
            expect(game.ui.shopOpen && game.run.phase === 'break', 'wave completion opens safe trader');
            expect(document.querySelector<HTMLButtonElement>('[data-item="plasmaRifle"] button')!.disabled, 'upgrade requires base rifle');
            click('[data-item="smg"] button');
            expect(game.weapons.owns('smg') && game.run.points === 1550 && game.weapons.current === 'smg', 'shop button buys and equips SMG');
            click('[data-item="rifle"] button');
            expect(game.run.points === 900 && game.weapons.owns('rifle'), 'rifle purchase deducts price');
            game.weapons.magazines.rifle = 2;
            game.weapons.reserves.rifle = 10;
            game.refreshShop();
            click('[data-action="refill"][data-weapon="rifle"]');
            expect(game.run.points === 800 && game.weapons.magazines.rifle === 30 && game.weapons.reserves.rifle === 180, 'paid refill restores selected ammunition');
            click('#trader-ready');
            await wait(350);
            expect(!game.ui.shopOpen && game.run.wave === 2 && game.run.points === 800, 'ready button starts next wave and preserves wallet');
            target(4);
            await wait(180);
            aim(true);
            game.shoot();
            await wait(180);
            expect(game.enemies.zombies.find(z => z.life === 'alive')?.health === 32, 'rifle damage distinct from pistol');
            const ammo = game.weapons.ammo, reserve = game.weapons.reserves.rifle;
            game.reload();
            await wait(350);
            game.switch('pistol');
            await wait(300);
            expect(game.weapons.magazines.rifle === ammo && game.weapons.reserves.rifle === reserve, 'cancelled magazine reload conserves ammunition');
            game.reload();
            await wait(1700);
            expect(game.weapons.ammo === 12 && game.weapons.reserve === Infinity, 'pistol retains unlimited reserve');
            game.switch('knife');
            await wait(350);
            target(4);
            await wait(150);
            game.shoot();
            await wait(750);
            expect(game.enemies.zombies.find(z => z.life === 'alive')?.health === 100, 'knife cannot reach distant target');
            target(1.05);
            await wait(180);
            game.shoot();
            await wait(300);
            expect(game.enemies.zombies.find(z => z.life === 'alive')?.health === 50, 'knife deals 50 within reach');
            await wait(450);
            game.shoot();
            await wait(300);
            openTrader(6000);
            await wait(100);
            click('[data-item="shotgun"] button');
            click('[data-item="leverShotgun"] button');
            click('[data-item="autoShotgun"] button');
            click('[data-item="plasmaRifle"] button');
            expect(game.weapons.owns('plasmaRifle') && game.weapons.owns('leverShotgun') && game.weapons.owns('autoShotgun'), 'upgrade purchases unlock distinct weapons');
            click('#trader-ready');
            await wait(350);
            game.switch('shotgun');
            await wait(300);
            target(2);
            await wait(180);
            aim(false);
            game.aiming = true;
            game.shoot();
            await wait(200);
            const hp = game.enemies.zombies.find(z => z.life === 'alive')?.health;
            expect(hp !== undefined && hp >= 19 && hp <= 30, 'light shotgun fires multiple lower-damage pellets');
            game.aiming = false;
            game.weapons.magazines.shotgun = 0;
            game.reload();
            await wait(680);
            expect(game.weapons.ammo === 1 && game.weapons.reloading, 'tube shotgun loads shell by shell');
            game.switch('pistol');
            await wait(300);
            expect(game.weapons.magazines.shotgun === 1, 'switch keeps inserted shell');
            game.switch('plasmaRifle');
            await wait(300);
            target(4);
            await wait(180);
            aim(true);
            const kills = game.run.kills;
            game.shoot();
            await wait(200);
            expect(game.run.kills === kills + 1, 'plasma headshot kills in one shot');
            game.enemies.reset();
            game.player.position = game.grid.center(4, 6);
            game.player.previous = {
                ...game.player.position
            };
            game.run.alive = 1;
            game.run.spawned = 1;
            game.enemies.spawn(game.grid.center(6, 6), false);
            const blocked = game.enemies.zombies.find(z => z.life === 'alive')!;
            blocked.debugFrozen = true;
            await wait(180);
            aim(false);
            game.shoot();
            await wait(200);
            expect(blocked.health === 100, 'wall blocks energy hits');
            game.pause(true);
            const elapsed = game.run.elapsed;
            await wait(250);
            expect(game.run.elapsed === elapsed, 'pause freezes simulation');
            game.pause(false);
            await wait(150);
            expect(game.run.elapsed > elapsed, 'resume continues simulation');
            game.invulnerable = false;
            game.run.damage(100);
            await wait(150);
            expect(game.finished && game.run.phase === 'dead', 'zero health opens death screen');
            start();
            await wait(100);
            expect(game.run.points === 0 && game.weapons.current === 'pistol' && game.weapons.inventory.length === 2, 'restart clears money and purchases');
            for (let wave = 1; wave <= 5; wave++) {
                clearWave();
                await wait(100);
                if (wave < 5) {
                    expect(game.ui.shopOpen, 'wave ' + wave + ' opens trader');
                    game.nextWave();
                    await wait(100);
                }
            }
            expect(game.finished && game.run.phase === 'won', 'fifth wave opens victory screen');
            output.textContent += 'ALL LOCAL BROWSER CHECKS PASSED';
        }
        catch (error) {
            output.textContent += 'FAIL ' + String(error);
            game.pause(true);
            console.error('Local browser checks:', error);
        }
        finally {
            checking = false;
        }
    }
    async function missionChecks() {
        if (checking)
            return;
        checking = true;
        const output = panel.querySelector('#qa-results')!;
        output.textContent = 'Running maps, missions and flyer checks…\n';
        const expect = (ok: boolean, label: string) => {
            if (!ok)
                throw Error(label);
            output.textContent += 'PASS ' + label + '\n';
        };
        const click = (selector: string) => {
            const b = document.querySelector<HTMLButtonElement>(selector);
            if (!b || b.disabled)
                throw Error('Unavailable ' + selector);
            b.click();
        };
        const mapReady = async () => {
            for (let i = 0; i < 100 && game.changingMap; i++)
                await wait(100);
            expect(!game.changingMap, 'map finishes loading');
        };
        const use = (held: boolean) => window.dispatchEvent(new KeyboardEvent(held ? 'keydown' : 'keyup', {
            code: 'KeyE', bubbles: true
        }));
        try {
            expect(document.title === 'One More Room In Hell', 'game title renamed');
            game.toMenu();
            click('[data-map="depot"]');
            await mapReady();
            expect(game.grid.map.id === 'depot', 'map picker loads Freight Depot');
            const meshes = game.scene.meshes.length, materials = game.scene.materials.length;
            for (let i = 0; i < 2; i++) {
                click('[data-map="hospital"]');
                await mapReady();
                click('[data-map="depot"]');
                await mapReady();
            }
            expect(game.scene.meshes.length === meshes && game.scene.materials.length === materials, 'repeated map changes preserve scene resource counts');
            for (const id of ['depot', 'hospital'] as const) {
                game.toMenu();
                click(`[data-map="${id}"]`);
                await mapReady();
                click('[data-mode="objective"]');
                click('#start');
                game.invulnerable = true;
                game.spawnTimer = 99999;
                await wait(250);
                expect(game.run.mode === 'objective' && game.run.stageCount === 3 && game.run.total === 12, 'objective mode starts on ' + id);
                expect(document.getElementById('hud-map')!.textContent === game.grid.map.name.toUpperCase(), 'HUD uses selected map name');
                for (let stage = 1; stage <= 3; stage++) {
                    clearWave();
                    expect(game.run.phase === 'wave' && !game.ui.shopOpen, 'cleared encounter waits for objective ' + id + stage);
                    const goal = game.grid.map.objectives[stage - 1];
                    if (stage === 1) {
                        use(true);
                        await wait(300);
                        use(false);
                        expect(game.objectiveRules.progress === 0, 'remote use cannot activate terminal');
                    }
                    game.player.position = game.grid.center(...goal.cell);
                    game.player.previous = {
                        ...game.player.position
                    };
                    use(true);
                    await wait(goal.hold * 1000 + 250);
                    use(false);
                    if (stage < 3) {
                        expect(game.ui.shopOpen && game.run.phase === 'break', 'objective opens trader ' + id + stage);
                        expect(document.getElementById('trader-ready')!.textContent!.includes('CONTINUE MISSION'), 'trader offers mission continuation');
                        click('#trader-ready');
                        game.spawnTimer = 99999;
                        await wait(120);
                    }
                }
                expect(game.run.phase === 'won' && game.finished, 'three terminals complete extraction on ' + id);
            }
            game.toMenu();
            click('[data-mode="survival"]');
            click('#start');
            game.invulnerable = true;
            game.spawnTimer = 99999;
            await wait(300);
            game.enemies.reset();
            game.run.wave = 2;
            game.run.spawned = 1;
            game.run.alive = 1;
            game.player.yaw = Math.PI;
            game.player.pitch = 0;
            const p = game.player.position;
            game.enemies.spawn({
                x: p.x, z: p.z - 4
            }, false, 'flyer');
            const flyer = game.enemies.zombies.find(z => z.life === 'alive')!;
            flyer.debugFrozen = true;
            await wait(350);
            expect(flyer.altitude > 1 && flyer.wings.every(w => w.isEnabled()), 'flying infected hover with visible animated wings');
            const origin = new Vector3(p.x, 1.65, p.z), low = new Vector3(0, -.2, -1).normalize();
            expect(game.enemies.hit(origin, low, 10) === null, 'ground-level shot misses airborne hitboxes');
            aim(true);
            game.shoot();
            await wait(300);
            expect(flyer.health === 10, 'airborne headshot uses actual elevated head');
            aim(true);
            game.shoot();
            await wait(250);
            expect(flyer.life === 'dead' && game.run.points === 75, 'flying kill awards ordinary headshot credits once');
            game.enemies.reset();
            game.run.alive = 1;
            game.player.position = game.grid.center(4, 6);
            game.player.previous = {
                ...game.player.position
            };
            game.enemies.spawn(game.grid.center(6, 6), false, 'flyer');
            const blocked = game.enemies.zombies.find(z => z.life === 'alive')!;
            blocked.debugFrozen = true;
            await wait(250);
            aim(true);
            game.shoot();
            await wait(250);
            expect(blocked.health === 60, 'wall blocks airborne headshot');
            game.toMenu();
            expect(!document.getElementById('menu')!.classList.contains('hidden'), 'map and mode selection can be reopened');
            output.textContent += 'ALL MAPS AND MISSIONS CHECKS PASSED';
        }
        catch (error) {
            output.textContent += 'FAIL ' + String(error);
            game.pause(true);
            console.error(error);
        }
        finally {
            checking = false;
        }
    }
    async function flightCombat() {
        const output = panel.querySelector('#qa-results')!;
        output.textContent = 'Running close-range flight checks…\n';
        try {
            game.ui.selectedMode = 'survival';
            start();
            game.run.wave = 2;
            game.run.spawned = 1;
            game.run.alive = 1;
            game.invulnerable = false;
            game.enemies.reset();
            game.player.yaw = Math.PI;
            game.grid.rebuild(game.player.position);
            const p = game.player.position;
            game.enemies.spawn({
                x: p.x, z: p.z - 1.05
            }, false, 'flyer');
            const enemy = game.enemies.zombies.find(z => z.life === 'alive')!;
            await wait(300);
            if (!(enemy.altitude < .6 && game.run.health === 100))
                throw Error('Descent must precede attack damage');
            output.textContent += 'PASS flyer descends before close attack damage\n';
            await wait(500);
            if (Number(game.run.health) !== 92)
                throw Error('Expected one eight-damage dive attack');
            output.textContent += 'PASS flyer close attack deals eight damage\nALL FLIGHT COMBAT CHECKS PASSED';
            game.pause(true);
        }
        catch (error) {
            output.textContent += 'FAIL ' + String(error);
            game.pause(true);
        }
    }
    add('Flight combat', () => void flightCombat());
    add('Mission checks', () => void missionChecks());
    add('Run checks', () => void checks());
    const mode = new URLSearchParams(location.search).get('qa');
    if (mode === 'flight')
        setTimeout(() => void flightCombat(), 700);
    if (mode === 'missions')
        setTimeout(() => void missionChecks(), 700);
    if (mode === 'checks')
        setTimeout(() => void checks(), 700);
    if (mode === 'stress')
        setTimeout(stress, 700);
    if (mode === 'armory')
        setTimeout(armory, 700);
    if (mode === 'shop')
        setTimeout(() => {
            start();
            openTrader();
            panel.style.display = 'none';
        }, 700);
    setInterval(() => {
        panel.querySelector('#qa-state')!.textContent = JSON.stringify({
            phase: game.run.phase, wave: game.run.wave, health: game.run.health, weapon: game.weapons.current, ammo: game.weapons.ammo, reserve: Number.isFinite(game.weapons.reserve) ? game.weapons.reserve : '∞', points: game.run.points, streak: game.run.headshotStreak, inventory: game.weapons.inventory, reload: +game.weapons.reloadRemaining.toFixed(2), kills: game.run.kills, headshots: game.run.headshots, map: game.grid.map.id, mode: game.run.mode, sceneMeshes: game.scene.meshes.length, sceneMaterials: game.scene.materials.length, waiting: game.scene.getWaitingItemsCount(), flyers: game.enemies.zombies.filter(z => z.life === 'alive' && z.kind === 'flyer').length, targets: game.enemies.zombies.filter(z => z.life === 'alive').slice(0, 2).map(z => ({
                kind: z.kind, altitude: +z.altitude.toFixed(2), hp: z.health, head: z.head?.getAbsolutePosition().asArray().map(n => +n.toFixed(2))
            })), ...game.metrics()
        }, null, 1);
    }, 500);
}
