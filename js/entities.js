// webfly — entities
// (модуль загружается классическим <script>; глобальное состояние общее)

/* ---------- миссия: цели, враги, союзники ---------- */
function spawnTargets(){
  const clusters=DATA_WORLD.groundClusters;
  const kinds=['bunker','fuel','warehouse','radar'];
  for(const cl of clusters){
    for(let i=0;i<DATA_WORLD.targetsPerCluster;i++){
      const ox=(Math.random()-0.5)*320, oz=(Math.random()-0.5)*320;
      const x=cl.x+ox, z=cl.z+oz, h=Math.max(terrainHeight(x,z),4);
      const kind=kinds[Math.floor(Math.random()*kinds.length)];
      const st=buildStructure(kind);
      st.group.position.set(x,h,z); st.group.rotation.y=Math.random()*6.2832; scene.add(st.group);
      targets.push({mesh:st.group,pos:new V3(x,h+5,z),hp:st.hp,alive:true,radius:14});
    }
  }
}

function spawnFighter(opts){
  opts=opts||{};
  const ang=Math.random()*Math.PI*2, r=1500+Math.random()*900;
  const px=state.pos.x+Math.sin(ang)*r, pz=state.pos.z-700-Math.random()*1400, py=state.pos.y+(Math.random()-0.4)*300;
  const ace=!!opts.ace;
  const STYLE_COL={aggr:0x8a6a52,energy:0x6d7a86,turn:0x7d7468,snipe:0x6f7562};
  const st0 = ace ? null : PILOT_STYLES[Math.floor(Math.random()*PILOT_STYLES.length)];
  const mesh=buildF16(ace?0x7a2f2f:STYLE_COL[st0.id], ace?1.25:1); mesh.position.set(px,py,pz); scene.add(mesh);
  const st = st0;
  enemies.push({ type:ace?'ace':'fighter', mesh, pos:mesh.position.clone(), vel:new V3(0,0,-170), fwd:new V3(0,0,-1),
    hp:ace?DATA_UNITS.ace.hp:DATA_UNITS.fighter.hp, maxhp:ace?DATA_UNITS.ace.hp:DATA_UNITS.fighter.hp,
    speed: ace?DATA_UNITS.ace.speed:Math.round(DATA_UNITS.fighter.speed*st.spd),
    turn:  ace?DATA_UNITS.ace.turn:(DATA_UNITS.fighter.turn*st.turn),
    style: st, fireCd:1+Math.random(), alive:true,
    label:ace?DATA_UNITS.ace.label:DATA_UNITS.fighter.label });
}

function spawnBomber(){
  // летит через карту; появляется сбоку
  const side=Math.random()<0.5?-1:1;
  const px=state.pos.x+side*2600, pz=state.pos.z-500-Math.random()*1500, py=380+Math.random()*160;
  const mesh=buildBomber(); mesh.position.set(px,py,pz); scene.add(mesh);
  const heading=new V3(-side,0,-0.3).normalize();
  enemies.push({ type:'bomber', mesh, pos:mesh.position.clone(), vel:heading.clone().multiplyScalar(105), fwd:heading.clone(),
    hp:DATA_UNITS.bomber.hp, maxhp:DATA_UNITS.bomber.hp, speed:DATA_UNITS.bomber.speed, turn:DATA_UNITS.bomber.turn, fireCd:0.6, alive:true, label:DATA_UNITS.bomber.label });
}

function spawnAAA(){
  const spots=DATA_WORLD.aaaSites;
  for(const sp of spots){
    const x=sp.x+(Math.random()-0.5)*300, z=sp.z+(Math.random()-0.5)*300, h=Math.max(terrainHeight(x,z),4);
    const mesh=buildAAA(); mesh.position.set(x,h,z); scene.add(mesh);
    aaa.push({ mesh, pos:new V3(x,h+3,z), hp:DATA_UNITS.aaaSite.hp, fireCd:1+Math.random()*2, alive:true });
  }
}

