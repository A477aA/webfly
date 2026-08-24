// webfly — weapons
// (модуль загружается классическим <script>; глобальное состояние общее)

/* ---------- оружие ---------- */
// общие ресурсы трассеров — создаются один раз (иначе мусор каждый выстрел)
const BULLET_RES={};
function bulletRes(friend){
  const k=friend?'f':'h';
  if(!BULLET_RES[k]){
    const geo=shared(new THREE.CylinderGeometry(0.06,0.02,17,6)); geo.rotateX(Math.PI/2);
    BULLET_RES[k]={
      geo,
      core:shared(new THREE.MeshBasicMaterial({color:friend?0xffe27a:0xff7a3a})),
      head:shared(new THREE.SpriteMaterial({map:friend?TEX.ally:TEX.foe,color:0xffffff,
        transparent:true,opacity:0.9,depthWrite:false,blending:THREE.AdditiveBlending}))
    };
  }
  return BULLET_RES[k];
}
function makeBullet(pos,vel,team,life){
  const friend=team==='friendly';
  const R=bulletRes(friend);
  const g=new THREE.Group();
  const core=new THREE.Mesh(R.geo,R.core); g.add(core);
  const head=new THREE.Sprite(R.head);
  head.scale.set(0.85,0.85,1); head.position.z=8.5; g.add(head);
  g.quaternion.setFromUnitVectors(new V3(0,0,1),vel.clone().normalize());
  g.position.copy(pos); scene.add(g);
  bullets.push({mesh:g,pos:pos.clone(),vel:vel.clone(),life:life||2.6,team,dmg:friend?DATA_GUNS.player.damage:DATA_GUNS.fighter.damage});
}

// направление ствола: доводка мышью + автоматический учёт упреждения по цели
function gunAimDir(){
  const G=GUN.player;
  const fwd=new V3(0,0,-1).applyQuaternion(state.quat);
  if(!(settings.gunAssist && mouse.enabled && G.cone)) return {dir:fwd,edge:false,lead:false};
  let d=aimDir.clone();
  // если курсор наведён на цель — берём точку упреждения (баллистическое решение)
  let best=null,bestDot=0.965;                    // шире зона захвата решения
  for(const e of allHostiles()){ if(!e.alive)continue;
    const to=e.pos.clone().sub(state.pos); const dist=to.length();
    if(dist>G.range)continue;
    const dot=aimDir.dot(to.clone().multiplyScalar(1/Math.max(dist,0.001)));
    if(dot+((e===selTarget)?0.02:0)>bestDot){ bestDot=dot; best=e; }
  }
  let lead=false;
  if(best){
    const dist=best.pos.distanceTo(state.pos), tof=dist/G.speed;
    const relV=(best.vel||new V3()).clone().sub(state.vel);
    const lp=best.pos.clone().addScaledVector(relV,tof);
    d=lp.sub(state.pos).normalize(); lead=true;
  }
  const ang=Math.acos(THREE.MathUtils.clamp(fwd.dot(d),-1,1));
  const edge=ang>G.cone;
  return {dir: edge?fwd.clone().lerp(d,G.cone/ang).normalize():d, edge, lead:lead&&!edge};
}

function fireGun(){
  if(gunCd>0||!state.alive)return; gunCd=DATA_GUNS.player.rate;
  const G=GUN.player;
  const fwd  =new V3(0,0,-1).applyQuaternion(state.quat);
  const right=new V3(1,0,0).applyQuaternion(state.quat);
  const up   =new V3(0,1,0).applyQuaternion(state.quat);
  const dir=gunAimDir().dir;
  // ГШ-30-1 в ПРАВОМ наплыве крыла: ствол смещён вбок и сведён в точку прицеливания
  const muzzle=state.pos.clone().addScaledVector(right,G.off[0]).addScaledVector(up,G.off[1]).addScaledVector(fwd,-G.off[2]);
  const conv=state.pos.clone().addScaledVector(dir,G.conv||700);
  const shotDir=conv.sub(muzzle).normalize();
  const sp=0.0012;
  shotDir.x+=(Math.random()-0.5)*sp; shotDir.y+=(Math.random()-0.5)*sp; shotDir.z+=(Math.random()-0.5)*sp;
  const v=shotDir.normalize().multiplyScalar(G.speed).add(state.vel);
  makeBullet(muzzle,v,'friendly',G.range/G.speed);
  spawnFlash(muzzle,0xff9a2a,5); sndGun();
}

