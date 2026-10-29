import { createFlyerWings } from './flyer-art.ts';
import { ENEMY_TYPES, flyerAltitude, type EnemyKind } from './enemy-rules.ts';
import { Scene, SceneLoader, TransformNode, Vector3, AnimationGroup, PBRMaterial, AbstractMesh, AssetContainer } from '@babylonjs/core';
import { WorldGrid, type Point, raySphere } from '../world/navigation.ts';
import { RunRules } from '../game/run-rules.ts';
import { GameAudio } from '../presentation/audio.ts';
type Life = 'pooled' | 'alive' | 'dead';
export type Zombie = {
    root: TransformNode;
    groups: Map<string, AnimationGroup>;
    head: TransformNode | undefined;
    meshes: AbstractMesh[];
    position: Point;
    previous: Point;
    life: Life;
    health: number;
    runner: boolean;
    kind: EnemyKind;
    wings: TransformNode[];
    age: number;
    altitude: number;
    previousAltitude: number;
    attack: number;
    attackHit: boolean;
    hurt: number;
    corpse: number;
    voice: number;
    current?: AnimationGroup;
    old?: AnimationGroup;
    blend: number;
    debugFrozen?: boolean;
};
export class Enemies {
    zombies: Zombie[] = [];
    container!: AssetContainer;
    constructor(private scene: Scene, private grid: WorldGrid, private audio: GameAudio) {
    }
    async load(progress: () => void) {
        this.container = await SceneLoader.LoadAssetContainerAsync('/assets/', 'zombie.glb', this.scene);
        const keep = ['idle', 'walk', 'run', 'attack1_r', 'attack2', 'hurt', 'dead1', 'dead2'];
        for (const g of [...this.container.animationGroups])
            if (!keep.includes(g.name)) {
                g.dispose();
                const i = this.container.animationGroups.indexOf(g);
                if (i >= 0)
                    this.container.animationGroups.splice(i, 1);
            }
        for (const m of this.container.materials)
            if (m instanceof PBRMaterial) {
                m.metallic = 0;
                m.roughness = .9;
            }
        for (let i = 0; i < 40; i++) {
            const entry = this.container.instantiateModelsToScene(n => `z${i}_${n}`, false, {
                doNotInstantiate: true
            });
            const root = new TransformNode(`zombie-${i}`, this.scene);
            for (const r of entry.rootNodes)
                r.parent = root;
            root.scaling.setAll(1.05 + (i % 3) * .015);
            const groups = new Map<string, AnimationGroup>();
            for (const g of entry.animationGroups) {
                g.stop();
                const name = keep.find(n => g.name.endsWith('_' + n) || g.name === n);
                if (name)
                    groups.set(name, g);
            }
            const wings = createFlyerWings(this.scene, root);
            const meshes = root.getChildMeshes();
            for (const m of meshes) {
                m.isPickable = false;
                m.alwaysSelectAsActiveMesh = false;
            }
            const head = root.getChildTransformNodes().find(n => n.name === `z${i}_head`);
            this.zombies.push({
                root, groups, head, meshes, position: {
                    x: 0, z: 0
                }, previous: {
                    x: 0, z: 0
                }, life: 'pooled', health: 100, runner: false, kind: 'shambler', wings, age: 0, altitude: 0, previousAltitude: 0, attack: 0, attackHit: false, hurt: 0, corpse: 0, voice: 2 + i * .3, blend: 0
            });
            root.setEnabled(false);
        }
        progress();
    }
    reset() {
        for (const z of this.zombies) {
            for (const g of z.groups.values())
                g.stop();
            z.life = 'pooled';
            z.root.setEnabled(false);
            z.current = undefined;
            z.old = undefined;
        }
    }
    private animate(z: Zombie, name: string, loop: boolean, speed = 1) {
        const g = z.groups.get(name);
        if (!g || z.current === g && g.isPlaying)
            return;
        if (z.old) {
            z.old.stop();
            z.old = undefined;
        }
        if (z.current && z.current.isPlaying) {
            z.old = z.current;
            z.old.setWeightForAllAnimatables(1);
        }
        g.stop();
        g.start(loop, speed);
        g.setWeightForAllAnimatables(z.old ? 0 : 1);
        z.blend = 0;
        z.current = g;
    }
    spawn(p: Point, runner: boolean, kind: EnemyKind = runner ? 'runner' : 'shambler') {
        let z = this.zombies.find(z => z.life === 'pooled');
        if (!z)
            z = this.zombies.filter(z => z.life === 'dead').sort((a, b) => a.corpse - b.corpse)[0];
        if (!z)
            return false;
        for (const g of z.groups.values())
            g.stop();
        z.current = undefined;
        z.old = undefined;
        z.position = {
            ...p
        };
        z.previous = {
            ...p
        };
        z.root.position.set(p.x, 0, p.z);
        z.health = ENEMY_TYPES[kind].health;
        z.kind = kind;
        z.age = 0;
        z.altitude = kind === 'flyer' ? 1.1 : 0;
        z.previousAltitude = z.altitude;
        z.root.scaling.setAll(kind === 'flyer' ? .68 : 1.05);
        z.root.rotation.x = kind === 'flyer' ? .18 : 0;
        z.root.rotation.z = 0;
        for (const wing of z.wings)
            wing.setEnabled(kind === 'flyer');
        z.root.position.y = z.altitude;
        z.life = 'alive';
        z.runner = runner;
        z.attack = 0;
        z.attackHit = false;
        z.hurt = 0;
        z.debugFrozen = false;
        z.voice = 1 + Math.random() * 5;
        z.root.setEnabled(true);
        this.animate(z, kind === 'flyer' ? 'idle' : runner ? 'run' : 'walk', true, runner ? 1.1 : .9);
        return true;
    }
    update(dt: number, player: Point, run: RunRules) {
        for (const z of this.zombies) {
            if (z.life === 'pooled')
                continue;
            if (z.old) {
                z.blend = Math.min(1, z.blend + dt / .12);
                z.current?.setWeightForAllAnimatables(z.blend);
                z.old.setWeightForAllAnimatables(1 - z.blend);
                if (z.blend === 1) {
                    z.old.stop();
                    z.old = undefined;
                }
            }
            if (z.life === 'dead') {
                if (z.kind === 'flyer') {
                    z.altitude = Math.max(0, z.altitude - dt * 3);
                    z.root.position.y = z.altitude;
                    for (const wing of z.wings)
                        wing.rotation.z *= Math.exp(-dt * 7);
                }
                z.corpse -= dt;
                if (z.corpse <= 0) {
                    z.life = 'pooled';
                    z.root.setEnabled(false);
                    for (const g of z.groups.values())
                        g.stop();
                    z.current = undefined;
                }
                continue;
            }
            z.previous = {
                ...z.position
            };
            z.previousAltitude = z.altitude;
            z.age += dt;
            z.hurt = Math.max(0, z.hurt - dt);
            z.voice -= dt;
            if (z.kind === 'flyer') {
                const d = Math.hypot(player.x - z.position.x, player.z - z.position.z);
                const target = flyerAltitude(z.age, d, z.attack > 0);
                z.altitude += (target - z.altitude) * (1 - Math.exp(-dt * 8));
                z.wings.forEach((wing, i) => wing.rotation.z = (i === 0 ? -1 : 1) * Math.sin(z.age * 13) * .6);
            }
            if (z.debugFrozen) {
                this.animate(z, 'idle', true);
                continue;
            }
            const dx = player.x - z.position.x, dz = player.z - z.position.z, d = Math.hypot(dx, dz);
            if (z.voice < 0 && d < 18) {
                this.audio.play('zombie' + (1 + Math.floor(Math.random() * 4)), .25, z.position, (z.kind === 'flyer' ? 1.4 : .85) + Math.random() * .2);
                z.voice = 4 + Math.random() * 7;
            }
            const yaw = Math.atan2(dx, dz);
            let turn = yaw - z.root.rotation.y;
            turn = Math.atan2(Math.sin(turn), Math.cos(turn));
            z.root.rotation.y += turn * Math.min(1, dt * 8);
            if (z.attack > 0) {
                z.attack -= dt;
                if (z.attack < .85 && !z.attackHit) {
                    z.attackHit = true;
                    if (d < 1.45 && (z.kind !== 'flyer' || z.altitude < .6) && this.grid.lineClear(z.position, player)) {
                        run.damage(ENEMY_TYPES[z.kind].damage);
                        this.audio.play('impact', .4);
                    }
                }
                if (z.attack <= 0)
                    this.animate(z, z.kind === 'flyer' ? 'idle' : z.runner ? 'run' : 'walk', true, z.runner ? 1.1 : .9);
                continue;
            }
            if (run.phase !== 'wave') {
                this.animate(z, 'idle', true);
                continue;
            }
            if (d < 1.15 && this.grid.lineClear(z.position, player)) {
                z.attack = 1.35;
                z.attackHit = false;
                this.animate(z, 'attack1_r', false, 1.24);
                continue;
            }
            const goal = this.grid.next(z.position, player);
            let mx = goal.x - z.position.x, mz = goal.z - z.position.z;
            const ml = Math.hypot(mx, mz);
            if (ml) {
                mx /= ml;
                mz /= ml;
            }
            let ax = 0, az = 0;
            for (const other of this.zombies) {
                if (other === z || other.life !== 'alive')
                    continue;
                const x = z.position.x - other.position.x, zz = z.position.z - other.position.z, d2 = x * x + zz * zz;
                if (d2 > 0 && d2 < .62 * .62) {
                    const dis = Math.sqrt(d2);
                    ax += x / dis * (.62 - dis) * 2.5;
                    az += zz / dis * (.62 - dis) * 2.5;
                }
            }
            const speed = ENEMY_TYPES[z.kind].speed * (z.hurt > 0 ? .25 : 1);
            this.grid.move(z.position, (mx * speed + ax) * dt, (mz * speed + az) * dt, .27);
            if (Math.hypot(z.position.x - player.x, z.position.z - player.z) < .65) {
                z.position = {
                    ...z.previous
                };
            }
            if (z.hurt === 0)
                this.animate(z, z.kind === 'flyer' ? 'idle' : z.runner ? 'run' : 'walk', true, z.runner ? 1.1 : .9);
        }
        const corpses = this.zombies.filter(z => z.life === 'dead').sort((a, b) => a.corpse - b.corpse);
        for (let i = 0; i < corpses.length - 8; i++) {
            const z = corpses[i];
            z.life = 'pooled';
            z.root.setEnabled(false);
            z.current?.stop();
        }
    }
    render(alpha: number) {
        for (const z of this.zombies)
            if (z.life === 'alive')
                z.root.position.set(z.previous.x + (z.position.x - z.previous.x) * alpha, z.previousAltitude + (z.altitude - z.previousAltitude) * alpha, z.previous.z + (z.position.z - z.previous.z) * alpha);
    }
    hit(origin: Vector3, direction: Vector3, max: number) {
        let best = max, result: {
            zombie: Zombie;
            distance: number;
            head: boolean;
        } | null = null;
        for (const z of this.zombies) {
            if (z.life !== 'alive')
                continue;
            const p = z.position, h = z.head?.getAbsolutePosition();
            const head = raySphere(origin.x, origin.y, origin.z, direction.x, direction.y, direction.z, h?.x ?? p.x, h?.y ?? 1.63, h?.z ?? p.z, z.kind === 'flyer' ? .18 : .22);
            let body = Infinity;
            const scale = z.kind === 'flyer' ? .68 : 1;
            const top = z.altitude + 1.25 * scale;
            for (const height of [.5 * scale + z.altitude, .82 * scale + z.altitude, 1.08 * scale + z.altitude, top])
                body = Math.min(body, raySphere(origin.x, origin.y, origin.z, direction.x, direction.y, direction.z, p.x, height, p.z, z.kind === 'flyer' ? .22 : .27));
            const d = Math.min(head, body);
            if (d < best) {
                best = d;
                result = {
                    zombie: z, distance: d, head: head <= body
                };
            }
        }
        return result;
    }
    melee(origin: Point, yaw: number) {
        let best = 1.5, result: Zombie | undefined;
        for (const z of this.zombies) {
            if (z.life !== 'alive')
                continue;
            const dx = z.position.x - origin.x, dz = z.position.z - origin.z, d = Math.hypot(dx, dz);
            if (d > best || d === 0 || (z.kind === 'flyer' && Math.abs(z.altitude + .9 - 1.3) > .65))
                continue;
            if ((dx * Math.sin(yaw) + dz * Math.cos(yaw)) / d < .6 || !this.grid.lineClear(origin, z.position))
                continue;
            best = d;
            result = z;
        }
        return result;
    }
    damage(z: Zombie, amount: number, head: boolean, run: RunRules) {
        if (z.life !== 'alive')
            return false;
        z.health -= amount;
        if (z.health <= 0) {
            z.life = 'dead';
            z.corpse = 6;
            z.root.position.set(z.position.x, z.altitude, z.position.z);
            this.animate(z, Math.random() < .5 ? 'dead1' : 'dead2', false);
            run.kill(head);
            return true;
        }
        z.hurt = .25;
        this.animate(z, 'hurt', false, 2.4);
        return false;
    }
    async warm() {
        const z = this.zombies[0];
        z.root.setEnabled(true);
        for (const wing of z.wings)
            wing.setEnabled(true);
        await Promise.all(z.meshes.map(m => m.material?.forceCompilationAsync(m)));
        for (const wing of z.wings)
            wing.setEnabled(false);
        z.root.setEnabled(false);
    }
}
