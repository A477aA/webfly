// webfly — effects
// (модуль загружается классическим <script>; глобальное состояние общее)

function showMsg(text,color){
  const el=document.getElementById('msg'); el.textContent=text; el.style.color=color||'#6bffb0'; el.style.opacity=1;
  clearTimeout(showMsg._t); showMsg._t=setTimeout(()=>{el.style.opacity=0;},1300);
}

function spawnSmoke(pos){
  const s=new THREE.Sprite(new THREE.SpriteMaterial({map:TEX.cloud,color:0xdedede,transparent:true,opacity:0.5,depthWrite:false}));
  s.position.copy(pos); s.scale.set(5,5,1); scene.add(s);
  fx.push({mesh:s,life:0.9,max:0.9,grow:18,base:5,fade:true});
}

function puff(pos,color,size,life,vel){
  const s=new THREE.Sprite(new THREE.SpriteMaterial({map:TEX.cloud,color,transparent:true,opacity:0.75,depthWrite:false}));
  s.position.copy(pos); s.scale.set(size,size,1); scene.add(s);
  fx.push({mesh:s,life,max:life,grow:size*2.2,base:size,fade:true,v:vel||new V3(0,4,0),soft:true});
}

// след повреждения: серый дым при <45% HP, чёрный дым + огонь при <22%
// СЛЕД ПОВРЕЖДЁННОЙ МАШИНЫ: три стадии — дым, дым с огнём, факел пламени
function damageTrail(obj,dt){
  const frac=obj.hp/(obj.maxhp||100); if(frac>=0.55)return;
  obj.smk=(obj.smk||0)-dt; if(obj.smk>0)return;
  const heavy=frac<0.35, critical=frac<0.18;
  obj.smk=critical?0.035:(heavy?0.055:0.10);
  const back=obj.fwd?TMP.a.copy(obj.fwd).multiplyScalar(-4):TMP.a.set(0,0,4);
  const jitter=()=>(Math.random()-0.5)*2.2;
  const p=obj.pos.clone().add(back).add(new V3(jitter(),0.4,jitter()));

  // 1) дым: чем тяжелее повреждения, тем гуще и чернее
  const col = critical?0x141414 : (heavy?0x2e2e2e:0x8f8f8f);
  const size= critical?9 : (heavy?7:4.5);
  puff(p, col, size, critical?2.0:1.3,
       new V3(jitter()*2+WIND.x*0.25, 5+Math.random()*5, jitter()*2+WIND.z*0.25));

  // 2) ОГОНЬ из места пробоины — начинается при тяжёлых повреждениях
  if(heavy){
    const fp=obj.pos.clone().add(TMP.b.copy(back).multiplyScalar(0.45))
                            .add(new V3(jitter()*0.8,0.2,jitter()*0.8));
    spawnFlame(fp, critical?3.4:2.2, critical?7:4);
    // раскалённое свечение очага
    fxSprite(TEX.glow,critical?0xff5a1e:0xff8a30,fp,critical?4.5:3,
      {life:0.22,grow:2,add:true});
  }
  // 3) при критических — искры и куски обшивки срываются потоком
  if(critical && Math.random()<0.35){
    const sp=obj.pos.clone().add(back);
    fxSprite(TEX.spark,0xffc86a,sp,1.1+Math.random(),
      {life:0.5+Math.random()*0.4,grow:-0.4,add:true,
       v:new V3(jitter()*8,-2-Math.random()*4,jitter()*8).add(back.clone().multiplyScalar(6)),
       grav:0.9,drag:0.5});
  }
}

