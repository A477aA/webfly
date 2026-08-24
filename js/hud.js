// webfly — hud
// (модуль загружается классическим <script>; глобальное состояние общее)

function updateHUD(dt){
  const V=state.vel.length();
  el('v-spd').textContent=Math.round(V*3.6);
  el('v-ms').textContent=V.toFixed(1)+' м/с';
  el('v-alt').textContent=Math.round(state.pos.y);
  const fwd=new V3(0,0,-1).applyQuaternion(state.quat);
  let hdg=Math.atan2(fwd.x,-fwd.z)*180/Math.PI; if(hdg<0)hdg+=360;
  el('v-hdg').textContent=String(Math.round(hdg)).padStart(3,'0');
  const vs=(state.pos.y-lastAlt)/Math.max(dt,1e-4); lastAlt=state.pos.y;
  vsiSmooth+=(vs-vsiSmooth)*Math.min(1,dt*4); const vEl=el('v-vsi');
  vEl.textContent=(vsiSmooth>=0?'+':'')+vsiSmooth.toFixed(1); vEl.style.color=Math.abs(vsiSmooth)>12?'var(--amber)':'var(--hud)';
  el('thfill').style.width=(state.throttle*100)+'%'; el('v-th').textContent=Math.round(state.throttle*100)+'%';
  el('v-score').textContent=game.score;
  el('v-enemies').textContent=enemies.filter(e=>e.alive).length + aaa.filter(a=>a.alive).length;
  el('v-allies').textContent=allies.filter(a=>a.alive).length;
  // список задач
  let oh='';
  for(const o of mission.objectives){ const done=o.cur>=o.total;
    oh+='<div class="label" style="color:'+(done?'#6bffb0':'#c9d4c0')+';letter-spacing:.02em;font-size:14px">'
      +(done?'✔ ':'▸ ')+t(o.key||'')+' <span style="color:#fff">'+Math.min(o.cur,o.total)+'/'+o.total+'</span></div>'; }
  if(oh!==_lastObjlist){ el('objlist').innerHTML=oh; _lastObjlist=oh; }
  const hp=Math.max(0,state.hp)/state.maxHp; const hf=el('hpfill');
  hf.style.width=(hp*100)+'%'; hf.style.background=hp>0.5?'var(--hud)':hp>0.25?'var(--amber)':'var(--red)';
  const rEl=el('v-repair');
  if(repair.active){ rEl.textContent=t('rHeal')+' '+Math.ceil(repair.timeLeft)+'s'; rEl.style.color='#6bffb0'; }
  else if(repair.cooldown>0){ rEl.textContent=t('rCool')+' '+Math.ceil(repair.cooldown)+'s'; rEl.style.color='#ffb23e'; }
  else if(state.hp>=state.maxHp){ rEl.textContent=t('rFull'); rEl.style.color='#2f8a5c'; }
  else { rEl.textContent=t('rReady'); rEl.style.color='#6bffb0'; }
  // панель оружия: иконка + принцип наведения
  const mcfg=MISSILES[selMsl];
  const SEEK={ ir:{ico:'◉',tag:'ИК',   col:'#ff9a5a'},   // тепловая ГСН
               sar:{ico:'((•))',tag:'ПРЛ', col:'#8ec4ff'}, // полуактивная радиолокационная
               arh:{ico:'◎',tag:'АРЛ', col:'#6bffb0'},   // активная радиолокационная
               arm:{ico:'≈',tag:'ПРР', col:'#ffd36b'},   // противорадиолокационная
               agm:{ico:'▼',tag:'В-З', col:'#c8a06a'} }; // воздух-земля
  const SEEK_EN={ir:'IR',sar:'SARH',arh:'ARH',arm:'ARM',agm:'AGM'};
  let wh='<div class="wslot"><div class="wkey">'+(LANG==='ru'?'ЛКМ':'LMB')+'</div><div class="wico">≣</div>'
       +'<div class="wnm">'+t('hGun')+'</div><div class="wam">∞</div></div>';
  wh+='<div class="wslot'+(bombMode?' sel':'')+(state.bombs<=0?' empty':'')+'"><div class="wkey">B</div><div class="wico">'+(bombMode?'◉':'●')+'</div>'
     +'<div class="wnm">'+t('hBombs')+'</div><div class="wam">'+state.bombs+'</div></div>';
  MSL_ORDER.forEach((k,i)=>{ const m=MISSILES[k], ammo=loadout[k], sel=(k===selMsl&&!bombMode), sk=SEEK[m.cls]||SEEK.ir;
    wh+='<div class="wslot'+(sel?' sel':'')+(ammo<=0?' empty':'')+'">'
      +'<div class="wkey">'+(i+1)+'</div>'
      +'<div class="wico" style="color:'+(sel?sk.col:'#fff')+'">'+sk.ico+'</div>'
      +'<div class="wnm">'+m.name+'</div>'
      +'<div class="wseek" style="color:'+sk.col+'">'+(LANG==='ru'?sk.tag:SEEK_EN[m.cls])+'</div>'
      +'<div class="wam">'+ammo+'</div></div>'; });
  if(wh!==_lastWslots){ el('wslots').innerHTML=wh; _lastWslots=wh; }   // перерисовываем только при изменении
  // наш захват — обычной строкой под панелью оружия
  const lEl=el('v-lock');
  if(lock.locked){ const ob=Math.round((lock.offBore||0)*57.3);
    lEl.textContent='◉ '+t('lockOn')+' · '+tgtLabel(lock.target)+(ob>12?'  ['+t('hms')+' '+ob+'°]':''); lEl.style.color='#ff5a5a'; }
  else if(lock.target){ lEl.textContent=t('lockGo')+' '+Math.min(99,Math.round(lock.progress/mcfg.lockTime*100))+'%'; lEl.style.color='#ffb23e'; }
  else { lEl.textContent=t('lockNo'); lEl.style.color='#2f8a5c'; }

  // ЗНАК ОПАСНОСТИ: по нам идёт ракета
  const mw=el('mslwarn');
  let inc=null, incT=1e9;
  for(const m of missiles){
    if(m.team!=='hostile'||!m.target||!m.target.isPlayer)continue;
    const d=m.pos.distanceTo(state.pos);
    const closing=Math.max(m.vel.length()-state.vel.length()*0.3,60);
    const tt=d/closing;
    if(tt<incT){ incT=tt; inc=m; }
  }
  if(inc && state.alive){
    mw.className=incT<3.5?'on close':'on';
    el('v-mslwarn').textContent=incT.toFixed(1)+' '+t('warnSec')+' · '+t('warnEvade');
  } else mw.className='';
  const dm=el('v-repair');
  if(devMode&&dm){ dm.textContent='DEV: '+t('rReady'); dm.style.color='#ffb23e'; }
  drawOverlay();
}

