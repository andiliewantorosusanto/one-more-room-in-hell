import type { GameMode } from '../maps/maps.ts';
export const WAVES = [16, 28, 40, 56, 72];
export const OBJECTIVE_ENEMIES = [12, 20, 28];
export const CAPS = [8, 12, 16, 24, 32];
export const KILL_POINTS = 50, HEADSHOT_BONUS = 25;
export function headshotStreakBonus(streak: number) {
    return Math.min(50, Math.max(0, streak - 1) * 10);
}
export type Phase = 'ready' | 'wave' | 'break' | 'won' | 'dead';
export class RunRules {
    mode: GameMode = 'survival';
    phase: Phase = 'ready';
    wave = 0;
    health = 100;
    spawned = 0;
    alive = 0;
    kills = 0;
    headshots = 0;
    shots = 0;
    hits = 0;
    elapsed = 0;
    points = 0;
    totalEarned = 0;
    headshotStreak = 0;
    bestStreak = 0;
    lastReward = 0;
    lastRewardHeadshot = false;
    rewardSerial = 0;
    get stageCount() {
        return this.mode === 'objective' ? 3 : 5;
    }
    start(mode: GameMode = 'survival') {
        this.mode = mode;
        this.phase = 'wave';
        this.wave = 1;
        this.health = 100;
        this.spawned = 0;
        this.alive = 0;
        this.kills = 0;
        this.headshots = 0;
        this.shots = 0;
        this.hits = 0;
        this.elapsed = 0;
        this.points = 0;
        this.totalEarned = 0;
        this.headshotStreak = 0;
        this.bestStreak = 0;
        this.lastReward = 0;
        this.rewardSerial = 0;
    }
    get total() {
        return (this.mode === 'objective' ? OBJECTIVE_ENEMIES : WAVES)[this.wave - 1] ?? 0;
    }
    get remaining() {
        return this.total - this.spawned + this.alive;
    }
    get canSpawn() {
        return this.phase === 'wave' && this.spawned < this.total && this.alive < CAPS[this.wave - 1];
    }
    spawn() {
        if (!this.canSpawn)
            return false;
        this.spawned++;
        this.alive++;
        return true;
    }
    kill(headshot = false) {
        if (this.phase !== 'wave' || this.alive === 0)
            return false;
        this.alive--;
        this.kills++;
        if (headshot) {
            this.headshots++;
            this.headshotStreak++;
            this.bestStreak = Math.max(this.bestStreak, this.headshotStreak);
        }
        else
            this.headshotStreak = 0;
        this.lastReward = KILL_POINTS + (headshot ? HEADSHOT_BONUS + headshotStreakBonus(this.headshotStreak) : 0);
        this.lastRewardHeadshot = headshot;
        this.rewardSerial++;
        this.points += this.lastReward;
        this.totalEarned += this.lastReward;
        if (this.mode === 'survival' && this.spawned === this.total && this.alive === 0) {
            if (this.wave === this.stageCount)
                this.phase = 'won';
            else {
                this.phase = 'break';
                this.health = Math.min(100, this.health + 25);
            }
            return true;
        }
        return false;
    }
    completeObjective() {
        if (this.mode !== 'objective' || this.phase !== 'wave' || this.remaining !== 0)
            return false;
        this.points += 150;
        this.totalEarned += 150;
        if (this.wave === this.stageCount)
            this.phase = 'won';
        else {
            this.phase = 'break';
            this.health = Math.min(100, this.health + 25);
        }
        return true;
    }
    damage(amount: number) {
        if (this.phase !== 'wave' || amount <= 0)
            return;
        this.headshotStreak = 0;
        this.health = Math.max(0, this.health - amount);
        if (this.health === 0)
            this.phase = 'dead';
    }
    startNextWave() {
        if (this.phase !== 'break' || this.wave >= this.stageCount)
            return false;
        this.wave++;
        this.spawned = 0;
        this.alive = 0;
        this.phase = 'wave';
        return true;
    }
    tick(dt: number) {
        if (this.phase === 'wave')
            this.elapsed += dt;
    }
}
