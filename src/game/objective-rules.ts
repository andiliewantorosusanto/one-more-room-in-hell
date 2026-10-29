import type { RunRules } from './run-rules.ts';
/** Holding an objective requires a cleared encounter, reach, and an unobstructed path. */
export class ObjectiveRules {
    progress = 0;
    private stage = 0;
    reset() {
        this.progress = 0;
        this.stage = 0;
    }
    update(dt: number, run: RunRules, distance: number, clear: boolean, held: boolean, hold: number) {
        if (this.stage !== run.wave) {
            this.progress = 0;
            this.stage = run.wave;
        }
        if (run.mode !== 'objective' || run.phase !== 'wave' || run.remaining !== 0 || distance > 1.65 || !clear || !held) {
            this.progress = 0;
            return false;
        }
        this.progress = Math.min(hold, this.progress + dt);
        if (this.progress + 1e-6 < hold)
            return false;
        this.progress = 0;
        return run.completeObjective();
    }
}
