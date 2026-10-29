import { Scene, MeshBuilder, Mesh, Vector3, Vector4, Color3, Color4, PBRMaterial, Texture, StandardMaterial, DynamicTexture, HemisphericLight, PointLight, SpotLight, type AbstractMesh, type Material, type BaseTexture } from '@babylonjs/core';
import { WorldGrid, CELL, COLS, ROWS, type Point } from './navigation.ts';
export type Quality = 'low' | 'medium' | 'high';
export class LevelWorld {
    lights: PointLight[] = [];
    fixtures: Vector3[] = [];
    flashlight: SpotLight;
    materials: PBRMaterial[] = [];
    textures: Texture[] = [];
    private batches = new Map<PBRMaterial, Mesh[]>();
    private noise = 617;
    private tick = 0;
    private textureLoads: Promise<void>[] = [];
    private ownedMeshes: AbstractMesh[] = [];
    private ownedMaterials: Material[] = [];
    private ownedTextures: BaseTexture[] = [];
    private quality: Quality = 'medium';
    private hemi: HemisphericLight;
    constructor(private scene: Scene, public grid: WorldGrid) {
        scene.clearColor = new Color4(.025, .033, .03, 1);
        scene.fogMode = Scene.FOGMODE_EXP2;
        scene.fogDensity = .023;
        scene.fogColor = new Color3(.035, .05, .04);
        scene.ambientColor = new Color3(.25, .29, .26);
        scene.skipPointerMovePicking = true;
        scene.imageProcessingConfiguration.exposure = 1.1;
        scene.imageProcessingConfiguration.contrast = 1.15;
        const hemi = this.hemi = new HemisphericLight('ambient fill', new Vector3(.1, 1, .2), scene);
        hemi.intensity = .3;
        hemi.diffuse = new Color3(.71, .8, .73);
        hemi.groundColor = new Color3(.15, .18, .14);
        for (let i = 0; i < 2; i++) {
            const l = new PointLight('practical-' + i, Vector3.Zero(), scene);
            l.diffuse = new Color3(.8, .9, .66);
            l.intensity = 1.1;
            l.range = 8;
            this.lights.push(l);
        }
        this.flashlight = new SpotLight('flashlight', new Vector3(0, 1.5, 0), new Vector3(0, 0, 1), 1.22, 1.4, scene);
        this.flashlight.intensity = 2.8;
        this.flashlight.range = 24;
        this.flashlight.diffuse = new Color3(.9, .91, .78);
    }
    private random() {
        this.noise = (Math.imul(this.noise, 1664525) + 1013904223) | 0;
        return (this.noise >>> 0) / 4294967296;
    }
    private texture(url: string) {
        let done!: () => void, fail!: (error: Error) => void;
        this.textureLoads.push(new Promise<void>((resolve, reject) => {
            done = resolve;
            fail = reject;
        }));
        return new Texture(url, this.scene, false, true, Texture.TRILINEAR_SAMPLINGMODE, done, message => fail(new Error(message || `Missing texture: ${url}`)));
    }
    private material(name: string, color: Color3, texture?: string) {
        const m = new PBRMaterial(name, this.scene);
        m.albedoColor = color;
        m.metallic = 0;
        m.roughness = .88;
        m.maxSimultaneousLights = 4;
        if (texture) {
            m.albedoTexture = this.texture(`/assets/textures/${texture}-color.jpg`);
            m.bumpTexture = this.texture(`/assets/textures/${texture}-normal.jpg`);
            m.bumpTexture.level = .55;
            m.metallicTexture = this.texture(`/assets/textures/${texture}-roughness.jpg`);
            m.useRoughnessFromMetallicTextureAlpha = false;
            m.useRoughnessFromMetallicTextureGreen = true;
            for (const t of [m.albedoTexture, m.bumpTexture, m.metallicTexture])
                this.textures.push(t as Texture);
        }
        this.materials.push(m);
        return m;
    }
    private box(name: string, x: number, y: number, z: number, w: number, h: number, d: number, mat: PBRMaterial, uvScale = 1) {
        const mesh = MeshBuilder.CreateBox(name, {
            width: w, height: h, depth: d, faceUV: Array.from({
                length: 6
            }, () => new Vector4(0, 0, uvScale, uvScale))
        }, this.scene);
        mesh.position.set(x, y, z);
        mesh.material = mat;
        mesh.isPickable = false;
        if (!this.batches.has(mat))
            this.batches.set(mat, []);
        this.batches.get(mat)!.push(mesh);
        return mesh;
    }
    private cylinder(x: number, y: number, z: number, h: number, d: number, mat: PBRMaterial, rotationZ = 0) {
        const m = MeshBuilder.CreateCylinder('tube', {
            height: h, diameter: d, tessellation: 8
        }, this.scene);
        m.position.set(x, y, z);
        m.rotation.z = rotationZ;
        m.material = mat;
        m.isPickable = false;
        if (!this.batches.has(mat))
            this.batches.set(mat, []);
        this.batches.get(mat)!.push(m);
        return m;
    }
    private sign(text: string, sub: string, p: Vector3, yaw = 0, width = 2.4, color = '#c9d0aa') {
        const dt = new DynamicTexture('sign ' + text, {
            width: 768, height: 192
        }, this.scene, false);
        const c = dt.getContext();
        const industrial = this.grid.map.theme === 'industrial';
        c.fillStyle = industrial ? '#29221b' : '#1d2c26';
        c.fillRect(0, 0, 768, 192);
        c.fillStyle = industrial && color === '#c9d0aa' ? '#e2b96f' : color;
        c.fillRect(0, 0, 9, 192);
        c.font = 'bold 52px Arial';
        c.fillText(text, 34, 87);
        c.font = '21px Arial';
        c.fillStyle = industrial ? '#b9aa90' : '#a8b4a4';
        c.fillText(sub, 36, 140);
        dt.update();
        const mat = new StandardMaterial('sign', this.scene);
        mat.diffuseTexture = dt;
        mat.emissiveColor = industrial ? new Color3(.3, .23, .13) : new Color3(.25, .28, .2);
        mat.specularColor = Color3.Black();
        const plane = MeshBuilder.CreatePlane('sign', {
            width, height: width / 4
        }, this.scene);
        plane.position.copyFrom(p);
        plane.rotation.y = yaw;
        plane.material = mat;
        plane.isPickable = false;
    }
    private stainTexture() {
        const dt = new DynamicTexture('blood and damp', {
            width: 256, height: 256
        }, this.scene, false);
        const c = dt.getContext();
        c.clearRect(0, 0, 256, 256);
        for (let i = 0; i < 45; i++) {
            const x = 128 + (this.random() - .5) * 210, y = 128 + (this.random() - .5) * 190, r = 2 + this.random() * 22;
            c.fillStyle = `rgba(37,9,6,${.07 + this.random() * .25})`;
            c.beginPath();
            (c as CanvasRenderingContext2D).ellipse(x, y, r, r * .45, this.random() * 6, 0, Math.PI * 2);
            c.fill();
        }
        dt.hasAlpha = true;
        dt.update();
        return dt;
    }
    async rebuild(progress: () => void) {
        // Other systems retain ownership of enemies, weapons and objectives.
        for (const mesh of this.ownedMeshes)
            mesh.dispose(true, false);
        for (const material of this.ownedMaterials)
            material.dispose(false, false);
        for (const texture of this.ownedTextures)
            texture.dispose();
        this.ownedMeshes = [];
        this.ownedMaterials = [];
        this.ownedTextures = [];
        this.materials = [];
        this.textures = [];
        this.batches.clear();
        this.fixtures = [];
        this.textureLoads = [];
        this.noise = 617;
        this.tick = 0;
        await this.build(progress);
    }
    async build(progress: () => void) {
        const meshesBefore = new Set(this.scene.meshes);
        const materialsBefore = new Set([...this.scene.materials, ...this.scene.multiMaterials]);
        const texturesBefore = new Set(this.scene.textures);
        try {
            const industrial = this.grid.map.theme === 'industrial';
            this.scene.clearColor = industrial ? new Color4(.035, .028, .021, 1) : new Color4(.025, .033, .03, 1);
            this.scene.fogColor = industrial ? new Color3(.06, .044, .028) : new Color3(.035, .05, .04);
            this.scene.ambientColor = industrial ? new Color3(.29, .25, .2) : new Color3(.25, .29, .26);
            this.hemi.diffuse = industrial ? new Color3(.8, .73, .61) : new Color3(.71, .8, .73);
            this.hemi.groundColor = industrial ? new Color3(.18, .14, .1) : new Color3(.15, .18, .14);
            for (const light of this.lights)
                light.diffuse = industrial ? new Color3(1, .64, .28) : new Color3(.8, .9, .66);
            this.flashlight.diffuse = industrial ? new Color3(.95, .87, .73) : new Color3(.9, .91, .78);
            const plaster = this.material(industrial ? 'smoke stained concrete' : 'old plaster', industrial ? new Color3(.45, .43, .37) : new Color3(.74, .76, .67), 'plaster');
            const paint = this.material(industrial ? 'rusted steel cladding' : 'institutional green', industrial ? new Color3(.48, .3, .17) : new Color3(.3, .44, .35), industrial ? 'metal' : 'plaster');
            const floor = this.material(industrial ? 'worn freight concrete' : 'worn ceramic', industrial ? new Color3(.4, .41, .37) : new Color3(.66, .72, .62), industrial ? 'plaster' : 'tiles');
            const ceiling = this.material(industrial ? 'warehouse roof' : 'ceiling', industrial ? new Color3(.18, .16, .13) : new Color3(.27, .3, .25));
            const trim = this.material(industrial ? 'oxidized structural steel' : 'dark steel', industrial ? new Color3(.23, .15, .095) : new Color3(.1, .14, .12), 'metal');
            trim.metallic = .35;
            const fabric = this.material(industrial ? 'weathered cargo panels' : 'stained mattress', industrial ? new Color3(.53, .37, .2) : new Color3(.63, .64, .48), 'plaster');
            const white = this.material(industrial ? 'faded freight markings' : 'enamel', industrial ? new Color3(.75, .53, .2) : new Color3(.6, .63, .55));
            const red = this.material('emergency red', new Color3(.28, .035, .022));
            const glow = this.material(industrial ? 'amber work lamps' : 'fluorescent', industrial ? new Color3(.68, .38, .12) : new Color3(.5, .6, .4));
            glow.emissiveColor = industrial ? new Color3(1, .57, .16) : new Color3(.82, .93, .63);
            const black = this.material('monitor glass', new Color3(.015, .035, .025));
            black.emissiveColor = industrial ? new Color3(.16, .09, .025) : new Color3(.03, .16, .10);
            black.roughness = .25;
            const adjacent = (x: number, z: number) => [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dz]) => this.grid.walkable(x + dx, z + dz));
            for (let z = 0; z < ROWS; z++)
                for (let x = 0; x < COLS; x++) {
                    const p = this.grid.center(x, z), open = this.grid.walkable(x, z), prop = this.grid.propCells.has(z * COLS + x);
                    if (open || prop) {
                        this.box('floor', p.x, -.06, p.z, CELL, .12, CELL, floor);
                        this.box('ceiling', p.x, 3.25, p.z, CELL, .12, CELL, ceiling);
                    }
                    else if (adjacent(x, z)) {
                        this.box('lower wall', p.x, .54, p.z, CELL, 1.08, CELL, paint);
                        this.box('upper wall', p.x, 2.15, p.z, CELL, 2.14, CELL, plaster, 1.5);
                        this.box('skirting', p.x, .10, p.z, CELL + .018, .15, CELL + .018, trim);
                        this.box('wall rail', p.x, 1.09, p.z, CELL + .025, .055, CELL + .025, trim);
                    }
                }
            const leakTexture = this.texture('/assets/textures/leak.png');
            leakTexture.hasAlpha = true;
            const leakMat = new StandardMaterial('damp streaks', this.scene);
            leakMat.diffuseTexture = leakTexture;
            leakMat.useAlphaFromDiffuseTexture = true;
            leakMat.specularColor = Color3.Black();
            leakMat.alpha = .8;
            leakMat.backFaceCulling = false;
            for (let z = 1; z < ROWS - 1; z++)
                for (let x = 1; x < COLS - 1; x++) {
                    if (this.grid.walkable(x, z) || this.grid.propCells.has(z * COLS + x))
                        continue;
                    for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
                        if (!this.grid.walkable(x + dx, z + dz) || this.random() > .53)
                            continue;
                        const p = this.grid.center(x, z);
                        const plane = MeshBuilder.CreatePlane('leaking wall', {
                            width: CELL * (1 + this.random() * .6), height: 1.35 + this.random() * 1.25
                        }, this.scene);
                        plane.position.set(p.x + dx * (CELL / 2 + .007), 1.7 + this.random() * .25, p.z + dz * (CELL / 2 + .007));
                        plane.rotation.y = dx ? Math.PI / 2 : 0;
                        plane.material = leakMat;
                        plane.isPickable = false;
                    }
                }
            // Fluorescent housings, conduits and their local light pools.
            for (const [gx, gz] of [[13, 3], [13, 7], [13, 11], [13, 15], [13, 19], [3, 3], [3, 8], [3, 12], [3, 17], [23, 3], [23, 8], [23, 12], [23, 17], [8, 3], [18, 3], [8, 19], [18, 19], [8, 11], [18, 11]]) {
                const p = this.grid.center(gx, gz);
                this.box('light housing', p.x, 3.13, p.z, .5, .12, 1.35, trim);
                for (const dx of [-.14, .14])
                    this.box('light tube', p.x + dx, 3.055, p.z, .07, .035, 1.18, glow);
                this.fixtures.push(new Vector3(p.x, 2.85, p.z));
            }
            for (const x of [-.85, .85]) {
                this.box('ceiling conduit', x, 3.08, 0, .045, .045, 25, trim);
            }
            // Cargo and hospital beds share the authored occupied footprints.
            for (const b of this.grid.obstacles) {
                const p = this.grid.center(b.x, b.z);
                p.x += CELL / 2;
                if (industrial) {
                    this.box('cargo pallet', p.x, .13, p.z, 2.18, .22, 1.08, trim);
                    this.box('freight crate', p.x, .74, p.z, 2.1, 1.0, 1.0, fabric);
                    this.box('stacked cargo', p.x - .5, 1.55, p.z, 1.04, .62, .96, paint);
                    for (const dx of [-.78, .78]) {
                        this.box('crate top strap', p.x + dx, 1.25, p.z, .055, .035, 1.02, trim);
                        for (const dz of [-.51, .51])
                            this.box('crate vertical strap', p.x + dx, .74, p.z + dz, .055, 1.04, .025, trim);
                    }
                    for (const dz of [-.53, .53])
                        this.box('pallet edge', p.x, .22, p.z + dz, 2.2, .06, .03, white);
                    continue;
                }
                this.box('bed base', p.x, .5, p.z, 2.05, .1, 1.02, trim);
                this.box('mattress', p.x, .69, p.z, 1.96, .24, .94, fabric);
                this.box('pillow', p.x - .7, .86, p.z, .37, .13, .78, white);
                for (const dx of [-.89, .89])
                    for (const dz of [-.43, .43]) {
                        this.cylinder(p.x + dx, .31, p.z + dz, .45, .055, trim);
                        this.box('caster', p.x + dx, .08, p.z + dz, .12, .14, .08, trim);
                    }
                for (const dx of [-1.03, 1.03]) {
                    for (const dz of [-.46, .46])
                        this.cylinder(p.x + dx, .84, p.z + dz, .66, .045, white);
                    this.cylinder(p.x + dx, 1.15, p.z, .94, .045, white, Math.PI / 2);
                }
                this.box('folded blanket', p.x + .4, .84, p.z, .75, .06, .96, paint);
                this.cylinder(p.x - .8, 1.2, p.z + .72, 2.2, .025, trim);
                this.box('IV bag', p.x - .8, 1.99, p.z + .72, .16, .32, .07, fabric);
            }
            if (industrial) {
                // Steelwork hugs walls and ceilings; occupied cells own cargo collision.
                for (const z of [-9, -4, 1, 6, 10]) {
                    this.box('roof cross beam', 0, 3.06, z, 6.2, .22, .16, trim);
                    for (const x of [-2.98, 2.98]) {
                        this.box('support column', x, 1.6, z, .12, 3.1, .15, trim);
                        this.box('column warning band', x, 1.0, z, .13, .25, .16, white);
                    }
                }
                for (const z of [-7, 4]) {
                    this.box('electrical enclosure', -3.02, 1.35, z, .15, 1.0, .75, paint);
                    this.box('breaker display', -2.93, 1.52, z, .025, .18, .35, black);
                    this.box('breaker warning label', -2.93, 1.15, z, .025, .12, .24, white);
                }
                this.sign('LOADING BAYS  →', 'BLACKWATER FREIGHT   /   TERMINAL 02', new Vector3(0, 2.55, 7.2), Math.PI, 3.0);
                this.sign('←  SORTING HALL', 'CARGO LANES   /   KEEP AISLES CLEAR', new Vector3(0, 2.55, -1.9), Math.PI, 3.0);
                this.sign('LOCKDOWN', 'SHUTTERS SEALED', new Vector3(3.11, 1.9, 5.8), -Math.PI / 2, 1.25, '#cf7c36');
                this.sign('DANGER', 'HIGH VOLTAGE', new Vector3(-3.11, 2.05, 3.0), Math.PI / 2, 1.0, '#cf7c36');
                for (const [gx, gz, label] of [[8, 6, 'A1'], [18, 6, 'A2'], [8, 14, 'B1'], [18, 14, 'B2']] as [
                    number,
                    number,
                    string
                ][]) {
                    const p = this.grid.center(gx, gz);
                    this.sign('CARGO ' + label, 'INBOUND / HOLD', new Vector3(p.x, 2.3, p.z - .62), Math.PI, 1.2);
                }
                for (const gx of [3, 23]) {
                    const p = this.grid.center(gx, 2);
                    for (let i = 0; i < 12; i++)
                        this.box('loading shutter rib', p.x, .15 + i * .22, p.z - CELL / 2 + .018, 3.45, .16, .035, paint);
                    this.sign('BAY ' + (gx === 3 ? '01' : '02'), 'NO DISPATCH / QUARANTINE', new Vector3(p.x, 2.95, p.z - CELL / 2 + .045), Math.PI, 2.0);
                }
            }
            else {
                // A reception desk and medical equipment tucked against the corridor walls.
                this.box('nurse station', -1.35, .55, 10.15, .68, 1.1, 2.0, paint);
                this.box('desk top', -1.35, 1.13, 10.15, .79, .08, 2.12, trim);
                this.box('monitor base', -1.27, 1.2, 9.95, .28, .05, .3, trim);
                this.box('monitor stand', -1.27, 1.4, 9.95, .04, .4, .04, trim);
                this.box('monitor', -1.27, 1.62, 9.95, .08, .4, .52, black);
                for (const z of [-8.5, 3.5]) {
                    this.box('cabinet', -1.65, 1.0, z, .4, 2, 1.05, white);
                    for (const y of [.25, .7, 1.2, 1.65])
                        this.box('drawer handle', -1.41, y, z, .035, .035, .23, trim);
                }
                this.box('biohazard bin', 1.6, .42, 7.3, .42, .84, .42, red);
                this.sign('SURGICAL WARD  →', 'LEVEL 01   /   RESTRICTED ACCESS', new Vector3(0, 2.55, 7.2), Math.PI, 2.7);
                this.sign('←  EMERGENCY', 'ISOLATION   /   WARDS 01—04', new Vector3(0, 2.55, -1.9), Math.PI, 2.7);
                this.sign('QUARANTINE', 'DO NOT BREAK THE SEAL', new Vector3(1.86, 1.9, 5.8), -Math.PI / 2, 1.2, '#b94b37');
                this.sign('04', 'PATIENT OBSERVATION', new Vector3(-1.86, 2.05, 3.0), Math.PI / 2, .7);
                for (const [gx, gz, n] of [[8, 6, '01'], [18, 6, '02'], [8, 14, '03'], [18, 14, '04']] as [
                    number,
                    number,
                    string
                ][]) {
                    const p = this.grid.center(gx, gz);
                    this.sign('WARD ' + n, 'NO VISITORS', new Vector3(p.x, 2.3, p.z - .62), Math.PI, 1.1);
                }
            }
            const bloodMat = new StandardMaterial('old blood', this.scene);
            bloodMat.diffuseTexture = this.stainTexture();
            bloodMat.diffuseTexture.hasAlpha = true;
            bloodMat.useAlphaFromDiffuseTexture = true;
            bloodMat.specularColor = Color3.Black();
            bloodMat.alpha = .65;
            bloodMat.backFaceCulling = false;
            for (let i = 0; i < 22; i++) {
                const x = 2 + Math.floor(this.random() * 23), z = 2 + Math.floor(this.random() * 19);
                if (!this.grid.walkable(x, z))
                    continue;
                const p = this.grid.center(x, z);
                const m = MeshBuilder.CreateGround('stain', {
                    width: 1.5 + this.random(), height: 1.2 + this.random()
                }, this.scene);
                m.position.set(p.x, .007, p.z);
                m.rotation.y = this.random() * 6;
                m.material = bloodMat;
                m.isPickable = false;
            }
            for (const [mat, list] of this.batches) {
                if (list.length) {
                    const merged = Mesh.MergeMeshes(list, true, true, undefined, false, true);
                    if (merged) {
                        merged.name = mat.name + ' architecture';
                        merged.freezeWorldMatrix();
                        merged.isPickable = false;
                    }
                }
            }
            this.batches.clear();
            this.setQuality(this.quality);
        }
        finally {
            // Capture before yielding to texture I/O: asynchronous enemy/weapon
            // imports must never enter the world's later disposal set.
            this.ownedMeshes.push(...this.scene.meshes.filter(mesh => !meshesBefore.has(mesh)));
            this.ownedMaterials.push(...[...this.scene.materials, ...this.scene.multiMaterials].filter(material => !materialsBefore.has(material)));
            // A first PBR material lazily creates scene-owned BRDF lookups.
            // Their creation during this build does not transfer their ownership.
            const sharedTextures = new Set([this.scene.environmentBRDFTexture, this.scene.environmentFuzzBRDFTexture, this.scene.environmentTexture]);
            this.ownedTextures.push(...this.scene.textures.filter(texture => !texturesBefore.has(texture) && !sharedTextures.has(texture)));
        }
        await Promise.all(this.textureLoads);
        progress();
    }
    update(dt: number, pos: Vector3, direction: Vector3) {
        this.flashlight.position.copyFrom(pos);
        this.flashlight.direction.copyFrom(direction);
        this.tick -= dt;
        if (this.tick > 0)
            return;
        this.tick = .2;
        const closest = [...this.fixtures].sort((a, b) => Vector3.DistanceSquared(a, pos) - Vector3.DistanceSquared(b, pos));
        for (let i = 0; i < this.lights.length; i++)
            if (closest[i])
                this.lights[i].position.copyFrom(closest[i]);
    }
    setQuality(q: Quality) {
        this.quality = q;
        for (const m of this.materials)
            m.bumpTexture && (m.bumpTexture.level = q === 'low' ? 0 : .55);
        this.scene.fogDensity = this.grid.map.theme === 'industrial' ? (q === 'low' ? .026 : .018) : (q === 'low' ? .03 : .023);
    }
}
