// webfly — config
// (модуль загружается классическим <script>; глобальное состояние общее)

const V3=THREE.Vector3, QUAT=THREE.Quaternion;

let renderer,scene,camera,player,afterburners=[],flapParts=[],ailParts=[],stabParts=[],rudParts=[],airbrake=null,cockpit=null,sunLight,running=false;
let viewMode=0, lastViewMode=-1;   // 0 — облёт сзади, 1 — кабина, 2 — дальний вид
let composer=null;

const state={ pos:new V3(0,DATA_FLIGHT.startAlt,0), vel:new V3(0,0,-DATA_FLIGHT.startSpeed), quat:new QUAT(),
  omega:new V3(0,0,0), throttle:DATA_FLIGHT.startThrottle, hp:DATA_UNITS.player.hp, maxHp:DATA_UNITS.player.hp, bombs:DATA_ORDNANCE.bombs, alive:true, alpha:0 };
// уставка «режима направления»: куда инструктор ведёт нос (Mouse Aim)
const aimDir=new V3(0,0,-1);
const flaps={ cmd:0, pos:0 };   // закрылки: команда и фактическое положение (0..1)

const game={ score:0, wave:1 };

// ремнабор: постепенное восстановление HP, кулдаун после применения
const repair={ cooldown:0, active:false, timeLeft:0, rate:DATA_REPAIR.rate, dur:DATA_REPAIR.duration, cd:DATA_REPAIR.cooldown };

const P=DATA_FLIGHT;

// боевые пулы
let enemies=[], allies=[], aaa=[], bullets=[], bombs=[], targets=[], fx=[];

let missiles=[], flares=[], fires=[], decor=[], debris=[];

let gunCd=0, bombCd=0, missileCd=0, flareCd=0, won=false, reinforceCd=0, playerSmk=0, boundT=0;

const mission={ objectives:[], groundTotal:0, fightersQuota:8, fightersDown:0, aceSpawned:false };

// эффективная дальность и скорость снаряда для каждого стрелка (как у реальных орудий)
const GUN=DATA_GUNS;

// ракеты: каждая под свою задачу (air=истреб./бомбард., aaa=ПВО, ground=наземные цели)
const MISSILES=DATA_MISSILES;

const MSL_ORDER=DATA_MISSILE_ORDER;

const HOSTILE_IR=DATA_HOSTILE_MISSILE;

const loadout={}; MSL_ORDER.forEach(k=>loadout[k]=MISSILES[k].ammo);

let selMsl='R73';

const lock={ target:null, progress:0, locked:false, offBore:0 };
let deathCause='', deathT=0, devMode=false, compactT=5;
let _lastWslots='', _lastObjlist='';
let bombMode=false;
let wingsT=0;         // как долго самолёт держит большой крен без команды   // режим бомбометания: показывать прицел
let selTarget=null;          // выбранная цель (клавиша T)
let radarRange=DATA_WORLD.radarRanges[1];         // дальность радара (N — переключение)
let camFollow=false;         // удержание Y — камера доворачивается на цель

/* ---------- ввод ---------- */
const keys={};

const ctrl={pitch:0,roll:0,yaw:0};

// управление мышью: нос тянется к курсору, ЛКМ — пушка, ПКМ — ракета
const mouse={ enabled:true, invert:false, mode:'arcade', x:0, y:0, px:0, py:0, sens:1.35, fire:false };

// настройки игрока (задаются на стартовом экране)
const settings={ sens:1.35, diff:'normal', invert:false, mouseOn:true, allies:2, enemyMult:1, ctrlMode:'arcade', mission:'battle', gunAssist:true, vol:0.55, lockStyle:'bold' };

// манеры ведения боя вражеских истребителей
const PILOT_STYLES=DATA_PILOT_STYLES;
const AI={ cd:1, spread:1, quota:8, fighters:4, bombers:2, allies:2, passive:false, free:false };
const WIND=new V3(DATA_WORLD.wind.x,DATA_WORLD.wind.y,DATA_WORLD.wind.z);

// прокси игрока для системы дым-повреждений
const playerObj={ pos:state.pos, hp:160, maxhp:160, fwd:new V3(0,0,-1), smk:0 };

const TEX={};

/* ---------- физика игрока ---------- */
const FIXED=1/120; let acc=0,last=performance.now();

/* ---------- камера ---------- */
const camPos=new V3();

/* ---------- HUD ---------- */
let lastAlt=state.pos.y,vsiSmooth=0;

// превью отметки захвата в меню
function drawLockPreview(){
  const cv=document.getElementById('lockpreview'); if(!cv)return;
  const c=cv.getContext('2d'); const W=cv.width,H=cv.height;
  c.clearRect(0,0,W,H);
  c.fillStyle='rgba(0,0,0,.35)'; c.fillRect(0,0,W,H);
  c.strokeStyle='rgba(107,255,176,.2)'; c.lineWidth=1; c.strokeRect(0.5,0.5,W-1,H-1);
  const st=settings.lockStyle;
  drawTargetMark(c,W*0.30,H*0.46,34,false,st);
  drawTargetMark(c,W*0.70,H*0.46,34,true, st);
  c.font='10px monospace'; c.textAlign='center';
  c.fillStyle='rgba(255,90,90,.6)';  c.fillText(t('lkNormal'),W*0.30,H-12);
  c.fillStyle='rgba(255,60,60,.95)'; c.fillText(t('lkLocked'),W*0.70,H-12);
  c.textAlign='left';
}
const volEl=document.getElementById('set-vol');
if(volEl)volEl.addEventListener('input',e=>{ settings.vol=+e.target.value;
  document.getElementById('set-vol-val').textContent=Math.round(settings.vol*100)+'%'; sndVolume(settings.vol); });
document.querySelectorAll('#set-lock button').forEach(b=>b.addEventListener('click',()=>{
  document.querySelectorAll('#set-lock button').forEach(x=>x.classList.remove('on'));
  b.classList.add('on'); settings.lockStyle=b.dataset.v; drawLockPreview(); }));
const gBtn=document.getElementById('set-gun');
if(gBtn)gBtn.addEventListener('click',()=>{ settings.gunAssist=!settings.gunAssist;
  gBtn.classList.toggle('on',settings.gunAssist); gBtn.textContent=settings.gunAssist?t('on'):t('off'); });

