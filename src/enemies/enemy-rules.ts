export type EnemyKind = 'shambler' | 'runner' | 'flyer';
export const ENEMY_TYPES = {
    shambler: {
        health: 100, speed: 1.28, damage: 10
    },
    runner: {
        health: 100, speed: 2.45, damage: 10
    },
    flyer: {
        health: 60, speed: 2.9, damage: 8
    },
} as const;
export function chooseEnemyKind(stage: number, spawned: number, activeFlyers: number, random: number): EnemyKind {
    if (stage >= 2 && spawned % 7 === 6 && activeFlyers < 4)
        return 'flyer';
    return random < [0, .1, .15, .2, .25][Math.min(4, Math.max(0, stage - 1))] ? 'runner' : 'shambler';
}
export function flyerAltitude(age: number, distance: number, attacking: boolean) {
    return attacking ? .28 : distance < 2.6 ? .42 : 1.1 + Math.sin(age * 3.6) * .13;
}

/** Persistent approach roles, with a direct final rush instead of circling forever. */
export function infectedApproach(dx: number, dz: number, age: number, variant: number, runner: boolean) {
    const distance = Math.hypot(dx, dz), side = variant % 2 ? 1 : -1;
    const flank = distance > 3.2 && variant % 4 !== 0 ? side * Math.min(3, distance * .4) : 0;
    const weave = distance > 1.5 ? Math.sin(age * (runner ? 3.4 : 1.8) + variant * 2.1) * (runner ? .48 : .16) : 0;
    const pace = runner ? .9 + Math.max(0, Math.sin(age * 2.3 + variant)) * .5 : .8 + .2 * Math.sin(age * 1.7 + variant) ** 2;
    return { flank, weave, pace };
}
