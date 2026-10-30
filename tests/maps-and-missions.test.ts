import test from 'node:test';
import assert from 'node:assert/strict';
import { RunRules, OBJECTIVE_ENEMIES } from '../src/game/run-rules.ts';
import { ObjectiveRules } from '../src/game/objective-rules.ts';
import { chooseEnemyKind, ENEMY_TYPES } from '../src/enemies/enemy-rules.ts';
test('objective encounters require cleared enemies, reach, line of sight and continuous use', () => {
    const run = new RunRules(), objective = new ObjectiveRules();
    run.start('objective');
    assert.ok(!objective.update(99, run, 0, true, true, 3));
    run.spawned = run.total;
    run.alive = 1;
    run.kill();
    assert.equal(run.phase, 'wave');
    for (const [distance, clear, held] of [[2, true, true], [0, false, true], [0, true, false]] as const) {
        assert.ok(!objective.update(99, run, distance, clear, held, 3));
        assert.equal(objective.progress, 0);
    }
    objective.update(2, run, 0, true, true, 3);
    assert.equal(objective.progress, 2);
    objective.update(.1, run, 0, true, false, 3);
    assert.equal(objective.progress, 0);
    objective.update(2.9, run, 0, true, true, 3);
    assert.equal(run.phase, 'wave');
    assert.ok(objective.update(.1, run, 0, true, true, 3));
    assert.equal(run.phase, 'break');
    assert.equal(run.points, 200);
    assert.ok(!run.completeObjective());
    assert.equal(run.points, 200);
});
test('three objective stages end in extraction; restart retains the chosen mode only when requested', () => {
    const run = new RunRules();
    run.start('objective');
    assert.equal(run.stageCount, 3);
    for (let stage = 1; stage <= 3; stage++) {
        assert.equal(run.total, OBJECTIVE_ENEMIES[stage - 1]);
        run.spawned = run.total;
        run.alive = 1;
        run.kill();
        assert.equal(run.phase, 'wave');
        assert.ok(run.completeObjective());
        if (stage < 3) {
            assert.equal(run.phase, 'break');
            assert.ok(run.startNextWave());
        }
    }
    assert.equal(run.phase, 'won');
    assert.equal(run.totalEarned, 600);
    assert.ok(!run.startNextWave());
    run.start();
    assert.equal(run.mode, 'survival');
    assert.equal(run.stageCount, 5);
    assert.equal(run.points, 0);
});
test('only ground infected are selected with the existing stage probabilities', () => {
    for (let stage = 1; stage <= 5; stage++) {
        for (let random = 0; random < 1; random += .01) assert.ok(['shambler', 'runner'].includes(chooseEnemyKind(stage, 0, random)));
    }
    assert.equal(chooseEnemyKind(1, 0, 0), 'shambler');
    assert.equal(chooseEnemyKind(5, 0, .1), 'runner');
    assert.equal(chooseEnemyKind(5, 0, .5), 'shambler');
    assert.equal(chooseEnemyKind(2, 6, .9), 'runner');
    assert.equal(ENEMY_TYPES.shambler.health, 100);
    assert.equal(ENEMY_TYPES.runner.damage, 10);
});