// ВЗРЫВ САМОЛЁТА: детонация, разлёт обломков, горящий шлейф падения
function aircraftExplosion(pos,vel,size){
  sndExplosion(pos,size*1.3);
  // 1) детонация: белая вспышка + оранжевое ядро
  fxSprite(TEX.glow,0xffffff,pos,size*0.9,{life:0.12,grow:size*1.6,add:true});
  fxSprite(TEX.glow,0xffb040,pos,size*0.7,{life:0.28,grow:size*2.2,add:true});
  // 2) огненный шар — языки пламени во все стороны
  for(let i=0;i<10;i++){
    const p=pos.clone().add(new V3((Math.random()-0.5)*size*0.5,(Math.random()-0.4)*size*0.4,(Math.random()-0.5)*size*0.5));
    spawnFlame(p,size*(0.4+Math.random()*0.5),size*(1.2+Math.random()*1.4));
  }
  // 3) вспышка топлива — расходящийся огненный фронт
  for(let i=0;i<8;i++){
    const a=i/8*Math.PI*2;
    const dir=new V3(Math.cos(a),0.25+Math.random()*0.4,Math.sin(a)).normalize();
    fxSprite(TEX.glow,0xff7a22,pos.clone(),size*0.45,
      {life:0.42+Math.random()*0.25,grow:size*1.1,add:true,
       v:dir.multiplyScalar(size*1.9),drag:1.2});
  }
  // 4) ОБЛОМКИ: летят по инерции машины, дымят и падают
  const base=vel?vel.clone().multiplyScalar(0.45):new V3();
  const budget=Math.max(0,Math.min(14, 90-debris.length));   // потолок, чтобы не завалить сцену
  for(let i=0;i<budget;i++){
    const dir=new V3(Math.random()-0.5,Math.random()*0.7-0.1,Math.random()-0.5).normalize();
    const v=base.clone().addScaledVector(dir,size*(1.2+Math.random()*2.2));
    const piece=new THREE.Mesh(DEBRIS_GEO,DEBRIS_MAT);
    piece.position.copy(pos); piece.scale.setScalar(0.6+Math.random()*1.5);
    scene.add(piece);
    debris.push({mesh:piece,pos:pos.clone(),vel:v,
      spin:new V3((Math.random()-0.5)*7,(Math.random()-0.5)*7,(Math.random()-0.5)*7),
      life:3.5+Math.random()*2.5, smk:0});
  }
  // 5) дымные клубы на месте взрыва
  for(let i=0;i<7;i++){
    const p=pos.clone().add(new V3((Math.random()-0.5)*size*0.6,(Math.random()-0.3)*size*0.5,(Math.random()-0.5)*size*0.6));
    const col=new THREE.Color().setHSL(0.06,0.18,0.10+Math.random()*0.10);
    fxSprite(TEX.smoke,col,p,size*(0.55+Math.random()*0.5),
      {life:1.6+Math.random()*1.2,grow:size*2.0,
       v:new V3(WIND.x*0.4+(Math.random()-0.5)*size*0.4, size*0.55, WIND.z*0.4+(Math.random()-0.5)*size*0.4),
       drag:0.5,spin:(Math.random()-0.5)*1.3,o0:0.85});
  }
  // 6) искры
  for(let i=0;i<18;i++){
    const dir=new V3(Math.random()-0.5,Math.random()*0.9,Math.random()-0.5).normalize();
    fxSprite(TEX.spark,i%3?0xffcf6a:0xffffff,pos.clone(),1.0+Math.random()*1.5,
      {life:0.5+Math.random()*0.6,grow:-0.4,add:true,
       v:base.clone().addScaledVector(dir,size*(1.5+Math.random()*2.4)),grav:1.1,drag:0.35});
  }
  // 7) ударная волна
  const ring=new THREE.Mesh(new THREE.RingGeometry(size*0.3,size*0.4,32),
    new THREE.MeshBasicMaterial({color:0xffe0a0,transparent:true,side:THREE.DoubleSide,depthWrite:false,blending:THREE.AdditiveBlending}));
  ring.position.copy(pos); ring.lookAt(camera.position); scene.add(ring);
  fx.push({mesh:ring,life:0.42,max:0.42,grow:size*3.4,base:size,fade:true,ring:true});
}

// обновление обломков: падают, крутятся, дымят, разбиваются о землю
function updateDebris(dt){
  for(let i=debris.length-1;i>=0;i--){
    const d=debris[i]; d.life-=dt;
    d.vel.y-=9.81*dt; d.vel.multiplyScalar(1-Math.min(1,0.35*dt));
    d.pos.addScaledVector(d.vel,dt); d.mesh.position.copy(d.pos);
    d.mesh.rotation.x+=d.spin.x*dt; d.mesh.rotation.y+=d.spin.y*dt; d.mesh.rotation.z+=d.spin.z*dt;
    d.smk-=dt;
    if(d.smk<=0){ d.smk=0.09;
      puff(d.pos.clone(),0x3a3a3a,2.2,0.9,new V3(0,2.5,0));
      if(Math.random()<0.4)spawnFlame(d.pos.clone(),1.2,2.5);
    }
    const gh=terrainHeight(d.pos.x,d.pos.z);
    if(d.pos.y<=gh){ explosion(d.pos.clone(),9); removeObject(d.mesh); debris.splice(i,1); continue; }
    if(d.life<=0){ removeObject(d.mesh); debris.splice(i,1); }
  }
}

/* ---------- эффекты ---------- *//* ---------- эффекты ---------- */
// универсальный спрайт-эффект
function fxSprite(tex,color,pos,size,o){
  o=o||{}; const m=new THREE.SpriteMaterial({map:tex,color,transparent:true,depthWrite:false});
  if(o.add)m.blending=THREE.AdditiveBlending;
  if(o.spin!==undefined)m.rotation=Math.random()*6.283;
  const s=new THREE.Sprite(m); s.position.copy(pos); s.scale.set(size,size,1); scene.add(s);
  fx.push({mesh:s,life:o.life||0.5,max:o.life||0.5,grow:(o.grow!==undefined?o.grow:size*2),base:size,
    fade:true,v:o.v,grav:o.grav,drag:o.drag,spin:o.spin,o0:o.o0,soft:o.soft});
}