// отметка цели: стиль настраивается в меню (settings.lockStyle)
function drawTargetMark(c,sx,sy,sz,locked,style){
  const col = locked ? 'rgba(255,40,40,1)' : 'rgba(255,90,90,.42)';
  c.strokeStyle=col; c.lineWidth=locked?2.4:1.2;
  const h=sz/2;
  if(style==='brackets'){
    const a=Math.max(7,sz*0.34);
    c.beginPath();
    c.moveTo(sx-h,sy-h+a); c.lineTo(sx-h,sy-h); c.lineTo(sx-h+a,sy-h);
    c.moveTo(sx+h-a,sy-h); c.lineTo(sx+h,sy-h); c.lineTo(sx+h,sy-h+a);
    c.moveTo(sx-h,sy+h-a); c.lineTo(sx-h,sy+h); c.lineTo(sx-h+a,sy+h);
    c.moveTo(sx+h-a,sy+h); c.lineTo(sx+h,sy+h); c.lineTo(sx+h,sy+h-a);
    c.stroke();
  } else if(style==='diamond'){
    c.beginPath(); c.moveTo(sx,sy-h); c.lineTo(sx+h,sy); c.lineTo(sx,sy+h); c.lineTo(sx-h,sy); c.closePath(); c.stroke();
    if(locked){ c.lineWidth=1.6; c.beginPath();
      c.moveTo(sx,sy-h*0.55); c.lineTo(sx+h*0.55,sy); c.lineTo(sx,sy+h*0.55); c.lineTo(sx-h*0.55,sy); c.closePath(); c.stroke(); }
  } else if(style==='reticle'){
    c.beginPath(); c.arc(sx,sy,h,0,Math.PI*2); c.stroke();
    c.beginPath();
    c.moveTo(sx-h-5,sy); c.lineTo(sx-h+4,sy); c.moveTo(sx+h-4,sy); c.lineTo(sx+h+5,sy);
    c.moveTo(sx,sy-h-5); c.lineTo(sx,sy-h+4); c.moveTo(sx,sy+h-4); c.lineTo(sx,sy+h+5);
    c.stroke();
  } else if(style==='bold'){
    c.lineWidth=locked?3.2:1.4;                       // «жирная» — толстая рамка
    c.strokeRect(sx-h,sy-h,sz,sz);
    if(locked){ c.lineWidth=1.6; const o=sz*0.30; c.strokeRect(sx-h-o,sy-h-o,sz+o*2,sz+o*2); }
  } else {                                            // 'simple'
    c.strokeRect(sx-h,sy-h,sz,sz);
  }
}