function spawnAllies(){
  const n=AI.allies;
  for(let i=0;i<n;i++){
    const ox=(i-(n-1)/2)*95;
    const mesh=buildF16(0x35618f); mesh.position.copy(state.pos.clone().add(new V3(ox,0,60+Math.abs(ox)*0.2))); scene.add(mesh);
    allies.push({ mesh, pos:mesh.position.clone(), vel:new V3(0,0,-175), fwd:new V3(0,0,-1),
      hp:DATA_UNITS.ally.hp, maxhp:DATA_UNITS.ally.hp, speed:DATA_UNITS.ally.speed, fireCd:1+Math.random(), alive:true, label:DATA_UNITS.ally.label });
  }
}

function startMission(){
  spawnTargets();
  spawnAirbase(); spawnNavy();
  mission.groundTotal=targets.filter(t=>!t.poi).length;
  const poiTotal=targets.filter(t=>t.poi).length;
  mission.poiTotal=poiTotal;
  if(!AI.free){
    spawnAAA(); mission.aaaTotal=aaa.length;
    for(let i=0;i<AI.bombers;i++)spawnBomber();
    for(let i=0;i<AI.fighters;i++)spawnFighter();
    spawnAllies();
  }
  mission.fightersQuota=AI.quota; mission.fightersDown=0; mission.aceSpawned=false;
  mission.groundDown=0; mission.poiDown=0; mission.aaaDown=0; mission.bombersDown=0; mission.aceDown=false;
  const bomberTotal=AI.bombers;
  if(AI.free){   // свободный полёт: только наземные цели для пристрелки
    mission.objectives=[
      {id:'ground', key:'oRangeG', total:mission.groundTotal, get cur(){return mission.groundDown;}},
      {id:'poi',    key:'oRangeP', total:poiTotal, get cur(){return mission.poiDown;}},
    ];
    return;
  }
  mission.objectives=[
    {id:'ground', key:'oGround', total:mission.groundTotal, get cur(){return mission.groundDown;}},
    {id:'poi',    key:'oPoi', total:poiTotal, get cur(){return mission.poiDown;}},
    {id:'aaa',    key:'oAaa',total:mission.aaaTotal, get cur(){return mission.aaaDown;}},
    {id:'bomber', key:'oBomber',total:bomberTotal, get cur(){return mission.bombersDown;}},
    {id:'fighter',key:'oFighter', total:mission.fightersQuota, get cur(){return Math.min(mission.fightersDown,mission.fightersQuota);}},
    {id:'ace',    key:'oAce', total:1, get cur(){return mission.aceDown?1:0;}},
  ];
}

