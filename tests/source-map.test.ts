import test from 'node:test';
import assert from 'node:assert/strict';
import { SourceNavigation } from '../src/world/source-map.ts';

test('Source navigation follows connected slopes and distinguishes stacked floors', () => {
    const nav = new SourceNavigation({ origin: [0, 0, 0], areas: [
        { id: 1, flags: 0, bounds: [0, 0, 0, 100, 100, 0, 0, 0], links: [2] },
        { id: 2, flags: 0, bounds: [100, 0, 0, 200, 100, 50, 50, 0], links: [1, 3] },
        { id: 3, flags: 0, bounds: [200, 0, 50, 300, 100, 50, 50, 50], links: [2] },
        { id: 4, flags: 0, bounds: [0, 0, 400, 100, 100, 400, 400, 400], links: [] },
    ] });
    assert.equal(nav.locate(1, 1, 0), 0);
    assert.equal(nav.locate(1, 1, 10.16), 3);
    const p = nav.center(0), target = nav.center(2);
    for (let i = 0; i < 100; i++) nav.move(p, .05, 0, .2);
    assert.ok(p.x > 6 && p.y! > 1.2);
    assert.equal(nav.lineClear(nav.center(0), target), true);
    assert.equal(nav.lineClear(nav.center(0), nav.center(3)), false);
    assert.equal(nav.clear(-1, 1, .2, 0), false);
    nav.rebuild(target);
    const next = nav.next(nav.center(0), { ...target, z: 9 });
    assert.ok(next.x > nav.center(0).x);
});