function drawOverlay(){
  const ov=el('overlay'),c=ov.getContext('2d'); const dpr=ov._dpr||1;
  const W=innerWidth,H=innerHeight,cx=W/2,cy=H/2;
  c.setTransform(dpr,0,0,dpr,0,0); c.clearRect(0,0,W,H);
  // прицел (краснеет, когда враг на линии огня)
  const fwd=new V3(0,0,-1).applyQuaternion(state.quat); let onTarget=false;
  for(const e of enemies){ if(!e.alive)continue; const dir=e.pos.clone().sub(state.pos).normalize();
    if(fwd.dot(dir)>0.995 && e.pos.distanceTo(state.pos)<1600){onTarget=true;break;} }
  const col=onTarget?'rgba(255,90,90,.95)':'rgba(107,255,176,.9)';
  c.strokeStyle=col; c.lineWidth=1.5; c.shadowColor=col; c.shadowBlur=6;
  c.beginPath(); c.moveTo(cx-30,cy);c.lineTo(cx-10,cy); c.moveTo(cx+10,cy);c.lineTo(cx+30,cy); c.moveTo(cx,cy-30);c.lineTo(cx,cy-10); c.moveTo(cx,cy+10);c.lineTo(cx,cy+30); c.stroke();
  c.beginPath();c.arc(cx,cy,5,0,Math.PI*2);c.stroke();
  // ретикул мыши (куда тянется нос)
  if(mouse.enabled){
    const mxp=mouse.px||cx, myp=mouse.py||cy;
    c.strokeStyle='rgba(107,255,176,.55)'; c.lineWidth=1.2;
    c.globalAlpha=0.35; c.beginPath(); c.moveTo(cx,cy); c.lineTo(mxp,myp); c.stroke(); c.globalAlpha=1;
    c.beginPath(); c.arc(mxp,myp,11,0,Math.PI*2); c.stroke();
    c.beginPath(); c.moveTo(mxp-4,myp);c.lineTo(mxp+4,myp);c.moveTo(mxp,myp-4);c.lineTo(mxp,myp+4); c.stroke();
  }
  // искусственный горизонт
  const eul=new THREE.Euler().setFromQuaternion(state.quat,'YXZ'); const roll=eul.z,pitch=eul.x,pxr=520;
  // указатель положения в пространстве — всегда по центру, кренится вместе с самолётом
  c.save(); c.translate(cx,cy); c.rotate(roll);
  c.strokeStyle='rgba(107,255,176,.55)'; c.lineWidth=1.6;
  c.beginPath(); c.moveTo(-150,0); c.lineTo(-46,0); c.moveTo(46,0); c.lineTo(150,0); c.stroke();
  c.beginPath(); c.moveTo(-150,0); c.lineTo(-150,7); c.moveTo(150,0); c.lineTo(150,7); c.stroke();
  c.strokeStyle='rgba(107,255,176,.30)'; c.lineWidth=1;
  c.beginPath(); c.moveTo(-30,-26); c.lineTo(0,-34); c.lineTo(30,-26); c.stroke();   // метка «верх»
  c.restore();
  // метки врагов (проекция в экран) — размер и подпись по типу
  c.shadowBlur=0; c.font='11px monospace';
  for(const e of enemies){ if(!e.alive)continue; const p=e.pos.clone().project(camera); if(p.z>1)continue;
    const sx=(p.x*0.5+0.5)*W, sy=(-p.y*0.5+0.5)*H;
    const sz=e.type==='bomber'?46:(e.type==='ace'?36:28);
    const isLocked=(lock.target===e&&lock.locked);
    drawTargetMark(c,sx,sy,sz,isLocked,settings.lockStyle);

    const hpw=sz, hp=Math.max(0,e.hp)/(e.maxhp||100);
    c.fillStyle='rgba(255,90,90,.18)'; c.fillRect(sx-hpw/2,sy-sz/2-7,hpw,3);
    c.fillStyle=isLocked?'rgba(255,50,50,1)':'rgba(255,90,90,.7)'; c.fillRect(sx-hpw/2,sy-sz/2-7,hpw*hp,3);
    c.fillStyle=isLocked?'rgba(255,70,70,1)':'rgba(255,90,90,.6)'; c.fillText(e.label||'F-16',sx-sz/2,sy+sz/2+12);
  }
  // метки союзников — как у врагов, но синие
  for(const a of allies){ if(!a.alive)continue; const p=a.pos.clone().project(camera); if(p.z>1)continue;
    const sx=(p.x*0.5+0.5)*W, sy=(-p.y*0.5+0.5)*H, sz=28;
    c.strokeStyle='rgba(110,175,255,.95)'; c.lineWidth=1.6;
    c.strokeRect(sx-sz/2,sy-sz/2,sz,sz);
    const hpw=sz, hp=Math.max(0,a.hp)/(a.maxhp||120);
    c.fillStyle='rgba(110,175,255,.25)'; c.fillRect(sx-hpw/2,sy-sz/2-7,hpw,3);
    c.fillStyle='rgba(110,175,255,.95)'; c.fillRect(sx-hpw/2,sy-sz/2-7,hpw*hp,3);
    c.fillStyle='rgba(110,175,255,.95)'; c.fillText('СОЮЗНИК',sx-sz/2,sy+sz/2+12);
  }
  // ПВО на земле (красные ромбы)
  for(const s of aaa){ if(!s.alive)continue; const p=s.pos.clone().project(camera); if(p.z>1)continue;
    const sx=(p.x*0.5+0.5)*W, sy=(-p.y*0.5+0.5)*H;
    c.strokeStyle='rgba(255,120,90,.9)'; c.lineWidth=1.4; c.beginPath();
    c.moveTo(sx-9,sy);c.lineTo(sx,sy-9);c.lineTo(sx+9,sy);c.lineTo(sx,sy+9);c.closePath(); c.stroke();
    c.fillStyle='rgba(255,120,90,.85)'; c.fillText('ПВО',sx+11,sy+3);
  }
  // цели на земле
  for(const t of targets){ if(!t.alive)continue; const p=t.pos.clone().project(camera); if(p.z>1)continue;
    const sx=(p.x*0.5+0.5)*W, sy=(-p.y*0.5+0.5)*H;
    c.strokeStyle='rgba(255,178,62,.8)'; c.lineWidth=1.2; c.beginPath();
    c.moveTo(sx-8,sy);c.lineTo(sx,sy-8);c.lineTo(sx+8,sy);c.lineTo(sx,sy+8);c.closePath(); c.stroke();
  }
  drawCompass(c,W,H,cx,cy,fwd);
  drawGunSector(c,W,H,cx,cy,fwd);
  drawLeadReticle(c,W,H,cx,cy,fwd);
  drawRadar(c,W,H,cx,cy,fwd);
  drawMissileWarning(c,W,H,cx,cy,fwd);
  drawSelectedTarget(c,W,H,cx,cy,fwd);
  drawBossMarker(c,W,H,cx,cy,fwd);
  if(bombMode&&state.bombs>0)drawBombSight(c,W,H,cx,cy);
}