/* ---------- боевая логика (frame dt) ---------- */
function updateCombat(dt){
  gunCd-=dt; bombCd-=dt; missileCd-=dt; flareCd-=dt;
  if(!bombMode && (keys['Space']||mouse.fire))fireGun();
  if(bombMode && (keys['Space']||mouse.fire))dropBomb();   // в режиме бомб гашетка сбрасывает бомбы
  sndEngine(dt); updateDeath(dt); mfdUpdate(dt);
  compactT-=dt; if(compactT<=0){ compactT=5; compactEntities(); }   // чистим мёртвые записи
  if(keys['KeyH'])useRepair();
  if(keys['KeyX'])dropFlare();
  tickRepair(dt);
  updateLock(dt);
  updateMissiles(dt);
  updateFlares(dt);
  updateFires(dt); updateDebris(dt);
  if(state.alive){ playerObj.hp=state.hp; playerObj.maxhp=state.maxHp;
    playerObj.fwd.set(0,0,-1).applyQuaternion(state.quat); damageTrail(playerObj,dt); }
  // дым/огонь у игрока при повреждении
  // граница боевой зоны (карта 17 км; на 1200 км/ч край близко)
  if(state.alive){
    const d=Math.max(Math.abs(state.pos.x),Math.abs(state.pos.z));
    if(d>DATA_WORLD.boundaryWarn){
      boundT-=dt;
      if(d>DATA_WORLD.boundaryDamage){ if(boundT<=0){ boundT=1; if(!AI.free)damagePlayer(DATA_WORLD.boundaryDps,t('causeZone')); showMsg(t('msgOutside'),'#ff5a5a'); } }
      else if(boundT<=0){ boundT=2; showMsg(t('msgBoundary'),'#ffb23e'); }
    }
  }

  if(state.alive){ const pf=state.hp/state.maxHp;    if(pf<0.45){ playerSmk-=dt; if(playerSmk<=0){ const sev=pf<0.22; playerSmk=sev?0.05:0.09;
      const back=new V3(0,0,1).applyQuaternion(state.quat).multiplyScalar(7);
      const p=state.pos.clone().add(back);
      puff(p, sev?0x252525:0x8a8a8a, sev?8:6, sev?1.6:1.2, new V3((Math.random()-0.5)*3,5+Math.random()*4,(Math.random()-0.5)*3));
      if(sev && Math.random()<0.5) spawnFlash(p,0xff7a2a,5);
    } } }

  // пули (проверка по отрезку за кадр — быстрые снаряды иначе «протыкают» цель)
  for(let i=bullets.length-1;i>=0;i--){ const b=bullets[i];
    b.life-=dt; const p0=b.pos.clone(); b.pos.addScaledVector(b.vel,dt); b.mesh.position.copy(b.pos);
    const segD=b.pos.clone().sub(p0), segLen2=Math.max(segD.lengthSq(),1e-6);
    const hitR2=(c,r2)=>{ // квадрат расстояния от точки c до пройденного отрезка
      const t=THREE.MathUtils.clamp(c.clone().sub(p0).dot(segD)/segLen2,0,1);
      return p0.clone().addScaledVector(segD,t).distanceToSquared(c)<r2; };
    let hit=false;
    if(b.team==='friendly'){
      for(const e of enemies){ if(!e.alive)continue; const r=e.type==='bomber'?1200:(e.type==='ace'?200:130);
        if(hitR2(e.pos,r)){ e.hp-=b.dmg; spawnFlash(b.pos,0xff8a20,5); hit=true; if(e.hp<=0)killEnemy(e); break; } }
      if(!hit)for(const s of aaa){ if(!s.alive)continue;
        if(hitR2(s.pos,170)){ s.hp-=b.dmg; spawnFlash(b.pos,0xff8a20,5); hit=true; if(s.hp<=0)killAAA(s); break; } }
      if(!hit)for(const t of targets){ if(!t.alive)continue;
        if(hitR2(t.pos,220)){ t.hp-=b.dmg; spawnFlash(b.pos,0xff8a20,5); hit=true; if(t.hp<=0)killTarget(t); break; } }
    } else {
      if(state.alive && hitR2(state.pos,95)){ damagePlayer(b.dmg); spawnFlash(b.pos,0xff6a20,5); hit=true; }
      if(!hit)for(const a of allies){ if(!a.alive)continue;
        if(hitR2(a.pos,95)){ a.hp-=b.dmg; spawnFlash(b.pos,0xff6a20,5); hit=true; if(a.hp<=0)killAlly(a); break; } }
    }
    if(b.pos.y<terrainHeight(b.pos.x,b.pos.z)) hit=true;
    if(hit||b.life<=0){ removeObject(b.mesh); bullets.splice(i,1); }
  }
  // бомбы (по наземным целям и ПВО)
  for(let i=bombs.length-1;i>=0;i--){ const bo=bombs[i];
    bo.life-=dt;
    // Баллистика фиксированным шагом: при переменном dt точка падения «плывёт»
    // и расходится с прицелом на разных FPS.
    bo.acc=(bo.acc||0)+dt;
    const H=0.01;
    while(bo.acc>=H){
      const V=bo.vel.length();
      if(V>0.1) bo.vel.addScaledVector(bo.vel, -DATA_ORDNANCE.bombDrag*V*H);
      bo.vel.y-=9.81*H;
      bo.pos.addScaledVector(bo.vel,H);
      bo.acc-=H;
      if(bo.pos.y<=terrainHeight(bo.pos.x,bo.pos.z))break;   // земля — дальше не считаем
    }
    bo.mesh.position.copy(bo.pos);
    const Vv=bo.vel.length();
    if(Vv>1) bo.mesh.quaternion.setFromUnitVectors(TMP.a.set(0,0,1), TMP.b.copy(bo.vel).normalize());
    const gh=terrainHeight(bo.pos.x,bo.pos.z);
    // контактный взрыватель: срабатывает у земли или при прямом попадании
    let near=false;
    for(const t of targets){ if(t.alive && bo.pos.distanceToSquared(t.pos)<(t.radius||12)**2){ near=true; break; } }
    if(!near)for(const s of aaa){ if(s.alive && bo.pos.distanceToSquared(s.pos)<100){ near=true; break; } }
    if(bo.pos.y<=gh || near || bo.life<=0){
      const hitPos=bo.pos.clone(); hitPos.y=Math.max(hitPos.y,gh);
      groundExplosion(hitPos, 30);                       // наземный взрыв: гриб, пыль, воронка
      const R2=DATA_ORDNANCE.bombBlast*DATA_ORDNANCE.bombBlast;
      for(const t of targets){ if(!t.alive)continue;
        const d2=hitPos.distanceToSquared(t.pos), d=Math.sqrt(d2);
        const hitR=(t.radius||12);
        if(d<hitR){ t.hp=0; killTarget(t); }                      // прямое попадание — цель уничтожена
        else if(d2<R2){ t.hp-=DATA_ORDNANCE.bombDamage*(1-d/DATA_ORDNANCE.bombBlast*0.6);
          if(t.hp<=0)killTarget(t); } }
      for(const s of aaa){ if(!s.alive)continue;
        const d2=hitPos.distanceToSquared(s.pos);
        if(d2<R2){ s.hp-=DATA_ORDNANCE.bombDamage*(1-Math.sqrt(d2)/DATA_ORDNANCE.bombBlast*0.6);
          if(s.hp<=0)killAAA(s); } }
      // ударная волна бьёт и по своему самолёту, если сбросил слишком низко
      if(state.alive){ const dp=hitPos.distanceTo(state.pos);
        if(dp<90) damagePlayer(Math.round(45*(1-dp/90)),t('causeGround')); }
      removeObject(bo.mesh); bombs.splice(i,1);
    }
  }
  // враги (по типам)
  for(const e of enemies){ if(!e.alive)continue;
    if(e.type==='bomber'){
      const gh=terrainHeight(e.pos.x,e.pos.z); if(e.pos.y<gh+160)e.fwd.y+=0.4;
      // не улетают за карту — разворачиваются к центру у границы зоны
      const dEdge=Math.max(Math.abs(e.pos.x),Math.abs(e.pos.z));
      if(dEdge>DATA_AI.bomberTurnBack){ const toC=new V3(-e.pos.x,0,-e.pos.z).normalize();
        e.fwd.lerp(toC,Math.min(1,dt*0.45)); }
      e.fwd.normalize();
      e.vel.copy(e.fwd).multiplyScalar(e.speed); e.pos.addScaledVector(e.vel,dt); e.mesh.position.copy(e.pos);
      e.mesh.quaternion.setFromUnitVectors(new V3(0,0,-1),e.fwd);
      const dist=state.pos.distanceTo(e.pos); e.fireCd-=dt;
      if(!AI.passive && state.alive && dist<GUN.bomber.range && e.fireCd<=0){ e.fireCd=0.22*AI.cd;
        const lead=leadShot(e.pos,state.pos,state.vel,GUN.bomber.speed); lead.x+=(Math.random()-0.5)*0.07*AI.spread; lead.y+=(Math.random()-0.5)*0.07*AI.spread; enemyFire(e,lead.normalize()); }
      damageTrail(e,dt);
      continue;
    }
    const toP=state.pos.clone().sub(e.pos); const dist=toP.length(); const dir=toP.clone().multiplyScalar(1/Math.max(dist,0.001));
    let desired=dir.clone(); const gh=terrainHeight(e.pos.x,e.pos.z);
    // ТАКТИКА: истребитель не гонится вплотную, а держит дистанцию боя
    // и работает пушкой/ракетами. Сближается только если игрок далеко.
    const desperate = e.hp < e.maxhp*DATA_AI.ramHpFraction;
    const st=e.style;
    if(st && st.alt>0 && dist>DATA_AI.standoffMax){
      const want=state.pos.y+st.alt;
      desired.y += THREE.MathUtils.clamp((want-e.pos.y)/400,-0.5,0.5);
      desired.normalize();
    }
    const standoff=DATA_AI.standoffMin;
    if(dist<standoff && !desperate){
      // РАЗРЫВ ДИСТАНЦИИ: уходим в сторону И ОТ игрока, набирая пространство для ракет.
      // Чем ближе — тем решительнее отворот (вплоть до полного отворота от цели).
      if(!e.breakSide) e.breakSide = Math.random()<0.5?-1:1;
      const side=TMP.a.crossVectors(dir,TMP.b.set(0,1,0)).normalize().multiplyScalar(e.breakSide);
      const k=THREE.MathUtils.clamp((standoff-dist)/standoff,0,1);
      desired.copy(side).multiplyScalar(1.0+k*1.2).addScaledVector(dir,-(0.4+k*1.6));
      desired.y+=k*0.55;                       // одновременно расходимся по высоте
      desired.normalize();
    } else if(dist>DATA_AI.standoffMax){
      e.breakSide=0;                           // далеко — снова сближаемся
    } else {
      // в «рабочей зоне» 700-1500 м держим цель в прицеле, не сближаясь вплотную
      const hold=THREE.MathUtils.clamp((dist-standoff)/(DATA_AI.standoffMax-standoff),0,1);
      desired.addScaledVector(dir,hold*0.6).normalize();
    }
    e.fwd.lerp(desired,Math.min(1,dt*e.turn)).normalize();
    const espd=e.speed*(e.hp/(e.maxhp||100)<0.3?0.72:1);   // подбитый летит медленнее
    e.vel.copy(e.fwd).multiplyScalar(espd); e.pos.addScaledVector(e.vel,dt); e.mesh.position.copy(e.pos);
    const qo=new QUAT().setFromUnitVectors(new V3(0,0,-1),e.fwd);
    const bank=THREE.MathUtils.clamp((e.fwd.x*desired.z-e.fwd.z*desired.x)*4,-1,1);
    qo.multiply(new QUAT().setFromAxisAngle(new V3(0,0,-1),bank)); e.mesh.quaternion.copy(qo);
    e.fireCd-=dt; const aimDot=e.fwd.dot(dir);
    const G=e.type==='ace'?GUN.ace:GUN.fighter;
    const fireRange=G.range*(e.style?e.style.fireK:1);      // манера: кто-то бьёт в упор, кто-то с дистанции
    const aimTol=(e.style&&e.style.id==='snipe')?0.990:0.985;
    if(!AI.passive && state.alive && dist<fireRange && aimDot>aimTol && e.fireCd<=0){
      e.fireCd=((e.type==='ace'?0.08:0.11)+Math.random()*0.05)*AI.cd*(e.style?e.style.burst:1);
      const lead=leadShot(e.pos,state.pos,state.vel,G.speed); const sp=(e.type==='ace'?0.025:0.04)*AI.spread;
      lead.x+=(Math.random()-0.5)*sp; lead.y+=(Math.random()-0.5)*sp; lead.z+=(Math.random()-0.5)*sp; enemyFire(e,lead.normalize());
    }
    // ас пускает ИК-ракеты по игроку
    if(e.type==='ace'){ e.mslCd=(e.mslCd||6)-dt;
      const canMsl=(e.type==='ace')||(e.style&&e.style.id!=='aggr');
      const mslGap=(e.type==='ace')?DATA_UNITS.ace.missileGap:DATA_AI.fighterMissileGap;
      if(!AI.passive && canMsl && state.alive && aimDot>0.9 && dist<HOSTILE_IR.range && dist>500 && e.mslCd<=0){ e.mslCd=mslGap+Math.random()*10;
        spawnMissile(e.pos.clone(),e.fwd.clone(),{pos:state.pos,alive:state.alive,isPlayer:true},HOSTILE_IR,'hostile'); showMsg(t('msgIncoming'),'#ff5a5a'); } }
    if(!AI.passive && state.alive && dist<DATA_AI.collisionDist){
      damagePlayer(desperate?DATA_AI.ramDamage:DATA_AI.hitDamage,t('causeRam')); e.hp-=140; explosion(e.pos.clone(),20); if(e.hp<=0)killEnemy(e); }
    damageTrail(e,dt);
  }
  // союзники
  for(const a of allies){ if(!a.alive)continue;
    let tgt=null,best=1e18; for(const e of enemies){ if(!e.alive)continue; const d=a.pos.distanceToSquared(e.pos); if(d<best){best=d;tgt=e;} }
    let desired = tgt ? tgt.pos.clone().sub(a.pos).normalize() : new V3(0,0,-1);
    const gh=terrainHeight(a.pos.x,a.pos.z); if(a.pos.y<gh+150){ desired.y+=0.6; desired.normalize(); }
    a.fwd.lerp(desired,Math.min(1,dt*1.0)).normalize();
    a.vel.copy(a.fwd).multiplyScalar(a.speed); a.pos.addScaledVector(a.vel,dt); a.mesh.position.copy(a.pos);
    const qo=new QUAT().setFromUnitVectors(new V3(0,0,-1),a.fwd);
    const bank=THREE.MathUtils.clamp((a.fwd.x*desired.z-a.fwd.z*desired.x)*4,-1,1);
    qo.multiply(new QUAT().setFromAxisAngle(new V3(0,0,-1),bank)); a.mesh.quaternion.copy(qo);
    a.fireCd-=dt;
    if(tgt){ const dist=a.pos.distanceTo(tgt.pos); const aimDot=a.fwd.dot(tgt.pos.clone().sub(a.pos).normalize());
      if(dist<GUN.ally.range && aimDot>0.98 && a.fireCd<=0){ a.fireCd=0.14+Math.random()*0.06;
        const lead=leadShot(a.pos,tgt.pos,tgt.vel,GUN.ally.speed); lead.x+=(Math.random()-0.5)*0.05; lead.y+=(Math.random()-0.5)*0.05; allyFire(a,lead.normalize()); } }
    damageTrail(a,dt);
  }
  // ПВО (наземные)
  for(const s of aaa){ if(!s.alive)continue;
    const toP=state.pos.clone().sub(s.pos); const dist=toP.length();
    if(s.mesh.userData.turret) s.mesh.userData.turret.rotation.y=Math.atan2(toP.x,-toP.z);
    s.fireCd-=dt;
    if(!AI.passive && state.alive && dist<GUN.aaa.range && dist>60 && s.fireCd<=0){ s.fireCd=(0.16+Math.random()*0.1)*AI.cd;
      const lead=leadShot(s.pos,state.pos,state.vel,GUN.aaa.speed); lead.x+=(Math.random()-0.5)*0.05; lead.y+=(Math.random()-0.5)*0.05; aaaFire(s,lead.normalize()); }
  }
  // эффекты
  for(let i=fx.length-1;i>=0;i--){ const f=fx[i]; f.life-=dt; const k=1-f.life/f.max;
    if(f.v){ if(f.grav)f.v.y-=9.8*f.grav*dt; f.mesh.position.addScaledVector(f.v,dt); if(f.drag)f.v.multiplyScalar(1-Math.min(1,f.drag*dt)); }
    if(f.spin!==undefined) f.mesh.material.rotation+=f.spin*dt;
    if(f.ring){ const s=f.base+f.grow*k; f.mesh.scale.set(s/f.base,s/f.base,1); if(!f.flat)f.mesh.lookAt(camera.position); }
    else{ const s=Math.max(0.01,f.base+f.grow*k); f.mesh.scale.set(s,s,1); }
    let op=Math.max(0,(1-k))*(f.o0!==undefined?f.o0:1);
    f.mesh.material.opacity=op;
    if(f.aspect){ const s2=Math.max(0.01,f.base+f.grow*k); f.mesh.scale.set(s2,s2*f.aspect,1); }
    if(f.life<=0){ removeObject(f.mesh); fx.splice(i,1); } }
  // форсаж
  // --- анимация управляемых поверхностей (отклоняются в такт манёврам) ---
  flapParts.forEach(f=>{ f.pivot.rotation.x = flaps.pos*0.50; });                    // закрылки вниз
  ailParts .forEach(a=>{ a.pivot.rotation.x = -ctrl.roll*a.side*0.42 + flaps.pos*0.16; }); // элероны в противофазе
  stabParts.forEach(p=>{ p.pivot.rotation.x = -ctrl.pitch*0.38; });                  // стабилизаторы по тангажу
  rudParts .forEach(r=>{ r.pivot.rotation.y =  ctrl.yaw*0.34; });                    // рули направления
  // тормозной щиток: выпускается при сбросе тяги и торможении
  if(airbrake){
    const want=(state.throttle<0.18||keys['ControlLeft']||keys['ControlRight'])?1:0;
    airbrake.userData.p=(airbrake.userData.p||0)+(want-(airbrake.userData.p||0))*Math.min(1,dt*3);
    airbrake.rotation.x=-airbrake.userData.p*0.95;
  }
  afterburners.forEach(ab=>{ const th=state.throttle; const u=ab.userData;
    if(th<=0.02){ ab.visible=false; return; }                 // нулевая тяга — сопло не светится
    ab.visible=true;
    if(u.t!==undefined){                                    // сегмент мягкого факела
      const flick=0.85+Math.sin(performance.now()*0.02+u.t*8)*0.11+Math.random()*0.03;
      const size=u.bs*(0.62+th*0.65)*flick;
      ab.position.z=11.5+u.bz*(0.55+th*0.75);                 // растягивается назад с тягой
      ab.scale.set(size,size,1);
      ab.material.opacity=(0.62-u.t*0.44)*(0.24+th*0.9)*flick;
    } else {                                                // диск/прочее
      if(!u.b)u.b={x:ab.scale.x,y:ab.scale.y};
      const f=0.6+th*0.5; ab.scale.set(u.b.x*f,u.b.y*f,1); ab.material.opacity=0.14+th*0.34;
    }
  });
  // подкрепление, ас, победа
  reinforceCd-=dt;
  const aliveFighters=enemies.filter(e=>e.type==='fighter'&&e.alive).length;
  const capF=Math.max(2, Math.round(AI.fighters*DATA_AI.reinforceCap));
  if(!AI.free && !won && mission.fightersDown<mission.fightersQuota && aliveFighters<capF && reinforceCd<=0){
    reinforceCd=DATA_AI.reinforceDelay; spawnFighter(); if(aliveFighters+1<capF)spawnFighter();
  }
  if(!AI.free && !won && !mission.aceSpawned && (objProgress()>=DATA_AI.aceProgress||mission.fightersDown>=DATA_AI.aceAfterKills)){ mission.aceSpawned=true; spawnFighter({ace:true}); showMsg(t('msgBoss'),'#ff5a5a'); }
  if(!won && missionComplete()){ won=true; showVictory(); }
}

