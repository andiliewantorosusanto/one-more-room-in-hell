export const DEFAULT_HOTKEYS = {
    KeyW: 'KeyW', KeyS: 'KeyS', KeyA: 'KeyA', KeyD: 'KeyD',
    ShiftLeft: 'ShiftLeft', KeyR: 'KeyR', KeyE: 'KeyE',
    Digit1: 'Digit1', Digit2: 'Digit2', Digit3: 'Digit3', Digit4: 'Digit4',
    Digit5: 'Digit5', Digit6: 'Digit6', Digit7: 'Digit7', Digit8: 'Digit8', Digit9: 'Digit9',
};
export type Control = keyof typeof DEFAULT_HOTKEYS;
export type Hotkeys = Record<Control, string>;
export const CONTROL_LABELS: Record<Control, string> = {
    KeyW: 'Move forward', KeyS: 'Move backward', KeyA: 'Strafe left', KeyD: 'Strafe right',
    ShiftLeft: 'Sprint', KeyR: 'Reload', KeyE: 'Use / hold objective',
    Digit1: 'Weapon slot 1', Digit2: 'Weapon slot 2', Digit3: 'Weapon slot 3',
    Digit4: 'Weapon slot 4', Digit5: 'Weapon slot 5', Digit6: 'Weapon slot 6',
    Digit7: 'Weapon slot 7', Digit8: 'Weapon slot 8', Digit9: 'Weapon slot 9',
};
export function validHotkey(code: unknown): code is string {
    return typeof code === 'string' && /^(Key[A-Z]|Digit[0-9]|Arrow(Up|Down|Left|Right)|Shift(Left|Right)|Control(Left|Right)|Alt(Left|Right)|Space|Enter|Tab|Backspace|CapsLock|Minus|Equal|BracketLeft|BracketRight|Backslash|Semicolon|Quote|Comma|Period|Slash|Backquote)$/.test(code);
}
export function keyLabel(code: string) {
    return code.replace(/^Key|^Digit/, '').replace(/([a-z])([A-Z])/g, '$1 $2').toUpperCase();
}
// Swap occupied bindings so every action remains available.
export function rebind(hotkeys: Hotkeys, action: Control, code: string): Hotkeys {
    if (!validHotkey(code)) return hotkeys;
    const next = { ...hotkeys };
    const occupied = (Object.keys(next) as Control[]).find(k => next[k] === code);
    if (occupied) next[occupied] = next[action];
    next[action] = code;
    return next;
}
export function loadHotkeys(value: unknown): Hotkeys {
    let keys = { ...DEFAULT_HOTKEYS };
    if (value && typeof value === 'object') {
        for (const action of Object.keys(keys) as Control[]) {
            const code = (value as Record<string, unknown>)[action];
            if (validHotkey(code)) keys = rebind(keys, action, code);
        }
    }
    return keys;
}
export function controlForCode(code: string, hotkeys: Hotkeys): Control | undefined {
    return (Object.keys(hotkeys) as Control[]).find(action => hotkeys[action] === code);
}