function spawnFlash(pos,color,size){
  fxSprite(TEX.glow,color,pos,size,{life:0.16,grow:size*2.2,add:true});
}

// одиночный язык пламени (вытянут вверх, мерцает, поднимается)
function spawnFlame(pos,size,rise){
  const m=new THREE.SpriteMaterial({map:TEX.fire,color:0xffffff,transparent:true,depthWrite:false,blending:THREE.AdditiveBlending});
  const s=new THREE.Sprite(m); s.center.set(0.5,0.12);
  s.position.copy(pos); s.scale.set(size,size*2.0,1); scene.add(s);
  fx.push({mesh:s,life:0.28+Math.random()*0.28,max:0.55,grow:-size*0.35,base:size,aspect:2.0,fade:true,
    v:new V3((Math.random()-0.5)*size*0.6,(rise||size*2.2),(Math.random()-0.5)*size*0.6)});
}
// очаг горения: живёт dur секунд, постоянно даёт пламя + столб дыма
function spawnFire(pos,size,dur){ fires.push({pos:pos.clone(),size,life:dur,ft:0,st:0}); }
function updateFires(dt){
  for(let i=fires.length-1;i>=0;i--){ const F=fires[i]; F.life-=dt;
    F.ft-=dt; if(F.ft<=0){ F.ft=0.05;
      spawnFlame(F.pos.clone().add(new V3((Math.random()-0.5)*F.size,0,(Math.random()-0.5)*F.size)),F.size*(0.6+Math.random()*0.6),F.size*2.4); }
    F.st-=dt; if(F.st<=0){ F.st=0.22;
      puff(F.pos.clone().add(new V3(0,F.size*0.6,0)),0x241f1a,F.size*1.0,1.8,new V3(WIND.x*0.5,F.size*1.4,WIND.z*0.5)); }
    if(F.life<=0)fires.splice(i,1);
  }
}

function explosion(pos,size){
  sndExplosion(pos,size);
  // яркая вспышка-ядро
  fxSprite(TEX.glow,0xffffff,pos,size*0.9,{life:0.13,grow:size*1.4,add:true});
  // огненный шар из языков пламени
  const nFlame=Math.min(14,Math.round(4+size/4));
  for(let i=0;i<nFlame;i++){
    const p=pos.clone().add(new V3((Math.random()-0.5)*size*0.6,(Math.random()-0.4)*size*0.4,(Math.random()-0.5)*size*0.6));
    spawnFlame(p,size*(0.5+Math.random()*0.6),size*(1.5+Math.random()*1.8));
  }
  // клубы дыма — весь снос в одну сторону (сдувает с обзора), но густой
  const drift=new V3(Math.random()-0.5,0,Math.random()-0.5).normalize().multiplyScalar(size*1.1).add(WIND);
  const nSmoke=Math.min(9,Math.max(4,Math.round(size/6)));
  for(let i=0;i<nSmoke;i++){
    const p=pos.clone().add(new V3((Math.random()-0.5)*size*0.5,(Math.random()-0.2)*size*0.4,(Math.random()-0.5)*size*0.5));
    const col=new THREE.Color().setHSL(0.07,0.15,0.11+Math.random()*0.11);
    fxSprite(TEX.smoke,col,p,size*(0.6+Math.random()*0.5),{life:1.4+Math.random()*1.3,grow:size*(1.9+Math.random()*1.2),
      v:drift.clone().add(new V3((Math.random()-0.5)*size*0.25,size*(0.35+Math.random()*0.5),(Math.random()-0.5)*size*0.25)),drag:0.28,spin:(Math.random()-0.5)*1.4,o0:0.85});
  }
  // искры/обломки
  const nSpark=Math.min(22,Math.round(8+size/4));
  for(let i=0;i<nSpark;i++){
    const dir=new V3(Math.random()-0.5,Math.random()*0.9+0.1,Math.random()-0.5).normalize();
    fxSprite(TEX.spark,i%3?0xffcf6a:0xffffff,pos.clone(),1.1+Math.random()*1.6,
      {life:0.5+Math.random()*0.7,grow:-0.4,add:true,v:dir.multiplyScalar(size*(1.4+Math.random()*2.4)),grav:1.1,drag:0.35});
  }
  // ударная волна
  const ring=new THREE.Mesh(new THREE.RingGeometry(size*0.34,size*0.42,32),
    new THREE.MeshBasicMaterial({color:0xffe0a0,transparent:true,side:THREE.DoubleSide,depthWrite:false,blending:THREE.AdditiveBlending}));
  ring.position.copy(pos); ring.lookAt(camera.position); scene.add(ring);
  fx.push({mesh:ring,life:0.45,max:0.45,grow:size*3.6,base:size,fade:true,ring:true});
}