function objProgress(){ const o=mission.objectives.filter(x=>x.id!=='ace'); let s=0; for(const x of o)s+=Math.min(1,x.cur/x.total); return o.length?s/o.length:0; }

function missionComplete(){ return mission.objectives.length>0 && mission.objectives.every(o=>o.cur>=o.total); }

function showVictory(){ document.getElementById('win-sub').textContent=t('winSub')+' · '+t('scoreIs')+': '+game.score;
  document.getElementById('winmsg').style.display='flex'; }

function killAAA(s){ s.alive=false; mission.aaaDown=(mission.aaaDown||0)+1; if(selTarget===s)selTarget=null; removeObject(s.mesh); explosion(s.pos.clone(),30); spawnFire(s.pos.clone(),5,4.5); game.score+=DATA_SCORE.aaa; }

function killAlly(a){ a.alive=false; removeObject(a.mesh); aircraftExplosion(a.pos.clone(),a.vel,26); }

function useRepair(){
  if(!state.alive||repair.active||repair.cooldown>0||state.hp>=state.maxHp)return;
  repair.active=true; repair.timeLeft=repair.dur;
}

function tickRepair(dt){
  if(repair.cooldown>0)repair.cooldown-=dt;
  if(repair.active){
    state.hp=Math.min(state.maxHp,state.hp+repair.rate*dt);
    // искры/дымок от ремонта
    if(Math.random()<dt*8) spawnFlash(state.pos.clone().add(new V3((Math.random()-0.5)*4,-1,(Math.random()-0.5)*4)),0x8effc0,4);
    repair.timeLeft-=dt;
    if(repair.timeLeft<=0||state.hp>=state.maxHp){ repair.active=false; repair.cooldown=repair.cd; }
  }
}

