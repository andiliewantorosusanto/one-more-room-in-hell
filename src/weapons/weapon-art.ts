import { Color3, Matrix, Mesh, MeshBuilder, PBRMaterial, Scene, Texture, TransformNode, Vector3, VertexData } from '@babylonjs/core';
export type AuthoredWeaponId = 'smg' | 'heavySmg' | 'shotgun' | 'leverShotgun' | 'autoShotgun' | 'plasmaRifle';
export const WEAPON_ART_METADATA: Record<AuthoredWeaponId, {
    silhouette: string;
    mechanism: string;
}> = {
    smg: {
        silhouette: 'Compact stamped receiver, curved magazine, retractable twin-rail stock', mechanism: 'Reciprocating bolt and detachable magazine'
    },
    heavySmg: {
        silhouette: 'Tall recoil housing, short squared shroud, vertical .45 magazine', mechanism: 'Bolt, charging handle and detachable magazine'
    },
    shotgun: {
        silhouette: 'Long twin tubes, walnut furniture and ribbed sliding fore-end', mechanism: 'Pump action and individual shell loading'
    },
    leverShotgun: {
        silhouette: 'Walnut stock, long barrel, exposed hammer and large loop lever', mechanism: 'Moving lever and individual shell loading'
    },
    autoShotgun: {
        silhouette: 'Heavy vented barrel, rail receiver and broad drum magazine', mechanism: 'Self-loading bolt and detachable shotgun drum'
    },
    plasmaRifle: {
        silhouette: 'Twin induction coils, luminous emitter and removable power cell', mechanism: 'Pulsing emitter, moving cooling vanes and removable cell'
    },
};
type Palette = {
    steel: PBRMaterial;
    dark: PBRMaterial;
    edge: PBRMaterial;
    wood: PBRMaterial;
    brass: PBRMaterial;
    red: PBRMaterial;
    glow: PBRMaterial;
};
export type WeaponArt = {
    root: TransformNode;
    muzzle: TransformNode;
    magazine?: TransformNode;
    pump?: TransformNode;
    lever?: TransformNode;
    flip?: TransformNode;
    bolt: TransformNode;
    shell?: TransformNode;
    vents: TransformNode[];
    kind: AuthoredWeaponId;
    sightLine: Vector3;
    sights: { rear: TransformNode; front: TransformNode };
    reset: () => void;
    update: (shotAge: number, reloadProgress: number, reloading: boolean) => void;
};
function palette(scene: Scene): Palette {
    const material = (name: string, color: string, metallic: number, roughness: number) => {
        const existing = scene.getMaterialByName(name);
        if (existing instanceof PBRMaterial)
            return existing;
        const m = new PBRMaterial(name, scene);
        m.albedoColor = Color3.FromHexString(color);
        m.metallic = metallic;
        m.roughness = roughness;
        return m;
    };
    const glow = material('weapon-art-coil', '#3b7981', .45, .34);
    glow.emissiveColor = new Color3(.07, .48, .58);
    const steel = material('weapon-art-steel', '#83908e', .65, .57);
    if (!steel.albedoTexture) {
        const local = (file: string) => {
            const t = new Texture('/assets/textures/' + file, scene);
            t.uScale = 2;
            t.vScale = 2;
            t.anisotropicFilteringLevel = 4;
            return t;
        };
        steel.albedoTexture = local('metal-color.jpg');
        steel.bumpTexture = local('metal-normal.jpg');
        steel.bumpTexture.level = .3;
        steel.metallicTexture = local('metal-roughness.jpg');
        steel.useRoughnessFromMetallicTextureGreen = true;
        steel.useRoughnessFromMetallicTextureAlpha = false;
        steel.useMetallnessFromMetallicTextureBlue = false;
    }
    return {
        steel, dark: material('weapon-art-polymer', '#20272a', .08, .78), edge: material('weapon-art-machined', '#a5a9a7', .88, .3), wood: material('weapon-art-walnut', '#613c28', .02, .7), brass: material('weapon-art-brass', '#b49a56', .75, .36), red: material('weapon-art-shell', '#963e30', .02, .72), glow
    };
}
/** All dimensions are authored in metres. Static details merge by material before attachment. */
class Parts {
    private batches = new Map<TransformNode, Map<PBRMaterial, Mesh[]>>();
    constructor(private scene: Scene) {
    }
    private add(mesh: Mesh, parent: TransformNode, material: PBRMaterial) {
        mesh.material = material;
        let batch = this.batches.get(parent);
        if (!batch) {
            batch = new Map();
            this.batches.set(parent, batch);
        }
        let list = batch.get(material);
        if (!list) {
            list = [];
            batch.set(material, list);
        }
        list.push(mesh);
        return mesh;
    }
    box(parent: TransformNode, mat: PBRMaterial, name: string, x: number, y: number, z: number, w: number, h: number, d: number, rx = 0, ry = 0, rz = 0) {
        const m = MeshBuilder.CreateBox(name, {
            width: w, height: h, depth: d
        }, this.scene);
        m.position.set(x, y, z);
        m.rotation.set(rx, ry, rz);
        return this.add(m, parent, mat);
    }
    walnutStock(parent: TransformNode, mat: PBRMaterial, name: string) {
        const positions = [-.027, 0, -.34, .027, 0, -.34, .027, -.095, -.34, -.027, -.095, -.34, -.044, .012, -.57, .044, .012, -.57, .044, -.16, -.545, -.044, -.16, -.545];
        const indices = [0, 1, 2, 0, 2, 3, 5, 4, 7, 5, 7, 6, 4, 0, 3, 4, 3, 7, 1, 5, 6, 1, 6, 2, 4, 5, 1, 4, 1, 0, 3, 2, 6, 3, 6, 7], normals: number[] = [];
        VertexData.ComputeNormals(positions, indices, normals);
        const data = new VertexData();
        data.positions = positions;
        data.indices = indices;
        data.normals = normals;
        data.uvs = positions.flatMap((_, i) => i % 3 === 0 ? [positions[i + 2], positions[i + 1]] : []);
        const mesh = new Mesh(name, this.scene);
        data.applyToMesh(mesh);
        return this.add(mesh, parent, mat);
    }
    tube(parent: TransformNode, mat: PBRMaterial, name: string, x: number, y: number, z: number, length: number, diameter: number, axis: 'z' | 'x' | 'y' = 'z', top = diameter) {
        const m = MeshBuilder.CreateCylinder(name, {
            height: length, diameterTop: top, diameterBottom: diameter, tessellation: 16
        }, this.scene);
        m.position.set(x, y, z);
        if (axis === 'z')
            m.rotation.x = Math.PI / 2;
        else if (axis === 'x')
            m.rotation.z = Math.PI / 2;
        return this.add(m, parent, mat);
    }
    loop(parent: TransformNode, mat: PBRMaterial, name: string, x: number, y: number, z: number, diameter: number, thickness: number, rx = Math.PI / 2) {
        const m = MeshBuilder.CreateTorus(name, {
            diameter, thickness, tessellation: 20
        }, this.scene);
        m.position.set(x, y, z);
        if (rx === 0)
            m.rotation.z = Math.PI / 2;
        else
            m.rotation.x = rx;
        return this.add(m, parent, mat);
    }
    finish() {
        for (const [parent, batch] of this.batches)
            for (const [mat, parts] of batch) {
                const merged = parts.length === 1 ? parts[0] : Mesh.MergeMeshes(parts, true, true)!;
                merged.name = parent.name + '-' + mat.name;
                merged.parent = parent;
                merged.material = mat;
                merged.isPickable = false;
                merged.renderingGroupId = 2;
                merged.alwaysSelectAsActiveMesh = true;
                merged.applyFog = false;
            }
    }
}
/** Attach a local frame at the donor rig's evaluated idle pose, without altering glTF handedness. */
export function attachViewFrame(node: TransformNode, socket: TransformNode, pivot: TransformNode, localPosition: Vector3) {
    pivot.computeWorldMatrix(true);
    for (const child of pivot.getDescendants())
        if (child instanceof TransformNode)
            child.computeWorldMatrix(true);
    const world = Matrix.Translation(localPosition.x, localPosition.y, localPosition.z).multiply(pivot.getWorldMatrix());
    const local = world.multiply(Matrix.Invert(socket.getWorldMatrix()));
    node.parent = socket;
    node.setPreTransformMatrix(local);
}
/** Physical U-notch rear sight and front blade. Sight tips share the bore's axis. */
export function createIronSights(scene: Scene, pivot: TransformNode, socket: TransformNode, rear: Vector3, front: Vector3) {
    const b = new Parts(scene), p = palette(scene);
    const anchors = {} as { rear: TransformNode; front: TransformNode };
    for (const [position, isFront] of [[rear, false], [front, true]] as const) {
        const frame = new TransformNode(isFront ? 'front-iron' : 'rear-iron', scene);
        anchors[isFront ? 'front' : 'rear'] = frame;
        attachViewFrame(frame, socket, pivot, position);
        b.box(frame, p.dark, 'sight-mount', 0, -.0115, 0, .024, .005, .016);
        if (isFront) {
            b.box(frame, p.dark, 'front-blade', 0, -.007, 0, .0035, .014, .010);
            b.box(frame, p.edge, 'front-inlay', 0, -.0025, -.0055, .0015, .0025, .001);
        }
        else {
            for (const x of [-.0085, .0085]) {
                b.box(frame, p.dark, 'rear-notch', x, -.0045, 0, .005, .009, .014);
                b.box(frame, p.edge, 'rear-inlay', x, -.002, -.0075, .0015, .0015, .001);
            }
        }
    }
    b.finish();
    return anchors;
}
export function createWeaponArt(id: AuthoredWeaponId, scene: Scene, pivot: TransformNode, bodySocket: TransformNode, magazineSocket: TransformNode): WeaponArt {
    const p = palette(scene), b = new Parts(scene), root = new TransformNode(id + '-authored-body', scene);
    const bolt = new TransformNode(id + '-bolt', scene);
    bolt.parent = root;
    const muzzle = new TransformNode(id + '-muzzle', scene);
    muzzle.parent = root;
    const vents: TransformNode[] = [];
    let sightHeight = .135, rearSightZ = -.22;
    const sights = {} as { rear: TransformNode; front: TransformNode };
    let magazine: TransformNode | undefined, pump: TransformNode | undefined, lever: TransformNode | undefined, shell: TransformNode | undefined;
    const box = (mat: PBRMaterial, name: string, x: number, y: number, z: number, w: number, h: number, d: number, rx = 0, ry = 0, rz = 0, parent = root) => b.box(parent, mat, id + '-' + name, x, y, z, w, h, d, rx, ry, rz);
    const tube = (mat: PBRMaterial, name: string, x: number, y: number, z: number, l: number, d: number, axis: 'z' | 'x' | 'y' = 'z', top = d, parent = root) => b.tube(parent, mat, id + '-' + name, x, y, z, l, d, axis, top);
    const rib = (parent: TransformNode, start: number, count: number, step: number, y: number, w: number, h: number) => {
        for (let i = 0; i < count; i++)
            b.box(parent, p.dark, id + '-rib-' + i, 0, y, start + i * step, w, h, .012);
    };
    const rail = (start: number, end: number, y: number) => {
        box(p.steel, 'rail-base', 0, y, (start + end) / 2, .072, .024, end - start);
        for (let z = start; z < end; z += .035)
            box(p.edge, 'rail-tooth', 0, y + .017, z, .084, .012, .017);
    };
    const sight = (z: number, y: number) => {
        const anchor = new TransformNode(id + (z < 0 ? '-rear-iron' : '-front-iron'), scene);
        anchor.parent = root;
        anchor.position.set(0, y + .055, z);
        sights[z < 0 ? 'rear' : 'front'] = anchor;
        sightHeight = y + .055;
        if (z < 0) rearSightZ = z;
        box(p.steel, 'sight-base', 0, y + .025, z, .032, .04, .028);
        box(p.dark, 'sight-left', -.012, y + .053, z, .006, .014, .018);
        box(p.dark, 'sight-right', .012, y + .053, z, .006, .014, .018);
        if (z > 0)
            box(p.dark, 'sight-post', 0, y + .030, z, .005, .05, .01);
    };
    const grip = () => {
        box(p.dark, 'pistol-grip', .013, -.145, -.285, .083, .21, .10, -.25);
        for (let i = 0; i < 6; i++)
            box(p.steel, 'grip-groove', .013, -.215 + i * .025, -.304, .086, .006, .07, -.25);
    };
    const trigger = () => {
        b.loop(root, p.steel, id + '-trigger-guard', 0, -.105, -.18, .105, .012, 0);
        box(p.dark, 'trigger', 0, -.083, -.18, .012, .047, .018, -.35);
    };
    const stock = (wood = false) => {
        if (wood) {
            b.walnutStock(root, p.wood, id + '-tapered-walnut-stock');
            box(p.dark, 'sloped-butt-pad', 0, -.075, -.564, .09, .15, .018, .18);
        }
        else {
            box(p.dark, 'stock', 0, -.035, -.49, .088, .135, .24, .18);
            box(p.dark, 'butt-pad', 0, -.055, -.62, .105, .16, .024, .18);
        }
    };
    const magazinePart = (kind: 'curved' | 'straight' | 'box' | 'drum' | 'cell') => {
        magazine = new TransformNode(id + '-moving-magazine', scene);
        if (kind === 'curved') {
            for (let i = 0; i < 5; i++)
                b.box(magazine, p.steel, id + '-curved-mag-' + i, 0, -.033 * i, -.007 * i * i, .067, .052, .10, -.07 * i);
            for (let i = 0; i < 2; i++)
                b.box(magazine, p.dark, id + '-mag-channel-' + i, -.025 + i * .05, -.08, -.017, .007, .16, .105);
        }
        else if (kind === 'drum') {
            b.box(magazine, p.steel, id + '-drum-feed-neck', 0, .005, 0, .085, .12, .14);
            b.tube(magazine, p.dark, id + '-drum-body', 0, -.14, 0, .17, .27, 'x');
            for (const x of [-.088, .088]) {
                b.tube(magazine, p.steel, id + '-drum-endcap', x, -.14, 0, .014, .245, 'x');
                b.tube(magazine, p.edge, id + '-drum-hub', x * 1.09, -.14, 0, .015, .055, 'x');
            }
            for (let i = 0; i < 8; i++) {
                const angle = i * Math.PI / 4;
                b.box(magazine, p.steel, id + '-drum-rib-' + i, 0, -.14 + Math.sin(angle) * .132, Math.cos(angle) * .132, .17, .012, .014, angle);
            }
        }
        else if (kind === 'cell') {
            b.box(magazine, p.dark, id + '-cell-case', 0, -.04, 0, .12, .18, .17);
            b.box(magazine, p.glow, id + '-cell-window', .061, -.04, 0, .008, .13, .12);
            for (let i = 0; i < 3; i++)
                b.box(magazine, p.edge, id + '-cell-contact-' + i, -.036 + i * .036, .057, 0, .015, .012, .08);
        }
        else {
            const wide = kind === 'box';
            b.box(magazine, p.steel, id + '-magazine', 0, -.065, 0, wide ? .105 : .069, wide ? .23 : .22, wide ? .16 : .105, .05);
            b.box(magazine, p.dark, id + '-mag-baseplate', 0, -.184, 0, wide ? .115 : .079, .025, wide ? .17 : .12);
            for (let i = 0; i < 4; i++)
                b.box(magazine, p.dark, id + '-mag-ridge-' + i, 0, -.145 + i * .045, -.055, wide ? .11 : .074, .012, .009);
        }
    };
    const shellPart = () => {
        shell = new TransformNode(id + '-loading-shell', scene);
        shell.parent = root;
        shell.setEnabled(false);
        b.tube(shell, p.red, id + '-shell-body', 0, 0, 0, .07, .026, 'z');
        b.tube(shell, p.brass, id + '-shell-rim', 0, 0, -.035, .009, .029, 'z');
    };
    if (id === 'smg') {
        tube(p.steel, 'stamped-upper', 0, .018, -.035, .59, .09);
        box(p.dark, 'lower-receiver', 0, -.037, -.105, .095, .12, .28);
        grip();
        trigger();
        tube(p.steel, 'short-barrel', 0, .018, .39, .27, .037);
        tube(p.dark, 'muzzle-thread', 0, .018, .536, .033, .055);
        box(p.dark, 'polymer-fore-end', 0, -.045, .235, .108, .14, .31);
        rib(root, .12, 8, .031, -.11, .11, .015);
        for (const x of [-.065, .065])
            box(p.steel, 'retractable-stock-rail', x, .025, -.47, .018, .024, .45);
        box(p.dark, 'retractable-butt', 0, -.025, -.71, .16, .16, .04);
        sight(-.26, .08);
        sight(.35, .08);
        box(p.edge, 'cocking-handle', -.073, .033, .06, .068, .018, .025);
        box(p.dark, 'ejection-port', .047, .025, -.05, .009, .041, .13);
        box(p.edge, 'bolt-face', .051, .025, -.05, .009, .031, .10, 0, 0, 0, bolt);
        magazinePart('curved');
        muzzle.position.set(0, .018, .56);
    }
    else if (id === 'heavySmg') {
        box(p.dark, 'recoil-housing', 0, -.045, -.055, .15, .31, .34);
        box(p.steel, 'upper', 0, .085, .025, .13, .095, .51);
        box(p.dark, 'integrated-grip', .012, -.205, -.265, .094, .20, .105, -.21);
        trigger();
        box(p.steel, 'squared-barrel-shroud', 0, .055, .34, .145, .15, .29);
        tube(p.dark, 'recessed-bore', 0, .06, .495, .018, .06);
        tube(p.steel, 'barrel-tip', 0, .06, .515, .055, .035);
        for (let i = 0; i < 5; i++) {
            box(p.dark, 'shroud-vent', .074, .055, .24 + i * .043, .005, .065, .022);
            box(p.dark, 'shroud-top-vent', 0, .132, .24 + i * .043, .08, .005, .019);
        }
        box(p.dark, 'vertical-foregrip', 0, -.16, .24, .082, .16, .085);
        box(p.steel, 'stock-spine', 0, .07, -.53, .07, .055, .44);
        box(p.dark, 'stock-cheek', 0, .085, -.61, .105, .10, .23);
        box(p.dark, 'skeleton-butt', 0, -.03, -.76, .14, .24, .035);
        rail(-.24, .35, .15);
        sight(-.18, .19);
        sight(.32, .19);
        box(p.edge, 'charging-handle', -.105, .078, -.03, .075, .022, .034, 0, 0, 0, bolt);
        magazinePart('straight');
        muzzle.position.set(0, .06, .55);
    }
    else if (id === 'shotgun' || id === 'leverShotgun') {
        const leverGun = id === 'leverShotgun';
        box(p.steel, 'receiver', 0, .01, -.11, .107, .145, .34);
        stock(true);
        trigger();
        tube(p.steel, 'long-barrel', 0, .062, .47, .91, .052);
        tube(p.dark, 'open-bore', 0, .062, .931, .008, .039);
        tube(p.steel, 'magazine-tube', 0, -.017, .44, .72, .046);
        for (const z of [.17, .71]) {
            box(p.steel, 'barrel-band', 0, .016, z, .072, .12, .022);
        }
        box(p.dark, 'ejection-port', .055, .035, -.055, .008, .066, .17);
        box(p.edge, 'ejection-bolt', .059, .035, -.055, .009, .05, .13, 0, 0, 0, bolt);
        if (leverGun) {
            box(p.wood, 'walnut-fore-end', 0, -.033, .34, .097, .095, .39);
            box(p.wood, 'stock-wrist', 0, -.09, -.36, .084, .125, .21, .22);
            lever = new TransformNode(id + '-large-loop-lever', scene);
            lever.parent = root;
            lever.position.set(0, -.065, -.23);
            b.loop(lever, p.steel, id + '-lever-loop', 0, -.10, .026, .17, .017, 0);
            b.box(lever, p.steel, id + '-lever-neck', 0, -.017, .04, .018, .085, .027, -.2);
            box(p.edge, 'exposed-hammer', 0, .106, -.25, .035, .065, .04, -.3);
            box(p.brass, 'side-loading-gate', .056, -.025, -.125, .008, .046, .115);
            sight(.82, .105);
            sight(-.22, .105);
        }
        else {
            grip();
            pump = new TransformNode(id + '-sliding-pump', scene);
            pump.parent = root;
            b.box(pump, p.wood, id + '-walnut-pump', 0, -.043, .33, .11, .115, .38);
            rib(pump, .17, 11, .03, -.102, .116, .017);
            for (const x of [-.05, .05])
                tube(p.steel, 'action-rod', x, -.025, .065, .40, .011);
            sight(.82, .106);
            sight(-.22, .106);
        }
        box(p.brass, 'receiver-pin', .056, -.02, -.21, .005, .019, .019);
        shellPart();
        muzzle.position.set(0, .062, .948);
    }
    else if (id === 'autoShotgun') {
        box(p.steel, 'box-receiver', 0, .02, -.065, .14, .18, .39);
        grip();
        trigger();
        stock();
        box(p.dark, 'vented-handguard', 0, .03, .36, .17, .18, .53);
        tube(p.steel, 'heavy-barrel', 0, .045, .55, .64, .064);
        tube(p.dark, 'muzzle-brake', 0, .045, .902, .09, .088);
        for (let i = 0; i < 7; i++) {
            box(p.steel, 'heat-vent', .087, .045, .14 + i * .07, .006, .064, .039);
            box(p.steel, 'heat-vent-left', -.087, .045, .14 + i * .07, .006, .064, .039);
        }
        rib(root, .12, 13, .034, -.068, .18, .015);
        rail(-.24, .62, .14);
        sight(-.16, .182);
        sight(.64, .182);
        box(p.dark, 'ejection-port', .073, .048, -.07, .009, .074, .16);
        box(p.edge, 'charging-handle', .11, .039, -.07, .08, .024, .034, 0, 0, 0, bolt);
        magazinePart('drum');
        muzzle.position.set(0, .045, .96);
    }
    else {
        box(p.dark, 'power-receiver', 0, .02, -.055, .20, .21, .44);
        grip();
        trigger();
        box(p.steel, 'stock-spine', 0, .025, -.53, .105, .08, .43);
        box(p.dark, 'stock-pad', 0, -.01, -.76, .15, .23, .045);
        tube(p.steel, 'emitter-core', 0, .045, .42, .68, .095);
        tube(p.dark, 'emitter-bore', 0, .045, .765, .012, .083);
        tube(p.glow, 'emitter-aperture', 0, .045, .775, .013, .057);
        for (const z of [.21, .52]) {
            b.loop(root, p.steel, id + '-induction-housing', 0, .045, z, .24, .043);
            b.loop(root, p.glow, id + '-induction-coil', 0, .045, z, .205, .022);
        }
        for (const x of [-.115, .115])
            box(p.steel, 'conductor-rail', x, .045, .4, .027, .11, .57);
        for (let i = 0; i < 5; i++) {
            const vane = new TransformNode(id + '-cooling-vane-' + i, scene);
            vane.parent = root;
            vane.position.set(0, .142, .11 + i * .095);
            vents.push(vane);
            b.box(vane, p.edge, id + '-vane', 0, 0, 0, .22, .017, .042);
        }
        box(p.dark, 'foregrip', 0, -.13, .24, .10, .17, .12);
        box(p.glow, 'charge-indicator', .103, .045, -.09, .009, .028, .19);
        box(p.steel, 'sight-bridge', 0, .145, -.08, .072, .046, .15);
        box(p.glow, 'sight-notch', 0, .173, -.12, .02, .009, .018);
        sight(-.2, .205);
        sight(.62, .205);
        magazinePart('cell');
        muzzle.position.set(0, .045, .8);
    }
    b.finish();
    let flip: TransformNode | undefined;
    if (id === 'leverShotgun') {
        flip = new TransformNode(id + '-between-shot-flip', scene);
        flip.parent = root;
        for (const part of [...root.getChildren()])
            if (part !== flip)
                part.parent = flip;
    }
    attachViewFrame(root, bodySocket, pivot, new Vector3(.08, .17, .50));
    if (magazine)
        attachViewFrame(magazine, magazineSocket, pivot, new Vector3(.08, -.005, .405));
    const magBase = magazine?.position.clone() ?? Vector3.Zero();
    const reset = () => {
        bolt.position.setAll(0);
        if (pump)
            pump.position.setAll(0);
        if (lever)
            lever.rotation.setAll(0);
        if (flip) {
            flip.rotation.setAll(0);
            flip.position.setAll(0);
        }
        for (const v of vents)
            v.rotation.setAll(0);
        if (magazine)
            magazine.position.copyFrom(magBase);
        shell?.setEnabled(false);
    };
    const update = (shotAge: number, reloadProgress: number, reloading: boolean) => {
        const cycle = shotAge >= 0 ? Math.max(0, Math.sin(Math.min(1, shotAge / .48) * Math.PI)) : 0;
        bolt.position.z = shotAge < 0 ? 0 : -Math.max(0, 1 - shotAge / .13) * .065;
        if (pump)
            pump.position.z = -cycle * .10;
        if (lever)
            lever.rotation.x = cycle * 1.1;
        if (flip) {
            const phase = shotAge < 0 ? 0 : Math.max(0, Math.min(1, (shotAge - .06) / .54));
            const eased = phase * phase * (3 - 2 * phase), angle = phase > 0 && phase < 1 ? -Math.PI * 2 * eased : 0;
            // Rotate around the loop/finger contact, not the receiver, then restore the exact grip frame.
            const y = -.165, z = -.23;
            flip.rotation.x = angle;
            flip.position.set(0, y - (Math.cos(angle) * y - Math.sin(angle) * z), z - (Math.sin(angle) * y + Math.cos(angle) * z));
        }
        for (const v of vents)
            v.rotation.x = cycle * .35;
        if (shell) {
            shell.setEnabled(reloading && reloadProgress > .12 && reloadProgress < .78);
            if (reloading) {
                const t = Math.max(0, Math.min(1, (reloadProgress - .12) / .66));
                shell.position.set(-.20 * (1 - t), -.29 + .19 * t, -.08 - .08 * t);
                shell.rotation.set(0, 0, (1 - t) * -.65);
            }
        }
    };
    reset();
    return {
        root, muzzle, magazine, pump, lever, flip, bolt, shell, vents, kind: id, sights, sightLine: new Vector3(.08, .17 + sightHeight, .50 + rearSightZ), reset, update
    };
}