// слой HUD: drawCompass
function drawCompass(c,W,H,cx,cy,fwd){
    // === ЛЕНТА КУРСА (компас) вверху экрана ===
    {
      let hdg=Math.atan2(fwd.x,-fwd.z)*180/Math.PI; if(hdg<0)hdg+=360;
      const bw=Math.min(560,W*0.38), bx=cx-bw/2, by=96, pxPerDeg=bw/90;   // видно ±45°
      c.save();
      c.beginPath(); c.rect(bx,by-14,bw,26); c.clip();
      c.strokeStyle='rgba(107,255,176,.45)'; c.lineWidth=1;      // просто тонкая линия шкалы
      c.beginPath(); c.moveTo(bx,by+7); c.lineTo(bx+bw,by+7); c.stroke();
      c.font='11px monospace'; c.textAlign='center';
      for(let d=-50;d<=50;d+=5){
        let deg=Math.round(hdg/5)*5+d; const x=cx+(deg-hdg)*pxPerDeg;
        let dn=((deg%360)+360)%360;
        const major=(dn%30===0);
        c.strokeStyle=major?'rgba(107,255,176,.85)':'rgba(107,255,176,.4)';
        c.lineWidth=major?1.6:1;
        c.beginPath(); c.moveTo(x,by+7); c.lineTo(x,major?by-1:by+3); c.stroke();
        if(major){ const NAMES={0:'С',90:'В',180:'Ю',270:'З'};
          const lbl=(LANG==='ru'&&NAMES[dn])?NAMES[dn]:(dn===0?'360':String(dn).padStart(3,'0'));
          c.fillStyle=NAMES[dn]?'rgba(255,255,255,.95)':'rgba(107,255,176,.85)';
          c.fillText(lbl,x,by-5); }
      }
      c.restore();
      // указатель текущего курса
      c.fillStyle='rgba(255,255,255,.98)';
      c.beginPath(); c.moveTo(cx,by-13); c.lineTo(cx-5,by-20); c.lineTo(cx+5,by-20); c.closePath(); c.fill();
    }

}

// слой HUD: drawGunSector
function drawGunSector(c,W,H,cx,cy,fwd){
    // === СЕКТОР ОБСТРЕЛА ПУШКИ + ПИПЕР (куда реально смотрит ствол) ===
    if(settings.gunAssist && mouse.enabled && GUN.player.cone){
      const G=GUN.player, cone=G.cone, conv=G.conv||700;
      const rightV=new V3(1,0,0).applyQuaternion(state.quat);
      const upV   =new V3(0,1,0).applyQuaternion(state.quat);
      // окружность конуса — проецируем реальные точки на границе сектора
      c.strokeStyle='rgba(107,255,176,.16)'; c.lineWidth=1; c.setLineDash([4,9]);
      c.beginPath(); let started=false;
      for(let i=0;i<=40;i++){ const a=i/40*Math.PI*2;
        const d=fwd.clone().multiplyScalar(Math.cos(cone))
          .addScaledVector(rightV,Math.sin(cone)*Math.cos(a))
          .addScaledVector(upV,   Math.sin(cone)*Math.sin(a)).normalize();
        const p=state.pos.clone().addScaledVector(d,conv).project(camera);
        if(p.z>1)continue;
        const sx=(p.x*0.5+0.5)*W, sy=(-p.y*0.5+0.5)*H;
        if(!started){c.moveTo(sx,sy);started=true;} else c.lineTo(sx,sy);
      }
      if(started){ c.closePath(); c.stroke(); }
      c.setLineDash([]);
      // пипер: то же направление, каким реально стреляет пушка
      const ga=gunAimDir();
      const gp=state.pos.clone().addScaledVector(ga.dir,conv).project(camera);
      if(gp.z<1){ const gx=(gp.x*0.5+0.5)*W, gy=(-gp.y*0.5+0.5)*H;
        const gc=ga.edge?'rgba(255,178,62,.95)':(ga.lead?'rgba(120,255,140,1)':'rgba(107,255,176,.9)');
        c.strokeStyle=gc; c.lineWidth=ga.lead?2.4:1.8;
        c.beginPath(); c.arc(gx,gy,ga.lead?9:7,0,Math.PI*2); c.stroke();
        c.beginPath(); c.moveTo(gx-13,gy); c.lineTo(gx-8,gy); c.moveTo(gx+8,gy); c.lineTo(gx+13,gy);
        c.moveTo(gx,gy-13); c.lineTo(gx,gy-8); c.moveTo(gx,gy+8); c.lineTo(gx,gy+13); c.stroke();
        if(ga.lead){ c.fillStyle='rgba(120,255,140,.95)'; c.font='bold 10px monospace'; c.textAlign='center';
          c.fillText(t('gunReady'),gx,gy-16); c.textAlign='left'; }
      }
    }
}

