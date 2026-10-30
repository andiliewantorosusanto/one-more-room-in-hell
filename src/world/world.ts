import { Scene, Mesh, Vector3, Color3, Color4, PBRMaterial, HemisphericLight, PointLight, SpotLight, SceneLoader, Ray, TransformNode, Quaternion, Light, type Material } from '@babylonjs/core';
import { WorldGrid } from './navigation.ts';
import { SOURCE_ROOT, sourcePack } from './source-map.ts';
export type Quality = 'low' | 'medium' | 'high';
export class LevelWorld {
    private sourceLights: PointLight[] = [];
    private tick = 0;
    private hemi: HemisphericLight;
    flashlight: SpotLight;
    constructor(private scene: Scene, public grid: WorldGrid) {
        scene.clearColor = new Color4(.025, .033, .03, 1);
        scene.fogMode = Scene.FOGMODE_EXP2;
        scene.fogColor = new Color3(.035, .05, .04);
        scene.skipPointerMovePicking = true;
        scene.imageProcessingConfiguration.exposure = 1.1;
        scene.imageProcessingConfiguration.contrast = 1.15;
        this.hemi = new HemisphericLight('ambient fill', new Vector3(.1, 1, .2), scene);
        this.flashlight = new SpotLight('flashlight', new Vector3(0, 1.5, 0), new Vector3(0, 0, 1), 1.22, 1.4, scene);
        this.flashlight.range = 24;
    }
    async build(progress: () => void) {
        const container = await SceneLoader.LoadAssetContainerAsync(SOURCE_ROOT, 'hospital.glb', this.scene).catch(() => { throw new Error('Cannot load ' + SOURCE_ROOT + 'hospital.glb'); });
        const [x, z, y] = sourcePack.nav.origin;
        for (const root of container.rootNodes) if (root instanceof TransformNode) {
            root.rotationQuaternion = Quaternion.Identity();
            root.position.set(-x * .0254, -y * .0254, -z * .0254);
        }
        container.addAllToScene();
        const batches = new Map<Material, Mesh[]>();
        for (const mesh of [...container.meshes]) {
            if (!(mesh instanceof Mesh) || !mesh.material || mesh.getTotalVertices() === 0 || mesh.getClassName() !== 'Mesh') continue;
            const list = batches.get(mesh.material) ?? []; list.push(mesh); batches.set(mesh.material, list);
        }
        for (const list of batches.values()) if (list.length > 1) {
            const merged = Mesh.MergeMeshes(list, true, true, undefined, false, true);
            if (merged) container.meshes.push(merged);
        }
        const meshes = new Set(container.meshes);
        for (const material of container.materials) if (material instanceof PBRMaterial) material.maxSimultaneousLights = 6;
        for (const mesh of meshes) { mesh.isPickable = true; mesh.freezeWorldMatrix(); }
        this.grid.raycast = (origin, direction, max) => {
            const ray = new Ray(new Vector3(origin.x, origin.y ?? 1.65, origin.z), new Vector3(direction.x, direction.y ?? 0, direction.z), max);
            return this.scene.pickWithRay(ray, mesh => meshes.has(mesh))?.distance ?? max;
        };
        for (const data of sourcePack.lights) {
            if (Number(data.spawnflags ?? 0) & 1) continue;
            const [lx, lz, ly] = data.origin.trim().split(/\s+/).map(Number);
            const [r, g, b, power = 100] = (data._light ?? '220 225 230 100').trim().split(/\s+/).map(Number);
            const light = new PointLight('hospital-fixture-' + data.hammerid, new Vector3((lx - x) * .0254, (ly - y) * .0254, (lz - z) * .0254), this.scene);
            light.diffuse = new Color3(r / 255, g / 255, b / 255);
            light.intensity = Math.min(2, Math.max(.35, power / 130)); light.range = 11;
            light.falloffType = Light.FALLOFF_STANDARD;
            light.setEnabled(false); this.sourceLights.push(light);
        }
        this.hemi.intensity = .16;
        this.hemi.diffuse = new Color3(.72, .77, .82);
        this.hemi.groundColor = new Color3(.1, .12, .15);
        this.scene.fogDensity = .004;
        this.scene.ambientColor = new Color3(.12, .13, .15);
        this.flashlight.intensity = 1.5;
        this.flashlight.diffuse = new Color3(.94, .96, 1);
        progress();
    }
    update(dt: number, pos: Vector3, direction: Vector3) {
        this.flashlight.position.copyFrom(pos);
        this.flashlight.direction.copyFrom(direction);
        this.tick -= dt;
        if (this.tick > 0) return;
        this.tick = .2;
        const nearby = new Set(this.sourceLights.filter(l => Math.abs(l.position.y - pos.y) < 5).sort((a, b) => Vector3.DistanceSquared(a.position, pos) - Vector3.DistanceSquared(b.position, pos)).slice(0, 4));
        this.sourceLights.forEach(l => l.setEnabled(nearby.has(l)));
    }
}