let BOMB_MAT=null;
function dropBomb(){
  if(devMode)state.bombs=99;
  if(bombCd>0||state.bombs<=0||!state.alive)return; bombCd=DATA_ORDNANCE.bombCooldown; if(!devMode)state.bombs--;
  const down=new V3(0,-1,0).applyQuaternion(state.quat);
  if(!BOMB_MAT)BOMB_MAT=shared(new THREE.MeshStandardMaterial({color:0x333a41,metalness:0.5,roughness:0.55}));
  const mat=BOMB_MAT;
  const m=new THREE.Group();
  const bodyB=new THREE.Mesh(new THREE.CylinderGeometry(0.55,0.55,3,10),mat); bodyB.rotation.x=Math.PI/2; m.add(bodyB);
  const noseB=new THREE.Mesh(new THREE.ConeGeometry(0.55,1.1,10),mat); noseB.rotation.x=-Math.PI/2; noseB.position.z=-2; m.add(noseB);
  for(let k=0;k<4;k++){ const fin=new THREE.Mesh(new THREE.BoxGeometry(0.1,1.3,1),mat);
    fin.position.z=1.5; fin.rotation.z=k*Math.PI/2; m.add(fin); }
  m.position.copy(state.pos.clone().addScaledVector(down,3)); m.traverse(o=>{if(o.isMesh)o.castShadow=true;}); scene.add(m);
  // бомба наследует скорость самолёта и отделяется вниз от держателя
  const v0=state.vel.clone().addScaledVector(down,DATA_ORDNANCE.bombEject);
  bombs.push({mesh:m,pos:m.position.clone(),vel:v0,life:30});
}

function enemyFire(e,dir){
  const G = e.type==='ace'?GUN.ace : (e.type==='bomber'?GUN.bomber:GUN.fighter);
  const off=G.off||[0,0,-3];   // ствол смещён к борту, как на реальной машине
  const rt=new V3(1,0,0).applyQuaternion(e.mesh.quaternion), up=new V3(0,1,0).applyQuaternion(e.mesh.quaternion);
  const muzzle=e.pos.clone().addScaledVector(rt,off[0]).addScaledVector(up,off[1]).addScaledVector(dir,-off[2]);
  makeBullet(muzzle,dir.clone().multiplyScalar(G.speed),'hostile',G.range/G.speed);
}

function allyFire(a,dir){
  const G=GUN.ally, off=G.off||[0,0,-3];
  const rt=new V3(1,0,0).applyQuaternion(a.mesh.quaternion), up=new V3(0,1,0).applyQuaternion(a.mesh.quaternion);
  const muzzle=a.pos.clone().addScaledVector(rt,off[0]).addScaledVector(up,off[1]).addScaledVector(dir,-off[2]);
  makeBullet(muzzle,dir.clone().multiplyScalar(G.speed),'friendly',G.range/G.speed);
}

function aaaFire(s,dir){
  const G=GUN.aaa, muzzle=s.pos.clone().addScaledVector(dir,3);
  makeBullet(muzzle,dir.clone().multiplyScalar(G.speed),'hostile',G.range/G.speed);
}

function candidateTargets(cfg,team){
  const arr=[];
  if(team==='friendly'){
    if(cfg.targets.includes('air')) for(const e of enemies) if(e.alive) arr.push(e);
    if(cfg.targets.includes('aaa')) for(const s of aaa) if(s.alive) arr.push(s);
    if(cfg.targets.includes('ground')) for(const t of targets) if(t.alive) arr.push(t);
  } else {
    arr.push({pos:state.pos,vel:state.vel,alive:state.alive,isPlayer:true});
    if(cfg.targets.includes('air')) for(const a of allies) if(a.alive) arr.push(a);
  }
  return arr;
}

function tgtLabel(t){ if(!t)return ''; if(t.isPlayer)return 'ИГРОК'; if(t.label)return t.label; if(aaa.includes(t))return 'ПВО'; if(targets.includes(t))return 'ЦЕЛЬ'; return 'ЦЕЛЬ'; }

