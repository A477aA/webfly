// webfly — процедурные текстуры (рисуются на canvas, внешних файлов нет)

function softDot(inner){ const s=64,c=document.createElement('canvas');c.width=c.height=s;
  const g=c.getContext('2d');const grd=g.createRadialGradient(s/2,s/2,1,s/2,s/2,s/2);
  grd.addColorStop(0,inner);grd.addColorStop(.4,inner.replace('1)','.6)'));grd.addColorStop(1,'rgba(255,255,255,0)');
  g.fillStyle=grd;g.fillRect(0,0,s,s); const t=new THREE.CanvasTexture(c);t.encoding=THREE.sRGBEncoding;return t; }

function glowTex(){ const s=128,c=document.createElement('canvas');c.width=c.height=s;
  const g=c.getContext('2d');const grd=g.createRadialGradient(s/2,s/2,0,s/2,s/2,s/2);
  grd.addColorStop(0,'rgba(255,255,255,1)');grd.addColorStop(.16,'rgba(255,255,255,.82)');
  grd.addColorStop(.42,'rgba(255,255,255,.32)');grd.addColorStop(.72,'rgba(255,255,255,.08)');
  grd.addColorStop(1,'rgba(255,255,255,0)');
  g.fillStyle=grd; g.beginPath(); g.arc(s/2,s/2,s/2,0,6.2832); g.fill();
  const t=new THREE.CanvasTexture(c);t.encoding=THREE.sRGBEncoding;return t; }

function smokeTex(){ const s=128,c=document.createElement('canvas');c.width=c.height=s;
  const g=c.getContext('2d');
  for(let i=0;i<16;i++){ const x=s/2+(Math.random()-0.5)*s*0.5,y=s/2+(Math.random()-0.5)*s*0.5,r=s*(0.1+Math.random()*0.2);
    const grd=g.createRadialGradient(x,y,0,x,y,r); grd.addColorStop(0,'rgba(255,255,255,.5)');grd.addColorStop(1,'rgba(255,255,255,0)');
    g.fillStyle=grd; g.beginPath(); g.arc(x,y,r,0,6.2832); g.fill(); }
  const t=new THREE.CanvasTexture(c);t.encoding=THREE.sRGBEncoding;return t; }

function sparkTex(){ const s=32,c=document.createElement('canvas');c.width=c.height=s;
  const g=c.getContext('2d');const grd=g.createRadialGradient(s/2,s/2,0,s/2,s/2,s/2);
  grd.addColorStop(0,'rgba(255,255,255,1)');grd.addColorStop(.35,'rgba(255,255,255,.7)');grd.addColorStop(1,'rgba(255,255,255,0)');
  g.fillStyle=grd;g.fillRect(0,0,s,s); const t=new THREE.CanvasTexture(c);t.encoding=THREE.sRGBEncoding;return t; }

function skyEquirect(){ const w=256,h=128,c=document.createElement('canvas');c.width=w;c.height=h;
  const g=c.getContext('2d');const grd=g.createLinearGradient(0,0,0,h);
  grd.addColorStop(0,'#1e63cf');grd.addColorStop(.5,'#5aa0ea');grd.addColorStop(1,'#c9e4fb');
  g.fillStyle=grd;g.fillRect(0,0,w,h); const t=new THREE.CanvasTexture(c);
  t.mapping=THREE.EquirectangularReflectionMapping;t.encoding=THREE.sRGBEncoding;return t; }

function fireTex(){ const s=96,c=document.createElement('canvas');c.width=c.height=s;const g=c.getContext('2d');
  const grd=g.createRadialGradient(s/2,s/2,0,s/2,s/2,s/2);
  grd.addColorStop(0,'rgba(255,255,238,1)');
  grd.addColorStop(0.16,'rgba(255,232,140,0.95)');
  grd.addColorStop(0.40,'rgba(255,150,44,0.72)');
  grd.addColorStop(0.66,'rgba(214,58,20,0.28)');
  grd.addColorStop(0.85,'rgba(120,20,10,0.04)');
  grd.addColorStop(1,'rgba(120,20,10,0)');
  g.fillStyle=grd; g.beginPath(); g.arc(s/2,s/2,s/2,0,6.2832); g.fill();
  const t=new THREE.CanvasTexture(c); t.encoding=THREE.sRGBEncoding; return t; }

