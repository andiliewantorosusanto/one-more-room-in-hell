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