// НАЗЕМНЫЙ ВЗРЫВ: вспышка → огненный шар → поднимающийся гриб → пылевое кольцо по земле
function groundExplosion(pos,size){
  sndExplosion(pos,size*1.6);
  // 1) ослепительная вспышка в эпицентре
  fxSprite(TEX.glow,0xffffff,pos,size*1.1,{life:0.16,grow:size*1.8,add:true});
  fxSprite(TEX.glow,0xffd9a0,pos,size*0.8,{life:0.30,grow:size*2.4,add:true});
  // 2) огненный шар из языков пламени, растущий вверх
  for(let i=0;i<14;i++){
    const a=Math.random()*Math.PI*2, r=Math.random()*size*0.5;
    const p=pos.clone().add(new V3(Math.cos(a)*r,Math.random()*size*0.3,Math.sin(a)*r));
    spawnFlame(p,size*(0.45+Math.random()*0.55),size*(1.6+Math.random()*2.0));
  }
  // 3) СТОЛБ ДЫМА (ножка гриба) — поднимается вверх, расширяясь
  for(let i=0;i<10;i++){
    const h=i/10;
    const p=pos.clone().add(new V3((Math.random()-0.5)*size*0.4, size*0.2+h*size*1.9, (Math.random()-0.5)*size*0.4));
    const col=new THREE.Color().setHSL(0.07,0.22,0.10+h*0.16);
    fxSprite(TEX.smoke,col,p,size*(0.5+h*0.5),{life:2.2+h*1.4,grow:size*(1.4+h*1.6),
      v:new V3(WIND.x*0.35,size*(0.9-h*0.4),WIND.z*0.35),drag:0.5,spin:(Math.random()-0.5)*1.2,o0:0.9});
  }
  // 4) ШАПКА ГРИБА — клубы, расходящиеся в стороны на высоте
  for(let i=0;i<12;i++){
    const a=i/12*Math.PI*2, r=size*(0.5+Math.random()*0.5);
    const p=pos.clone().add(new V3(Math.cos(a)*r, size*2.0+Math.random()*size*0.4, Math.sin(a)*r));
    const col=new THREE.Color().setHSL(0.06,0.20,0.14+Math.random()*0.12);
    fxSprite(TEX.smoke,col,p,size*(0.8+Math.random()*0.6),{life:2.6+Math.random()*1.6,grow:size*2.4,
      v:new V3(Math.cos(a)*size*0.9+WIND.x*0.4, size*0.35, Math.sin(a)*size*0.9+WIND.z*0.4),
      drag:0.55,spin:(Math.random()-0.5)*1.0,o0:0.85});
  }
  // 5) ПЫЛЕВОЕ КОЛЬЦО по земле — расходится от эпицентра
  for(let i=0;i<16;i++){
    const a=i/16*Math.PI*2+Math.random()*0.2;
    const p=pos.clone().add(new V3(Math.cos(a)*size*0.4,1.5,Math.sin(a)*size*0.4));
    fxSprite(TEX.smoke,new THREE.Color(0.55,0.48,0.36),p,size*0.7,{life:1.6+Math.random(),grow:size*2.0,
      v:new V3(Math.cos(a)*size*2.6,size*0.18,Math.sin(a)*size*2.6),drag:1.1,spin:(Math.random()-0.5)*0.8,o0:0.7});
  }
  // 6) выброс грунта и искр
  for(let i=0;i<26;i++){
    const dir=new V3(Math.random()-0.5,Math.random()*1.1+0.35,Math.random()-0.5).normalize();
    const dust=i%2===0;
    fxSprite(dust?TEX.smoke:TEX.spark, dust?new THREE.Color(0.42,0.36,0.26):0xffc86a,
      pos.clone(), dust?2.2:1.4,
      {life:0.8+Math.random()*0.9,grow:dust?4:-0.5,add:!dust,
       v:dir.multiplyScalar(size*(1.6+Math.random()*2.6)),grav:1.15,drag:0.3});
  }
  // 7) ударная волна по земле
  const ring=new THREE.Mesh(new THREE.RingGeometry(size*0.3,size*0.42,40),
    new THREE.MeshBasicMaterial({color:0xffe0a0,transparent:true,side:THREE.DoubleSide,depthWrite:false,blending:THREE.AdditiveBlending}));
  ring.position.copy(pos).y+=1.2; ring.rotation.x=-Math.PI/2; scene.add(ring);
  fx.push({mesh:ring,life:0.55,max:0.55,grow:size*5,base:size,fade:true,flat:true});
  // 8) очаг горения на месте попадания
  spawnFire(pos.clone(),size*0.28,5);
}
