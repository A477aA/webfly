// webfly — physics
// (модуль загружается классическим <script>; глобальное состояние общее)

function stepPhysics(dt){
  if(!state.alive)return;
  const tgt=(a,b)=>(keys[a]?1:0)-(keys[b]?1:0); const sm=(c,t)=>c+(t-c)*Math.min(1,dt*DATA_CONTROL.smoothing);
  const kbPitch=tgt('KeyS','KeyW')||tgt('ArrowDown','ArrowUp');
  const kbRoll =tgt('KeyD','KeyA')||tgt('ArrowRight','ArrowLeft');
  const kbYaw=tgt('KeyE','KeyQ')||tgt('KeyC','KeyZ');   // руль: Q/E либо Z/C
  let tp=kbPitch, tr=kbRoll, tyaw=kbYaw;
  if(mouse.enabled){
    const curve=(v)=>{ const s2=Math.sign(v), a=Math.abs(v); if(a<DATA_CONTROL.deadzone)return 0;
      const n=(a-DATA_CONTROL.deadzone)/(1-DATA_CONTROL.deadzone); return s2*(n*n*0.5+n*0.5); };
    let mx=mouse.x, my=mouse.y; const rr=Math.hypot(mx,my); if(rr>1){mx/=rr;my/=rr;}
    mx=curve(mx); my=curve(my);
    const iv=mouse.invert?-1:1;
    // НСЦ: направление визирования (для ракет и доводки пушки)
    { const hx=mx*0.95, hy=-my*0.95*iv;
      aimDir.set(Math.sin(hx),Math.sin(hy),-Math.cos(hx)*Math.cos(hy)).normalize().applyQuaternion(state.quat);
      if(settings.gunAssist){
        let best=null,bestDot=0.978;
        for(const e of allHostiles()){ if(!e.alive)continue;
          const to=e.pos.clone().sub(state.pos); const d=to.length(); if(d>GUN.player.range*1.2)continue;
          const dir=to.multiplyScalar(1/Math.max(d,0.001)); const dot=aimDir.dot(dir);
          if(dot>bestDot){ bestDot=dot; best=dir; } }
        if(best){ const k=THREE.MathUtils.clamp((bestDot-0.978)/0.022,0,1)*0.45;
          aimDir.lerp(best,k).normalize(); }
      } }

    if(mouse.mode==='direct'){
      // ===== ПРОДВИНУТОЕ: мышь = ручка (X — крен, Y — тангаж) =====
      tp  =THREE.MathUtils.clamp(kbPitch + (-my)*DATA_CONTROL.expertPitch*mouse.sens*iv, -1,1);
      tr  =THREE.MathUtils.clamp(kbRoll  +   mx *DATA_CONTROL.expertRoll*mouse.sens,    -1,1);
      tyaw=THREE.MathUtils.clamp(kbYaw, -1,1);
    } else {
      // ===== ПРОСТОЕ: манёвры — клавиатура, мышь — только доводка носа =====
      const yaw  =  mx*mouse.sens;
      const pitch= -my*mouse.sens*iv;
      const rightV=new V3(1,0,0).applyQuaternion(state.quat);
      const upV   =new V3(0,1,0).applyQuaternion(state.quat);
      // знаковый крен без «слепой зоны»: atan2 корректно работает и вверх ногами
      const bank=Math.atan2(-rightV.y,upV.y);
      if(kbRoll!==0){
        tr=kbRoll;                                              // клавиши — полный контроль крена (бочка)
        wingsT=0;
      } else {
        // Мышь задаёт ЖЕЛАЕМЫЙ крен (ограниченный), а не добавляет его бесконтрольно.
        // Курсор в центре -> желаемый крен 0 -> самолёт САМ возвращается в горизонт.
        const wantBank=THREE.MathUtils.clamp(yaw*DATA_CONTROL.simpleYawToRoll,
                                             -DATA_CONTROL.maxAssistBank, DATA_CONTROL.maxAssistBank);
        // кратчайший путь к нужному крену (через ±180°, а не «длинной дорогой»)
        let err=wantBank-bank;
        while(err> Math.PI)err-=2*Math.PI;
        while(err<-Math.PI)err+=2*Math.PI;
        // если крен долго остаётся большим без команды — усиливаем возврат:
        // так самолёт не может «зависнуть» боком или вверх ногами
        wingsT = Math.abs(bank)>DATA_CONTROL.maxAssistBank+0.15 ? wingsT+dt : 0;
        const boost = 1 + Math.min(3, wingsT*DATA_CONTROL.levelUrgency);
        tr=THREE.MathUtils.clamp(err*DATA_CONTROL.autoLevel*boost + state.omega.z*DATA_CONTROL.levelDamp,-1,1);
      }
      // ТАНГАЖ: клавиши в приоритете, иначе доводка мышью + подтяг в развороте
      const turnPull=Math.abs(bank)*DATA_CONTROL.simpleTurnPull;
      tp = kbPitch!==0 ? kbPitch
                       : THREE.MathUtils.clamp(pitch*DATA_CONTROL.simplePitch + turnPull
                                               - state.omega.x*DATA_CONTROL.pitchDamp, -1,1);
      // РЫСКАНИЕ: только клавишами
      tyaw = THREE.MathUtils.clamp(kbYaw + state.omega.y*0.06, -1,1);
      // страховка от сваливания
      const aLim=P.stallAlpha*0.85;
      if(state.alpha> aLim && tp>0) tp*=Math.max(0,1-( state.alpha-aLim)*DATA_CONTROL.stallGuard);
      if(state.alpha<-aLim && tp<0) tp*=Math.max(0,1-(-state.alpha-aLim)*DATA_CONTROL.stallGuard);
    }
  }
  ctrl.pitch=sm(ctrl.pitch,tp);
  ctrl.roll =sm(ctrl.roll ,tr);
  ctrl.yaw  =sm(ctrl.yaw ,tyaw);
  // газ: Shift/Ctrl, плюс дублирующие клавиши на случай залипания модификаторов
  const thrUp  = keys['ShiftLeft']||keys['ShiftRight']||keys['KeyW']&&false||keys['Equal']||keys['NumpadAdd'];
  const thrDn  = keys['ControlLeft']||keys['ControlRight']||keys['Minus']||keys['NumpadSubtract'];
  if(thrUp) state.throttle=Math.min(1,state.throttle+dt*DATA_FLIGHT.throttleRate);
  if(thrDn) state.throttle=Math.max(0,state.throttle-dt*DATA_FLIGHT.throttleRate);
  const fwd=new V3(0,0,-1).applyQuaternion(state.quat), up=new V3(0,1,0).applyQuaternion(state.quat), right=new V3(1,0,0).applyQuaternion(state.quat);
  const V=state.vel.length(),q=V*V; const force=new V3(0,-P.g,0);
  force.addScaledVector(fwd,P.maxThrust*state.throttle);
  let stalled=false;
  if(V>1){ const vhat=state.vel.clone().normalize();
    const alpha=Math.atan2(-up.dot(vhat),fwd.dot(vhat)); state.alpha=alpha; let cl=P.clAlpha*alpha; const a=Math.abs(alpha);
    const stallA=P.stallAlpha*(1+flaps.pos*DATA_FLAPS.stallBonus);
    if(a>stallA){cl*=Math.max(0.4,1-(a-stallA)*2.0);stalled=true;}
    // базовая (балансировочная) подъёмная не превышает вес — иначе на скорости выбрасывает вверх
    const fl=flaps.pos;
    const trimLift=Math.min(P.g,P.liftCoeff*q*(1+fl*DATA_FLAPS.liftBonus));
    // манёвренная подъёмная от угла атаки, с ограничением по перегрузке
    const manLift=THREE.MathUtils.clamp(P.liftCoeff*q*(1+fl*DATA_FLAPS.liftBonus)*cl,-P.maxG*P.g,P.maxG*P.g);
    force.addScaledVector(right.clone().cross(vhat).normalize(),trimLift+manLift);
    force.addScaledVector(vhat,-(q*(P.dragCoeff*(1+fl*DATA_FLAPS.dragPenalty)+P.inducedK*cl*cl)));
    const mis=fwd.clone().cross(vhat); state.omega.addScaledVector(mis.applyQuaternion(state.quat.clone().invert()),P.weathervane*dt*Math.min(1,V/40)); }
  state.vel.addScaledVector(force,dt); state.pos.addScaledVector(state.vel,dt);
  // ЗАКРЫЛКИ: в простом режиме выпускаются автоматически (на малой скорости и в вираже),
  // в продвинутом — вручную клавишей G. Дают больше подъёмной и лучший вираж ценой сопротивления.
  if(mouse.mode==='direct'){
    if(keys['KeyG']&&!flaps._h){ flaps.cmd=flaps.cmd>0.5?0:1; flaps._h=true; }
    if(!keys['KeyG'])flaps._h=false;
  } else {
    const slow=V<DATA_FLAPS.autoSlowSpeed, hard=Math.abs(ctrl.pitch)>0.55;
    flaps.cmd=(slow||hard)?1:0;
    if(V>DATA_FLAPS.autoRetractSpeed)flaps.cmd=0;                                  // на большой скорости убираются
  }
  flaps.pos+=(flaps.cmd-flaps.pos)*Math.min(1,dt*DATA_FLAPS.rate);      // выпускаются не мгновенно
  const auth=Math.min(1.4,0.05+V/220)*(1+flaps.pos*DATA_FLAPS.authBonus);   // с закрылками рули эффективнее
  state.omega.x+= ctrl.pitch*P.ctrlPitch*auth*dt; state.omega.z+=-ctrl.roll*P.ctrlRoll*auth*dt; state.omega.y+=-ctrl.yaw*P.ctrlYaw*auth*dt;
  state.omega.multiplyScalar(1-Math.min(1,P.angDamp*dt));
  const w=state.omega; state.quat.multiply(new QUAT(w.x*dt*0.5,w.y*dt*0.5,w.z*dt*0.5,1)).normalize();
  const ground=Math.max(terrainHeight(state.pos.x,state.pos.z)+2,2);
  if(state.pos.y<ground){ // удар о землю/воду
    const impact=Math.max(V,-state.vel.y*1.5);
    if(state.alive){
      if(impact>24){ explosion(state.pos.clone(),42); damagePlayer(999,'СТОЛКНОВЕНИЕ С ЗЕМЛЁЙ'); }
      else damagePlayer(50,'ЖЁСТКАЯ ПОСАДКА');
    }
    state.pos.y=ground; if(state.vel.y<0)state.vel.y*=-0.1; state.vel.multiplyScalar(0.86);
  }
  document.getElementById('stall').style.display=stalled?'block':'none';
}