function killEnemy(e){ e.alive=false; if(selTarget===e)selTarget=null; removeObject(e.mesh);
  if(e.type==='bomber'){ aircraftExplosion(e.pos.clone(),e.vel,60); game.score+=DATA_SCORE.bomber; mission.bombersDown=(mission.bombersDown||0)+1; }
  else if(e.type==='ace'){ aircraftExplosion(e.pos.clone(),e.vel,46); game.score+=DATA_SCORE.ace; mission.aceDown=true; }
  else { aircraftExplosion(e.pos.clone(),e.vel,32); mission.fightersDown++; game.score+=DATA_SCORE.fighter; }
}

function killTarget(t){ t.alive=false; if(t.poi)mission.poiDown=(mission.poiDown||0)+1; else mission.groundDown=(mission.groundDown||0)+1; removeObject(t.mesh); explosion(t.pos.clone(),34); spawnFire(t.pos.clone(),t.poi?9:6,t.poi?7:5); game.score+=DATA_SCORE.ground; }

function damagePlayer(d,cause){ if(!state.alive)return;
  if(devMode&&DATA_DEV.godMode){ sndHit(); return; }   // режим разработчика — неуязвимость
  state.hp-=d; sndHit();
  if(state.hp<=0 && state.alive){ state.hp=0; state.alive=false;
    aircraftExplosion(state.pos.clone(),state.vel,50); deathCause=cause||t('causeGun'); deathT=1.6; } }

