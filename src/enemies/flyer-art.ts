import { Color3, DynamicTexture, Mesh, MeshBuilder, Scene, StandardMaterial, TransformNode, Vector3, VertexData } from '@babylonjs/core';
/** Original torn membranes layered on the existing credited zombie rig. No new downloads. */
export function createFlyerWings(scene: Scene, parent: TransformNode) {
    let membrane = scene.getMaterialByName('infected wing membrane') as StandardMaterial | null;
    if (!membrane) {
        membrane = new StandardMaterial('infected wing membrane', scene);
        membrane.diffuseColor = new Color3(.62, .51, .43);
        const texture = new DynamicTexture('scarred wing skin', {
            width: 256, height: 256
        }, scene, false);
        const context = texture.getContext() as CanvasRenderingContext2D, image = context.createImageData(256, 256);
        let seed = 173;
        for (let i = 0; i < image.data.length; i += 4) {
            seed = (Math.imul(seed, 1664525) + 1013904223) | 0;
            const noise = (seed >>> 24) / 255;
            const x = (i / 4) % 256, y = Math.floor(i / 1024);
            const fold = Math.sin(x * .16 + y * .045) * 4;
            image.data[i] = 57 + noise * 24 + fold;
            image.data[i + 1] = 43 + noise * 16 + fold;
            image.data[i + 2] = 36 + noise * 12;
            image.data[i + 3] = 255;
        }
        context.putImageData(image, 0, 0);
        context.strokeStyle = 'rgba(20,12,10,.55)';
        context.lineWidth = 1;
        for (let i = 0; i < 14; i++) {
            context.beginPath();
            context.moveTo(48, 220);
            context.bezierCurveTo(70 + i * 7, 170, 115 + i * 5, 130, 185 + i * 4, 30 + i * 10);
            context.stroke();
        }
        texture.update();
        membrane.diffuseTexture = texture;
        membrane.specularColor = new Color3(.045, .035, .025);
        membrane.backFaceCulling = false;
    }
    let bone = scene.getMaterialByName('infected wing bone') as StandardMaterial | null;
    if (!bone) {
        bone = new StandardMaterial('infected wing bone', scene);
        bone.diffuseColor = new Color3(.15, .12, .095);
        bone.specularColor = Color3.Black();
    }
    const wings: TransformNode[] = [];
    for (const side of [-1, 1]) {
        const hinge = new TransformNode('flyer wing hinge', scene);
        hinge.parent = parent;
        hinge.position.set(side * .16, 1.23, .04);
        const points = [new Vector3(0, .12, 0), new Vector3(side * .42, .55, .04), new Vector3(side * 1.2, .30, .12), new Vector3(side * .94, -.12, -.02), new Vector3(side * .86, -.5, -.13), new Vector3(side * .42, -.28, -.10), new Vector3(side * .22, -.58, -.05)];
        const wing = new Mesh('torn infected membrane', scene);
        const data = new VertexData();
        data.positions = points.flatMap(p => p.asArray());
        data.uvs = points.flatMap(p => [Math.abs(p.x) / 1.2, (p.y + .6) / 1.2]);
        data.indices = [0, 1, 2, 0, 2, 3, 0, 3, 4, 0, 4, 5, 0, 5, 6];
        data.normals = [];
        VertexData.ComputeNormals(data.positions, data.indices, data.normals);
        data.applyToMesh(wing);
        wing.parent = hinge;
        wing.material = membrane;
        wing.isPickable = false;
        for (const i of [1, 2, 4, 6]) {
            const rib = MeshBuilder.CreateTube('wing tendon', {
                path: i === 1 ? [points[0], points[1]] : [points[1], new Vector3((points[1].x + points[i].x) * .5, (points[1].y + points[i].y) * .5 + .10, .09), points[i]], radius: .014, tessellation: 5
            }, scene);
            rib.parent = hinge;
            rib.material = bone;
            rib.isPickable = false;
        }
        hinge.setEnabled(false);
        wings.push(hinge);
    }
    return wings;
}