function updateLock(dt){
  const cfg=MISSILES[selMsl];
  const fwd=new V3(0,0,-1).applyQuaternion(state.quat);
  // Цель выбирается по НАПРАВЛЕНИЮ ВИЗИРОВАНИЯ (курсор = нашлемный прицел),
  // но остаётся ограничение ГСН по углу от оси самолёта (cfg.minDot).
  const look=(mouse.enabled?aimDir:fwd);
  let best=null,bestDot=-1; lock.offBore=0;
  for(const t of candidateTargets(cfg,'friendly')){
    const to=t.pos.clone().sub(state.pos); const d=to.length(); if(d>cfg.range)continue;
    const dir=to.multiplyScalar(1/Math.max(d,0.001));
    if(fwd.dot(dir)<cfg.minDot)continue;              // вне поля зрения ГСН — захват невозможен
    const dot=look.dot(dir);                          // ближайшая к перекрестию НСЦ
    const prio=(t===selTarget)?0.08:0;                  // выбранная клавишей T цель в приоритете
    if(dot>0.86 && dot+prio>bestDot){ bestDot=dot+prio; best=t; lock.offBore=Math.acos(THREE.MathUtils.clamp(fwd.dot(dir),-1,1)); }
  }
  if(best && best===lock.target) lock.progress+=dt;
  else { lock.target=best; lock.progress=0; }
  lock.locked = !!lock.target && lock.progress>=cfg.lockTime;
}

function fireMissile(){
  if(missileCd>0||!state.alive)return;
  const cfg=MISSILES[selMsl];
  if(devMode)loadout[selMsl]=99;
  if(loadout[selMsl]<=0){ spawnFlash(state.pos.clone(),0xff6060,4); showMsg(t('msgNoMsl')+' · '+cfg.name,'#ff8a5a'); return; }
  if(!lock.locked||!lock.target||!lock.target.alive){ showMsg(t('msgNoLock'),'#ffb23e'); return; }
  missileCd=devMode?0.12:DATA_ORDNANCE.missileCooldown; if(!devMode)loadout[selMsl]--;
  const fwd=new V3(0,0,-1).applyQuaternion(state.quat);
  spawnMissile(state.pos.clone().addScaledVector(fwd,6),fwd.clone(),lock.target,cfg,'friendly');
  showMsg(t('msgLaunch')+' · '+cfg.name+' → '+tgtLabel(lock.target),'#6bffb0'); sndLaunch();
}

function spawnMissile(from,dir,target,cfg,team){
  const mesh=buildMissileMesh(cfg.color,cfg.cls); mesh.position.copy(from);
  mesh.quaternion.setFromUnitVectors(new V3(0,0,-1),dir.clone().normalize());
  mesh.traverse(o=>{if(o.isMesh)o.castShadow=true;}); scene.add(mesh);
  // яркий след-«светлячок», чтобы видеть ракету издалека
  const head=new THREE.Sprite(new THREE.SpriteMaterial({map:TEX.flash,color:team==='friendly'?0xfff0c0:0xff8060,transparent:true,depthWrite:false,blending:THREE.AdditiveBlending}));
  head.scale.set(6,6,1); mesh.add(head);
  // эффект пуска: вспышка + клуб дыма назад
  spawnFlash(from.clone(),0xffe6a0,14);
  for(let k=0;k<5;k++) puff(from.clone().addScaledVector(dir,-k*2),0xdcdcdc,2.4,0.8,dir.clone().multiplyScalar(-12).add(new V3((Math.random()-0.5)*6,0,(Math.random()-0.5)*6)));
  const launchV=dir.clone().multiplyScalar(cfg.speed*0.55).add(team==='friendly'?state.vel:new V3());
  missiles.push({ mesh, pos:from.clone(), vel:launchV, target, cfg, team, life:cfg.range/cfg.speed+2.5, smokeT:0 });
}

function detonate(m){ const cfg=m.cfg, R2=cfg.blast*cfg.blast;
  explosion(m.pos.clone(),cfg.blast*0.8);
  if(m.team==='friendly'){
    for(const e of enemies){ if(e.alive && m.pos.distanceToSquared(e.pos)<R2){ e.hp-=cfg.dmg; if(e.hp<=0)killEnemy(e); } }
    for(const s of aaa){ if(s.alive && m.pos.distanceToSquared(s.pos)<R2){ s.hp-=cfg.dmg; if(s.hp<=0)killAAA(s); } }
    for(const t of targets){ if(t.alive && m.pos.distanceToSquared(t.pos)<R2){ t.hp-=cfg.dmg; if(t.hp<=0)killTarget(t); } }
  } else {
    if(state.alive && m.pos.distanceToSquared(state.pos)<R2) damagePlayer(cfg.dmg,'ПОРАЖЕНИЕ РАКЕТОЙ');
    for(const a of allies){ if(a.alive && m.pos.distanceToSquared(a.pos)<R2){ a.hp-=cfg.dmg; if(a.hp<=0)killAlly(a); } }
  }
}

