// webfly — ЕДИНЫЙ КОНФИГ ИГРЫ
// Здесь собраны ВСЕ настраиваемые величины: характеристики машин, вооружение,
// баланс, поведение ИИ и управление. Чтобы что-то подкрутить — правьте только этот файл,
// лезть в логику не нужно.
//
// Порядок загрузки: data.js идёт первым, до config.js и остальных модулей.

/* ============================================================
   1. АЭРОДИНАМИКА И УПРАВЛЕНИЕ ИГРОКА
   ============================================================ */
const DATA_FLIGHT={
  g:9.81,
  maxThrust:8.3,        // удельная тяга; T/W = maxThrust/g (0.85 -> свечка теряет скорость)
  liftCoeff:0.00162,    // подъёмная: подобрана под скорость сваливания ~180 км/ч
  clAlpha:9.5,          // прирост подъёмной по углу атаки (позволяет вираж 5-7G без срыва)
  stallAlpha:0.42,      // критический угол атаки, рад (~24°)
  dragCoeff:0.000177,   // лобовое: задаёт максимальную скорость ~780 км/ч
  inducedK:0.00007,     // индуктивное сопротивление
  ctrlPitch:4.0, ctrlRoll:7.0, ctrlYaw:1.6,   // эффективность рулей
  angDamp:2.4,          // демпфирование вращения
  weathervane:0.7,      // флюгерная устойчивость (нос доворачивается к потоку)
  maxG:9,               // предел перегрузки
  // старт
  startAlt:460, startSpeed:180, startThrottle:0.7,
  throttleRate:0.55,    // скорость изменения тяги
};

// закрылки: насколько улучшают несущие свойства и сколько добавляют сопротивления
const DATA_FLAPS={
  liftBonus:0.45,       // прирост подъёмной при полном выпуске
  dragPenalty:0.9,      // прирост сопротивления
  stallBonus:0.22,      // насколько поднимают критический угол
  authBonus:0.25,       // прибавка к эффективности рулей
  rate:2.2,             // скорость выпуска/уборки
  autoSlowSpeed:130,    // ниже этой скорости выпускаются сами (простой режим)
  autoRetractSpeed:200, // выше этой — убираются
};

// коэффициенты управления (можно крутить «ощущение» полёта)
const DATA_CONTROL={
  smoothing:12,         // сглаживание команд (больше = резче)
  deadzone:0.05,        // мёртвая зона мыши
  // простой режим
  simplePitch:3.4,      // сила доводки носа мышью по тангажу
  simpleYawToRoll:1.9,  // доворот по горизонтали через крен
  simpleTurnPull:0.55,  // подтяг в развороте
  autoLevel:2.6,        // сила авто-выравнивания крыльев (курсор в центре -> горизонт)
  maxAssistBank:0.75,   // максимальный крен от доводки мышью, рад (~43°) — боком не поставить
  levelUrgency:1.6,     // насколько быстро нарастает усилие возврата в горизонт
  levelDamp:0.30,
  pitchDamp:0.22,
  stallGuard:10,        // жёсткость страховки от сваливания
  // продвинутый режим
  expertPitch:1.25, expertRoll:1.35,
};

/* ============================================================
   2. ВООРУЖЕНИЕ
   ============================================================ */
// пушки: range — эффективная дальность, speed — начальная скорость снаряда,
// off — вынос ствола [вбок, вверх, вперёд], cone — сектор доводки, conv — дистанция сведения
const DATA_GUNS={
  player :{range:1600,speed:860,cone:0.21,conv:700,off:[2.2,0.15,-3.0],damage:10,rate:0.09},
  ally   :{range:1400,speed:840,off:[-1.4,0.1,-3.0],damage:5},
  fighter:{range:1250,speed:840,off:[-1.4,0.1,-3.0],damage:4},
  ace    :{range:1650,speed:870,cone:0.12,off:[-1.4,0.1,-3.0],damage:6},
  bomber :{range:950, speed:650,damage:5},
  aaa    :{range:2400,speed:640,damage:5},
};

// ракеты: cls — тип ГСН, targets — по кому работает, minDot — поле зрения ГСН
const DATA_MISSILES={
  'R73' :{name:'Р-73',  role:'ИК ближняя',  cls:'ir',  targets:['air'],    range:2200, speed:480, turn:3.2, dmg:140, blast:34, minDot:0.45, lockTime:0.35, ammo:4, color:0xe6e6e0},
  'R27' :{name:'Р-27',  role:'полуакт. РЛ', cls:'sar', targets:['air'],    range:3800, speed:560, turn:1.7, dmg:190, blast:40, minDot:0.90, lockTime:0.8,  ammo:2, color:0xd7dbcf},
  'R77' :{name:'Р-77',  role:'акт. РЛ',     cls:'arh', targets:['air'],    range:4400, speed:600, turn:2.0, dmg:170, blast:40, minDot:0.72, lockTime:0.7,  ammo:2, color:0xccd0d8},
  'KH31':{name:'Х-31П', role:'противорад.', cls:'arm', targets:['aaa'],    range:5200, speed:560, turn:1.2, dmg:320, blast:55, minDot:0.60, lockTime:0.5,  ammo:2, color:0xcdb98a},
  'KH29':{name:'Х-29',  role:'воздух-земля',cls:'agm', targets:['ground'], range:3200, speed:420, turn:1.4, dmg:420, blast:60, minDot:0.55, lockTime:0.5,  ammo:4, color:0xb9beb2},
};
const DATA_MISSILE_ORDER=['R73','R27','R77','KH31','KH29'];
const DATA_HOSTILE_MISSILE={name:'AA-11',cls:'ir',targets:['air'],range:2600,speed:460,turn:2.5,dmg:60,blast:30,color:0xff8a5a};

