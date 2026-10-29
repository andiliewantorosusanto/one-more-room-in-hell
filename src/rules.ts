export type WeaponId = 'rifle' | 'pistol' | 'knife';
export const WEAPONS = {
  rifle: {name:'AK-74M',label:'ASSAULT RIFLE',capacity:30,damage:34,reload:2.5,interval:.105},
  pistol: {name:'XD COMPACT',label:'SIDEARM',capacity:12,damage:25,reload:1.5,interval:.24},
  knife: {name:'COMBAT KNIFE',label:'MELEE',capacity:0,damage:50,reload:0,interval:.65},
} as const;
export const WAVES = [16,28,40,56,72];
export const CAPS = [8,12,16,24,32];
export class WeaponRules {
  current:WeaponId='rifle';
  magazines={rifle:30,pistol:12,knife:0};
  reserve=120;
  cooldown=0;
  reloadRemaining=0;
  get ammo(){return this.magazines[this.current];}
  get reloading(){return this.reloadRemaining>0;}
  get reloadProgress(){return this.reloading?1-this.reloadRemaining/WEAPONS[this.current].reload:0;}
  tick(dt:number){
    this.cooldown=Math.max(0,this.cooldown-dt);
    if(!this.reloading)return false;
    this.reloadRemaining=Math.max(0,this.reloadRemaining-dt);
    if(this.reloading)return false;
    const needed=WEAPONS[this.current].capacity-this.ammo;
    const transfer=this.current==='pistol'?needed:Math.min(needed,this.reserve);
    this.magazines[this.current]+=transfer;
    if(this.current==='rifle')this.reserve-=transfer;
    return true;
  }
  switchTo(id:WeaponId){
    if(id===this.current)return false;
    this.reloadRemaining=0;this.current=id;this.cooldown=.25;return true;
  }
  reload(){
    if(this.current==='knife'||this.reloading||this.ammo===WEAPONS[this.current].capacity)return false;
    if(this.current==='rifle'&&this.reserve===0)return false;
    this.reloadRemaining=WEAPONS[this.current].reload;return true;
  }
  fire(){
    if(this.cooldown>0||this.reloading)return false;
    if(this.current!=='knife'&&this.ammo===0)return false;
    if(this.current!=='knife')this.magazines[this.current]--;
    this.cooldown=WEAPONS[this.current].interval;return true;
  }
  resupply(){this.reserve=Math.min(180,this.reserve+60);}
}
export type Phase='ready'|'wave'|'break'|'won'|'dead';
export class RunRules {
  phase:Phase='ready';wave=0;health=100;spawned=0;alive=0;kills=0;headshots=0;shots=0;hits=0;elapsed=0;breakRemaining=0;
  start(){this.phase='wave';this.wave=1;this.health=100;this.spawned=0;this.alive=0;this.kills=0;this.headshots=0;this.shots=0;this.hits=0;this.elapsed=0;}
  get total(){return WAVES[this.wave-1]??0;}
  get remaining(){return this.total-this.spawned+this.alive;}
  get canSpawn(){return this.phase==='wave'&&this.spawned<this.total&&this.alive<CAPS[this.wave-1];}
  spawn(){if(!this.canSpawn)return false;this.spawned++;this.alive++;return true;}
  kill(headshot=false){
    if(this.phase!=='wave'||this.alive===0)return false;
    this.alive--;this.kills++;if(headshot)this.headshots++;
    if(this.spawned===this.total&&this.alive===0){
      if(this.wave===5)this.phase='won';
      else {this.phase='break';this.breakRemaining=15;this.health=Math.min(100,this.health+25);}
      return true;
    }
    return false;
  }
  damage(amount:number){if(this.phase!=='wave')return;this.health=Math.max(0,this.health-amount);if(this.health===0)this.phase='dead';}
  tick(dt:number){
    if(this.phase==='wave'||this.phase==='break')this.elapsed+=dt;
    if(this.phase!=='break')return false;
    this.breakRemaining-=dt;
    if(this.breakRemaining>0)return false;
    this.wave++;this.spawned=0;this.alive=0;this.phase='wave';return true;
  }
}