function panelTexBase(){
  const W=1024,H=420,c=document.createElement('canvas'); c.width=W;c.height=H;
  const g=c.getContext('2d');
  g.fillStyle='#11161a'; g.fillRect(0,0,W,H);
  // фактура: лёгкий шум и панельные швы
  for(let i=0;i<2600;i++){ g.fillStyle='rgba(255,255,255,'+(Math.random()*0.03)+')';
    g.fillRect(Math.random()*W,Math.random()*H,2,2); }
  g.strokeStyle='#1c242b'; g.lineWidth=3;
  for(let x=0;x<W;x+=128){ g.beginPath(); g.moveTo(x,0); g.lineTo(x,H); g.stroke(); }
  // три многофункциональных индикатора
  const mfd=[[120,70,220,190],[402,55,240,205],[700,70,220,190]];
  for(const [x,y,w,h] of mfd){
    g.fillStyle='#0a0f12'; g.fillRect(x-8,y-8,w+16,h+16);
    g.fillStyle='#08281e'; g.fillRect(x,y,w,h);
    // сетка и «данные» на экране
    g.strokeStyle='rgba(90,255,190,.35)'; g.lineWidth=1.5;
    g.strokeRect(x+6,y+6,w-12,h-12);
    g.beginPath(); g.moveTo(x+w/2,y+8); g.lineTo(x+w/2,y+h-8);
    g.moveTo(x+8,y+h/2); g.lineTo(x+w-8,y+h/2); g.stroke();
    g.fillStyle='rgba(110,255,200,.55)';
    for(let r=0;r<5;r++) g.fillRect(x+16,y+22+r*16,20+Math.random()*70,6);
    g.strokeStyle='rgba(110,255,200,.75)'; g.lineWidth=2;
    g.beginPath(); g.arc(x+w*0.68,y+h*0.62,Math.min(w,h)*0.22,0,Math.PI*2); g.stroke();
    // рамка кнопок вокруг экрана
    g.fillStyle='#2a343c';
    for(let i=0;i<5;i++){ g.fillRect(x+10+i*((w-40)/4),y-26,26,16); g.fillRect(x+10+i*((w-40)/4),y+h+10,26,16); }
  }
  // клавиатурный блок снизу по центру
  g.fillStyle='#1a2129'; g.fillRect(390,300,264,100);
  for(let r=0;r<3;r++)for(let i=0;i<6;i++){
    g.fillStyle=(Math.random()<0.12)?'#2d6f57':'#2a333b';
    g.fillRect(400+i*42,310+r*30,34,22);
  }
  // сигнальные лампы
  const lamps=['#c9452f','#c9a02f','#3fa86a','#3f7ea8'];
  for(let i=0;i<8;i++){ g.fillStyle=lamps[i%4]; g.globalAlpha=0.55+Math.random()*0.4;
    g.fillRect(60+i*14,352,10,14); }
  g.globalAlpha=1;
  const t=new THREE.CanvasTexture(c); t.encoding=THREE.sRGBEncoding; return t;
}

function consoleTex(){
  const W=256,H=512,c=document.createElement('canvas'); c.width=W;c.height=H;
  const g=c.getContext('2d');
  g.fillStyle='#151b21'; g.fillRect(0,0,W,H);
  for(let i=0;i<900;i++){ g.fillStyle='rgba(255,255,255,'+(Math.random()*0.03)+')'; g.fillRect(Math.random()*W,Math.random()*H,2,2); }
  for(let r=0;r<12;r++)for(let i=0;i<4;i++){
    g.fillStyle=(Math.random()<0.15)?'#2d6f57':'#28313a';
    g.fillRect(24+i*52,40+r*36,40,24);
  }
  g.fillStyle='#3a444d'; g.fillRect(20,H-90,W-40,60);
  const t=new THREE.CanvasTexture(c); t.encoding=THREE.sRGBEncoding; return t;
}

function starTex(){
  const S=128,c=document.createElement('canvas'); c.width=c.height=S;
  const g=c.getContext('2d');
  g.clearRect(0,0,S,S);
  const cx=S/2, cy=S/2, R=S*0.44, r=R*0.42;
  const star=(rad1,rad2)=>{ g.beginPath();
    for(let i=0;i<10;i++){ const a=-Math.PI/2+i*Math.PI/5, rr=(i%2?rad2:rad1);
      const x=cx+Math.cos(a)*rr, y=cy+Math.sin(a)*rr; i?g.lineTo(x,y):g.moveTo(x,y); }
    g.closePath(); };
  star(R,r); g.fillStyle='#b81f1f'; g.fill();
  star(R*0.82,r*0.82); g.strokeStyle='#f2f2f2'; g.lineWidth=3; g.stroke();
  const t=new THREE.CanvasTexture(c); t.encoding=THREE.sRGBEncoding; return t;
}

// общая геометрия и материал обломков (создаются один раз)
let DEBRIS_GEO=null, DEBRIS_MAT=null;
function initDebrisRes(){
  DEBRIS_GEO=shared(new THREE.BoxGeometry(1.1,0.35,0.8));
  DEBRIS_MAT=shared(new THREE.MeshStandardMaterial({color:0x4a5058,metalness:0.55,roughness:0.6}));
}
