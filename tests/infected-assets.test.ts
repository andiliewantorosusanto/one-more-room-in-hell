import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { NullEngine, Scene, SceneLoader, TransformNode, UniversalCamera, Vector3 } from '@babylonjs/core';
import '@babylonjs/loaders/glTF/index.js';

test('all three infected ship self-contained textures, mapped head bones and combat clips', () => {
    for (const name of ['romero', 'yaku', 'parasite']) {
        const bytes = readFileSync(new URL(`../public/assets/infected/${name}.glb`, import.meta.url));
        assert.equal(bytes.readUInt32LE(0), 0x46546c67);
        assert.equal(bytes.readUInt32LE(8), bytes.length);
        const g = JSON.parse(bytes.subarray(20, 20 + bytes.readUInt32LE(12)).toString());
        assert.ok(g.nodes.some((n: { name: string }) => n.name === 'mixamorig:Head'));
        for (const role of ['idle', 'walk', 'run', 'attack1_r', 'hurt', 'dead1', 'dead2'])
            assert.ok(g.animations.some((a: { name: string; channels: unknown[] }) => a.name === role && a.channels.length > 20), `${name}: ${role}`);
        assert.ok(g.images.length > 0);
        assert.ok(g.images.every((im: { bufferView?: number; uri?: string }) => im.bufferView !== undefined && !im.uri));
        assert.ok(g.buffers.every((b: { uri?: string }) => !b.uri));
        for (const material of g.materials)
            assert.ok((material.pbrMetallicRoughness?.baseColorFactor?.[3] ?? 1) > 0, `${name}: invisible clothing`);
        for (const view of g.bufferViews)
            assert.ok((view.byteOffset ?? 0) + view.byteLength <= g.buffers[0].byteLength);
    }
});

test('retargeted rigs keep standing head hitboxes in reach and fall on death', async () => {
    const engine = new NullEngine();
    const scene = new Scene(engine);
    new UniversalCamera('test', Vector3.Zero(), scene);
    const observer = SceneLoader.OnPluginActivatedObservable.add(loader => {
        if ('skipMaterials' in loader) loader.skipMaterials = true;
    });
    try {
        for (const name of ['romero', 'yaku', 'parasite']) {
            const bytes = readFileSync(new URL(`../public/assets/infected/${name}.glb`, import.meta.url));
            const container = await SceneLoader.LoadAssetContainerAsync('', new Uint8Array(bytes), scene, undefined, '.glb');
            const entry = container.instantiateModelsToScene(n => `test_${n}`, false, { doNotInstantiate: true });
            const root = new TransformNode('test-root', scene);
            entry.rootNodes.forEach(node => node.parent = root);
            root.scaling.setAll(.9);
            const head = root.getChildTransformNodes().find(n => n.name.endsWith('mixamorig:Head'))!;
            assert.ok(head);
            for (const group of entry.animationGroups) {
                group.start(false);
                group.pause();
                group.goToFrame(group.to);
                scene.render();
                const height = head.getAbsolutePosition().y;
                assert.ok(group.name.includes('dead') ? height < .3 : height > 1.3 && height < 1.9, `${name}: ${group.name} head at ${height}`);
                group.stop();
            }
            entry.animationGroups.forEach(group => group.dispose());
            root.dispose();
            container.dispose();
        }
    }
    finally {
        SceneLoader.OnPluginActivatedObservable.remove(observer);
        scene.dispose();
        engine.dispose();
    }
});
