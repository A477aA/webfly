// webfly — main
// (модуль загружается классическим <script>; глобальное состояние общее)

addEventListener('keydown',e=>{ keys[e.code]=true;
  if(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Space'].includes(e.code))e.preventDefault();
  if(e.code==='KeyR')restart(); if(e.code==='KeyV')viewMode=(viewMode+1)%3;
  if(e.code==='Escape'){ togglePause(); }
  if(e.code==='KeyT')cycleTarget();
  if(e.code==='KeyB'){ bombMode=!bombMode;            // B — включить/выключить прицел бомбометания
    showMsg(bombMode?t('bombOn'):t('bombOff'), bombMode?'#ffb23e':'#2f8a5c'); }
  if(/^Digit[1-5]$/.test(e.code))bombMode=false;       // выбор ракеты выключает режим бомб
  if(e.code==='KeyU')devMode=!devMode;
  if(e.code==='KeyN'){ { const R=DATA_WORLD.radarRanges; radarRange=R[(R.indexOf(radarRange)+1)%R.length]; } }
  if(e.code==='KeyM')mouse.enabled=!mouse.enabled;
  if(e.code==='KeyF' && !e.repeat)fireMissile();
  if(e.code.startsWith('Digit')){ const n=+e.code.slice(5); if(n>=1&&n<=5){ selMsl=MSL_ORDER[n-1]; lock.target=null; lock.progress=0; lock.locked=false; } }
});

addEventListener('keyup',e=>{keys[e.code]=false;});
// выбор цели: ближайшая к центру экрана, затем по кругу
function cycleTarget(){
  const fwd=new V3(0,0,-1).applyQuaternion(state.quat);
  const list=[...enemies,...aaa].filter(e=>e.alive)
    .map(e=>{ const to=e.pos.clone().sub(state.pos); const d=to.length();
      return {e,d,dot:fwd.dot(to.multiplyScalar(1/Math.max(d,0.001)))}; })
    .filter(o=>o.dot>0.2)
    .sort((a,b)=>(b.dot-a.dot));
  if(!list.length){ selTarget=null; return; }
  const i=list.findIndex(o=>o.e===selTarget);
  selTarget=list[(i+1)%list.length].e;
}

function applySettings(){
  mouse.sens=settings.sens; mouse.invert=settings.invert; mouse.enabled=settings.mouseOn; mouse.mode=settings.ctrlMode;
  const base=DATA_DIFFICULTY[settings.diff]||DATA_DIFFICULTY.normal;
  AI.cd=base.cd; AI.spread=base.spread;
  AI.fighters=Math.max(1,Math.round(base.fighters*settings.enemyMult));
  AI.quota   =Math.max(1,Math.round(base.quota  *settings.enemyMult));
  AI.bombers =Math.max(1,Math.round(2*settings.enemyMult));
  AI.allies  =settings.allies;
  AI.passive =(settings.mission!=='battle');
  AI.free    =(settings.mission==='free');
}

addEventListener('mousemove',e=>{ mouse.px=e.clientX; mouse.py=e.clientY;
  mouse.x=(e.clientX/innerWidth)*2-1; mouse.y=(e.clientY/innerHeight)*2-1; });

addEventListener('mousedown',e=>{ if(!running)return;
  if(e.button===0) mouse.fire=true;
  if(e.button===2) fireMissile(); });

addEventListener('mouseup',e=>{ if(e.button===0) mouse.fire=false; });

addEventListener('contextmenu',e=>e.preventDefault());

function updateCamera(dt){
  player.position.copy(state.pos); player.quaternion.copy(state.quat);
  const back=new V3(0,0,1).applyQuaternion(state.quat), up=new V3(0,1,0).applyQuaternion(state.quat);
  const fwdV=new V3(0,0,-1).applyQuaternion(state.quat);
  const inCockpit=(viewMode===1);

  // из кабины корпус самолёта скрываем целиком: его материалы двусторонние
  // и изнутри перекрывают весь обзор
  player.visible=state.alive && !inCockpit;
  if(cockpit){
    cockpit.visible=inCockpit && state.alive;
    if(inCockpit){
      cockpit.position.copy(state.pos).addScaledVector(fwdV,3.2).addScaledVector(up,0.95);
      cockpit.quaternion.copy(state.quat);
    }
  }
  // угол обзора меняем ТОЛЬКО при смене вида — иначе пересборка проекции каждый кадр
  if(viewMode!==lastViewMode){
    camera.fov = inCockpit?86:64;
    camera.updateProjectionMatrix();
    lastViewMode=viewMode;
  }

  const lookBack=keys['KeyO']||keys['AltLeft'];      // удержание — взгляд назад
  let lookAt;
  if(lookBack){
    const eye = inCockpit ? state.pos.clone().addScaledVector(fwdV,3.2).addScaledVector(up,0.95)
                          : state.pos.clone().addScaledVector(back,-26).addScaledVector(up,7);
    camera.position.copy(eye); camPos.copy(eye); camera.up.copy(up);
    camera.lookAt(eye.clone().addScaledVector(back,200));
    player.visible=state.alive && !inCockpit;
    if(cockpit)cockpit.visible=false;
    sunLight.target.position.copy(state.pos); sunLight.position.copy(state.pos.clone().addScaledVector(window.__sunDir,900));
    if(window.__water)window.__water.position.set(state.pos.x,-0.6,state.pos.z);
    if(window.__sky)window.__sky.position.copy(camera.position);
    if(window.__sunHalo)window.__sunHalo.position.copy(camera.position).addScaledVector(window.__sunDir,7000);
    if(window.__sunCore)window.__sunCore.position.copy(camera.position).addScaledVector(window.__sunDir,7000);
    return;
  }
  if(inCockpit){
    const eye=state.pos.clone().addScaledVector(fwdV,3.2).addScaledVector(up,0.95);
    camera.position.copy(eye); camPos.copy(eye); camera.up.copy(up);
    lookAt=eye.clone().addScaledVector(fwdV,200);
    if(keys['KeyY'] && selTarget && selTarget.alive) lookAt=lookAt.lerp(selTarget.pos,0.8);
  } else {
    const dist=(viewMode===2)?58:32, hgt=(viewMode===2)?15:9;
    const desired=state.pos.clone().addScaledVector(back,dist).addScaledVector(up,hgt);
    camPos.lerp(desired,Math.min(1,dt*4)); camera.position.copy(camPos); camera.up.copy(up);
    lookAt=state.pos.clone().addScaledVector(back,-14).addScaledVector(up,2);
    if(keys['KeyY'] && selTarget && selTarget.alive) lookAt=lookAt.lerp(selTarget.pos,0.75);
  }
  camera.lookAt(lookAt);

  sunLight.target.position.copy(state.pos); sunLight.position.copy(state.pos.clone().addScaledVector(window.__sunDir,900));
  if(window.__water)window.__water.position.set(state.pos.x,-0.6,state.pos.z);
  if(window.__sky)window.__sky.position.copy(camera.position);
  if(window.__sunHalo)window.__sunHalo.position.copy(camera.position).addScaledVector(window.__sunDir,7000);
  if(window.__sunCore)window.__sunCore.position.copy(camera.position).addScaledVector(window.__sunDir,7000);
}

/* ---------- HUD-цикл и запуск ---------- */
function loop(){ requestAnimationFrame(loop); if(!running)return;
  const now=performance.now(); let frame=Math.min(0.05,(now-last)/1000); last=now; acc+=frame;
  while(acc>=FIXED){stepPhysics(FIXED);acc-=FIXED;}
  updateCombat(frame); updateCamera(frame); updateHUD(frame);
  if(composer) composer.render(); else renderer.render(scene,camera); }

/* ---------- пауза ---------- */
let paused=false;
function togglePause(){
  const gate=document.getElementById('startgate');
  const open=(gate.style.display!=='none'&&gate.style.display!=='');
  if(open){ if(paused)resumeGame(); return; }
  if(!running)return;
  paused=true; running=false;
  document.getElementById('resumebtn').style.display='';
  document.getElementById('startbtn').textContent=t('restartBtn');
  gate.style.display='flex';
}
function resumeGame(){
  paused=false;
  document.getElementById('startgate').style.display='none';
  applySettings(); running=true; last=performance.now();
}
function showGate(){ running=false; paused=false;
  document.getElementById('resumebtn').style.display='none';
  document.getElementById('startbtn').textContent=t('start');
  document.getElementById('overmsg').style.display='none';
  document.getElementById('winmsg').style.display='none';
  document.getElementById('startgate').style.display='flex'; }

/* ---------- запуск ---------- */
applyI18N();
drawLockPreview();
initScene();
camPos.copy(state.pos.clone().add(new V3(0,9,32)));
loop();

/* ---------- настройки в меню ---------- */
document.getElementById('set-sens').addEventListener('input',e=>{
  settings.sens=+e.target.value; document.getElementById('set-sens-val').textContent=(+e.target.value).toFixed(2); });
function segHandler(sel,apply){
  document.querySelectorAll(sel+' button').forEach(b=>b.addEventListener('click',()=>{
    document.querySelectorAll(sel+' button').forEach(x=>x.classList.remove('on'));
    b.classList.add('on'); apply(b.dataset.v); }));
}
segHandler('#set-lang',  v=>setLang(v));
segHandler('#set-mission',v=>settings.mission=v);
segHandler('#set-ctrl',  v=>settings.ctrlMode=v);
segHandler('#set-diff',  v=>settings.diff=v);
segHandler('#set-allies',v=>settings.allies=+v);
segHandler('#set-enemies',v=>settings.enemyMult=+v);

const invBtn2=document.getElementById('set-invert');
invBtn2.addEventListener('click',()=>{ settings.invert=!settings.invert;
  invBtn2.classList.toggle('on',settings.invert); invBtn2.textContent=settings.invert?t('on'):t('off'); });
const mBtn2=document.getElementById('set-mouse');
mBtn2.addEventListener('click',()=>{ settings.mouseOn=!settings.mouseOn;
  mBtn2.classList.toggle('on',settings.mouseOn); mBtn2.textContent=settings.mouseOn?t('on'):t('off'); });

/* ---------- кнопки экранов ---------- */
document.getElementById('resumebtn').addEventListener('click',resumeGame);
document.getElementById('startbtn').addEventListener('click',()=>{
  audioInit(); audioResume(); sndVolume(settings.vol);
  paused=false; document.getElementById('resumebtn').style.display='none';
  applySettings();
  document.getElementById('startgate').style.display='none';
  restart();
});
document.getElementById('restartbtn').addEventListener('click',restart);
document.getElementById('winbtn').addEventListener('click',restart);
document.getElementById('over-settings').addEventListener('click',showGate);
document.getElementById('win-settings').addEventListener('click',showGate);
addEventListener('blur',()=>{ last=performance.now();
  for(const k in keys)keys[k]=false;      // сброс: иначе Shift/Ctrl «залипают» при переключении окна
  mouse.fire=false; });