function updateMissiles(dt){
  for(let i=missiles.length-1;i>=0;i--){ const m=missiles[i]; const cfg=m.cfg; m.life-=dt;
    let guiding = m.target && m.target.alive;
    if(guiding && cfg.cls==='sar'){ // полуактивная РЛ: игрок должен держать нос на цели
      const fwd=new V3(0,0,-1).applyQuaternion(state.quat);
      if(fwd.dot(m.target.pos.clone().sub(state.pos).normalize())<0.5) guiding=false;
    }
    if(cfg.cls==='ir' && m.team==='hostile'){ // ИК-ракету уводят тепловые ловушки
      for(const fl of flares){ if(fl.alive && m.pos.distanceToSquared(fl.pos)<90000 && Math.random()<dt*4){ m.target=fl; break; } }
    }
    if(guiding){
      const lead=leadShot(m.pos,m.target.pos,m.target.vel||new V3(),cfg.speed);
      const cur=m.vel.clone().normalize().lerp(lead,Math.min(1,cfg.turn*dt)).normalize();
      m.vel.copy(cur).multiplyScalar(cfg.speed);
    } else m.vel.setLength(cfg.speed);
    const mp0=m.pos.clone();
    m.pos.addScaledVector(m.vel,dt); m.mesh.position.copy(m.pos);
    m.mesh.quaternion.setFromUnitVectors(new V3(0,0,-1),m.vel.clone().normalize());
    m.smokeT-=dt; if(m.smokeT<=0){ m.smokeT=0.014; puff(m.pos.clone(),0xd2d2d2,1.7,0.85,new V3(0,0.8,0)); }
    let boom=false;
    if(m.target && m.target.alive){            // проверка по отрезку — быстрая ракета иначе проскочит
      const sd=m.pos.clone().sub(mp0), sl2=Math.max(sd.lengthSq(),1e-6);
      const t=THREE.MathUtils.clamp(m.target.pos.clone().sub(mp0).dot(sd)/sl2,0,1);
      const near=mp0.clone().addScaledVector(sd,t).distanceToSquared(m.target.pos);
      if(near<(cfg.blast*0.9)*(cfg.blast*0.9)) boom=true;
    }
    if(m.pos.y<terrainHeight(m.pos.x,m.pos.z)) boom=true;
    if(m.life<=0) boom=true;
    if(boom){ detonate(m); removeObject(m.mesh); missiles.splice(i,1); }
  }
}

function dropFlare(){
  if(flareCd>0||!state.alive)return; flareCd=DATA_ORDNANCE.flares.cooldown; sndFlare();
  const back=new V3(0,0,1).applyQuaternion(state.quat);
  const right=new V3(1,0,0).applyQuaternion(state.quat);
  const down=new V3(0,-1,0).applyQuaternion(state.quat);
  for(let k=0;k<DATA_ORDNANCE.flares.count;k++){
    const s=new THREE.Sprite(new THREE.SpriteMaterial({map:TEX.glow,color:0xff7a12,transparent:true,depthWrite:false,blending:THREE.AdditiveBlending}));
    const p=state.pos.clone().addScaledVector(back,4+k*1.2); s.position.copy(p); s.scale.set(4.5,4.5,1); scene.add(s);
    // резкий отстрел вбок-вниз-назад, слабо наследуя скорость самолёта
    const side=(k%2?1:-1)*(40+Math.random()*35);
    const v=state.vel.clone().multiplyScalar(0.2)
      .addScaledVector(right,side).addScaledVector(down,55+Math.random()*30).addScaledVector(back,20+Math.random()*20);
    flares.push({mesh:s,pos:p.clone(),vel:v,life:DATA_ORDNANCE.flares.life,alive:true});
  }
}

function updateFlares(dt){
  for(let i=flares.length-1;i>=0;i--){ const f=flares[i]; f.life-=dt; f.vel.y-=6*dt;
    f.pos.addScaledVector(f.vel,dt); f.mesh.position.copy(f.pos); f.mesh.material.opacity=Math.max(0,f.life/3.5);
    if(f.life<=0){ f.alive=false; removeObject(f.mesh); flares.splice(i,1); }
  }
}
