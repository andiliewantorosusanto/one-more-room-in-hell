import { Matrix, Vector3 } from '@babylonjs/core';
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
        const point = game.grid.areas.map((_, i) => game.grid.center(i)).filter(point => Math.abs((point.y ?? 0) - (p.y ?? 0)) < .4 && game.grid.clear(point.x, point.z, .3, point.y) && game.grid.lineClear(p, point)).sort((a, b) => Math.abs(Math.hypot(a.x - p.x, a.z - p.z) - distance) - Math.abs(Math.hypot(b.x - p.x, b.z - p.z) - distance))[0];
        if (!point) throw new Error('No clear hospital target area');
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
        const p = head ? z.head!.getAbsolutePosition() : new Vector3(z.position.x, (z.position.y ?? 0) + 1.08, z.position.z);
        game.player.yaw = Math.atan2(p.x - game.player.position.x, p.z - game.player.position.z);
        game.player.pitch = -Math.atan2(p.y - (game.player.position.y ?? 0) - 1.65, Math.hypot(p.x - game.player.position.x, p.z - game.player.position.z));
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
    add('Port diagnostics', () => {
        game.player.render(1, .016, game.aiming);
        game.view.update(.016, game.weapons, false, false, game.aiming, 0, true);
        game.scene.render();
        const model = game.view.models.get(game.weapons.current)!;
        const nodes = model.pivot.getChildTransformNodes().filter(n => /Camera|weapon_bone|attach_muzzle|Head1/.test(n.name));
        panel.querySelector('#qa-results')!.textContent = JSON.stringify({
            position: game.player.position, nativeAreas: game.grid.areas.length,
            bones: nodes.map(n => ({ name: n.name, local: Vector3.TransformCoordinates(n.getAbsolutePosition(), Matrix.Invert(model.pivot.getWorldMatrix())).asArray() })),
            groups: model.groups.map(g => ({ name: g.name, from: g.from, to: g.to })),
            bounds: model.pivot.getHierarchyBoundingVectors(),
        }, null, 1);
    });
    add('Hospital corridor', () => {
        start(); game.enemies.reset();
        game.player.position = game.grid.center(game.grid.closest({ x: 2, z: 12, y: 0 }));
        game.player.previous = { ...game.player.position };
        game.player.yaw = 0; game.player.pitch = 0;
    });
    add('Port combat check', () => {
        const output = panel.querySelector('#qa-results')!;
        output.textContent = '';
        try {
            const nav = game.grid;
            start(); game.enemies.reset();
            const centers = nav.areas.map((_, i) => nav.center(i)).filter(p => (p.y ?? 0) < 1 && nav.clear(p.x, p.z, .3, p.y));
            let pair: typeof centers | undefined;
            outer: for (const a of centers) for (const b of centers) {
                const d = Math.hypot(b.x - a.x, b.z - a.z);
                if (d < 4 || d > 6 || !nav.lineClear(a, b)) continue;
                const direction = new Vector3((b.x - a.x) / d, 0, (b.z - a.z) / d);
                if (game.grid.wallDistance({ ...a, y: (a.y ?? 0) + 1.5 }, direction, d + .5) > d) { pair = [a, b]; break outer; }
            }
            if (!pair) throw Error('No unobstructed hospital firing lane');
            game.player.position = { ...pair[0] }; game.player.previous = { ...pair[0] };
            game.enemies.spawn(pair[1], false);
            const enemy = game.enemies.zombies.find(z => z.life === 'alive')!;
            enemy.debugFrozen = true;
            game.run.spawned = game.run.alive = 1;
            game.enemies.render(1); game.scene.render();
            if (!enemy.head) throw Error('Missing native head bone');
            const spread = WEAPONS.pistol.spread;
            try {
                WEAPONS.pistol.spread = 0;
                for (let i = 0; i < 2; i++) {
                    aim(true); game.view.recoil = 0; game.view.sway = { yaw: 0, pitch: 0 };
                    game.weapons.tick(1); game.shoot();
                }
            } finally { WEAPONS.pistol.spread = spread; }
            if (enemy.life !== 'dead' || game.weapons.ammo !== 10 || game.run.headshots !== 1) throw Error('Native two-headshot kill / ammunition check failed');
            output.textContent = 'PASS native head bone and two-shot kill\nPASS two rounds consumed\nPASS real hospital geometry firing lane\n';
            const before = { ...game.player.position };
            for (let i = 0; i < 30; i++) game.grid.move(game.player.position, (pair[1].x - before.x) / 120, (pair[1].z - before.z) / 120, .27);
            if (Math.hypot(game.player.position.x - before.x, game.player.position.z - before.z) < .1) throw Error('Hospital movement blocked');
            output.textContent += 'PASS navigation movement\n';
            pair = undefined;
            outer: for (const a of centers) for (const b of centers) {
                const distance = Math.hypot(b.x - a.x, b.z - a.z);
                if (distance < 4 || distance > 15) continue;
                const direction = new Vector3((b.x - a.x) / distance, 0, (b.z - a.z) / distance);
                if (game.grid.wallDistance({ ...a, y: (a.y ?? 0) + 1.5 }, direction, distance) < distance - 1) { pair = [a, b]; break outer; }
            }
            if (!pair) throw Error('No blocked hospital firing lane');
            game.enemies.reset();
            game.player.position = { ...pair[0] }; game.player.previous = { ...pair[0] };
            game.enemies.spawn(pair[1], false);
            const blocked = game.enemies.zombies.find(z => z.life === 'alive')!;
            blocked.debugFrozen = true;
            game.enemies.render(1); game.scene.render();
            const originalSpread = WEAPONS.pistol.spread;
            try {
                WEAPONS.pistol.spread = 0;
                aim(false); game.view.recoil = 0; game.view.sway = { yaw: 0, pitch: 0 };
                game.weapons.tick(1); game.shoot();
            } finally { WEAPONS.pistol.spread = originalSpread; }
            if (blocked.health !== 100 || Number(game.weapons.ammo) !== 9) throw Error('Hospital wall must block a fired round');
            output.textContent += 'PASS hospital wall blocks shots\nALL PORT COMBAT CHECKS PASSED';
            game.player.previous = { ...game.player.position }; game.player.render(1, .016, false); game.scene.render();
        } catch (error) { output.textContent += 'FAIL ' + String(error); }
    });
    add('Hide checks', () => { panel.style.display = 'none'; });
    add('Target 4m', () => target(4));
    add('Target 1m', () => target(1.05));
    const lineup = () => {
        start();
        game.enemies.reset();
        const p = game.player.position;
        game.player.yaw = Math.PI;
        game.player.pitch = .08;
        const points = game.grid.areas.map((_, i) => game.grid.center(i)).filter(point => Math.abs((point.y ?? 0) - (p.y ?? 0)) < .4 && game.grid.clear(point.x, point.z, .3, point.y) && game.grid.lineClear(p, point) && Math.hypot(point.x - p.x, point.z - p.z) > 2).sort((a, b) => Math.hypot(a.x - p.x, a.z - p.z) - Math.hypot(b.x - p.x, b.z - p.z));
        for (const point of points.slice(0, 5)) {
            game.enemies.spawn(point, false);
            const z = game.enemies.zombies.find(z => z.life === 'alive' && !z.debugFrozen)!;
            z.debugFrozen = true;
            z.root.rotation.y = Math.atan2(p.x - point.x, p.z - point.z);
        }
    };
    add('Infected lineup', lineup);
    const sightChecks = () => {
        start();
        game.enemies.reset();
        game.weapons.inventory = Object.keys(WEAPONS) as WeaponId[];
        const output = panel.querySelector('#qa-results')!;
        output.textContent = '';
        for (const id of game.weapons.inventory.filter(id => id !== 'knife')) {
            game.weapons.switchTo(id);
            game.view.equip(id);
            game.view.update(1, game.weapons, false, false, true, 0, true);
            game.player.render(1, 0, true, 0, true);
            game.scene.render();
            const sights = game.view.models.get(id)!.sights;
            if (!sights) throw Error('Missing physical sights: ' + id);
            const inverse = Matrix.Invert(game.player.camera.getWorldMatrix());
            for (const anchor of [sights.rear, sights.front]) {
                const p = Vector3.TransformCoordinates(anchor.getAbsolutePosition(), inverse);
                if (Math.abs(p.x) > .004 || Math.abs(p.y) > .004 || p.z < .04) {
                    output.textContent += `FAIL ${id} ${anchor.name}: ${p.asArray().map(v => v.toFixed(4)).join(', ')}\n`;
                    game.pause(true);
                    return;
                }
            }
            output.textContent += 'PASS aligned physical sights: ' + id + '\n';
        }
        game.weapons.switchTo('pistol');
        game.view.equip('pistol');
        output.textContent += 'ALL IRON SIGHT CHECKS PASSED';
        game.view.update(1, game.weapons, false, false, true, 0, true);
        game.ui.render(game.run, game.weapons, 0);
        game.scene.render();
        game.paused = true;
        game.scene.animationsEnabled = false;
    };
    add('Sight checks', sightChecks);
    add('Mission terminal', () => {
        if (game.run.mode !== 'objective')
            return;
        const goal = game.grid.map.objectives[game.run.wave - 1];
        game.enemies.reset();
        game.run.spawned = game.run.total;
        game.run.alive = 0;
        game.player.position = game.grid.center(goal.area);
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
        game.enemies.reset();
        const player = game.player.position;
        const points = game.grid.areas.map((_, i) => game.grid.center(i)).filter(p => Math.abs((p.y ?? 0) - (player.y ?? 0)) < 1 && game.grid.clear(p.x, p.z, .3, p.y) && Math.hypot(p.x - player.x, p.z - player.z) > 2);
        if (!points.length) throw new Error('No usable hospital spawn areas');
        for (let i = 0; i < 32; i++) game.enemies.spawn(points[Math.floor(i * points.length / 32)], i % 4 === 0);
        game.run.wave = 5;
        game.run.spawned = game.run.alive = 32;
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
    async function missionChecks() {
        if (checking) return;
        checking = true;
        const output = panel.querySelector('#qa-results')!;
        output.textContent = 'Running hospital objective checks…\n';
        const use = (held: boolean) => window.dispatchEvent(new KeyboardEvent(held ? 'keydown' : 'keyup', { code: game.ui.settings.hotkeys.KeyE, bubbles: true }));
        try {
            game.toMenu();
            game.ui.selectedMode = 'objective';
            start();
            for (let stage = 1; stage <= 3; stage++) {
                game.enemies.reset();
                game.run.spawned = game.run.total;
                game.run.alive = 0;
                const goal = game.grid.map.objectives[stage - 1];
                game.player.position = game.grid.center(goal.area);
                game.player.previous = { ...game.player.position };
                use(true);
                for (let i = 0; i < 600 && game.run.phase === 'wave'; i++) await wait(50);
                use(false);
                if (game.run.phase !== (stage < 3 ? 'break' : 'won')) throw Error(`Objective ${stage} did not complete`);
                output.textContent += `PASS hospital objective ${stage} and Use hotkey\n`;
                if (stage < 3) game.nextWave();
            }
            output.textContent += 'ALL HOSPITAL MISSION CHECKS PASSED';
        } catch (error) {
            output.textContent += 'FAIL ' + String(error);
            game.pause(true);
        } finally {
            use(false);
            checking = false;
        }
    }
    add('Mission checks', () => void missionChecks());
    const mode = new URLSearchParams(location.search).get('qa');
    if (mode === 'infected') setTimeout(lineup, 700);
    if (mode === 'sights') setTimeout(sightChecks, 700);
    if (mode === 'missions') setTimeout(() => void missionChecks(), 700);
    if (mode === 'stress') setTimeout(stress, 700);
    if (mode === 'armory') setTimeout(armory, 700);
    if (mode === 'shop') setTimeout(() => { start(); openTrader(); }, 700);
    setInterval(() => {
        panel.querySelector('#qa-state')!.textContent = JSON.stringify({
            phase: game.run.phase, wave: game.run.wave, health: game.run.health,
            weapon: game.weapons.current, ammo: game.weapons.ammo, points: game.run.points,
            nativeAreas: game.grid.areas.length, position: game.player.position, ...game.metrics()
        }, null, 1);
    }, 500);
}