// слой HUD: drawLeadReticle
function drawLeadReticle(c,W,H,cx,cy,fwd){
    // === УПРЕЖДАЮЩИЙ ПРИЦЕЛ (аркадный): куда стрелять по ближайшей цели ===
    {
      let best=null,bd=GUN.player.range*GUN.player.range;
      const cand=[...enemies,...aaa];
      for(const e of cand){ if(!e.alive)continue; const dd=e.pos.distanceToSquared(state.pos); if(dd<bd){bd=dd;best=e;} }
      if(best){
        const dist=Math.sqrt(bd), tof=dist/GUN.player.speed;           // время полёта снаряда
        const relV=(best.vel||new V3()).clone().sub(state.vel);        // снаряд наследует скорость самолёта
        const leadPt=best.pos.clone().addScaledVector(relV,tof);
        const pl=leadPt.clone().project(camera), pt=best.pos.clone().project(camera);
        if(pl.z<1){
          const lx=(pl.x*0.5+0.5)*W, ly=(-pl.y*0.5+0.5)*H;
          const tx=(pt.x*0.5+0.5)*W, ty=(-pt.y*0.5+0.5)*H;
          // зелёный, когда нос совмещён с точкой упреждения (можно стрелять)
          const aimOk=Math.hypot(lx-cx,ly-cy)<16;
          const col=aimOk?'rgba(120,255,140,.98)':'rgba(255,240,150,.9)';
          if(pt.z<1){ c.save(); c.setLineDash([3,4]); c.strokeStyle='rgba(255,240,150,.5)'; c.lineWidth=1;
            c.beginPath(); c.moveTo(tx,ty); c.lineTo(lx,ly); c.stroke(); c.restore(); }
          c.strokeStyle=col; c.lineWidth=aimOk?2.2:1.6;
          c.beginPath(); c.arc(lx,ly,9,0,Math.PI*2); c.stroke();
          c.beginPath(); c.moveTo(lx-13,ly); c.lineTo(lx-9,ly); c.moveTo(lx+9,ly); c.lineTo(lx+13,ly);
          c.moveTo(lx,ly-13); c.lineTo(lx,ly-9); c.moveTo(lx,ly+9); c.lineTo(lx,ly+13); c.stroke();
          c.fillStyle=col; c.font='10px monospace'; c.fillText(t('leadMark')+' '+Math.round(dist)+' m',lx+14,ly+4);
        }
      }
    }
}

