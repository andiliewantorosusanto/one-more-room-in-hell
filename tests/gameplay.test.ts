import test from 'node:test';
import assert from 'node:assert/strict';
import {WeaponRules,RunRules,WAVES,CAPS} from '../src/rules.ts';
import {HospitalGrid,COLS,ROWS,raySphere} from '../src/navigation.ts';
test('rifle ammunition is conserved and an interrupted reload grants nothing',()=>{
 const w=new WeaponRules();for(let i=0;i<30;i++){assert.ok(w.fire());w.tick(.11);}assert.equal(w.ammo,0);assert.equal(w.reserve,120);assert.ok(!w.fire());
 assert.ok(w.reload());w.tick(1);w.switchTo('pistol');assert.equal(w.magazines.rifle,0);assert.equal(w.reserve,120);
 w.switchTo('rifle');w.tick(.3);w.reload();w.tick(2.5);assert.equal(w.ammo,30);assert.equal(w.reserve,90);
 w.reserve=5;w.magazines.rifle=20;w.reload();w.tick(2.5);assert.equal(w.ammo,25);assert.equal(w.reserve,0);assert.ok(!w.reload());
});
test('pistol has unlimited reserve but a finite magazine; knife has cadence',()=>{
 const w=new WeaponRules();w.switchTo('pistol');w.tick(.3);for(let j=0;j<3;j++){for(let i=0;i<12;i++){assert.ok(w.fire());w.tick(.25);}assert.ok(!w.fire());w.reload();w.tick(1.5);assert.equal(w.ammo,12);}assert.equal(w.reserve,120);
 w.switchTo('knife');w.tick(.3);assert.ok(w.fire());assert.ok(!w.fire());w.tick(.65);assert.ok(w.fire());
});
test('all five waves honor population caps, break healing and final victory',()=>{
 const r=new RunRules(),w=new WeaponRules();r.start();r.damage(40);
 for(let wave=1;wave<=5;wave++){
  assert.equal(r.wave,wave);let count=0;
  while(r.phase==='wave'){while(r.canSpawn){r.spawn();count++;assert.ok(r.alive<=CAPS[wave-1]);}r.kill();}
  assert.equal(count,WAVES[wave-1]);
  if(wave<5){assert.equal(r.phase,'break');assert.equal(r.health,wave===1?85:100);w.resupply();assert.ok(w.reserve<=180);assert.ok(!r.tick(14));assert.ok(r.tick(1.01));}
 }
 assert.equal(r.phase,'won');assert.equal(r.kills,212);
});
test('death prevents more damage and wave progression',()=>{const r=new RunRules();r.start();r.damage(100);assert.equal(r.phase,'dead');assert.ok(!r.canSpawn);r.tick(100);assert.equal(r.wave,1);});
test('hospital navigation is connected, walls block shots and movement',()=>{
 const g=new HospitalGrid(),target=g.center(13,11);g.rebuild(target);
 for(let z=0;z<ROWS;z++)for(let x=0;x<COLS;x++)if(g.walkable(x,z))assert.ok(g.distances[z*COLS+x]>=0,`Disconnected ${x},${z}`);
 const p=g.center(4,6),wall=g.center(5,6);assert.ok(!g.lineClear(p,wall));const before={...p};g.move(p,1.3,0);assert.deepEqual(p,before);
 assert.ok(g.wallDistance(before,{x:1,z:0})<1);
 assert.equal(raySphere(0,1,0,0,0,1,0,1,5,.5),4.5);
 assert.equal(raySphere(0,1,0,0,0,1,2,1,5,.5),Infinity);
});