// после гибели даём догореть взрыву, затем показываем экран и останавливаем бой
function updateDeath(dt){
  if(state.alive||deathT<=0)return;
  deathT-=dt;
  if(deathT<=0){
    document.getElementById('over-title').textContent=t('failTitle');
    document.getElementById('over-sub').textContent=deathCause+' · '+t('scoreIs')+': '+game.score;
    document.getElementById('overmsg').style.display='flex';
    running=false;
  }
}

function restart(){
  enemies.forEach(e=>e.alive&&removeObject(e.mesh)); enemies=[];
  allies.forEach(a=>a.alive&&removeObject(a.mesh)); allies=[];
  aaa.forEach(s=>s.alive&&removeObject(s.mesh)); aaa=[];
  bullets.forEach(b=>removeObject(b.mesh)); bullets=[];
  bombs.forEach(b=>removeObject(b.mesh)); bombs=[];
  missiles.forEach(m=>removeObject(m.mesh)); missiles=[];
  flares.forEach(f=>removeObject(f.mesh)); flares=[];
  fx.forEach(f=>removeObject(f.mesh)); fx=[]; fires=[];
  decor.forEach(d=>removeObject(d)); decor=[];
  debris.forEach(d=>removeObject(d.mesh)); debris=[];
  targets.forEach(t=>t.alive&&removeObject(t.mesh)); targets=[];
  state.pos.set(0,DATA_FLIGHT.startAlt,0); state.vel.set(0,0,-DATA_FLIGHT.startSpeed); state.quat.identity(); state.omega.set(0,0,0);
  state.throttle=DATA_FLIGHT.startThrottle; state.hp=DATA_UNITS.player.hp; state.bombs=DATA_ORDNANCE.bombs; state.alive=true;
  repair.active=false; repair.cooldown=0; repair.timeLeft=0;
  MSL_ORDER.forEach(k=>loadout[k]=MISSILES[k].ammo); selMsl='R73';
  lock.target=null; lock.progress=0; lock.locked=false; missileCd=0; flareCd=0;
  game.score=0; game.wave=1; won=false; reinforceCd=0; boundT=0; selTarget=null; deathT=0; deathCause=''; bombMode=false; startMission();
  document.getElementById('overmsg').style.display='none';
  document.getElementById('winmsg').style.display='none';
  running=true; last=performance.now();
}
