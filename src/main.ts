import {Engine,Scene,Vector3} from '@babylonjs/core';
import './style.css';
import '@babylonjs/core/Shaders/default.vertex';
import '@babylonjs/core/Shaders/default.fragment';
import '@babylonjs/core/Shaders/pbr.vertex';
import '@babylonjs/core/Shaders/pbr.fragment';
import {UI,type Settings} from './ui';
import {HospitalGrid} from './navigation';
import {HospitalWorld} from './world';
import {RunRules,WeaponRules,WEAPONS,type WeaponId} from './rules';
import {Player} from './player';
import {WeaponView} from './weapon-view';
import {GameAudio} from './audio';
import {Enemies} from './enemies';
import {Effects} from './effects';

class Game {
  canvas=document.getElementById('game') as HTMLCanvasElement;
  engine:Engine;scene:Scene;grid=new HospitalGrid();run=new RunRules();weapons=new WeaponRules();player:Player;world:HospitalWorld;view:WeaponView;audio=new GameAudio();enemies:Enemies;effects:Effects;
  keys=new Set<string>();paused=false;loaded=false;aiming=false;held=false;pressed=false;accumulator=0;last=performance.now();spawnTimer=2;navTimer=0;footstep=0;clock=0;pendingMelee=0;reloadSounds=0;finished=false;frames:number[]=[];showStats=false;metricsTimer=0;
  qa=(import.meta.env.DEV||import.meta.env.MODE==='qa')&&new URLSearchParams(location.search).has('qa');invulnerable=false;fallbackLook=false;
  constructor(public ui:UI){
    this.engine=new Engine(this.canvas,true,{preserveDrawingBuffer:true,stencil:true,powerPreference:'high-performance'},false);
    if(this.engine.webGLVersion<2)throw new Error('WebGL2 is required. Please enable hardware acceleration in a desktop browser.');
    this.scene=new Scene(this.engine);this.scene.setRenderingAutoClearDepthStencil(2,true,true,true);
    this.player=new Player(this.grid,this.scene);this.scene.activeCamera=this.player.camera;
    this.world=new HospitalWorld(this.scene,this.grid);this.view=new WeaponView(this.scene,this.player.camera);this.enemies=new Enemies(this.scene,this.grid,this.audio);this.effects=new Effects(this.scene);
    this.canvas.tabIndex=0;
    this.ui.onStart=()=>this.start();this.ui.onRestart=()=>this.start();this.ui.onResume=()=>this.capture();this.ui.onSettings=s=>this.settings(s);
    this.settings(ui.settings);this.bind();
    this.engine.runRenderLoop(()=>this.frame());window.addEventListener('resize',()=>this.resize());
  }
  async load(){
    let done=0;const progress=()=>this.ui.loading(++done,20);
    await Promise.all([this.world.build(progress),this.audio.load(progress),this.view.load(progress),this.enemies.load(progress)]);
    this.ui.loading(20,20,'Checking equipment…');await this.scene.whenReadyAsync();await this.view.warm();await this.enemies.warm();
    this.view.models.forEach(m=>m.pivot.setEnabled(false));
    this.loaded=true;this.player.pitch=.035;this.player.yaw=Math.PI-.06;
    this.enemies.spawn(this.grid.center(13,9),false);this.enemies.spawn(this.grid.center(12,5),false);
    this.ui.ready();if(this.qa){const {setupQA}=await import('./qa');setupQA(this);}
  }
  settings(s:Settings){this.audio.setVolume(s.volume);this.player.sensitivity=s.sensitivity;this.world.setQuality(s.quality);this.resize();}
  resize(){const limit=this.ui.settings.quality==='low'?960:this.ui.settings.quality==='high'?1920:1280;const scale=Math.max(1,this.canvas.clientWidth/limit,this.canvas.clientHeight/(limit*9/16));this.engine.setHardwareScalingLevel(scale);this.engine.resize();}
  start(){
    if(!this.loaded)return;this.enemies.reset();this.effects.reset();this.run=new RunRules();this.weapons=new WeaponRules();this.run.start();this.player.reset();this.view.equip('rifle');this.spawnTimer=2.5;this.navTimer=0;this.pendingMelee=0;this.reloadSounds=0;this.finished=false;this.invulnerable=false;this.fallbackLook=false;this.ui.mouseMode(false);this.clock=0;this.accumulator=0;this.frames=[];this.keys.clear();this.held=false;this.pressed=false;this.aiming=false;
    this.ui.showGame();this.ui.announce(1,16);this.capture();
  }
  capture(){
    void this.audio.unlock();this.canvas.focus();
    if(this.qa){this.pause(false);return;}
    const fallback=()=>{this.fallbackLook=true;this.ui.mouseMode(true);this.pause(false);};
    try{const request=this.canvas.requestPointerLock();if(request)request.catch(fallback);}catch{fallback();}
  }
  pause(value:boolean){
    if(this.finished||this.run.phase==='ready')return;
    this.paused=value;this.ui.setPaused(value);this.keys.clear();this.held=false;this.pressed=false;this.aiming=false;this.accumulator=0;
    this.scene.animationsEnabled=!value;if(value)this.audio.suspend();else void this.audio.unlock();
  }
  bind(){
    document.addEventListener('pointerlockchange',()=>{if(this.run.phase==='wave'||this.run.phase==='break'){if(document.pointerLockElement===this.canvas){this.fallbackLook=false;this.ui.mouseMode(false);this.pause(false);}else if(!this.fallbackLook)this.pause(true);}});
    document.addEventListener('visibilitychange',()=>{if(document.hidden){if(document.pointerLockElement)document.exitPointerLock();this.pause(true);}});
    window.addEventListener('blur',()=>{if(!this.qa)this.pause(true);});
    window.addEventListener('keydown',e=>{
      if(e.code==='F3'){e.preventDefault();this.showStats=!this.showStats;return;}
      if(e.code==='Escape'){if(this.ui.closeDialog())return;if(!this.finished&&this.run.phase!=='ready'){this.pause(true);if(document.pointerLockElement)document.exitPointerLock();}return;}
      if(this.paused||this.finished||this.run.phase==='ready')return;
      if(['KeyW','KeyA','KeyS','KeyD','ShiftLeft','KeyR','Digit1','Digit2','Digit3'].includes(e.code))e.preventDefault();
      this.keys.add(e.code);if(e.repeat)return;
      if(e.code==='KeyR')this.reload();const ids:Record<string,WeaponId>={Digit1:'rifle',Digit2:'pistol',Digit3:'knife'};if(ids[e.code])this.switch(ids[e.code]);
    });
    window.addEventListener('keyup',e=>this.keys.delete(e.code));
    document.addEventListener('mousemove',e=>{if(!this.paused&&!this.finished&&(document.pointerLockElement===this.canvas||this.fallbackLook&&(e.buttons&2)!==0))this.player.look(e.movementX,e.movementY);});
    this.canvas.addEventListener('mousedown',e=>{if(!this.playing())return;if(!this.qa&&!this.fallbackLook&&document.pointerLockElement!==this.canvas)return;if(e.button===0){this.held=true;this.pressed=true;}if(e.button===2)this.aiming=this.weapons.current!=='knife';});
    window.addEventListener('mouseup',e=>{if(e.button===0)this.held=false;if(e.button===2)this.aiming=false;});
    this.canvas.addEventListener('contextmenu',e=>e.preventDefault());
    this.canvas.addEventListener('wheel',e=>{if(!this.playing())return;e.preventDefault();const ids:WeaponId[]=['rifle','pistol','knife'];this.switch(ids[(ids.indexOf(this.weapons.current)+(e.deltaY>0?1:2))%3]);},{passive:false});
  }
  playing(){return this.loaded&&!this.paused&&!this.finished&&(this.run.phase==='wave'||this.run.phase==='break');}
  switch(id:WeaponId){if(this.weapons.switchTo(id)){this.pendingMelee=0;this.view.equip(id);this.audio.play('equip',.18);this.aiming=false;this.reloadSounds=0;}}
  reload(){if(this.weapons.reload()){this.view.reload(this.weapons.current);this.reloadSounds=0;}}
  shoot(){
    const id=this.weapons.current;
    if(!this.weapons.fire())return;
    this.view.attack(id);
    if(id==='knife'){this.pendingMelee=.18;this.audio.play('knife',.4);return;}
    this.audio.play(id,.65,undefined,.98+Math.random()*.04);this.run.shots++;
    const pitch=this.player.pitch-this.view.recoil,spread=this.aiming?.0015:.006;
    const yaw=this.player.yaw+(Math.random()-.5)*spread,p=pitch+(Math.random()-.5)*spread;
    const direction=new Vector3(Math.sin(yaw)*Math.cos(p),-Math.sin(p),Math.cos(yaw)*Math.cos(p));const origin=new Vector3(this.player.position.x,1.65,this.player.position.z);
    let distance=this.grid.wallDistance(origin,{x:direction.x,z:direction.z});
    if(direction.y>0)distance=Math.min(distance,(3.16-origin.y)/direction.y);else if(direction.y<0)distance=Math.min(distance,-origin.y/direction.y);
    const hit=this.enemies.hit(origin,direction,distance);
    if(hit){const killed=this.enemies.damage(hit.zombie,WEAPONS[id].damage*(hit.head?2:1),hit.head,this.run);this.effects.blood(origin.add(direction.scale(hit.distance)),direction);this.audio.play('impact',.2,hit.zombie.position);this.ui.hit(killed,hit.head);this.run.hits++;}
  }
  simulate(dt:number){
    const oldPhase=this.run.phase,health=this.run.health;
    if(this.run.tick(dt)){this.ui.announce(this.run.wave,this.run.total);this.spawnTimer=1.5;}
    this.weapons.tick(dt);
    if(this.weapons.reloading){const p=this.weapons.reloadProgress;const stage=p>.84?3:p>.53?2:p>.17?1:0;if(stage>this.reloadSounds){this.audio.play('reload',.3,undefined,.85+stage*.1);this.reloadSounds=stage;}}
    this.player.update(dt,this.keys,this.aiming,this.weapons.cooldown===0&&!this.weapons.reloading);
    this.audio.listener=this.player.position;this.audio.yaw=this.player.yaw;
    if(this.player.moving){this.footstep-=dt;if(this.footstep<=0){this.audio.play('step'+(1+Math.floor(Math.random()*4)),this.player.sprinting?.19:.12);this.footstep=this.player.sprinting?.28:.44;}}else this.footstep=0;
    if((this.weapons.current==='rifle'?(this.held||this.pressed):this.pressed)&&this.run.phase==='wave')this.shoot();this.pressed=false;
    if(this.pendingMelee>0){this.pendingMelee-=dt;if(this.pendingMelee<=0&&this.weapons.current==='knife'){const hit=this.enemies.melee(this.player.position,this.player.yaw);if(hit){const killed=this.enemies.damage(hit,50,false,this.run);this.effects.blood(new Vector3(hit.position.x,1.2,hit.position.z),new Vector3(Math.sin(this.player.yaw),0,Math.cos(this.player.yaw)));this.audio.play('impact',.4,hit.position);this.ui.hit(killed,false);}}}
    this.navTimer-=dt;if(this.navTimer<=0){this.grid.rebuild(this.player.position);this.navTimer=.2;}
    this.spawnTimer-=dt;
    if(this.spawnTimer<=0&&this.run.canSpawn){
      const locations=[[3,3],[23,3],[3,19],[23,19],[3,11],[23,11]].map(([x,z])=>this.grid.center(x,z));
      locations.sort((a,b)=>{const score=(p:{x:number,z:number})=>Math.hypot(p.x-this.player.position.x,p.z-this.player.position.z)+(this.grid.lineClear(p,this.player.position)?0:20);return score(b)-score(a);});
      const p=locations[Math.floor(Math.random()*Math.min(3,locations.length))];const rate=[0,.1,.15,.2,.25][this.run.wave-1];
      if(this.enemies.spawn(p,Math.random()<rate))this.run.spawn();this.spawnTimer=Math.max(.35,.9-this.run.wave*.08);
    }
    this.enemies.update(dt,this.player.position,this.run);
    if(this.invulnerable&&this.run.phase==='dead'){this.run.phase='wave';this.run.health=100;}
    if(this.run.health<health)this.ui.damage();
    if(oldPhase==='wave'&&this.run.phase==='break')this.weapons.resupply();
    if(this.run.phase==='won'||this.run.phase==='dead')this.finish();
  }
  finish(){if(this.finished)return;this.finished=true;this.held=false;this.aiming=false;this.keys.clear();this.ui.finish(this.run);if(document.pointerLockElement)document.exitPointerLock();}
  metrics(){const sorted=[...this.frames].sort((a,b)=>a-b);const mean=this.frames.reduce((a,b)=>a+b,0)/Math.max(1,this.frames.length);return {samples:this.frames.length,seconds:Math.round(this.frames.reduce((a,b)=>a+b,0)/1000),fps:mean>0?Math.round(1000/mean):0,p95:+(sorted[Math.floor(sorted.length*.95)]||0).toFixed(1),stalls:this.frames.filter(t=>t>50).length,active:this.enemies.zombies.filter(z=>z.life==='alive').length,resolution:`${this.engine.getRenderWidth()} × ${this.engine.getRenderHeight()}`};}
  frame(){
    const now=performance.now(),rawDelta=(now-this.last)/1000,delta=Math.min(.1,rawDelta);this.last=now;this.clock+=delta;
    if(!this.finished&&(this.run.phase==='dead'||this.run.phase==='won'))this.finish();
    if(this.playing()){
      if(this.run.elapsed>10){this.frames.push(rawDelta*1000);if(this.frames.length>18000)this.frames.shift();}
      this.accumulator+=delta;let iterations=0;while(this.accumulator>=1/60&&iterations++<6){this.simulate(1/60);this.accumulator-=1/60;if(this.finished)break;}
      this.player.render(this.accumulator/(1/60),delta,this.aiming,this.view.recoil,this.ui.settings.reducedMotion);this.enemies.render(this.accumulator/(1/60));
      this.view.update(delta,this.weapons,this.player.moving,this.player.sprinting,this.aiming,this.clock,this.ui.settings.reducedMotion);this.ui.render(this.run,this.weapons,delta,this.aiming);
    }else if(this.run.phase==='ready'){this.player.render(1,delta,false);this.enemies.update(delta,this.player.position,this.run);}
    if(!this.paused)this.effects.update(delta);
    const direction=this.player.camera.getForwardRay(1).direction;this.world.update(delta,this.player.camera.position,direction);
    this.scene.render();
    this.metricsTimer-=delta;if(this.metricsTimer<=0){this.metricsTimer=.5;const el=document.getElementById('performance')!;el.classList.toggle('hidden',!this.showStats);if(this.showStats){const m=this.metrics();el.textContent=`${m.fps||Math.round(this.engine.getFps())} FPS · P95 ${m.p95} ms\n${m.active} INFECTED · ${m.resolution}\n${m.seconds}s SAMPLED · ${m.stalls} FRAMES >50ms`;}}
  }
}
export type GameInstance=Game;

if(new URLSearchParams(location.search).has('lab')){
  await import('./asset-lab');
}else{
  const ui=new UI();
  try{const game=new Game(ui);await game.load();}catch(e){ui.fail(e);}
}
