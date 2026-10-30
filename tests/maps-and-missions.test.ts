import test from 'node:test';
import assert from 'node:assert/strict';
import { MAPS, getMap } from '../src/maps/maps.ts';
import { WorldGrid, COLS, ROWS } from '../src/world/navigation.ts';
import { RunRules, OBJECTIVE_ENEMIES } from '../src/game/run-rules.ts';
import { ObjectiveRules } from '../src/game/objective-rules.ts';
import { chooseEnemyKind, ENEMY_TYPES, flyerAltitude } from '../src/enemies/enemy-rules.ts';
test('each map connects its spawn, entrances, objectives and all walkable cells', () => {
    for (const map of MAPS) {
        const grid = new WorldGrid(map), spawn = grid.center(...map.spawn);
        grid.rebuild(spawn);
        assert.ok(grid.clear(spawn.x, spawn.z));
        for (let z = 0; z < ROWS; z++)
            for (let x = 0; x < COLS; x++)
                if (grid.walkable(x, z))
                    assert.ok(grid.distances[z * COLS + x] >= 0, `${map.id} disconnected ${x},${z}`);
        for (const [x, z] of [...map.entrances, ...map.objectives.map(g => g.cell)])
            assert.ok(grid.walkable(x, z), `${map.id} invalid encounter point ${x},${z}`);
    }
    assert.notDeepEqual(new WorldGrid(MAPS[0]).cells, new WorldGrid(MAPS[1]).cells);
    assert.equal(getMap('unknown').id, 'hospital');
});
test('changing maps clears the previous collision and flow data', () => {
    const grid = new WorldGrid();
    grid.rebuild(grid.center(...grid.map.spawn));
    grid.configure(getMap('depot'));
    assert.deepEqual(grid.cells, new WorldGrid(getMap('depot')).cells);
    assert.ok(grid.distances.every(d => d === -1));
    assert.equal(grid.obstacles.length, getMap('depot').obstacles.length);
    assert.equal(grid.obstacles.length, 16);
});
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
test('flying infected enter from stage two and remain within their shared population budget', () => {
    for (let i = 0; i < 40; i++)
        assert.notEqual(chooseEnemyKind(1, i, 0, .5), 'flyer');
    assert.equal(chooseEnemyKind(2, 6, 0, .5), 'flyer');
    assert.notEqual(chooseEnemyKind(5, 6, 4, .5), 'flyer');
    assert.equal(chooseEnemyKind(5, 1, 0, .1), 'runner');
    assert.ok(ENEMY_TYPES.flyer.health < ENEMY_TYPES.shambler.health);
    assert.ok(ENEMY_TYPES.flyer.speed > ENEMY_TYPES.runner.speed);
    assert.ok(flyerAltitude(1, 6, false) > 1);
    assert.ok(flyerAltitude(1, 1, false) < .6);
    assert.ok(flyerAltitude(1, 1, true) < .6);
});
