import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';

const root = new URL('../public/source-private/l4d2/', import.meta.url);
test('local Valve pack contains textured native rigs and the complete hospital NAV', { skip: !existsSync(new URL('manifest.json', root)) && 'Native asset pack missing: restore public/source-private/l4d2/' }, () => {
    const manifest = JSON.parse(readFileSync(new URL('manifest.json', root), 'utf8').replace(/^\uFEFF/, ''));
    for (const name of [...manifest.infected, ...Object.values(manifest.weapons)]) {
        const bytes = readFileSync(new URL(name + '.glb', root));
        const gltf = JSON.parse(bytes.subarray(20, 20 + bytes.readUInt32LE(12)).toString());
        const clips = gltf.animations.map((a: { name: string }) => a.name);
        for (const clip of manifest.infected.includes(name) ? ['idle', 'walk', 'run', 'attack1_r', 'hurt', 'dead1'] : name === 'knife' ? ['idle', 'fire'] : ['idle', 'fire', 'reload']) assert.ok(clips.includes(clip), name + ': ' + clip);
        assert.ok(gltf.skins.length, name + ' has its native skeleton');
        assert.ok(gltf.materials.every((m: { pbrMetallicRoughness?: { baseColorTexture?: unknown } }) => m.pbrMetallicRoughness?.baseColorTexture), name + ' has all diffuse textures');
    }
    const nav = JSON.parse(readFileSync(new URL('hospital-nav.json', root), 'utf8'));
    assert.equal(nav.areas.length, 976);
    const ids = new Set(nav.areas.map((a: { id: number }) => a.id));
    assert.ok(nav.areas.every((a: { links: number[] }) => a.links.every(id => ids.has(id))));
});
