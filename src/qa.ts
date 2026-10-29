import {Vector3} from '@babylonjs/core';
import type {GameInstance} from './main';
export function setupQA(game:GameInstance){
  const panel=document.createElement('div');panel.id='qa';panel.style.cssText='position:fixed;right:12px;top:150px;background:#071108ed;border:1px solid #9fa97e66;padding:10px;color:#cbd5b0;z-index:20;width:235px;font:10px monospace;pointer-events:auto';
  panel.innerHTML='<b>DEVELOPMENT CHECKS</b><div id="qa-buttons" style="display:flex;flex-wrap:wrap;gap:5px;margin-top:10px"></div><pre id="qa-state" style="white-space:pre-wrap"></pre>';document.body.append(panel);
  const add=(name:string,fn:()=>void)=>{const b=document.createElement('button');b.textContent=name;b.style.cssText='font:10px monospace;padding:6px;';b.onclick=fn;panel.querySelector('#qa-buttons')!.append(b);};
  add('Start test',()=>game.start());
  function target(distance:number){
    game.enemies.reset();game.run.phase='wave';game.run.spawned=1;game.run.alive=1;const p=game.player.position;const point={x:p.x+Math.sin(game.player.yaw)*distance,z:p.z+Math.cos(game.player.yaw)*distance};game.enemies.spawn(point,false);
    const z=game.enemies.zombies.find(z=>z.life==='alive')!;game.player.pitch=0;game.held=false;game.pressed=false;z.debugFrozen=true;game.run.health=100;game.invulnerable=true;game.spawnTimer=99999;
  }
  add('Target 4m',()=>target(4));add('Target 1m',()=>target(1.05));
  add('Aim head',()=>{const z=game.enemies.zombies.find(z=>z.life==='alive');if(!z)return;const h=z.head?.getAbsolutePosition()??new Vector3(z.position.x,1.65,z.position.z);game.player.yaw=Math.atan2(h.x-game.player.position.x,h.z-game.player.position.z);game.player.pitch=-Math.atan2(h.y-1.65,Math.hypot(h.x-game.player.position.x,h.z-game.player.position.z));});
  add('Aim body',()=>{game.player.pitch=.11;});
  add('Fire once',()=>{game.pressed=true;if(game.weapons.current==='rifle'){game.held=true;setTimeout(()=>game.held=false,35);}});
  add('Reload',()=>game.reload());for(const id of ['rifle','pistol','knife'] as const)add(id,()=>game.switch(id));
  add('Clear wave',()=>{game.run.spawned=game.run.total;for(const z of game.enemies.zombies)if(z.life==='alive')game.enemies.damage(z,1000,false,game.run);if(game.run.alive===0&&game.run.phase==='wave'){game.run.alive=1;game.run.kill();}if(game.run.phase==='break')game.weapons.resupply();if(game.run.phase==='won')game.finish();});
  add('Next wave',()=>{if(game.run.phase==='break')game.run.breakRemaining=.01;});
  add('Take damage',()=>game.run.damage(40));add('Fatal damage',()=>game.run.damage(100));
  const stress=()=>{
    game.start();game.run.wave=5;game.run.spawned=32;game.run.alive=32;game.invulnerable=true;game.spawnTimer=9999;game.enemies.reset();game.player.position=game.grid.center(13,11);game.player.previous={...game.player.position};game.player.yaw=0;
    const points=[];for(let z=2;z<=20;z++)for(let x=2;x<=24;x++)if(game.grid.walkable(x,z)){const p=game.grid.center(x,z);const d=Math.hypot(p.x-game.player.position.x,p.z-game.player.position.z);if(d>2&&d<10)points.push(p);}
    for(let i=0;i<32;i++)game.enemies.spawn(points[Math.floor(i*points.length/32)],i%4===0);game.frames=[];game.run.elapsed=0;game.showStats=true;
  };
  add('Stress 32',stress);
  add('Pause',()=>game.pause(true));add('Resume',()=>game.pause(false));
  let checking=false;
  const results=document.createElement('pre');results.id='qa-results';results.style.cssText='white-space:pre-wrap;color:#d5e0ad';panel.append(results);
  async function checks(){
    if(checking)return;checking=true;results.textContent='Running browser integration checks…\n';
    const wait=(ms:number)=>new Promise<void>(r=>setTimeout(r,ms));
    const expect=(condition:boolean,label:string)=>{if(!condition)throw new Error(label);results.textContent+='PASS '+label+'\n';};
    const aim=(head:boolean)=>{const z=game.enemies.zombies.find(z=>z.life==='alive')!;const p=head?z.head!.getAbsolutePosition():new Vector3(z.position.x,1.08,z.position.z);game.player.yaw=Math.atan2(p.x-game.player.position.x,p.z-game.player.position.z);game.player.pitch=-Math.atan2(p.y-1.65,Math.hypot(p.x-game.player.position.x,p.z-game.player.position.z));};
    try{
      game.start();game.invulnerable=true;game.spawnTimer=99999;await wait(400);game.canvas.dispatchEvent(new MouseEvent('mousedown',{button:0,bubbles:true}));window.dispatchEvent(new MouseEvent('mouseup',{button:0,bubbles:true}));await wait(200);expect(game.weapons.ammo===29,'quick mouse click fires a rifle round');target(4);await wait(200);aim(true);game.shoot();await wait(200);
      expect(game.enemies.zombies.find(z=>z.life==='alive')?.health===32,'rifle headshot deals 68');aim(true);game.shoot();await wait(200);expect(game.run.kills===1&&game.run.headshots===1,'second headshot kills and counts');
      target(4);await wait(200);for(let i=0;i<3;i++){aim(false);game.shoot();await wait(180);}expect(game.run.kills===2&&game.run.headshots===1,'three body shots kill without headshot credit');
      const rifleAmmo=game.weapons.ammo,reserve=game.weapons.reserve;game.reload();await wait(300);game.switch('pistol');await wait(300);expect(game.weapons.magazines.rifle===rifleAmmo&&game.weapons.reserve===reserve,'switch cancels reload without free ammunition');
      game.shoot();await wait(300);game.reload();await wait(1700);expect(game.weapons.magazines.pistol===12&&game.weapons.reserve===reserve,'pistol reload uses unlimited reserve');
      game.switch('knife');await wait(300);target(4);await wait(200);game.shoot();await wait(750);expect(game.enemies.zombies.find(z=>z.life==='alive')?.health===100,'knife cannot hit a distant target');
      target(1.05);await wait(200);game.shoot();await wait(300);expect(game.enemies.zombies.find(z=>z.life==='alive')?.health===50,'nearby knife hit deals 50');await wait(450);game.shoot();await wait(300);expect(game.run.kills===3,'second knife hit kills');
      game.player.position=game.grid.center(4,6);game.player.previous={...game.player.position};game.enemies.reset();game.run.alive=1;game.run.spawned=1;game.enemies.spawn(game.grid.center(6,6),false);const blocked=game.enemies.zombies.find(z=>z.life==='alive')!;blocked.debugFrozen=true;game.switch('rifle');await wait(350);aim(false);game.shoot();await wait(200);expect(blocked.health===100,'hospital wall blocks firearm hits');
      game.pause(true);const elapsed=game.run.elapsed;await wait(300);expect(game.run.elapsed===elapsed,'pause freezes simulation time');game.pause(false);await wait(150);expect(game.run.elapsed>elapsed,'resume continues simulation');
      game.start();game.spawnTimer=99999;game.run.damage(100);await wait(100);expect(game.finished&&game.run.phase==='dead','zero health opens death screen');game.start();game.spawnTimer=99999;await wait(100);expect(game.run.health===100&&game.weapons.ammo===30&&game.run.wave===1&&game.run.kills===0,'restart resets run and ammunition');
      for(let wave=1;wave<=5;wave++){game.run.spawned=game.run.total;game.run.alive=1;game.run.kill();if(wave<5){game.weapons.resupply();expect(game.run.phase==='break','wave '+wave+' enters resupply break');game.run.breakRemaining=.01;await wait(100);}}
      await wait(100);expect(game.run.phase==='won'&&game.finished,'fifth wave opens victory screen');results.textContent+='ALL BROWSER CHECKS PASSED';
    }catch(e){results.textContent+='FAIL '+String(e);game.pause(true);console.error('Integration checks:',e);}finally{checking=false;}
  }
  add('Run checks',()=>void checks());
  if(new URLSearchParams(location.search).get('qa')==='checks')setTimeout(()=>void checks(),700);
  if(new URLSearchParams(location.search).get('qa')==='stress')setTimeout(stress,700);
  setInterval(()=>{const m=game.metrics();panel.querySelector('#qa-state')!.textContent=JSON.stringify({phase:game.run.phase,wave:game.run.wave,health:game.run.health,weapon:game.weapons.current,ammo:game.weapons.ammo,reserve:game.weapons.reserve,reload:+game.weapons.reloadRemaining.toFixed(2),kills:game.run.kills,headshots:game.run.headshots,targets:game.enemies.zombies.filter(z=>z.life==='alive').slice(0,3).map(z=>({hp:z.health,head:z.head?.getAbsolutePosition().asArray().map(n=>+n.toFixed(2))})),...m},null,1);},500);
}