const DATA_ORDNANCE={
  bombs:18, bombDamage:260, bombBlast:70, bombCooldown:0.35,
  bombDrag:0.00016,      // сопротивление воздуха бомбы (без него летит как в вакууме)
  bombEject:6,           // скорость отделения от держателя, м/с вниз
  flares:{cooldown:0.7, count:6, life:3.0},
  missileCooldown:0.35,
};

/* ============================================================
   3. МАШИНЫ
   ============================================================ */
const DATA_DEV={ godMode:true, infiniteAmmo:true };

const DATA_UNITS={
  player  :{hp:340, name:'Су-27 «ФЛАНКЕР»'},
  fighter :{hp:115, speed:170, turn:1.0, label:'F-16'},
  ace     :{hp:520, speed:195, turn:1.5, label:'ACE Су-57', missileGap:13, scale:1.25, color:0x7a2f2f},
  bomber  :{hp:700, speed:105, turn:0.15, label:'BOMBER', fireCooldown:0.22},
  ally    :{hp:150, speed:175, label:'ALLY', color:0x35618f},
  aaaSite :{hp:150},
};

// ремонтный комплект
const DATA_REPAIR={ rate:22, duration:6, cooldown:16 };

/* ============================================================
   4. ПОВЕДЕНИЕ ИИ
   ============================================================ */
// манеры ведения боя вражеских истребителей
const DATA_PILOT_STYLES=[
  {id:'aggr',  turn:1.30, breakD:150, fireK:0.72, spd:1.05, alt:  0, burst:0.85, color:0x8a6a52, missiles:false},
  {id:'energy',turn:0.85, breakD:360, fireK:1.00, spd:1.14, alt:220, burst:1.25, color:0x6d7a86, missiles:true},
  {id:'turn',  turn:1.45, breakD:210, fireK:0.85, spd:0.97, alt: 40, burst:1.00, color:0x7d7468, missiles:true},
  {id:'snipe', turn:0.90, breakD:430, fireK:1.00, spd:1.00, alt: 90, burst:1.45, color:0x6f7562, missiles:true},
];

const DATA_AI={
  breakDistMult:1.5,       // во сколько раз раньше расходятся (защита от тарана)
  ramHpFraction:0.12,      // почти никогда: только при смертельных повреждениях
  collisionDist:11,        // дистанция реального столкновения
  ramDamage:60, hitDamage:35,
  fighterMissileGap:11,    // интервал пусков ракет у обычных истребителей
  standoffMin:700,         // ближе этого истребитель отворачивает (держит дистанцию)
  standoffMax:1500,        // дальше — сближается
  reinforceCap:0.85,       // доля от стартового числа, которую держат в воздухе
  bomberTurnBack:6200,     // дистанция от центра, где бомбардировщик разворачивается
  reinforceDelay:3.0,
  aceProgress:0.35,        // при какой доле выполнения задач появляется ас
  aceAfterKills:4,
};

// сложность: множители темпа и точности огня, число врагов
const DATA_DIFFICULTY={
  easy  :{cd:2.0, spread:2.2, fighters:6,  quota:12},
  normal:{cd:1.4, spread:1.4, fighters:9,  quota:18},
  hard  :{cd:1.0, spread:0.9, fighters:13, quota:26},
};

/* ============================================================
   5. МИР И МИССИЯ
   ============================================================ */
const DATA_WORLD={
  mapSize:17000,           // размер карты
  boundaryWarn:7200,       // предупреждение о границе зоны
  boundaryDamage:8300,     // за этой чертой начинается урон
  boundaryDps:8,
  terrainSegments:256,
  wind:{x:24,y:0,z:15},    // снос дыма
  radarRanges:[2500,5000,10000],
  groundClusters:[ {x:400,z:-2600}, {x:-1800,z:-4200}, {x:2200,z:-5200} ],
  targetsPerCluster:5,
  aaaSites:[ {x:200,z:-2600}, {x:-1700,z:-4100}, {x:2100,z:-5100}, {x:-400,z:-3400} ],
};

const DATA_SCORE={ fighter:100, bomber:400, ace:800, aaa:150, ground:60 };

/* ============================================================
   6. ЗВУК
   ============================================================ */
const DATA_SOUND={
  master:0.4,
  gun:{low:0.135, click:0.055},
  hit:{noise:0.05, tone:0.025},
  explosion:{rumble:0.30, body:0.14, bass:0.10, refDist:1600},
  launch:{pop:0.16, roar:0.20, thrust:0.07},
  lock:0.045, lockDone:0.055, warn:0.07, flare:0.07,
};
