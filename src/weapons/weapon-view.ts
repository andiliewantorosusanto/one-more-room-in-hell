import { Scene, SceneLoader, TransformNode, Vector3, UniversalCamera, AnimationGroup, Mesh, Color3, StandardMaterial, MeshBuilder, Quaternion, Matrix } from '@babylonjs/core';
import '@babylonjs/loaders/glTF';
import { WEAPONS, weaponSway, type WeaponId, WeaponRules } from './weapon-rules.ts';
import { sourcePack, SOURCE_ROOT } from '../world/source-map.ts';
type Model = {
    pivot: TransformNode;
    groups: AnimationGroup[];
    current?: AnimationGroup;
    previous?: AnimationGroup;
    transition?: number;
    base: Vector3;
    aim: Vector3;
    muzzle: TransformNode;
    kind: string;
    actionRemaining: number;
    actionDuration: number;
    aimBlend: number;
    sights?: { rear: TransformNode; front: TransformNode };
    sightRotation?: Quaternion;
};
export class WeaponView {
    models = new Map<WeaponId, Model>();
    recoil = 0;
    sway = { yaw: 0, pitch: 0 };
    private swayRoot: TransformNode;
    private flash: Mesh;
    private flashTime = 0;
    private equipped: WeaponId = 'pistol';
    constructor(private scene: Scene, camera: UniversalCamera) {
        this.swayRoot = new TransformNode('breathing-and-aim-sway', scene);
        this.swayRoot.parent = camera;
        const mat = new StandardMaterial('muzzle', scene);
        mat.emissiveColor = new Color3(1, .68, .2);
        mat.disableLighting = true;
        mat.alpha = .9;
        mat.backFaceCulling = false;
        this.flash = MeshBuilder.CreatePlane('flash', {
            size: .12
        }, scene);
        this.flash.material = mat;
        this.flash.parent = camera;
        this.flash.renderingGroupId = 2;
        this.flash.isPickable = false;
        this.flash.applyFog = false;
        this.flash.setEnabled(false);
    }
    async load(progress: () => void) {
        for (const id of Object.keys(WEAPONS) as WeaponId[]) {
            const container = await SceneLoader.LoadAssetContainerAsync(SOURCE_ROOT, sourcePack.weapons[id] + '.glb', this.scene).catch(() => { throw new Error('Cannot load ' + SOURCE_ROOT + sourcePack.weapons[id] + '.glb'); });
            container.addAllToScene();
            const pivot = new TransformNode(id + '-source-view', this.scene);
            pivot.parent = this.swayRoot;
            for (const root of container.rootNodes) root.parent = pivot;
            for (const group of container.animationGroups) group.stop();
            const base = id === 'knife' ? new Vector3(-.14, .02, .18) : new Vector3(0, -.05, 0), muzzle = new TransformNode(id + '-muzzle-anchor', this.scene);
            muzzle.parent = pivot; muzzle.position.set(.1, -.12, .65);
            const model: Model = { pivot, groups: container.animationGroups, base, aim: new Vector3(-.1, .12, .02), muzzle, kind: '', actionRemaining: 0, actionDuration: 0, aimBlend: 0 };
            this.models.set(id, model);
            this.play(id, 'idle', true, undefined, true);
            model.current?.goToFrame(model.current.from);
            for (const mesh of pivot.getChildMeshes()) {
                mesh.isPickable = false; mesh.renderingGroupId = 2; mesh.alwaysSelectAsActiveMesh = true; mesh.applyFog = false;
            }
            pivot.computeWorldMatrix(true);
            for (const node of pivot.getChildTransformNodes()) node.computeWorldMatrix(true);
            for (const skeleton of container.skeletons) skeleton.prepare(true);
            const attachment = pivot.getChildTransformNodes().find(n => n.name === 'attach_muzzle');
            if (attachment) { muzzle.parent = attachment; muzzle.position.setAll(0); }
            if (id !== 'knife') {
                const inverse = Matrix.Invert(pivot.getWorldMatrix());
                const tip = Vector3.TransformCoordinates(muzzle.getAbsolutePosition(), inverse);
                const points: Vector3[] = [];
                for (const mesh of pivot.getChildMeshes()) {
                    if (mesh.material?.name.includes('bill_color')) continue;
                    const positions = mesh.getPositionData(true, true);
                    if (!positions) continue;
                    const transform = mesh.getWorldMatrix().multiply(inverse);
                    for (let i = 0; i < positions.length; i += 3) points.push(Vector3.TransformCoordinates(Vector3.FromArray(positions, i), transform));
                }
                const long = ['rifle', 'plasmaRifle', 'shotgun', 'leverShotgun', 'autoShotgun'].includes(id);
                const rearZ = tip.z - (long ? .59 : .21), frontZ = tip.z - (long ? .13 : .035);
                const top = (z: number) => {
                    const band = points.filter(p => Math.abs(p.z - z) < .035 && Math.abs(p.x - tip.x) < .055);
                    const y = Math.max(...band.map(p => p.y));
                    const tips = band.filter(p => p.y >= y - .004);
                    return tips.length ? new Vector3(tips.reduce((sum, p) => sum + p.x, 0) / tips.length, y, tips.reduce((sum, p) => sum + p.z, 0) / tips.length) : new Vector3(tip.x, tip.y + .04, z);
                };
                // The P220's highest receiver vertex is above the rear notch;
                // use its measured sight plane rather than rotating toward that vertex.
                const rearPoint = id === 'pistol' ? new Vector3(.125, -.095, .35) : top(rearZ);
                const frontPoint = id === 'pistol' ? new Vector3(.125, -.095, .525) : top(frontZ);
                const rear = new TransformNode(id + '-native-rear-sight', this.scene), front = new TransformNode(id + '-native-front-sight', this.scene);
                rear.parent = front.parent = pivot;
                rear.position.copyFrom(rearPoint); front.position.copyFrom(frontPoint);
                model.sights = { rear, front };
                const direction = frontPoint.subtract(rearPoint).normalize();
                model.sightRotation = Quaternion.FromUnitVectorsToRef(direction, Vector3.Forward(), Quaternion.Identity());
                const aligned = rearPoint.applyRotationQuaternion(model.sightRotation);
                model.aim.set(-aligned.x - base.x, -aligned.y - base.y, (id === 'pistol' ? .7 : .28) - aligned.z - base.z);
            }
            pivot.setEnabled(false); progress();
        }
        this.equip('pistol');
    }
    private find(id: WeaponId, kind: string) {
        const m = this.models.get(id)!;
        return m.groups.find(g => g.name === kind);
    }
    play(id: WeaponId, kind: string, loop = false, duration?: number, force = false) {
        const m = this.models.get(id)!, g = this.find(id, kind);
        if (!g)
            return;
        if (!force && m.kind === kind && m.current === g && (g.isPlaying || kind === 'idle' && (m.aimBlend > .01 || id === 'knife')))
            return;
        m.previous?.stop();
        m.previous = m.current?.isPlaying && m.current !== g ? m.current : undefined;
        for (const a of m.groups) if (a !== m.previous) a.stop();
        m.current = g;
        m.kind = kind;
        if (id === 'knife' && kind === 'idle') {
            // A stopped attack is not an idle pose. Evaluate its authored first frame before visibility.
            g.start(false);
            g.goToFrame(g.from);
            g.pause();
            return;
        }
        const shell = kind === 'reload' && WEAPONS[id].reloadStyle === 'shell';
        const from = g.from + (shell ? .22 : 0) * (g.to - g.from), to = g.from + (shell ? .62 : 1) * (g.to - g.from);
        g.start(loop, duration ? g.getLength() * (shell ? .40 : 1) / duration : 1, from, to);
        g.goToFrame(from);
        if (m.previous) { m.transition = 0; g.setWeightForAllAnimatables(0); m.previous.setWeightForAllAnimatables(1); }
        else g.setWeightForAllAnimatables(1);
    }
    equip(id: WeaponId) {
        if (!this.models.has(id))
            return;
        for (const m of this.models.values()) {
            m.pivot.setEnabled(false);
            for (const g of m.groups)
                g.stop();
            m.kind = '';
            m.actionRemaining = 0;
        }
        this.equipped = id;
        const m = this.models.get(id)!;
        m.aimBlend = 0;
        m.pivot.position.copyFrom(m.base);
        m.pivot.rotation.setAll(0);
        if (m.sightRotation) m.pivot.rotationQuaternion = Quaternion.Identity();
        this.play(id, 'idle', true, undefined, true);
        m.pivot.setEnabled(true);
        this.flash.parent = m.muzzle;
        this.flash.position.setAll(0);
        this.flash.rotation.setAll(0);
        this.flashTime = 0;
        this.flash.setEnabled(false);
    }
    attack(id: WeaponId) {
        const m = this.models.get(id);
        if (!m)
            return;
        this.play(id, 'fire', false, id === 'knife' ? .65 : Math.max(.13, Math.min(.5, WEAPONS[id].interval)), true);
        m.actionRemaining = id === 'knife' ? .65 : Math.max(.13, Math.min(.5, WEAPONS[id].interval));
        m.actionDuration = m.actionRemaining;
        if (id !== 'knife') {
            this.recoil += id === 'pistol' ? .018 : id === 'shotgun' || id === 'leverShotgun' ? .026 : id === 'plasmaRifle' ? .009 : .013;
            this.flashTime = .035;
            (this.flash.material as StandardMaterial).emissiveColor = new Color3(1, .68, .2);
            this.flash.scaling.setAll(id === 'pistol' ? .65 : id.includes('Shotgun') || id === 'shotgun' ? 1.25 : 1);
        }
    }
    reload(id: WeaponId) {
        const m = this.models.get(id);
        if (!m || id === 'knife')
            return;
        this.play(id, 'reload', false, WEAPONS[id].reload, true);
        m.actionDuration = WEAPONS[id].reload;
        m.actionRemaining = m.actionDuration;
    }
    update(dt: number, state: WeaponRules, moving: boolean, sprinting: boolean, aiming: boolean, time: number, reducedMotion = false) {
        this.recoil *= Math.exp(-dt * 15);
        this.flashTime -= dt;
        this.flash.setEnabled(this.flashTime > 0);
        if (state.current !== this.equipped)
            this.equip(state.current);
        const m = this.models.get(state.current);
        if (!m)
            return;
        if (m.previous) {
            m.transition = Math.min(1, (m.transition ?? 0) + dt / .08);
            m.current?.setWeightForAllAnimatables(m.transition);
            m.previous.setWeightForAllAnimatables(1 - m.transition);
            if (m.transition === 1) { m.previous.stop(); m.previous = undefined; }
        }
        m.actionRemaining = Math.max(0, m.actionRemaining - dt);
        if (m.actionRemaining === 0 && !state.reloading) {
            const kind = state.current !== 'knife' && sprinting && this.find(state.current, 'run') ? 'run' : state.current !== 'knife' && moving && this.find(state.current, 'walk') ? 'walk' : 'idle';
            this.play(state.current, kind, true);
        }
        // Keep reload framing independent of ADS: preserve the authored grip and move the whole rig.
        const reloading = state.reloading || m.kind === 'reload' && m.actionRemaining > 0;
        m.aimBlend += ((aiming && !reloading && state.current !== 'knife' ? 1 : 0) - m.aimBlend) * (1 - Math.exp(-dt * 14));
        this.sway = weaponSway(time, m.aimBlend, moving, reducedMotion);
        this.swayRoot.rotation.set(this.sway.pitch, this.sway.yaw, 0);
        if (m.aimBlend > .95 && m.kind === 'idle' && m.current) {
            m.current.goToFrame(m.current.from);
            m.current.pause();
        }
        const progress = reloading && m.actionDuration > 0 ? Math.min(1, 1 - m.actionRemaining / m.actionDuration) : 0, reloadDip = reloading ? Math.sin(progress * Math.PI) : 0;
        const sway = reducedMotion ? 0 : Math.sin(time * 1.6) * .004 * (1 - m.aimBlend), pistolReload = state.current === 'pistol' && reloading;
        m.pivot.position.set(m.base.x + m.aim.x * m.aimBlend - (pistolReload ? .025 * reloadDip : 0), m.base.y + m.aim.y * m.aimBlend + sway - (pistolReload ? .42 * reloadDip : 0), m.base.z + m.aim.z * m.aimBlend + this.recoil * 1.5 + (pistolReload ? .38 * reloadDip : 0));
        m.pivot.rotation.x = this.recoil * (reducedMotion ? 1 : 2);
        m.pivot.rotation.z = reducedMotion ? 0 : Math.sin(time * 1.2) * .006 * (1 - m.aimBlend);
        if (m.sightRotation) {
            m.pivot.rotationQuaternion = Quaternion.Slerp(Quaternion.Identity(), m.sightRotation, m.aimBlend)
                .multiply(Quaternion.RotationYawPitchRoll(0, m.pivot.rotation.x, m.pivot.rotation.z));
        }
    }
    async warm() {
        for (const m of this.models.values()) {
            m.pivot.setEnabled(true);
            await Promise.all(m.pivot.getChildMeshes().filter(mesh => mesh.isVisible).map(mesh => mesh.material?.forceCompilationAsync(mesh)));
            m.pivot.setEnabled(false);
        }
        this.equip(this.equipped);
    }
}