// слой HUD: drawRadar
function drawRadar(c,W,H,cx,cy,fwd){
    // === РАДАР (правый нижний угол) ===
    {
      const R=218, rcx=W-R-24, rcy=H-R-24, RANGE=radarRange;
      c.save();
      // фон и сетка
      c.fillStyle='rgba(0,20,10,.42)'; c.beginPath(); c.arc(rcx,rcy,R,0,Math.PI*2); c.fill();
      c.strokeStyle='rgba(107,255,176,.55)'; c.lineWidth=1.4;
      c.beginPath(); c.arc(rcx,rcy,R,0,Math.PI*2); c.stroke();
      c.strokeStyle='rgba(107,255,176,.22)'; c.lineWidth=1;
      for(const f of [0.33,0.66]){ c.beginPath(); c.arc(rcx,rcy,R*f,0,Math.PI*2); c.stroke(); }
      c.beginPath(); c.moveTo(rcx-R,rcy); c.lineTo(rcx+R,rcy); c.moveTo(rcx,rcy-R); c.lineTo(rcx,rcy+R); c.stroke();
      // базис: нос самолёта — вверх
      const f2x=fwd.x, f2z=fwd.z, fl=Math.hypot(f2x,f2z)||1;
      const fx=f2x/fl, fz=f2z/fl, rx2=-fz, rz2=fx;
      const plot=(p)=>{ const dx=p.x-state.pos.x, dz=p.z-state.pos.z;
        const fwdC=dx*fx+dz*fz, rgtC=dx*rx2+dz*rz2;
        let sx=rgtC/RANGE*R, sy=-fwdC/RANGE*R; const m=Math.hypot(sx,sy);
        const edge=m>R; if(edge){ sx=sx/m*R; sy=sy/m*R; }
        return {x:rcx+sx,y:rcy+sy,edge}; };
      // наземные цели
      for(const t of targets){ if(!t.alive)continue; const q=plot(t.pos); if(q.edge)continue;
        c.fillStyle='rgba(255,178,62,.75)'; c.fillRect(q.x-2,q.y-2,4,4); }
      // ПВО
      for(const s of aaa){ if(!s.alive)continue; const q=plot(s.pos); if(q.edge)continue;
        c.strokeStyle='rgba(255,120,90,.95)'; c.lineWidth=1.4; c.beginPath();
        c.moveTo(q.x-4,q.y); c.lineTo(q.x,q.y-4); c.lineTo(q.x+4,q.y); c.lineTo(q.x,q.y+4); c.closePath(); c.stroke(); }
      // союзники
      for(const a of allies){ if(!a.alive)continue; const q=plot(a.pos);
        c.fillStyle=q.edge?'rgba(110,175,255,.5)':'rgba(110,175,255,.95)';
        c.beginPath(); c.arc(q.x,q.y,q.edge?2.5:3.6,0,Math.PI*2); c.fill(); }
      // враги (крупнее — бомбардировщик/ас)
      for(const e of enemies){ if(!e.alive)continue; const q=plot(e.pos);
        const sz=e.type==='bomber'?5.2:(e.type==='ace'?4.8:3.6);
        c.fillStyle=q.edge?'rgba(255,90,90,.5)':'rgba(255,90,90,.98)';
        c.beginPath(); c.arc(q.x,q.y,q.edge?2.5:sz,0,Math.PI*2); c.fill();
        if(e===selTarget){ const bl=0.5+0.5*Math.sin(performance.now()*0.008);   // выбранная мигает
          c.strokeStyle='rgba(255,255,255,'+(0.4+bl*0.6)+')'; c.lineWidth=1.6;
          c.beginPath(); c.arc(q.x,q.y,sz+4,0,Math.PI*2); c.stroke(); }
        if(e.type==='ace'&&!q.edge){ c.strokeStyle='rgba(255,90,90,.9)'; c.lineWidth=1.2;
          c.beginPath(); c.arc(q.x,q.y,sz+3,0,Math.PI*2); c.stroke(); } }
      // наш самолёт в центре
      c.fillStyle='rgba(107,255,176,.98)';
      c.beginPath(); c.moveTo(rcx,rcy-6); c.lineTo(rcx-4.5,rcy+5); c.lineTo(rcx+4.5,rcy+5); c.closePath(); c.fill();
      c.fillStyle='rgba(107,255,176,.6)'; c.font='10px monospace'; c.textAlign='center';
      c.fillText((RANGE/1000)+' km · N', rcx, rcy+R+14); c.textAlign='left';
      c.restore();
    }
}

// слой HUD: drawMissileWarning
function drawMissileWarning(c,W,H,cx,cy,fwd){
    // === НАПРАВЛЕНИЕ НА ВХОДЯЩУЮ РАКЕТУ (стрелка по кругу вокруг прицела) ===
    for(const m of missiles){
      if(m.team!=='hostile'||!m.target||!m.target.isPlayer||!state.alive)continue;
      const rel=m.pos.clone().sub(state.pos);
      const dir=rel.clone().applyQuaternion(state.quat.clone().invert());
      const ang=Math.atan2(dir.x,-dir.z);
      const R2=Math.min(W,H)*0.20, pulse=0.6+0.4*Math.sin(performance.now()*0.02);
      c.save(); c.translate(cx,cy); c.rotate(ang);
      c.fillStyle='rgba(255,60,60,'+(0.45+pulse*0.45)+')';
      c.beginPath(); c.moveTo(0,-R2-16); c.lineTo(-10,-R2); c.lineTo(10,-R2); c.closePath(); c.fill();
      c.restore();
      // трек ракеты на экране
      const p=m.pos.clone().project(camera);
      if(p.z<1){ const sx=(p.x*0.5+0.5)*W, sy=(-p.y*0.5+0.5)*H;
        c.strokeStyle='rgba(255,60,60,.95)'; c.lineWidth=2;
        c.beginPath(); c.arc(sx,sy,11+pulse*4,0,Math.PI*2); c.stroke(); }
      break;
    }
}

