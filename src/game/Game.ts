import { getMap, type MapId } from '../maps/maps.ts';
import { ObjectiveRules } from './objective-rules.ts';
import { ObjectiveView } from '../presentation/objective-view.ts';
import { chooseEnemyKind } from '../enemies/enemy-rules.ts';
import { Engine, Scene, Vector3 } from '@babylonjs/core';
import { UI, type Settings } from '../ui/ui.ts';
import { WorldGrid } from '../world/navigation.ts';
import { LevelWorld } from '../world/world.ts';
import { RunRules } from './run-rules.ts';
import { WeaponRules, WEAPONS, type WeaponId } from '../weapons/weapon-rules.ts';
import { Player } from '../player/player.ts';
import { WeaponView } from '../weapons/weapon-view.ts';
import { GameAudio } from '../presentation/audio.ts';
import { Enemies } from '../enemies/enemies.ts';
import { Effects } from '../presentation/effects.ts';
import { sourcePack } from '../world/source-map.ts';
export class Game {
    canvas = document.getElementById('game') as HTMLCanvasElement;
    engine: Engine;
    scene: Scene;
    grid = new WorldGrid();
    run = new RunRules();
    weapons = new WeaponRules();
    player: Player;
    world: LevelWorld;
    view: WeaponView;
    audio = new GameAudio();
    enemies: Enemies;
    effects: Effects;
    objectiveRules = new ObjectiveRules();
    objectiveView: ObjectiveView;
    changingMap = false;
    keys = new Set<string>();
    paused = false;
    loaded = false;
    aiming = false;
    held = false;
    pressed = false;
    accumulator = 0;
    last = performance.now();
    spawnTimer = 2;
    navTimer = 0;
    footstep = 0;
    clock = 0;
    pendingMelee = 0;
    reloadSounds = 0;
    finished = false;
    frames: number[] = [];
    showStats = false;
    metricsTimer = 0;
    qa = (import.meta.env.DEV || import.meta.env.MODE === 'qa') && new URLSearchParams(location.search).has('qa');
    invulnerable = false;
    fallbackLook = false;
    constructor(public ui: UI) {
        this.engine = new Engine(this.canvas, true, {
            preserveDrawingBuffer: true, stencil: true, powerPreference: 'high-performance'
        }, false);
        if (this.engine.webGLVersion < 2)
            throw new Error('WebGL2 is required. Please enable hardware acceleration in a desktop browser.');
        this.scene = new Scene(this.engine);
        this.scene.preventDefaultOnPointerDown = false;
        this.scene.setRenderingAutoClearDepthStencil(2, true, true, true);
        this.player = new Player(this.grid, this.scene);
        this.scene.activeCamera = this.player.camera;
        this.world = new LevelWorld(this.scene, this.grid);
        this.view = new WeaponView(this.scene, this.player.camera);
        this.enemies = new Enemies(this.scene, this.grid, this.audio);
        this.effects = new Effects(this.scene);
        this.objectiveView = new ObjectiveView(this.scene);
        this.canvas.tabIndex = 0;
        this.ui.onStart = () => this.start();
        this.ui.onMapChange = id => void this.selectMap(id);
        this.ui.onMenu = () => this.toMenu();
        this.ui.onRestart = () => this.start();
        this.ui.onResume = () => this.capture();
        this.ui.onSettings = s => this.settings(s);
        this.ui.trader.onBuy = id => {
            if (this.weapons.buy(id, this.run)) {
                this.switch(id);
                this.ui.trader.message(WEAPONS[id].name + ' purchased and equipped.');
                this.refreshShop();
            }
        };
        this.ui.trader.onRefill = id => {
            if (this.weapons.refill(id, this.run)) {
                this.ui.trader.message(WEAPONS[id].name + ' fully resupplied.');
                this.refreshShop();
            }
        };
        this.ui.trader.onEquip = id => {
            if (this.run.phase === 'break' && this.weapons.owns(id)) {
                this.switch(id);
                this.ui.trader.message(WEAPONS[id].name + ' equipped.');
                this.refreshShop();
            }
        };
        this.ui.trader.onReady = () => this.nextWave();
        this.settings(ui.settings);
        this.bind();
        this.engine.runRenderLoop(() => this.frame());
        window.addEventListener('resize', () => this.resize());
    }
    async load() {
        let done = 0;
        const progress = () => this.ui.loading(++done, 20);
        await Promise.all([this.world.build(progress), this.audio.load(progress), this.view.load(progress), this.enemies.load(progress)]);
        // The forward-facing flashlight must not illuminate its own first-person rig.
        this.world.flashlight.excludedMeshes = [...this.view.models.values()].flatMap(model => model.pivot.getChildMeshes());
        this.ui.loading(20, 20, 'Checking equipment…');
        await this.scene.whenReadyAsync();
        this.ui.loading(20, 20, 'Warming weapons…');
        await this.view.warm();
        this.ui.loading(20, 20, 'Warming infected…');
        await this.enemies.warm();
        this.view.models.forEach(m => m.pivot.setEnabled(false));
        this.loaded = true;
        this.player.pitch = .035;
        this.player.yaw = Math.PI - .06;
        if (!this.grid.source) {
            this.enemies.spawn(this.grid.center(13, 9), false);
            this.enemies.spawn(this.grid.center(12, 5), false);
        }
        this.ui.ready();
        if (this.qa) {
            const { setupQA } = await import('../dev/qa.ts');
            setupQA(this);
        }
    }
    settings(s: Settings) {
        this.audio.setVolume(s.volume);
        this.player.sensitivity = s.sensitivity;
        this.world.setQuality(s.quality);
        this.resize();
    }
    resize() {
        const limit = this.ui.settings.quality === 'low' ? 960 : this.ui.settings.quality === 'high' ? 1920 : 1280;
        const scale = Math.max(1, this.canvas.clientWidth / limit, this.canvas.clientHeight / (limit * 9 / 16));
        this.engine.setHardwareScalingLevel(scale);
        this.engine.resize();
    }
    start() {
        if (!this.loaded || this.changingMap)
            return;
        this.enemies.reset();
        this.effects.reset();
        this.run = new RunRules();
        this.weapons = new WeaponRules();
        this.run.start(this.ui.selectedMode);
        this.objectiveRules.reset();
        this.player.reset();
        this.view.equip('pistol');
        this.spawnTimer = 2.5;
        this.navTimer = 0;
        this.pendingMelee = 0;
        this.reloadSounds = 0;
        this.finished = false;
        this.invulnerable = false;
        this.fallbackLook = false;
        this.ui.mouseMode(false);
        this.clock = 0;
        this.accumulator = 0;
        this.frames = [];
        this.keys.clear();
        this.held = false;
        this.pressed = false;
        this.aiming = false;
        this.ui.showGame();
        this.ui.announce(1, this.run.total, this.run.mode === 'objective');
        this.capture();
    }
    async selectMap(id: MapId) {
        if (!this.loaded || this.changingMap || this.run.phase !== 'ready' || id === this.grid.map.id)
            return;
        this.changingMap = true;
        this.ui.setMapBusy(true);
        this.enemies.reset();
        this.view.models.forEach(m => m.pivot.setEnabled(false));
        try {
            this.grid.configure(getMap(id));
            await this.world.rebuild(() => {
            });
            this.ui.loading(20, 20, 'Warming selected location…');
            this.world.setQuality(this.ui.settings.quality);
            await this.scene.whenReadyAsync();
            this.player.reset();
            this.player.render(1, 0, false);
            this.grid.rebuild(this.player.position);
            if (!this.grid.source) this.enemies.spawn(this.grid.center(13, 9), false);
            this.ui.setMapBusy(false);
        }
        catch (error) {
            this.ui.fail(error);
        }
        finally {
            this.changingMap = false;
        }
    }
    toMenu() {
        if (this.changingMap)
            return;
        this.keys.clear();
        this.held = false;
        this.pressed = false;
        this.aiming = false;
        this.pendingMelee = 0;
        this.accumulator = 0;
        this.enemies.reset();
        this.effects.reset();
        this.objectiveRules.reset();
        this.run = new RunRules();
        this.finished = false;
        this.paused = false;
        this.scene.animationsEnabled = true;
        this.view.models.forEach(m => m.pivot.setEnabled(false));
        this.player.reset();
        this.ui.showMenu();
        if (document.pointerLockElement)
            document.exitPointerLock();
    }
    updateObjectiveHUD() {
        if (this.run.mode !== 'objective')
            return;
        const goal = this.grid.map.objectives[this.run.wave - 1];
        if (!goal)
            return;
        const target = this.grid.center(...goal.cell), dx = target.x - this.player.position.x, dz = target.z - this.player.position.z, distance = Math.hypot(dx, dz);
        const angle = Math.atan2(Math.sin(Math.atan2(dx, dz) - this.player.yaw), Math.cos(Math.atan2(dx, dz) - this.player.yaw));
        const bearing = Math.abs(angle) < .5 ? 'AHEAD' : Math.abs(angle) > 2.5 ? 'BEHIND' : angle < 0 ? 'LEFT' : 'RIGHT';
        const hint = this.run.remaining > 0 ? `CLEAR ${this.run.remaining} INFECTED TO USE THE TERMINAL` : (distance > 1.65 || !this.grid.lineClear(this.player.position, target)) ? 'FOLLOW THE BEACON · HOLD E WHEN CLOSE' : `HOLD E · ${goal.action}`;
        this.ui.objective(goal.title, distance, bearing, hint, this.objectiveRules.progress / goal.hold);
    }
    capture() {
        void this.audio.unlock();
        this.canvas.focus();
        if (this.qa) {
            this.pause(false);
            return;
        }
        const fallback = () => {
            this.fallbackLook = true;
            this.ui.mouseMode(true);
            this.pause(false);
        };
        try {
            const request = this.canvas.requestPointerLock();
            if (request)
                request.catch(fallback);
        }
        catch {
            fallback();
        }
    }
    pause(value: boolean) {
        if (this.ui.shopOpen) {
            this.keys.clear();
            this.held = false;
            this.pressed = false;
            this.aiming = false;
            return;
        }
        if (this.finished || this.run.phase === 'ready')
            return;
        this.paused = value;
        this.ui.setPaused(value);
        this.keys.clear();
        this.held = false;
        this.pressed = false;
        this.aiming = false;
        this.accumulator = 0;
        this.scene.animationsEnabled = !value;
        if (value)
            this.audio.suspend();
        else
            void this.audio.unlock();
    }
    bind() {
        document.addEventListener('pointerlockchange', () => {
            if (this.ui.shopOpen)
                return;
            if (this.run.phase === 'wave' || this.run.phase === 'break') {
                if (document.pointerLockElement === this.canvas) {
                    this.fallbackLook = false;
                    this.ui.mouseMode(false);
                    this.pause(false);
                }
                else if (!this.fallbackLook)
                    this.pause(true);
            }
        });
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                if (document.pointerLockElement)
                    document.exitPointerLock();
                this.pause(true);
            }
        });
        window.addEventListener('blur', () => {
            if (!this.qa)
                this.pause(true);
        });
        window.addEventListener('keydown', e => {
            if (e.code === 'F3') {
                e.preventDefault();
                this.showStats = !this.showStats;
                return;
            }
            if (e.code === 'Escape') {
                if (this.ui.closeDialog() || this.ui.shopOpen)
                    return;
                if (!this.finished && this.run.phase !== 'ready') {
                    this.pause(true);
                    if (document.pointerLockElement)
                        document.exitPointerLock();
                }
                return;
            }
            if (this.paused || this.finished || this.ui.shopOpen || this.run.phase === 'ready')
                return;
            if (['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ShiftLeft', 'KeyR', 'KeyE'].includes(e.code) || /^Digit[1-9]$/.test(e.code))
                e.preventDefault();
            this.keys.add(e.code);
            if (e.repeat)
                return;
            if (e.code === 'KeyR')
                this.reload();
            if (e.code === 'KeyE' && this.grid.source && (this.run.mode === 'survival' || this.run.wave >= 3)) {
                const p = this.player.position;
                // ponytail: transfer between the authored elevator landings; Source's entity I/O isn't a browser runtime.
                if (Math.hypot(p.x - 25.76, p.z - 68.3) < 5 && (Math.abs((p.y ?? 0) - 10.36) < 2 || Math.abs((p.y ?? 0) - 140.2) < 2)) {
                    const target = { x: 25.76, z: 66.5, y: (p.y ?? 0) < 50 ? 140.2 : 10.36 };
                    this.player.position = this.grid.source.center(this.grid.source.closest(target));
                    this.player.previous = { ...this.player.position };
                    this.enemies.reset(); this.grid.rebuild(this.player.position);
                }
            }
            if (/^Digit[1-9]$/.test(e.code)) {
                const id = this.weapons.inventory[Number(e.code.slice(-1)) - 1];
                if (id)
                    this.switch(id);
            }
        });
        window.addEventListener('keyup', e => this.keys.delete(e.code));
        document.addEventListener('mousemove', e => {
            if (!this.paused && !this.finished && (document.pointerLockElement === this.canvas || this.fallbackLook && (e.buttons & 2) !== 0))
                this.player.look(e.movementX, e.movementY);
        });
        this.canvas.addEventListener('mousedown', e => {
            if (!this.playing())
                return;
            if (!this.qa && !this.fallbackLook && document.pointerLockElement !== this.canvas)
                return;
            if (e.button === 0) {
                this.held = true;
                this.pressed = true;
            }
            if (e.button === 2)
                this.aiming = this.weapons.current !== 'knife';
        });
        window.addEventListener('mouseup', e => {
            if (e.button === 0)
                this.held = false;
            if (e.button === 2)
                this.aiming = false;
        });
        this.canvas.addEventListener('contextmenu', e => e.preventDefault());
        this.canvas.addEventListener('wheel', e => {
            if (!this.playing())
                return;
            e.preventDefault();
            const ids = this.weapons.inventory;
            this.switch(ids[(ids.indexOf(this.weapons.current) + (e.deltaY > 0 ? 1 : ids.length - 1)) % ids.length]);
        }, {
            passive: false
        });
    }
    playing() {
        return this.loaded && !this.paused && !this.finished && !this.ui.shopOpen && (this.run.phase === 'wave' || this.run.phase === 'break');
    }
    switch(id: WeaponId) {
        if (this.weapons.switchTo(id)) {
            this.pendingMelee = 0;
            this.view.equip(id);
            this.audio.play('equip', .18);
            this.aiming = false;
            this.reloadSounds = 0;
        }
    }
    reload() {
        if (this.weapons.reload()) {
            this.view.reload(this.weapons.current);
            this.reloadSounds = 0;
        }
    }
    refreshShop() {
        this.ui.trader.render(this.run, this.weapons);
        this.ui.render(this.run, this.weapons, 0, false);
    }
    openShop() {
        if (this.ui.shopOpen || this.run.phase !== 'break')
            return;
        this.paused = false;
        this.ui.setPaused(false);
        this.keys.clear();
        this.held = false;
        this.pressed = false;
        this.aiming = false;
        this.pendingMelee = 0;
        this.accumulator = 0;
        this.player.moving = false;
        this.player.sprinting = false;
        this.ui.openShop(this.run, this.weapons);
        if (document.pointerLockElement)
            document.exitPointerLock();
    }
    nextWave() {
        if (!this.run.startNextWave())
            return;
        this.ui.closeShop();
        this.spawnTimer = 1.5;
        this.navTimer = 0;
        this.accumulator = 0;
        this.ui.announce(this.run.wave, this.run.total, this.run.mode === 'objective');
        this.capture();
    }
    shoot() {
        const id = this.weapons.current, spec = WEAPONS[id];
        if (!this.weapons.fire())
            return;
        this.view.attack(id);
        if (id === 'knife') {
            this.pendingMelee = .18;
            this.audio.play('knife', .4);
            return;
        }
        if (id === 'plasmaRifle' && !sourcePack)
            this.audio.plasma();
        else
            this.audio.play(id === 'pistol' ? 'pistol' : 'rifle', spec.pellets > 1 ? .75 : .65, undefined, spec.pellets > 1 ? .68 : id === 'smg' ? 1.2 : id === 'heavySmg' ? .9 : .98 + Math.random() * .04);
        this.run.shots++;
        let triggerHit = false;
        const spread = spec.spread * (this.aiming ? .35 : 1);
        for (let pellet = 0; pellet < spec.pellets; pellet++) {
            const radius = Math.sqrt(Math.random()) * spread, angle = Math.random() * Math.PI * 2;
            const yaw = this.player.yaw + this.view.sway.yaw + Math.cos(angle) * radius, p = this.player.pitch + this.view.sway.pitch - this.view.recoil + Math.sin(angle) * radius;
            const direction = new Vector3(Math.sin(yaw) * Math.cos(p), -Math.sin(p), Math.cos(yaw) * Math.cos(p));
            const origin = new Vector3(this.player.position.x, (this.player.position.y ?? 0) + 1.65, this.player.position.z);
            let distance = this.grid.wallDistance(origin, {
                x: direction.x, y: direction.y, z: direction.z
            });
            if (!this.grid.source && direction.y > 0)
                distance = Math.min(distance, (3.16 - origin.y) / direction.y);
            else if (!this.grid.source && direction.y < 0)
                distance = Math.min(distance, -origin.y / direction.y);
            const hit = this.enemies.hit(origin, direction, distance);
            if (hit) {
                const falloff = spec.pellets > 1 ? Math.max(.25, 1 - Math.max(0, hit.distance - 3) * .045) : 1;
                const damage = spec.damage * falloff * (hit.head ? 2 : 1);
                const killed = this.enemies.damage(hit.zombie, damage, hit.head, this.run);
                this.effects.blood(origin.add(direction.scale(hit.distance)), direction);
                this.audio.play('impact', .15, hit.zombie.position);
                this.ui.hit(killed, hit.head);
                triggerHit = true;
                distance = hit.distance;
            }
            if (id === 'plasmaRifle' && !sourcePack)
                this.effects.energy(origin.add(new Vector3(Math.sin(yaw) * .4 + Math.cos(yaw) * .15, -.1, Math.cos(yaw) * .4 - Math.sin(yaw) * .15)), origin.add(direction.scale(distance)));
        }
        if (triggerHit)
            this.run.hits++;
    }
    simulate(dt: number) {
        const oldPhase = this.run.phase, health = this.run.health;
        this.run.tick(dt);
        if (this.weapons.tick(dt) && this.weapons.reloading && WEAPONS[this.weapons.current].reloadStyle === 'shell') {
            this.view.reload(this.weapons.current);
            this.reloadSounds = 0;
        }
        if (this.weapons.reloading) {
            const p = this.weapons.reloadProgress;
            const stage = p > .84 ? 3 : p > .53 ? 2 : p > .17 ? 1 : 0;
            if (stage > this.reloadSounds) {
                this.audio.play('reload', .3, undefined, .85 + stage * .1);
                this.reloadSounds = stage;
            }
        }
        this.player.update(dt, this.keys, this.aiming, this.weapons.cooldown === 0 && !this.weapons.reloading);
        this.audio.listener = this.player.position;
        this.audio.yaw = this.player.yaw;
        if (this.player.moving) {
            this.footstep -= dt;
            if (this.footstep <= 0) {
                this.audio.play('step' + (1 + Math.floor(Math.random() * 4)), this.player.sprinting ? .19 : .12);
                this.footstep = this.player.sprinting ? .28 : .44;
            }
        }
        else
            this.footstep = 0;
        if ((WEAPONS[this.weapons.current].automatic ? (this.held || this.pressed) : this.pressed) && this.run.phase === 'wave')
            this.shoot();
        this.pressed = false;
        if (this.pendingMelee > 0) {
            this.pendingMelee -= dt;
            if (this.pendingMelee <= 0 && this.weapons.current === 'knife') {
                const hit = this.enemies.melee(this.player.position, this.player.yaw);
                if (hit) {
                    const killed = this.enemies.damage(hit, 50, false, this.run);
                    this.effects.blood(new Vector3(hit.position.x, 1.2, hit.position.z), new Vector3(Math.sin(this.player.yaw), 0, Math.cos(this.player.yaw)));
                    this.audio.play('impact', .4, hit.position);
                    this.ui.hit(killed, false);
                }
            }
        }
        this.navTimer -= dt;
        if (this.navTimer <= 0) {
            this.grid.rebuild(this.player.position);
            this.navTimer = .2;
        }
        this.spawnTimer -= dt;
        if (this.spawnTimer <= 0 && this.run.canSpawn) {
            const locations = this.grid.map.entrances.map(([x, z]) => this.grid.center(x, z)).filter(p => !this.grid.source || Math.abs((p.y ?? 0) - (this.player.position.y ?? 0)) < 1.5);
            locations.sort((a, b) => {
                const score = (p: {
                    x: number;
                    z: number;
                }) => {
                    const distance = Math.hypot(p.x - this.player.position.x, p.z - this.player.position.z);
                    return Math.abs(distance - 13) + (distance < 7 ? 100 : 0) + (this.grid.lineClear(p, this.player.position) ? 20 : 0);
                };
                return score(a) - score(b);
            });
            const p = locations[Math.floor(Math.random() * Math.min(3, locations.length))];
            let kind = chooseEnemyKind(this.run.wave, this.run.spawned, this.enemies.zombies.filter(z => z.life === 'alive' && z.kind === 'flyer').length, Math.random());
            if (sourcePack && kind === 'flyer') kind = 'runner';
            if (p && this.enemies.spawn(p, kind === 'runner', kind))
                this.run.spawn();
            this.spawnTimer = Math.max(.35, .9 - this.run.wave * .08);
        }
        this.enemies.update(dt, this.player.position, this.run);
        if (this.invulnerable && this.run.phase === 'dead') {
            this.run.phase = 'wave';
            this.run.health = 100;
        }
        if (this.run.health < health) {
            this.ui.damage();
            this.objectiveRules.progress = 0;
        }
        if (this.run.mode === 'objective') {
            const goal = this.grid.map.objectives[this.run.wave - 1];
            if (goal) {
                const target = this.grid.center(...goal.cell);
                const distance = Math.hypot(target.x - this.player.position.x, target.z - this.player.position.z);
                this.objectiveRules.update(dt, this.run, distance, this.grid.lineClear(this.player.position, target), this.keys.has('KeyE'), goal.hold);
            }
        }
        if (oldPhase === 'wave' && this.run.phase === 'break')
            this.openShop();
        if (this.run.phase === 'won' || this.run.phase === 'dead')
            this.finish();
    }
    finish() {
        if (this.finished)
            return;
        this.ui.closeShop();
        this.finished = true;
        this.held = false;
        this.aiming = false;
        this.keys.clear();
        this.ui.finish(this.run);
        if (document.pointerLockElement)
            document.exitPointerLock();
    }
    metrics() {
        const sorted = [...this.frames].sort((a, b) => a - b);
        const mean = this.frames.reduce((a, b) => a + b, 0) / Math.max(1, this.frames.length);
        return {
            samples: this.frames.length, seconds: Math.round(this.frames.reduce((a, b) => a + b, 0) / 1000), fps: mean > 0 ? Math.round(1000 / mean) : 0, p95: +(sorted[Math.floor(sorted.length * .95)] || 0).toFixed(1), stalls: this.frames.filter(t => t > 50).length, active: this.enemies.zombies.filter(z => z.life === 'alive').length, resolution: `${this.engine.getRenderWidth()} × ${this.engine.getRenderHeight()}`
        };
    }
    frame() {
        const now = performance.now(), rawDelta = (now - this.last) / 1000, delta = Math.min(.1, rawDelta);
        this.last = now;
        this.clock += delta;
        if (!this.finished && (this.run.phase === 'dead' || this.run.phase === 'won'))
            this.finish();
        if (this.run.phase === 'break' && !this.ui.shopOpen && !this.finished)
            this.openShop();
        if (this.playing()) {
            if (this.run.elapsed > 10) {
                this.frames.push(rawDelta * 1000);
                if (this.frames.length > 18000)
                    this.frames.shift();
            }
            this.accumulator += delta;
            let iterations = 0;
            while (this.accumulator >= 1 / 60 && iterations++ < 6) {
                this.simulate(1 / 60);
                this.accumulator -= 1 / 60;
                if (this.finished || this.ui.shopOpen) {
                    this.accumulator = 0;
                    break;
                }
            }
            this.player.render(this.accumulator / (1 / 60), delta, this.aiming, this.view.recoil, this.ui.settings.reducedMotion);
            this.enemies.render(this.accumulator / (1 / 60));
            this.view.update(delta, this.weapons, this.player.moving, this.player.sprinting, this.aiming, this.clock, this.ui.settings.reducedMotion);
            this.ui.render(this.run, this.weapons, delta, this.aiming);
            this.updateObjectiveHUD();
        }
        else if (this.run.phase === 'ready') {
            this.player.render(1, delta, false);
            this.enemies.update(delta, this.player.position, this.run);
        }
        if (!this.paused)
            this.effects.update(delta);
        this.objectiveView.update(this.run, this.grid);
        const direction = this.player.camera.getForwardRay(1).direction;
        this.world.update(delta, this.player.camera.position, direction);
        this.scene.render();
        this.metricsTimer -= delta;
        if (this.metricsTimer <= 0) {
            this.metricsTimer = .5;
            const el = document.getElementById('performance')!;
            el.classList.toggle('hidden', !this.showStats);
            if (this.showStats) {
                const m = this.metrics();
                el.textContent = `${m.fps || Math.round(this.engine.getFps())} FPS · P95 ${m.p95} ms\n${m.active} INFECTED · ${m.resolution}\n${m.seconds}s SAMPLED · ${m.stalls} FRAMES >50ms`;
            }
        }
    }
}
export type GameInstance = Game;
