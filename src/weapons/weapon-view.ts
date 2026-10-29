import { Scene, SceneLoader, TransformNode, Vector3, UniversalCamera, AnimationGroup, Mesh, Color3, StandardMaterial, MeshBuilder, AssetContainer } from '@babylonjs/core';
import '@babylonjs/loaders/glTF';
import { WEAPONS, type WeaponId, WeaponRules } from './weapon-rules.ts';
import { attachViewFrame, createWeaponArt, type AuthoredWeaponId, type WeaponArt } from './weapon-art.ts';
type SourceId = 'rifle' | 'pistol' | 'knife';
type Model = {
    pivot: TransformNode;
    groups: AnimationGroup[];
    current?: AnimationGroup;
    base: Vector3;
    aim: Vector3;
    muzzle: TransformNode;
    kind: string;
    actionRemaining: number;
    actionDuration: number;
    shotAge: number;
    aimBlend: number;
    art?: WeaponArt;
};
type ViewConfig = {
    source: SourceId;
    scale: number;
    base: [
        number,
        number,
        number
    ];
    aim: [
        number,
        number,
        number
    ];
};
export const WEAPON_VIEW_CONFIG: Record<WeaponId, ViewConfig> = {
    pistol: {
        source: 'pistol', scale: 1.55, base: [.08, -.28, -.10], aim: [-.16, .04, 0]
    },
    knife: {
        source: 'knife', scale: 1, base: [0, -.04, .62], aim: [0, 0, 0]
    },
    rifle: {
        source: 'rifle', scale: .8, base: [.2, -.5, .3], aim: [-.28, .19, .08]
    },
    smg: {
        source: 'rifle', scale: .8, base: [.2, -.5, .3], aim: [-.28, .18, .08]
    },
    heavySmg: {
        source: 'rifle', scale: .8, base: [.2, -.5, .3], aim: [-.28, .13, .08]
    },
    shotgun: {
        source: 'rifle', scale: .8, base: [.2, -.5, .3], aim: [-.28, .19, .08]
    },
    leverShotgun: {
        source: 'rifle', scale: .8, base: [.2, -.5, .3], aim: [-.28, .19, .08]
    },
    autoShotgun: {
        source: 'rifle', scale: .8, base: [.2, -.5, .3], aim: [-.28, .14, .08]
    },
    plasmaRifle: {
        source: 'rifle', scale: .8, base: [.2, -.5, .3], aim: [-.28, .15, .08]
    },
};
export class WeaponView {
    models = new Map<WeaponId, Model>();
    recoil = 0;
    private flash: Mesh;
    private flashTime = 0;
    private equipped: WeaponId = 'pistol';
    private sources = new Map<SourceId, AssetContainer>();
    constructor(private scene: Scene, private camera: UniversalCamera) {
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
        // Load the three local source assets once; derived guns share their rig and textures.
        await Promise.all((['rifle', 'pistol', 'knife'] as const).map(async (source) => {
            const container = await SceneLoader.LoadAssetContainerAsync('/assets/', source + '.glb', this.scene);
            for (const g of container.animationGroups)
                g.stop();
            this.sources.set(source, container);
            progress();
        }));
        for (const id of Object.keys(WEAPON_VIEW_CONFIG) as WeaponId[]) {
            const cfg = WEAPON_VIEW_CONFIG[id], entry = this.sources.get(cfg.source)!.instantiateModelsToScene(n => id + '::' + n, false, {
                doNotInstantiate: true
            });
            for (const g of entry.animationGroups)
                g.stop();
            const pivot = new TransformNode(id + '-view', this.scene);
            pivot.parent = this.camera;
            for (const root of entry.rootNodes) {
                root.parent = pivot;
                if (root instanceof TransformNode)
                    root.scaling.scaleInPlace(cfg.scale);
            }
            const base = Vector3.FromArray(cfg.base);
            pivot.position.copyFrom(base);
            const muzzle = new TransformNode(id + '-muzzle-anchor', this.scene);
            const model: Model = {
                pivot, groups: entry.animationGroups, base, aim: Vector3.FromArray(cfg.aim), muzzle, kind: '', actionRemaining: 0, actionDuration: 0, shotAge: -1, aimBlend: 0
            };
            this.models.set(id, model);
            this.play(id, 'idle', true, undefined, true);
            pivot.computeWorldMatrix(true);
            for (const n of pivot.getChildTransformNodes())
                n.computeWorldMatrix(true);
            const nodes = pivot.getChildTransformNodes(), body = nodes.find(n => /PBody_058$/.test(n.name)), authored = cfg.source === 'rifle' && id !== 'rifle';
            for (const m of pivot.getChildMeshes()) {
                m.isPickable = false;
                m.renderingGroupId = 2;
                m.alwaysSelectAsActiveMesh = true;
                m.applyFog = false;
                if (authored && !m.material?.name.toLowerCase().includes('arms'))
                    m.isVisible = false;
            }
            if (authored) {
                const mag = nodes.find(n => /Pmag_062$/.test(n.name));
                if (!body || !mag)
                    throw new Error('Local rifle rig is missing its weapon attachment bones.');
                model.art = createWeaponArt(id as AuthoredWeaponId, this.scene, pivot, body, mag);
                model.muzzle.dispose();
                model.muzzle = model.art.muzzle;
            }
            else if (body)
                attachViewFrame(muzzle, body, pivot, id === 'pistol' ? new Vector3(.0775, .215, .801) : new Vector3(.09, .27, 1.57));
            else
                muzzle.parent = pivot;
            pivot.setEnabled(false);
        }
        this.equip('pistol');
    }
    private find(id: WeaponId, kind: string) {
        const m = this.models.get(id)!;
        if (id === 'knife')
            return m.groups.find(g => /Knife_Attack$/i.test(g.name)) ?? m.groups.find(g => /attack/i.test(g.name));
        const patterns: Record<string, RegExp> = {
            idle: /idle$/i, walk: /walk$/i, run: /run$/i, fire: /shot$|fire$/i, reload: /reload(?:_easy)?$/i, draw: /draw$|take$/i
        };
        return m.groups.find(g => (patterns[kind] ?? patterns.idle).test(g.name));
    }
    play(id: WeaponId, kind: string, loop = false, duration?: number, force = false) {
        const m = this.models.get(id)!, g = this.find(id, kind);
        if (!g)
            return;
        if (!force && m.kind === kind && m.current === g && (g.isPlaying || id === 'knife' && kind === 'idle'))
            return;
        for (const a of m.groups)
            a.stop();
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
            m.shotAge = -1;
            m.art?.reset();
        }
        this.equipped = id;
        const m = this.models.get(id)!;
        m.aimBlend = 0;
        m.pivot.position.copyFrom(m.base);
        m.pivot.rotation.setAll(0);
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
        this.play(id, 'fire', false, id === 'knife' ? .65 : undefined, true);
        m.actionRemaining = id === 'knife' ? .65 : Math.max(.13, Math.min(.5, WEAPONS[id].interval));
        m.actionDuration = m.actionRemaining;
        m.shotAge = 0;
        if (id !== 'knife') {
            this.recoil += id === 'pistol' ? .018 : id === 'shotgun' || id === 'leverShotgun' ? .026 : id === 'plasmaRifle' ? .009 : .013;
            this.flashTime = .035;
            (this.flash.material as StandardMaterial).emissiveColor = id === 'plasmaRifle' ? new Color3(.17, .85, 1) : new Color3(1, .68, .2);
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
        m.shotAge = -1;
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
        m.actionRemaining = Math.max(0, m.actionRemaining - dt);
        if (m.shotAge >= 0) {
            m.shotAge += dt;
            if (m.shotAge > .65)
                m.shotAge = -1;
        }
        if (m.actionRemaining === 0 && !state.reloading) {
            const kind = state.current !== 'knife' && sprinting && this.find(state.current, 'run') ? 'run' : state.current !== 'knife' && moving && this.find(state.current, 'walk') ? 'walk' : 'idle';
            this.play(state.current, kind, true);
        }
        // Keep reload framing independent of ADS: preserve the authored grip and move the whole rig.
        const reloading = state.reloading || m.kind === 'reload' && m.actionRemaining > 0;
        m.aimBlend += ((aiming && !reloading && state.current !== 'knife' ? 1 : 0) - m.aimBlend) * (1 - Math.exp(-dt * 14));
        const progress = reloading && m.actionDuration > 0 ? Math.min(1, 1 - m.actionRemaining / m.actionDuration) : 0, reloadDip = reloading ? Math.sin(progress * Math.PI) : 0;
        const sway = reducedMotion ? 0 : Math.sin(time * 1.6) * .002, pistolReload = state.current === 'pistol' && reloading;
        m.pivot.position.set(m.base.x + m.aim.x * m.aimBlend - (pistolReload ? .025 * reloadDip : 0), m.base.y + m.aim.y * m.aimBlend + sway - (pistolReload ? .42 * reloadDip : 0), m.base.z + m.aim.z * m.aimBlend + this.recoil * 1.5 + (pistolReload ? .38 * reloadDip : 0));
        m.pivot.rotation.x = this.recoil * (reducedMotion ? 1 : 2);
        m.pivot.rotation.z = reducedMotion ? 0 : Math.sin(time * 1.2) * .003;
        if (m.art?.kind === 'leverShotgun' && m.shotAge >= 0) {
            const cycle = Math.sin(Math.min(1, m.shotAge / .48) * Math.PI);
            m.pivot.rotation.z -= cycle * .16;
            m.pivot.rotation.x -= cycle * .12;
        }
        m.art?.update(m.shotAge, progress, reloading);
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