// слой HUD: drawSelectedTarget
function drawSelectedTarget(c,W,H,cx,cy,fwd){
    // === ВЫБРАННАЯ ЦЕЛЬ (клавиша T): рамка, данные, стрелка если за кадром ===
    if(selTarget && selTarget.alive){
      const rel=selTarget.pos.clone().sub(state.pos), dist=rel.length();
      const p=selTarget.pos.clone().project(camera);
      if(p.z<1){
        const sx=(p.x*0.5+0.5)*W, sy=(-p.y*0.5+0.5)*H, q=22;
        c.strokeStyle='rgba(255,255,255,.95)'; c.lineWidth=2;
        c.beginPath();
        c.moveTo(sx-q,sy-q+8); c.lineTo(sx-q,sy-q); c.lineTo(sx-q+8,sy-q);
        c.moveTo(sx+q-8,sy-q); c.lineTo(sx+q,sy-q); c.lineTo(sx+q,sy-q+8);
        c.moveTo(sx-q,sy+q-8); c.lineTo(sx-q,sy+q); c.lineTo(sx-q+8,sy+q);
        c.moveTo(sx+q-8,sy+q); c.lineTo(sx+q,sy+q); c.lineTo(sx+q,sy+q-8); c.stroke();
        c.fillStyle='rgba(255,255,255,.95)'; c.font='bold 11px monospace'; c.textAlign='center';
        c.fillText((selTarget.label||'ЦЕЛЬ')+'  '+Math.round(dist)+' m',sx,sy+q+15); c.textAlign='left';
      } else {
        const dir=rel.clone().applyQuaternion(camera.quaternion.clone().invert());
        const ang=Math.atan2(dir.x,-dir.z), rr2=Math.min(W,H)*0.30;
        c.save(); c.translate(cx,cy); c.rotate(ang);
        c.fillStyle='rgba(255,255,255,.9)';
        c.beginPath(); c.moveTo(0,-rr2-13); c.lineTo(-8,-rr2); c.lineTo(8,-rr2); c.closePath(); c.fill();
        c.restore();
      }
    }
}

// слой HUD: drawBossMarker
function drawBossMarker(c,W,H,cx,cy,fwd){
    // === МЕТКА БОССА: когда прочие задачи закрыты, ведём к асу ===
    {
      const others=mission.objectives.filter(o=>o.id!=='ace');
      const done=others.length>0 && others.every(o=>o.cur>=o.total);
      const ace=enemies.find(e=>e.type==='ace'&&e.alive);
      if(done&&ace){
        const p=ace.pos.clone().project(camera);
        const rel=ace.pos.clone().sub(state.pos), dist=rel.length();
        if(p.z<1){ const sx=(p.x*0.5+0.5)*W, sy=(-p.y*0.5+0.5)*H;
          const pulse=0.55+0.45*Math.sin(performance.now()*0.006);
          c.save(); c.strokeStyle='rgba(255,80,80,'+(0.55+pulse*0.45)+')'; c.lineWidth=2.4;
          c.beginPath(); c.arc(sx,sy,26+pulse*5,0,Math.PI*2); c.stroke();
          c.setLineDash([4,5]); c.lineWidth=1.4; c.beginPath(); c.arc(sx,sy,40,0,Math.PI*2); c.stroke();
          c.restore();
          c.fillStyle='rgba(255,90,90,.98)'; c.font='bold 12px monospace'; c.textAlign='center';
          c.fillText('★ '+t('oAce').toUpperCase(),sx,sy-46);
          c.fillText(Math.round(dist)+' m',sx,sy+58); c.textAlign='left';
        } else {
          // за кадром — стрелка к боссу по краю экрана
          const dir=rel.clone().applyQuaternion(camera.quaternion.clone().invert());
          const ang=Math.atan2(dir.x,-dir.z), ax=cx+Math.sin(ang)*(Math.min(W,H)*0.36), ay=cy-Math.cos(ang)*0+cy*0.0+cy;
          c.save(); c.translate(cx,cy); c.rotate(ang); c.fillStyle='rgba(255,90,90,.9)';
          const rr2=Math.min(W,H)*0.34;
          c.beginPath(); c.moveTo(0,-rr2-14); c.lineTo(-9,-rr2); c.lineTo(9,-rr2); c.closePath(); c.fill(); c.restore();
        }
      }
    }
    // рамка захвата ракеты (жёлтая — идёт захват, красная — LOCK)
    if(lock.target && lock.target.pos && lock.target.alive!==false){
      const p=lock.target.pos.clone().project(camera);
      if(p.z<1){ const sx=(p.x*0.5+0.5)*W, sy=(-p.y*0.5+0.5)*H; const q=lock.locked?24:34;
        const lc=lock.locked?'rgba(255,90,90,.98)':'rgba(255,178,62,.95)';
        c.strokeStyle=lc; c.lineWidth=2; c.beginPath();
        c.moveTo(sx-q,sy-q+9);c.lineTo(sx-q,sy-q);c.lineTo(sx-q+9,sy-q);
        c.moveTo(sx+q-9,sy-q);c.lineTo(sx+q,sy-q);c.lineTo(sx+q,sy-q+9);
        c.moveTo(sx-q,sy+q-9);c.lineTo(sx-q,sy+q);c.lineTo(sx-q+9,sy+q);
        c.moveTo(sx+q-9,sy+q);c.lineTo(sx+q,sy+q);c.lineTo(sx+q,sy+q-9); c.stroke();
        c.fillStyle=lc; c.font='11px monospace'; c.fillText(lock.locked?'LOCK':'…',sx-q,sy-q-5);
      }
    }
    // отметки летящих ракет: свои — голубые, с линией к цели; вражеские — красные
    for(const m of missiles){ const p=m.pos.clone().project(camera); if(p.z>1)continue;
      const sx=(p.x*0.5+0.5)*W, sy=(-p.y*0.5+0.5)*H;
      const friend=m.team==='friendly'; const col=friend?'rgba(120,220,255,.95)':'rgba(255,90,90,.95)';
      if(friend && m.target && m.target.pos){ const tp=m.target.pos.clone().project(camera);
        if(tp.z<1){ const tx=(tp.x*0.5+0.5)*W, ty=(-tp.y*0.5+0.5)*H;
          c.strokeStyle='rgba(120,220,255,.35)'; c.lineWidth=1; c.beginPath(); c.moveTo(sx,sy); c.lineTo(tx,ty); c.stroke(); } }
      c.strokeStyle=col; c.lineWidth=1.4; c.beginPath(); c.arc(sx,sy,5,0,Math.PI*2); c.stroke();
      c.beginPath(); c.moveTo(sx-8,sy);c.lineTo(sx-5,sy); c.moveTo(sx+5,sy);c.lineTo(sx+8,sy);
      c.moveTo(sx,sy-8);c.lineTo(sx,sy-5); c.moveTo(sx,sy+5);c.lineTo(sx,sy+8); c.stroke();
    }
}

