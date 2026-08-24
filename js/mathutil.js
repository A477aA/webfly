// webfly — mathutil
// (модуль загружается классическим <script>; глобальное состояние общее)

/* ---------- рельеф ---------- */
function hash2(x,y){ const n=Math.sin(x*127.1+y*311.7)*43758.5453123; return n-Math.floor(n); }

function vnoise(x,y){ const xi=Math.floor(x),yi=Math.floor(y),xf=x-xi,yf=y-yi;
  const u=xf*xf*(3-2*xf),v=yf*yf*(3-2*yf);
  const a=hash2(xi,yi),b=hash2(xi+1,yi),c=hash2(xi,yi+1),d=hash2(xi+1,yi+1);
  return a*(1-u)*(1-v)+b*u*(1-v)+c*(1-u)*v+d*u*v; }

function fbm(x,y){ let s=0,amp=0.5,f=1; for(let o=0;o<5;o++){s+=amp*vnoise(x*f,y*f);f*=2;amp*=0.5;} return s; }

function terrainHeight(x,z){
  const h=(fbm(x*0.00035+50,z*0.00035+50)-0.42)*540;
  // кромка берега приподнята над плоскостью воды (-0.6), а дно уходит вниз —
  // так суша и вода нигде не лежат в одной плоскости и не мерцают
  return h>0 ? h+0.9 : h-1.2;
}

function findSpot(cond){
  for(let r=1800;r<7500;r+=450) for(let a=0;a<6.283;a+=0.5){
    const x=Math.sin(a)*r, z=-2000-Math.cos(a)*r*0.7, h=terrainHeight(x,z);
    if(cond(h)) return {x,z,h};
  }
  return {x:0,z:-5000,h:Math.max(terrainHeight(0,-5000),4)};
}

function leadShot(from,target,tgtVel,speed){
  const d=target.distanceTo(from), t=d/speed;
  return target.clone().addScaledVector(tgtVel||new V3(),t).sub(from).normalize();
}
