import type {Point} from './navigation';
const FILES=['rifle','pistol','reload','knife','impact','equip','ambient','step1','step2','step3','step4','zombie1','zombie2','zombie3','zombie4'];
export class GameAudio {
  context:AudioContext;
  buffers=new Map<string,AudioBuffer>();
  volume=.65;voices=0;listener:Point={x:0,z:0};yaw=0;
  private master:GainNode;
  private ambient:AudioBufferSourceNode|null=null;
  constructor(){this.context=new AudioContext();this.master=this.context.createGain();this.master.connect(this.context.destination);this.master.gain.value=this.volume;}
  async load(progress:()=>void){await Promise.all(FILES.map(async name=>{const r=await fetch(`/assets/audio/${name}.wav`);if(!r.ok)throw new Error(`Missing audio: ${name}`);this.buffers.set(name,await this.context.decodeAudioData(await r.arrayBuffer()));progress();}));}
  async unlock(){await this.context.resume();if(!this.ambient){this.ambient=this.context.createBufferSource();this.ambient.buffer=this.buffers.get('ambient')!;this.ambient.loop=true;const gain=this.context.createGain();gain.gain.value=.035;this.ambient.connect(gain);gain.connect(this.master);this.ambient.start();}}
  setVolume(v:number){this.volume=v;this.master.gain.setTargetAtTime(v,this.context.currentTime,.05);}
  play(name:string,volume=1,position?:Point,rate=1){
    if(this.context.state!=='running'||this.voices>=28)return;
    const buffer=this.buffers.get(name);if(!buffer)return;
    const source=this.context.createBufferSource();source.buffer=buffer;source.playbackRate.value=rate;
    const gain=this.context.createGain();let level=volume;
    if(position){const dx=position.x-this.listener.x,dz=position.z-this.listener.z,d=Math.hypot(dx,dz);level*=1/(1+.17*d);const pan=this.context.createStereoPanner();pan.pan.value=Math.max(-1,Math.min(1,(dx*Math.cos(this.yaw)-dz*Math.sin(this.yaw))/Math.max(1,d)));source.connect(pan);pan.connect(gain);}else source.connect(gain);
    gain.gain.value=level;gain.connect(this.master);this.voices++;source.onended=()=>{this.voices--;source.disconnect();gain.disconnect();};source.start();
  }
  suspend(){if(this.context.state==='running')void this.context.suspend();}
}
