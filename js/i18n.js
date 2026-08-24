// webfly — локализация (RU/EN)
// Строки берутся через t('ключ'); статическая разметка размечена data-i18n.

const I18N={
ru:{
  // стартовый экран
  tag:'WEBFLY · ВОЗДУШНЫЙ БОЙ', title:'Операция «Фланкер»',
  intro:'Су-27 в бою: уничтожь наземные цели и ПВО, сбей бомбардировщики и вражеского аса. Управляй мышью или с клавиатуры. Выполни все задачи — победа.',
  start:'НА ЗАДАНИЕ →', resume:'ПРОДОЛЖИТЬ →', restartBtn:'НАЧАТЬ ЗАНОВО', paused:'ПАУЗА', settingsHint:'наведи курсор на название — покажу, что делает настройка',
  // настройки
  sLang:'Язык', sSens:'Чувствительность мыши', sMission:'Режим миссии', sCtrl:'Режим управления',
  sDiff:'Сложность', sAllies:'Союзники', sEnemies:'Количество врагов',
  sLock:'Метка захвата', lkNormal:'обычная цель', lkLocked:'захват', lkBold:'Жирная', lkSimple:'Обычная', lkBrackets:'Скобки', lkDiamond:'Ромб', lkReticle:'Кольцо', sVol:'Громкость', sGunAssist:'Доводка пушки мышью', sInvert:'Инверсия тангажа (мышь)', sMouse:'Управление мышью',
  mBattle:'Бой', mPassive:'Не атакуют', mFree:'Свободный полёт',
  cArcade:'Простое', cExpert:'Продвинутое',
  dEasy:'Лёгкая', dNormal:'Обычная', dHard:'Тяжёлая',
  on:'ВКЛ', off:'ВЫКЛ',
  // подсказки
  tSens:'Насколько резко самолёт реагирует на отклонение курсора. Меньше — плавнее и точнее прицеливание, больше — резче манёвр.',
  tMission:'Бой — полноценная миссия с сопротивлением. Не атакуют — враги летают, но не стреляют. Свободный полёт — без противников, только полигон: проверить разгон, потолок, сваливание, вираж.',
  tCtrl:'ПРОСТОЕ (советуем): самолёт летит туда, куда показывает курсор. Крен в вираже, выход из него и защита от сваливания — автоматически. A/D — бочка, если нужна. ПРОДВИНУТОЕ: мышь работает как ручка управления (вбок — крен, вперёд-назад — тангаж), помощи нет, можно свалиться.',
  tDiff:'Влияет на врагов: как часто и точно они стреляют, сколько их в начале и сколько надо сбить для победы.',
  tAllies:'Сколько дружественных истребителей взлетает вместе с тобой. Их могут сбить. 0 — воюешь в одиночку.',
  tEnemies:'Множитель численности: истребители, бомбардировщики и квота на победу умножаются.',
  tLock:'Как выглядит отметка захваченной цели. Снизу — превью: слева обычная отметка противника, справа — она же при захвате. Выбирайте по вкусу и читаемости.', tVol:'Громкость звука: пушка, взрывы, пуски ракет, гул двигателей, сигналы захвата и предупреждения. 0 — полная тишина.', tGunAssist:'ВКЛ — пушка доворачивается за курсором в пределах сектора обстрела (~12°), он показан пунктирным кругом на прицеле, целиться заметно легче (игровое допущение: настоящая ГШ-30-1 закреплена жёстко в правом наплыве крыла и наводится только самолётом). ВЫКЛ — честная стрельба строго по оси.', tInvert:'ВКЛ — мышь вверх опускает нос (как ручка в реальном самолёте). ВЫКЛ — мышь вверх поднимает нос.',
  tMouse:'ВЫКЛ — мышь не управляет самолётом, летишь только с клавиатуры. Мышь остаётся для стрельбы.',
  tLang:'Язык интерфейса. / Interface language.',
  // HUD
  hSpeed:'СКОРОСТЬ', hAlt:'ВЫСОТА', hVs:'ВЕРТ. СКОР.', hScore:'СЧЁТ', hHdg:'КУРС',
  hAllies:'СОЮЗНИКИ', hEnemies:'ВРАГИ', hTasks:'ЗАДАЧИ', hHp:'ПРОЧНОСТЬ', hThr:'ТЯГА',
  hRepair:'РЕМНАБОР', hFlaps:'ЗАКРЫЛКИ', flapsUp:'убраны', flapsDown:'выпущены', flapsAuto:'авто', hGun:'ПУШКА', hBombs:'БОМБЫ', hStall:'СВАЛИВАНИЕ',
  rReady:'готов', rHeal:'восстановление', rCool:'перезарядка', rFull:'прочность полная',
  lockNo:'нет цели в захвате', lockGo:'захват', lockOn:'ЗАХВАТ',
  hms:'НСЦ', gunReady:'ОГОНЬ', bombReady:'ЦЕЛЬ В ЗОНЕ', bombOn:'РЕЖИМ БОМБОМЕТАНИЯ — гашетка сбрасывает', bombOff:'РЕЖИМ БОМБОМЕТАНИЯ ВЫКЛ', leadMark:'упреждение', warnMissile:'РАКЕТА', warnEvade:'уходи · X — ловушки', warnSec:'с',
  // подсказки управления
  kMouse:'манёвр', kGun:'пушка', kMsl:'ракета', kPitch:'тангаж', kRoll:'крен', kYaw:'рыскание',
  kThr:'тяга', kBomb:'режим бомбометания', kRep:'ремонт', kSel:'выбор ракеты', kFire:'пуск', kFlare:'ловушки',
  kFlaps:'закрылки (эксперт)', kPause:'пауза', kTarget:'выбор цели', kLook:'смотреть на цель', kRadar:'радар', kBack:'взгляд назад (удерживать)', kDev:'режим разработчика: бесконечное оружие', kMouseTgl:'мышь вкл/выкл', kCam:'камера: облёт / кабина / дальний', kRestart:'рестарт',
  // сообщения
  msgLaunch:'ПУСК', msgNoLock:'НЕТ ЗАХВАТА', msgNoMsl:'НЕТ РАКЕТ',
  msgIncoming:'⚠ ПУСК ПО ВАМ — уходи (X — ловушки)',
  msgBoundary:'⚠ ГРАНИЦА БОЕВОЙ ЗОНЫ', msgOutside:'⚠ ВНЕ БОЕВОЙ ЗОНЫ — РАЗВОРОТ!',
  msgBoss:'⚠ В ВОЗДУХЕ ВРАЖЕСКИЙ АС',
  // задачи
  oGround:'Уничтожить наземные цели', oPoi:'Разбомбить авиабазу и флот', oAaa:'Подавить ПВО',
  oBomber:'Сбить бомбардировщики', oFighter:'Завоевать господство в воздухе', oAce:'Уничтожить вражеского аса',
  oRangeG:'Полигон: наземные цели', oRangeP:'Полигон: авиабаза и флот',
  // экраны
  failTag:'ЗАДАНИЕ ПРОВАЛЕНО', failTitle:'СБИТ', winTag:'ЗАДАНИЕ ВЫПОЛНЕНО', winTitle:'ПОБЕДА',
  again:'ЗАНОВО →', once:'ЕЩЁ РАЗ →', toSettings:'⚙ Настройки',
  causeGround:'СТОЛКНОВЕНИЕ С ЗЕМЛЁЙ', causeHard:'ЖЁСТКАЯ ПОСАДКА', causeRam:'ТАРАН',
  causeGun:'Поражён огнём противника', causeZone:'ВЫХОД ИЗ БОЕВОЙ ЗОНЫ',
  winSub:'Все задачи выполнены', scoreIs:'Счёт',
  acName:'Су-27 «ФЛАНКЕР»', subtitle:'воздушный бой',
},
en:{
  tag:'WEBFLY · AIR COMBAT', title:'Operation Flanker',
  intro:'Su-27 in combat: destroy ground targets and AA, shoot down the bombers and the enemy ace. Fly with mouse or keyboard. Complete every objective to win.',
  start:'START MISSION →', resume:'RESUME →', restartBtn:'RESTART', paused:'PAUSED', settingsHint:'hover a label to see what the setting does',
  sLang:'Language', sSens:'Mouse sensitivity', sMission:'Mission mode', sCtrl:'Control mode',
  sDiff:'Difficulty', sAllies:'Allies', sEnemies:'Enemy count',
  sLock:'Lock marker', lkNormal:'normal', lkLocked:'locked', lkBold:'Bold', lkSimple:'Plain', lkBrackets:'Brackets', lkDiamond:'Diamond', lkReticle:'Ring', sVol:'Volume', sGunAssist:'Gun aim assist', sInvert:'Invert pitch (mouse)', sMouse:'Mouse control',
  mBattle:'Combat', mPassive:'No return fire', mFree:'Free flight',
  cArcade:'Simple', cExpert:'Advanced',
  dEasy:'Easy', dNormal:'Normal', dHard:'Hard',
  on:'ON', off:'OFF',
  tSens:'How sharply the aircraft reacts to cursor offset. Lower is smoother and more precise, higher is snappier.',
  tMission:'Combat — full mission with opposition. No return fire — enemies fly but never shoot. Free flight — no opposition at all, just a range to test acceleration, ceiling, stalls and turns.',
  tCtrl:'SIMPLE (recommended): the aircraft flies where the cursor points. Banking, levelling out and stall protection are automatic. A/D roll when you need it. ADVANCED: the mouse is a control stick (sideways is roll, forward/back is pitch), no assistance, you can stall.',
  tDiff:'Affects enemies: how often and how accurately they fire, how many start and how many you must down to win.',
  tAllies:'How many friendly fighters launch with you. They can be shot down. 0 means you fly alone.',
  tEnemies:'Force multiplier: fighters, bombers and the victory quota all scale up.',
  tLock:'How a locked target is marked. The preview below shows a normal enemy mark on the left and the same target when locked on the right.', tVol:'Sound volume: gun, explosions, missile launches, engine rumble, lock tones and warnings. 0 mutes everything.', tGunAssist:'ON — the gun traverses after the cursor inside its firing sector (~12°), shown as a dashed circle on the sight, which makes aiming much easier (a game concession: the real GSh-30-1 is fixed in the right wing root and is aimed by the aircraft). OFF — strictly boresight fire.', tInvert:'ON — mouse up lowers the nose (like a real stick). OFF — mouse up raises the nose.',
  tMouse:'OFF — the mouse no longer flies the aircraft, keyboard only. The mouse still fires.',
  tLang:'Interface language. / Язык интерфейса.',
  hSpeed:'AIRSPEED', hAlt:'ALT', hVs:'V/S', hScore:'SCORE', hHdg:'HDG',
  hAllies:'ALLIES', hEnemies:'ENEMIES', hTasks:'OBJECTIVES', hHp:'HULL', hThr:'THROTTLE',
  hRepair:'REPAIR KIT', hFlaps:'FLAPS', flapsUp:'up', flapsDown:'down', flapsAuto:'auto', hGun:'GUN', hBombs:'BOMBS', hStall:'STALL',
  rReady:'ready', rHeal:'repairing', rCool:'cooldown', rFull:'hull full',
  lockNo:'no target locked', lockGo:'locking', lockOn:'LOCK',
  hms:'HMS', gunReady:'FIRE', bombReady:'TARGET IN ZONE', bombOn:'BOMBING MODE — trigger releases', bombOff:'BOMBING MODE OFF', leadMark:'lead', warnMissile:'MISSILE', warnEvade:'evade · X for flares', warnSec:'s',
  kMouse:'manoeuvre', kGun:'gun', kMsl:'missile', kPitch:'pitch', kRoll:'roll', kYaw:'yaw',
  kThr:'throttle', kBomb:'bombing mode', kRep:'repair', kSel:'select missile', kFire:'launch', kFlare:'flares',
  kFlaps:'flaps (advanced)', kPause:'pause', kTarget:'select target', kLook:'look at target', kRadar:'radar zoom', kBack:'look back (hold)', kDev:'developer mode: unlimited weapons', kMouseTgl:'mouse on/off', kCam:'camera: chase / cockpit / far', kRestart:'restart',
  msgLaunch:'LAUNCH', msgNoLock:'NO LOCK', msgNoMsl:'NO MISSILES',
  msgIncoming:'⚠ MISSILE INBOUND — evade (X for flares)',
  msgBoundary:'⚠ EDGE OF COMBAT AREA', msgOutside:'⚠ OUTSIDE COMBAT AREA — TURN BACK!',
  msgBoss:'⚠ ENEMY ACE AIRBORNE',
  oGround:'Destroy ground targets', oPoi:'Bomb the airbase and fleet', oAaa:'Suppress air defences',
  oBomber:'Shoot down the bombers', oFighter:'Win air superiority', oAce:'Destroy the enemy ace',
  oRangeG:'Range: ground targets', oRangeP:'Range: airbase and fleet',
  failTag:'MISSION FAILED', failTitle:'SHOT DOWN', winTag:'MISSION COMPLETE', winTitle:'VICTORY',
  again:'RETRY →', once:'AGAIN →', toSettings:'⚙ Settings',
  causeGround:'FLEW INTO THE GROUND', causeHard:'HARD LANDING', causeRam:'MID-AIR COLLISION',
  causeGun:'Shot down by enemy fire', causeZone:'LEFT THE COMBAT AREA',
  winSub:'All objectives complete', scoreIs:'Score',
  acName:'Su-27 FLANKER', subtitle:'air combat',
}
};

let LANG=(navigator.language||'ru').toLowerCase().startsWith('ru')?'ru':'en';
function t(k){ return (I18N[LANG]&&I18N[LANG][k])||I18N.ru[k]||k; }
function setLang(l){ LANG=l; applyI18N(); }
// раскладываем статические строки по разметке
function applyI18N(){
  document.querySelectorAll('[data-i18n]').forEach(el=>{ el.textContent=t(el.dataset.i18n); });
  document.querySelectorAll('[data-i18n-tip]').forEach(el=>{ el.setAttribute('data-tip',t(el.dataset.i18nTip)); });
  const inv=document.getElementById('set-invert'), mo=document.getElementById('set-mouse');
  if(inv)inv.textContent=settings.invert?t('on'):t('off');
  if(mo) mo.textContent=settings.mouseOn?t('on'):t('off');
  const gb=document.getElementById('set-gun');
  if(gb)gb.textContent=settings.gunAssist?t('on'):t('off');
  if(typeof drawLockPreview==='function')drawLockPreview();
}
