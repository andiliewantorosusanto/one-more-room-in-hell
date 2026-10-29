import {Engine,Scene,Color4,Color3,HemisphericLight,Vector3,ArcRotateCamera,SceneLoader,Mesh} from '@babylonjs/core';
import '@babylonjs/loaders/glTF';

const canvas=document.querySelector<HTMLCanvasElement>('#game')!;
canvas.style.cssText='width:100%;height:100%;display:block';
document.body.style.cssText='margin:0;background:#121816;color:#eee;font:14px system-ui;overflow:hidden';
canvas.style.position='fixed';canvas.style.inset='0';
const engine=new Engine(canvas,true,{preserveDrawingBuffer:true,stencil:true},false);
const scene=new Scene(engine);scene.clearColor=new Color4(.13,.16,.15,1);
const camera=new ArcRotateCamera('lab',-Math.PI/2,Math.PI/2.4,2,Vector3.Zero(),scene);camera.attachControl(canvas,true);camera.minZ=.001;
const l=new HemisphericLight('labLight',new Vector3(.2,1,-.7),scene);l.intensity=1.5;l.groundColor=new Color3(.4,.4,.4);
const ui=document.querySelector<HTMLDivElement>('#app')!;ui.style.cssText='position:fixed;left:24px;top:24px;z-index:3';
ui.innerHTML='<h1>Asset validation</h1><p id="info">Loading…</p><button id="rifle">Rifle</button> <button id="pistol">Pistol</button> <button id="knife">Knife</button> <button id="zombie">Zombie</button><div id="clips"></div>';
let current:Awaited<ReturnType<typeof SceneLoader.ImportMeshAsync>>|null=null;
async function load(name:string){
 if(current){current.animationGroups.forEach(g=>g.dispose());current.meshes.forEach(m=>m.dispose());}
 current=await SceneLoader.ImportMeshAsync('','/assets/',name+'.glb',scene);
 const meshes=current.meshes.filter((m):m is Mesh=>m instanceof Mesh&&m.getTotalVertices()>0);
 const bounds=meshes.map(m=>{m.computeWorldMatrix(true);return m.getBoundingInfo().boundingBox;});
 const lo=bounds.reduce((a,b)=>Vector3.Minimize(a,b.minimumWorld),new Vector3(Infinity,Infinity,Infinity));
 const hi=bounds.reduce((a,b)=>Vector3.Maximize(a,b.maximumWorld),new Vector3(-Infinity,-Infinity,-Infinity));
 camera.target=lo.add(hi).scale(.5);camera.radius=Vector3.Distance(lo,hi)*1.05;
 document.querySelector('#info')!.textContent=name+' • '+meshes.reduce((n,m)=>n+m.getTotalVertices(),0)+' vertices • bounds '+lo.toString()+' / '+hi.toString();
 document.querySelector('#clips')!.innerHTML='';
 for(const g of current.animationGroups){
  const b=document.createElement('button');b.textContent=g.name;b.onclick=()=>{current!.animationGroups.forEach(a=>a.stop());g.start(true)};document.querySelector('#clips')!.append(b);
 }
 current.animationGroups.forEach(g=>g.stop());const idle=current.animationGroups.find(g=>/idle/i.test(g.name));idle?.start(true);
 (window as any).lab={scene,camera,current,engine};
}
for(const n of ['rifle','pistol','knife','zombie'])document.getElementById(n)!.onclick=()=>load(n).catch(console.error);
load('rifle');engine.runRenderLoop(()=>scene.render());window.addEventListener('resize',()=>engine.resize());
