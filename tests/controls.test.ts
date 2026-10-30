import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULT_HOTKEYS, rebind, loadHotkeys, controlForCode, validHotkey, keyLabel } from '../src/player/controls.ts';

test('remapping routes new keys and releases old keys without losing occupied actions', () => {
    const keys = rebind(DEFAULT_HOTKEYS, 'KeyW', 'ArrowUp');
    assert.equal(controlForCode('ArrowUp', keys), 'KeyW');
    assert.equal(controlForCode('KeyW', keys), undefined);
    const swapped = rebind(keys, 'KeyR', 'KeyE');
    assert.equal(controlForCode('KeyE', swapped), 'KeyR');
    assert.equal(controlForCode('KeyR', swapped), 'KeyE');
    assert.equal(new Set(Object.values(swapped)).size, Object.keys(swapped).length);
    assert.deepEqual(loadHotkeys(JSON.parse(JSON.stringify(swapped))), swapped);
    assert.equal(DEFAULT_HOTKEYS.KeyW, 'KeyW');
});

test('old or malformed settings retain usable defaults and reserve system keys', () => {
    for (const value of [undefined, null, [], 'bad', {KeyW: 'Escape', KeyR: '<script>', Digit1: 42}]) {
        assert.deepEqual(loadHotkeys(value), DEFAULT_HOTKEYS);
    }
    for (const code of ['Escape', 'F3', 'MetaLeft', '', 'Mouse0']) assert.equal(validHotkey(code), false);
    assert.equal(keyLabel('ArrowUp'), 'ARROW UP');
    assert.equal(keyLabel('Digit3'), '3');
});
