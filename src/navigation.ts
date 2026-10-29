export const CELL=1.25;
export const COLS=27, ROWS=23;
export type Point={x:number,z:number};
export class HospitalGrid {
  cells=new Uint8Array(COLS*ROWS);
  distances=new Int16Array(COLS*ROWS).fill(-1);
  propCells=new Set<number>();
  beds=[{x:7,z:7},{x:18,z:7},{x:8,z:15},{x:17,z:15}];
  constructor(){
    const carve=(x1:number,z1:number,x2:number,z2:number)=>{for(let z=z1;z<=z2;z++)for(let x=x1;x<=x2;x++)this.cells[z*COLS+x]=1;};
    // Two connected circulation loops and a cross-corridor; wards open into each loop.
    carve(2,2,24,4);carve(2,18,24,20);
    carve(2,2,4,20);carve(12,2,14,20);carve(22,2,24,20);carve(2,10,24,12);
    carve(6,6,10,8);carve(8,5,9,6);carve(16,6,20,8);carve(17,8,18,10);
    carve(6,14,10,16);carve(7,12,8,14);carve(16,14,20,16);carve(18,16,19,18);
    for(const b of this.beds)for(const x of [b.x,b.x+1]){this.cells[b.z*COLS+x]=0;this.propCells.add(b.z*COLS+x);}
  }
  toCell(x:number,z:number){return {x:Math.floor(x/CELL+COLS/2),z:Math.floor(z/CELL+ROWS/2)};}
  center(x:number,z:number):Point{return {x:(x+.5-COLS/2)*CELL,z:(z+.5-ROWS/2)*CELL};}
  walkable(x:number,z:number){return x>=0&&z>=0&&x<COLS&&z<ROWS&&this.cells[z*COLS+x]===1;}
  clear(x:number,z:number,r=.28){
    const a=this.toCell(x-r,z-r),b=this.toCell(x+r,z+r);
    for(let iz=a.z;iz<=b.z;iz++)for(let ix=a.x;ix<=b.x;ix++){
      if(this.walkable(ix,iz))continue;
      const p=this.center(ix,iz),nx=Math.max(p.x-CELL/2,Math.min(x,p.x+CELL/2)),nz=Math.max(p.z-CELL/2,Math.min(z,p.z+CELL/2));
      if((x-nx)**2+(z-nz)**2<r*r)return false;
    }return true;
  }
  move(p:Point,dx:number,dz:number,r=.28){
    if(this.clear(p.x+dx,p.z,r))p.x+=dx;
    if(this.clear(p.x,p.z+dz,r))p.z+=dz;
  }
  lineClear(a:Point,b:Point){
    const n=Math.ceil(Math.hypot(b.x-a.x,b.z-a.z)/.16);
    for(let i=0;i<=n;i++){const t=n?i/n:0,c=this.toCell(a.x+(b.x-a.x)*t,a.z+(b.z-a.z)*t);if(!this.walkable(c.x,c.z))return false;}
    return true;
  }
  rebuild(target:Point){
    this.distances.fill(-1);const c=this.toCell(target.x,target.z);
    if(!this.walkable(c.x,c.z))return;
    const queue=new Int16Array(COLS*ROWS);let head=0,tail=0;const start=c.z*COLS+c.x;queue[tail++]=start;this.distances[start]=0;
    while(head<tail){const i=queue[head++],x=i%COLS,z=Math.floor(i/COLS);
      for(const [dx,dz] of [[1,0],[-1,0],[0,1],[0,-1]]){const xx=x+dx,zz=z+dz,j=zz*COLS+xx;if(!this.walkable(xx,zz)||this.distances[j]>=0)continue;this.distances[j]=this.distances[i]+1;queue[tail++]=j;}
    }
  }
  next(from:Point,target:Point):Point{
    if(this.lineClear(from,target))return target;
    const c=this.toCell(from.x,from.z);let best=this.distances[c.z*COLS+c.x];let result=this.center(c.x,c.z);
    for(const [dx,dz] of [[1,0],[-1,0],[0,1],[0,-1]]){const x=c.x+dx,z=c.z+dz;if(!this.walkable(x,z))continue;const d=this.distances[z*COLS+x];if(d>=0&&(best<0||d<best)){best=d;result=this.center(x,z);}}
    return result;
  }
  wallDistance(origin:Point,direction:Point,max=70){
    // Grid DDA returns the first wall surface, so projectiles cannot cross corners.
    const c=this.toCell(origin.x,origin.z);let x=c.x,z=c.z;
    const sx=direction.x>=0?1:-1,sz=direction.z>=0?1:-1;
    const dx=direction.x===0?Infinity:CELL/Math.abs(direction.x),dz=direction.z===0?Infinity:CELL/Math.abs(direction.z);
    let tx=direction.x===0?Infinity:((x+(sx>0?1:0)-COLS/2)*CELL-origin.x)/direction.x;
    let tz=direction.z===0?Infinity:((z+(sz>0?1:0)-ROWS/2)*CELL-origin.z)/direction.z;
    let t=0;
    while(t<max){if(!this.walkable(x,z))return Math.max(0,t);if(tx<tz){t=tx;tx+=dx;x+=sx;}else{t=tz;tz+=dz;z+=sz;}}
    return max;
  }
}
export function raySphere(ox:number,oy:number,oz:number,dx:number,dy:number,dz:number,cx:number,cy:number,cz:number,r:number){
  const x=ox-cx,y=oy-cy,z=oz-cz,b=x*dx+y*dy+z*dz,c=x*x+y*y+z*z-r*r,disc=b*b-c;
  if(disc<0)return Infinity;const near=-b-Math.sqrt(disc);return near>=0?near:(c<=0?0:Infinity);
}