// ПРИЦЕЛ БОМБОМЕТАНИЯ: численно интегрируем траекторию бомбы и показываем,
// куда она упадёт. Активен, когда выбраны бомбы (клавиша B в панели оружия).
function predictBombImpact(){
  const down=TMP.a.set(0,-1,0).applyQuaternion(state.quat);
  const p=TMP.b.copy(state.pos).addScaledVector(down,3);
  const v=TMP.c.copy(state.vel).addScaledVector(down,DATA_ORDNANCE.bombEject);
  const dt=0.01;
  for(let i=0;i<4000;i++){
    const V=v.length();
    if(V>0.1) v.addScaledVector(v,-DATA_ORDNANCE.bombDrag*V*dt);
    v.y-=9.81*dt;
    p.addScaledVector(v,dt);
    const gh=terrainHeight(p.x,p.z);
    if(p.y<=gh){ p.y=gh; return {pos:p.clone(), t:i*dt}; }
  }
  return null;
}

function drawBombSight(c,W,H,cx,cy){
  if(!state.alive)return;
  const imp=predictBombImpact(); if(!imp)return;
  const pr=imp.pos.clone().project(camera); if(pr.z>1)return;
  const sx=(pr.x*0.5+0.5)*W, sy=(-pr.y*0.5+0.5)*H;
  // радиус поражения в экранных пикселях
  const edge=imp.pos.clone().add(new V3(DATA_ORDNANCE.bombBlast,0,0)).project(camera);
  const ex=(edge.x*0.5+0.5)*W, ey=(-edge.y*0.5+0.5)*H;
  const rPix=Math.max(6,Math.hypot(ex-sx,ey-sy));
  // есть ли цель в зоне поражения — тогда прицел зеленеет
  let inZone=false;
  const R2=DATA_ORDNANCE.bombBlast*DATA_ORDNANCE.bombBlast;
  for(const t of targets){ if(t.alive&&imp.pos.distanceToSquared(t.pos)<R2){inZone=true;break;} }
  if(!inZone)for(const s of aaa){ if(s.alive&&imp.pos.distanceToSquared(s.pos)<R2){inZone=true;break;} }
  const col=inZone?'rgba(120,255,140,':'rgba(255,178,62,';
  c.save();
  // зона поражения
  c.strokeStyle=col+'.85)'; c.lineWidth=inZone?2.2:1.5;
  c.beginPath(); c.ellipse(sx,sy,rPix,rPix*0.42,0,0,Math.PI*2); c.stroke();
  c.fillStyle=col+'.10)'; c.fill();
  // перекрестие точки падения
  c.beginPath();
  c.moveTo(sx-12,sy); c.lineTo(sx-4,sy); c.moveTo(sx+4,sy); c.lineTo(sx+12,sy);
  c.moveTo(sx,sy-12); c.lineTo(sx,sy-4); c.moveTo(sx,sy+4); c.lineTo(sx,sy+12); c.stroke();
  c.beginPath(); c.arc(sx,sy,3.5,0,Math.PI*2); c.stroke();
  // линия от самолёта к точке падения и время полёта
  const me=state.pos.clone().project(camera);
  if(me.z<1){ const mx2=(me.x*0.5+0.5)*W, my2=(-me.y*0.5+0.5)*H;
    c.setLineDash([4,6]); c.strokeStyle=col+'.35)'; c.lineWidth=1;
    c.beginPath(); c.moveTo(mx2,my2); c.lineTo(sx,sy); c.stroke(); c.setLineDash([]); }
  c.fillStyle=col+'.95)'; c.font='11px monospace'; c.textAlign='center';
  c.fillText(imp.t.toFixed(1)+' s',sx,sy+rPix*0.42+15);
  if(inZone){ c.font='bold 11px monospace'; c.fillText(t('bombReady'),sx,sy-rPix*0.42-8); }
  c.textAlign='left'; c.restore();
}
