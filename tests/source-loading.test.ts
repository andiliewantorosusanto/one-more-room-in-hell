import test from 'node:test';
import assert from 'node:assert/strict';
import { loadSourcePack, validateSourcePack, SOURCE_ROOT } from '../src/world/source-map.ts';
import { WEAPONS, WeaponRules } from '../src/weapons/weapon-rules.ts';
import { WorldGrid } from '../src/world/navigation.ts';

const manifest = () => ({
    infected: ['nurse', 'patient', 'surgeon', 'police', 'civilian'],
    weapons: Object.fromEntries(Object.keys(WEAPONS).map(id => [id, id])),
});
const navigation = () => ({ origin: [0, 0, 0], areas: [
    { id: 1, flags: 0, bounds: [0, 0, 0, 100, 100, 0, 0, 0], links: [2] },
    { id: 2, flags: 0, bounds: [100, 0, 0, 200, 100, 0, 0, 0], links: [1] },
] });
const lighting = [{ origin: '10 20 30', _light: '220 225 230 100' }];

test('valid native pack loads and supplies NAV-area encounter references', async () => {
    const requests: string[] = [];
    const pack = await loadSourcePack(async input => {
        const url = String(input);
        requests.push(url);
        const body = url.endsWith('manifest.json') ? manifest() : url.endsWith('hospital-nav.json') ? navigation() : lighting;
        return Response.json(body);
    });
    assert.deepEqual(requests.sort(), ['manifest.json', 'hospital-nav.json', 'hospital.lights.json'].map(file => SOURCE_ROOT + file).sort());
    const grid = new WorldGrid(pack.nav);
    assert.equal(grid.map.name, 'No Mercy · Hospital');
    assert.ok(Number.isInteger(grid.map.spawn));
    assert.equal(grid.map.entrances.length, 2);
    for (const goal of grid.map.objectives) assert.ok(grid.center(goal.area));
    const spawn = grid.center(grid.map.spawn);
    assert.ok(grid.clear(spawn.x, spawn.z, .2, spawn.y));
    assert.throws(() => grid.wallDistance(spawn, { x: 1, z: 0 }), /collision geometry is not ready/);
    grid.raycast = () => 2;
    assert.equal(grid.wallDistance(spawn, { x: 1, z: 0 }), 2);
});

test('missing files, HTML fallbacks, malformed JSON and network failures identify the required resource', async () => {
    for (const file of ['manifest.json', 'hospital-nav.json', 'hospital.lights.json']) {
        for (const kind of ['missing', 'html', 'json', 'network']) {
            await assert.rejects(loadSourcePack(async input => {
                const url = String(input);
                if (url.endsWith(file)) {
                    if (kind === 'network') throw new Error('offline');
                    if (kind === 'missing') return new Response('', { status: 404 });
                    if (kind === 'html') return new Response('<html></html>', { headers: { 'content-type': 'text/html' } });
                    return new Response('{bad', { headers: { 'content-type': 'application/json' } });
                }
                return Response.json(url.endsWith('manifest.json') ? manifest() : url.endsWith('hospital-nav.json') ? navigation() : lighting);
            }), error => error instanceof Error && error.message.includes(SOURCE_ROOT + file) && error.message.includes('public/source-private/l4d2/'));
        }
    }
});

test('invalid manifests cannot omit native models or escape the pack directory', () => {
    for (const bad of [null, {}, { ...manifest(), infected: [] }, { ...manifest(), infected: ['../nurse'] }, { ...manifest(), weapons: {} }, { ...manifest(), weapons: { ...manifest().weapons, pistol: '../pistol' } }]) {
        assert.throws(() => validateSourcePack(bad, navigation(), lighting), /manifest.json/);
    }
});

test('unusable navigation and malformed lighting fail before gameplay', () => {
    const area = navigation().areas[0];
    for (const bad of [null, {}, { origin: [NaN, 0, 0], areas: [area] }, { origin: [0, 0, 0], areas: [] }, { origin: [0, 0, 0], areas: [area, area] }, { origin: [0, 0, 0], areas: [{ ...area, bounds: [0] }] }, { origin: [0, 0, 0], areas: [{ ...area, links: [99] }] }]) {
        assert.throws(() => validateSourcePack(manifest(), bad, lighting), /hospital-nav.json/);
    }
    for (const bad of [null, {}, [null], [{ origin: 'not a position' }], [{ origin: '0 0 0', _light: 'red' }]]) {
        assert.throws(() => validateSourcePack(manifest(), navigation(), bad), /hospital.lights.json/);
    }
});

test('native weapons are authoritative and retain IDs, prices, damage and reload behavior', () => {
    assert.deepEqual(Object.values(WEAPONS).map(w => w.name), ['P220', 'COMBAT KNIFE', 'UZI', 'MAC-10', 'M16A2', 'REMINGTON 870', 'CHROME SHOTGUN', 'SPAS-12', 'AK-47']);
    assert.deepEqual(Object.values(WEAPONS).map(w => [w.price, w.damage]), [[0, 25], [0, 50], [450, 18], [800, 27], [650, 34], [350, 10], [800, 18], [1400, 15], [1600, 60]]);
    assert.equal(WEAPONS.autoShotgun.reloadStyle, 'shell');
    assert.equal(WEAPONS.autoShotgun.reload, .65);
    assert.equal(WEAPONS.plasmaRifle.capacity, 30);
    assert.equal(WEAPONS.plasmaRifle.reloadStyle, 'magazine');
    assert.equal(WEAPONS.plasmaRifle.reload, 2.5);
    const state = new WeaponRules();
    state.inventory.push('autoShotgun');
    state.current = 'autoShotgun';
    state.reserves.autoShotgun = 3;
    assert.ok(state.reload());
    state.tick(.66);
    assert.equal(state.ammo, 1);
    assert.equal(state.reserve, 2);
});
