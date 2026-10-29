import {Scene,SceneLoader,TransformNode,Vector3,UniversalCamera,AnimationGroup,Mesh,Color3,StandardMaterial,MeshBuilder} from '@babylonjs/core';
import '@babylonjs/loaders/glTF';
import {WEAPONS,type WeaponId,WeaponRules} from './rules';
type Model={pivot:TransformNode,groups:AnimationGroup[],current?:AnimationGroup,base:Vector3};
export class WeaponView {
  models=new Map<WeaponId,Model>();
  recoil=0;private flash:Mesh;private flashTime=0;private actionTime=0;private lastMove='';
  constructor(private scene:Scene,private camera:UniversalCamera){
    const mat=new StandardMaterial('muzzle',scene);mat.emissiveColor=new Color3(1,.68,.2);mat.disableLighting=true;mat.alpha=.9;
    this.flash=MeshBuilder.CreatePlane('flash',{size:.12},scene);this.flash.material=mat;this.flash.parent=camera;this.flash.position.set(.1,-.035,.8);this.flash.renderingGroupId=2;this.flash.setEnabled(false);
  }
  async load(progress:()=>void){
    await Promise.all((['rifle','pistol','knife'] as WeaponId[]).map(async id=>{
      const data=await SceneLoader.ImportMeshAsync('','/assets/',id+'.glb',this.scene);
      data.animationGroups.forEach(g=>g.stop());
      const pivot=new TransformNode(id+'-view',this.scene);pivot.parent=this.camera;
      const root=data.meshes[0];root.parent=pivot;
      const scale=id==='rifle'?.8:id==='pistol'?1.8:1;
      // Preserve the handedness conversion on the imported glTF root.
      root.scaling.scaleInPlace(scale);
      const base=id==='rifle'?new Vector3(.2,-.5,.3):id==='pistol'?new Vector3(.09,-.24,.22):new Vector3(0,-.15,.2);
      pivot.position.copyFrom(base);
      for(const m of data.meshes){m.isPickable=false;m.renderingGroupId=2;m.alwaysSelectAsActiveMesh=true;}
      const model={pivot,groups:data.animationGroups,base};this.models.set(id,model);pivot.setEnabled(false);
      progress();
    }));this.equip('rifle');
  }
  private find(id:WeaponId,kind:string){
    const m=this.models.get(id)!;
    const patterns:Record<string,RegExp>={idle:/idle/i,walk:/walk/i,run:/run/i,fire:/shot|fire|knife_attack|attack_knife/i,reload:/reload(?:_easy)?$/i,draw:/draw|take/i};
    return m.groups.find(g=>(patterns[kind]??/idle/i).test(g.name));
  }
  play(id:WeaponId,kind:string,loop=false,duration?:number){
    const m=this.models.get(id)!;const g=this.find(id,kind);if(!g){if(id==='knife'&&kind==='idle'){const rest=this.find(id,'fire')!;if(m.current===rest&&!rest.isPlaying)return;for(const a of m.groups)a.stop();rest.start(false);rest.goToFrame(rest.from);rest.pause();m.current=rest;}return;}
    if(m.current===g&&g.isPlaying&&loop)return;
    for(const a of m.groups)if(a!==g)a.stop();g.stop();
    m.current=g;g.start(loop,duration?g.getLength()/duration:1);
  }
  equip(id:WeaponId){for(const [key,m] of this.models)m.pivot.setEnabled(key===id);this.play(id,'idle',true);this.actionTime=.25;this.lastMove='';this.flashTime=0;}
  attack(id:WeaponId){this.play(id,'fire',false,id==='knife'?.65:undefined);this.actionTime=id==='knife'?.65:.13;if(id!=='knife'){this.recoil+=id==='rifle'?.014:.022;this.flashTime=.035;}}
  reload(id:WeaponId){this.play(id,'reload',false,WEAPONS[id].reload);this.actionTime=WEAPONS[id].reload;}
  update(dt:number,state:WeaponRules,moving:boolean,sprinting:boolean,aiming:boolean,time:number,reducedMotion=false){
    this.recoil*=Math.exp(-dt*15);this.flashTime-=dt;this.flash.setEnabled(this.flashTime>0);
    this.actionTime=Math.max(0,this.actionTime-dt);
    const m=this.models.get(state.current);if(!m)return;
    if(this.actionTime===0&&!state.reloading){const kind=sprinting&&this.find(state.current,'run')?'run':moving&&this.find(state.current,'walk')?'walk':'idle';this.play(state.current,kind,true);this.lastMove=kind;}
    const sway=reducedMotion?0:Math.sin(time*1.6)*.002;
    m.pivot.position.set(m.base.x+(aiming?-.1:0),m.base.y+(aiming?.07:0)+sway,m.base.z+this.recoil*1.5);
    m.pivot.rotation.x=this.recoil*(reducedMotion?1:2);m.pivot.rotation.z=reducedMotion?0:Math.sin(time*1.2)*.003;
  }
  async warm(){
    for(const m of this.models.values()){
      m.pivot.setEnabled(true);
      await Promise.all(m.pivot.getChildMeshes().map(mesh=>mesh.material?.forceCompilationAsync(mesh)));
      m.pivot.setEnabled(false);
    }this.equip('rifle');
  }
}
