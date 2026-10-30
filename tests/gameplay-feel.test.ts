import test from 'node:test';
import assert from 'node:assert/strict';
import { weaponSway } from '../src/weapons/weapon-rules.ts';
import { infectedApproach } from '../src/enemies/enemy-rules.ts';

test('ADS reduces idle sway by 85%, motion reduction disables it', () => {
    const hip = weaponSway(1, 0, false, false), aim = weaponSway(1, 1, false, false);
    assert.ok(Math.abs(hip.yaw) > .001);
    assert.ok(Math.abs(aim.yaw / hip.yaw - .15) < 1e-10);
    assert.ok(Math.abs(aim.pitch / hip.pitch - .15) < 1e-10);
    assert.deepEqual(weaponSway(1, 0, true, true), { yaw: 0, pitch: 0 });
});

test('infected split to both flanks, vary pace, and commit to close attacks', () => {
    assert.ok(infectedApproach(0, 10, 1, 1, true).flank > 0);
    assert.ok(infectedApproach(0, 10, 1, 2, true).flank < 0);
    assert.equal(infectedApproach(0, 10, 1, 0, true).flank, 0);
    assert.notEqual(infectedApproach(0, 10, 0, 1, true).weave, infectedApproach(0, 10, 1, 1, true).weave);
    for (let variant = 0; variant < 8; variant++) {
        const close = infectedApproach(0, 1, 1, variant, true);
        assert.equal(close.flank, 0);
        assert.equal(close.weave, 0);
        for (let t = 0; t < 10; t += .1) {
            const { pace, weave } = infectedApproach(0, 10, t, variant, true);
            assert.ok(pace >= .9 && pace <= 1.4);
            assert.ok(Math.abs(weave) <= .48);
        }
    }
});
