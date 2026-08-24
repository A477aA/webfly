// webfly — 3D-модели: самолёты, кабина, наземные объекты, ракеты

// webfly — build
// (модуль загружается классическим <script>; глобальное состояние общее)

/* ---------- текстуры ---------- */

// мягкое свечение (гауссоподобное) — для вспышек, огня, солнца

// клубистый дым (несколько наложенных пятен)

// тугая яркая искра



/* ---------- модели самолётов ---------- */
// горизонтальная плоскость (крыло/стабилизатор) из планформы [x,z] — вид сверху
function horizPanel(pts,thick,mat){
  const sh=new THREE.Shape(); sh.moveTo(pts[0][0],-pts[0][1]);
  for(let i=1;i<pts.length;i++)sh.lineTo(pts[i][0],-pts[i][1]); sh.closePath();
  const geo=new THREE.ExtrudeGeometry(sh,{depth:thick,bevelEnabled:false});
  geo.translate(0,0,-thick/2); geo.rotateX(-Math.PI/2); geo.computeVertexNormals();
  return new THREE.Mesh(geo,mat);
}

// вертикальная плоскость (киль) из бокового профиля [z,y]
function vertPanel(pts,thick,mat){
  const sh=new THREE.Shape(); sh.moveTo(-pts[0][0],pts[0][1]);
  for(let i=1;i<pts.length;i++)sh.lineTo(-pts[i][0],pts[i][1]); sh.closePath();
  const geo=new THREE.ExtrudeGeometry(sh,{depth:thick,bevelEnabled:false});
  geo.translate(0,0,-thick/2); geo.rotateY(Math.PI/2); geo.computeVertexNormals();
  return new THREE.Mesh(geo,mat);
}

function buildSu27(){
  const g=new THREE.Group();
  flapParts=[]; ailParts=[]; stabParts=[]; rudParts=[];
  const SKIN=skinTex();
  const body =new THREE.MeshStandardMaterial({color:0x8ea0b2,map:SKIN,metalness:0.5,roughness:0.45,side:THREE.DoubleSide});
  const body2=new THREE.MeshStandardMaterial({color:0x6d8092,map:SKIN,metalness:0.5,roughness:0.48,side:THREE.DoubleSide});
  const dark =new THREE.MeshStandardMaterial({color:0x2c3540,metalness:0.55,roughness:0.5});
  const radome=new THREE.MeshStandardMaterial({color:0x46544c,metalness:0.2,roughness:0.7});
  const glass=new THREE.MeshStandardMaterial({color:0x6b5a2a,metalness:0.9,roughness:0.07});
  const rail =new THREE.MeshStandardMaterial({color:0xcfd3cc,metalness:0.3,roughness:0.6});

  // длинный радар-нос (слегка опущен)
  const nose=new THREE.Mesh(new THREE.ConeGeometry(0.85,6,16),radome); nose.rotation.x=-Math.PI/2+0.05; nose.position.set(0,-0.1,-11); g.add(nose);
  // носовая часть фюзеляжа
  const fwd=new THREE.Mesh(new THREE.CylinderGeometry(1.05,1.25,9,16),body); fwd.rotation.x=Math.PI/2; fwd.position.set(0,0,-4.5); g.add(fwd);
  // интегральный несущий корпус (плоское широкое днище)
  const belly=new THREE.Mesh(new THREE.BoxGeometry(3.6,0.7,12),body2); belly.position.set(0,-0.45,1.5); g.add(belly);
  // фонарь кабины — вытянутый пузырь
  const canopy=new THREE.Mesh(new THREE.SphereGeometry(1,16,12,0,Math.PI*2,0,Math.PI*0.62),glass);
  canopy.scale.set(1.0,0.95,2.4); canopy.position.set(0,0.85,-4.2); g.add(canopy); g.userData.canopy=canopy;
  const spine=new THREE.Mesh(new THREE.CylinderGeometry(0.9,1.1,10,16),body); spine.rotation.x=Math.PI/2; spine.position.set(0,0.15,2.5); g.add(spine);

  // крыло со стреловидностью + наплыв (LERX), симметрично
  for(const s of [1,-1]){
    const wing=horizPanel([[1.5*s,-2.0],[9.0*s,2.4],[9.0*s,3.6],[1.5*s,4.4]],0.32,body); g.add(wing);
    const lerx=horizPanel([[0.9*s,-6.5],[1.7*s,-2.0],[1.7*s,0.5],[0.9*s,0.5]],0.28,body); g.add(lerx);
    // --- управляемые поверхности на задней кромке крыла ---
    // закрылок (внутренняя секция) — на шарнире, отклоняется вниз
    { const piv=new THREE.Group(); piv.position.set(0,-0.02,2.9);
      const fl=new THREE.Mesh(new THREE.BoxGeometry(3.6,0.13,1.35),body2);
      fl.position.set(3.2*s,0,0.68); piv.add(fl);
      g.add(piv); flapParts.push({pivot:piv,side:s}); }
    // элерон (внешняя секция) — работает в противофазе при крене
    { const piv=new THREE.Group(); piv.position.set(0,-0.02,3.25);
      const al=new THREE.Mesh(new THREE.BoxGeometry(2.9,0.12,1.1),body2);
      al.position.set(7.1*s,0,0.55); piv.add(al);
      g.add(piv); ailParts.push({pivot:piv,side:s}); }
    // ракета на законцовке (R-73)
    const tip=new THREE.Mesh(new THREE.CylinderGeometry(0.13,0.13,3,8),rail); tip.rotation.x=Math.PI/2; tip.position.set(8.7*s,0.05,1.6); g.add(tip);
    const tipn=new THREE.Mesh(new THREE.ConeGeometry(0.13,0.6,8),rail); tipn.rotation.x=-Math.PI/2; tipn.position.set(8.7*s,0.05,0.0); g.add(tipn);
  }

  // два разнесённых двигателя с соплами + воздухозаборники
  const abx=[];
  for(const s of [1,-1]){
    const nac=new THREE.Mesh(new THREE.CylinderGeometry(0.95,0.95,12,16),body2); nac.rotation.x=Math.PI/2; nac.position.set(1.5*s,-0.15,4.5); g.add(nac);
    const nz=buildNozzle(); nz.position.set(1.5*s,-0.15,10.9); g.add(nz);
    const intake=new THREE.Mesh(new THREE.BoxGeometry(1.5,1.3,4.5),dark); intake.position.set(1.5*s,-0.95,-1.2); g.add(intake);
    // подфюзеляжный гребень
    const vf=vertPanel([[6.5,-0.2],[7.2,-1.9],[8.4,-1.9],[8.6,-0.2]],0.16,body2); vf.position.set(1.35*s,0,0); vf.rotation.z=s*0.5; g.add(vf);
    abx.push(1.5*s);
  }
  // хвостовая балка между двигателями
  // хвостовая балка между двигателями (сплошная, состыкована с фюзеляжем)
  const boom=new THREE.Mesh(new THREE.BoxGeometry(2.2,1.5,9),body2); boom.position.set(0,0.05,6.5); g.add(boom);
  const sting=new THREE.Mesh(new THREE.CylinderGeometry(0.55,0.32,4.5,12),body2);
  sting.rotation.x=Math.PI/2; sting.position.set(0,0.15,12.2); g.add(sting);

  // ДВА киля с наклоном наружу (визитная карточка Су-27) + рули направления
  for(const s of [1,-1]){
    const vt=vertPanel([[5.4,0.4],[7.0,4.4],[8.4,4.4],[9.4,0.4]],0.22,body); vt.position.set(2.15*s,0.3,0); vt.rotation.z=-s*0.14; g.add(vt);
    const piv=new THREE.Group(); piv.position.set(2.15*s,0.3,8.6); piv.rotation.z=-s*0.14;
    const rd=vertPanel([[-0.2,0.6],[0.3,4.1],[0.9,4.1],[0.9,0.6]],0.2,body2);  // локально относительно шарнира
    piv.add(rd); g.add(piv); rudParts.push({pivot:piv,side:s});
  }
  // цельноповоротные стабилизаторы на шарнире (отклоняются по тангажу)
  for(const s of [1,-1]){
    const piv=new THREE.Group(); piv.position.set(0,-0.05,7.0);
    const ht=horizPanel([[1.3*s,-0.7],[5.6*s,1.0],[5.6*s,1.9],[1.3*s,2.4]],0.26,body);  // уже локально
    piv.add(ht); g.add(piv); stabParts.push({pivot:piv,side:s});
  }

  // форсажные факелы
  // ================= ДЕТАЛИ =================
  const metalD=new THREE.MeshStandardMaterial({color:0xcfd3cc,metalness:0.3,roughness:0.6});
  const seam =new THREE.MeshStandardMaterial({color:0x44505c,metalness:0.4,roughness:0.7});
  const glassD=new THREE.MeshStandardMaterial({color:0x1a2430,metalness:0.9,roughness:0.05});

  // ОЛС — оптико-локационная станция перед фонарём (визитная карточка Су-27)
  { const irstBase=new THREE.Mesh(new THREE.CylinderGeometry(0.34,0.42,0.5,12),body);
    irstBase.position.set(0,1.05,-7.4); g.add(irstBase);
    const irstBall=new THREE.Mesh(new THREE.SphereGeometry(0.36,14,12),glassD);
    irstBall.position.set(0,1.32,-7.4); g.add(irstBall); }

  // ПВД — штанга приёмника воздушного давления на носу
  { const probe=new THREE.Mesh(new THREE.CylinderGeometry(0.055,0.09,2.6,8),metalD);
    probe.rotation.x=Math.PI/2; probe.position.set(0,-0.05,-14.2); g.add(probe);
    const tip=new THREE.Mesh(new THREE.ConeGeometry(0.055,0.35,8),metalD);
    tip.rotation.x=-Math.PI/2; tip.position.set(0,-0.05,-15.6); g.add(tip); }

  // тормозной щиток на гаргроте (выпускается при сбросе тяги)
  { const brk=new THREE.Mesh(new THREE.BoxGeometry(1.5,0.12,2.6),body2);
    const piv=new THREE.Group(); piv.position.set(0,1.05,1.2); brk.position.set(0,0,1.3);
    piv.add(brk); g.add(piv); airbrake=piv; }

  // катапультное кресло под фонарём
  { const seat=new THREE.Mesh(new THREE.BoxGeometry(0.62,0.9,0.28),seam);
    seat.position.set(0,0.55,-3.0); g.add(seat);
    const back=new THREE.Mesh(new THREE.BoxGeometry(0.62,0.28,0.85),seam);
    back.position.set(0,0.95,-2.55); back.rotation.x=0.25; g.add(back); }

  // подкрыльевые пилоны с ракетами Р-27
  for(const s of [1,-1]){
    for(const [px,pz] of [[4.4,1.2],[6.4,1.6]]){
      const pyl=new THREE.Mesh(new THREE.BoxGeometry(0.22,0.5,1.3),body2);
      pyl.position.set(px*s,-0.42,pz); g.add(pyl);
      const msl=new THREE.Mesh(new THREE.CylinderGeometry(0.19,0.19,4.6,10),metalD);
      msl.rotation.x=Math.PI/2; msl.position.set(px*s,-0.78,pz-0.4); g.add(msl);
      const mn=new THREE.Mesh(new THREE.ConeGeometry(0.19,0.8,10),metalD);
      mn.rotation.x=-Math.PI/2; mn.position.set(px*s,-0.78,pz-2.9); g.add(mn);
      for(let k=0;k<4;k++){ const fin=new THREE.Mesh(new THREE.BoxGeometry(0.05,0.6,0.5),seam);
        fin.position.set(px*s,-0.78,pz+1.6); fin.rotation.z=k*Math.PI/2; g.add(fin); }
    }
  }

  // аэронавигационные огни: левый красный, правый зелёный, хвостовой белый
  { const nav=(col,x,z)=>{ const m=new THREE.Mesh(new THREE.SphereGeometry(0.16,8,6),
      new THREE.MeshBasicMaterial({color:col}));
      m.position.set(x,0.1,z); g.add(m);
      const halo=new THREE.Sprite(new THREE.SpriteMaterial({map:TEX.glow,color:col,transparent:true,
        opacity:0.6,depthWrite:false,blending:THREE.AdditiveBlending}));
      halo.scale.set(1.4,1.4,1); halo.position.set(x,0.1,z); g.add(halo); };
    nav(0xff3020,-8.8,2.6); nav(0x30ff50,8.8,2.6); nav(0xffffff,0,11.2); }

  // антенны на гаргроте и подфюзеляжные гребни-разрядники
  for(const [ax,az] of [[0,-1.2],[0,3.4]]){
    const ant=new THREE.Mesh(new THREE.BoxGeometry(0.08,0.42,0.5),seam);
    ant.position.set(ax,1.35,az); g.add(ant);
  }
  for(const s of [1,-1]) for(let k=0;k<3;k++){
    const disch=new THREE.Mesh(new THREE.CylinderGeometry(0.02,0.02,0.5,5),seam);
    disch.rotation.x=Math.PI/2.2; disch.position.set((7.4+k*0.8)*s,0.05,4.3); g.add(disch);
  }

  // технологические швы на фюзеляже
  for(const z of [-6.5,-2.5,1.5,5.5]){
    const sm=new THREE.Mesh(new THREE.TorusGeometry(1.28,0.022,6,20),seam);
    sm.rotation.y=Math.PI/2; sm.rotation.x=Math.PI/2; sm.position.set(0,0,z); g.add(sm);
  }

  // опознавательные знаки
  { const st=starTex();
    const starMat=new THREE.MeshBasicMaterial({map:st,transparent:true});
    for(const s of [1,-1]){
      const w=new THREE.Mesh(new THREE.PlaneGeometry(2.6,2.6),starMat);
      w.rotation.x=-Math.PI/2; w.position.set(5.5*s,0.2,1.6); g.add(w);
      const f=new THREE.Mesh(new THREE.PlaneGeometry(1.9,1.9),starMat);
      f.position.set(2.15*s+0.14*s,2.4,6.2); f.rotation.y=Math.PI/2*s; g.add(f);
    } }

  afterburners=[];
  const c0=new THREE.Color(0xcfe6ff), c1=new THREE.Color(0xff5a1e), tmpc=new THREE.Color();
  abx.forEach(x=>{
    const segs=11;
    for(let i=0;i<segs;i++){
      const t=i/(segs-1);
      tmpc.copy(c0).lerp(c1,Math.pow(t,0.9));                 // горячее у сопла → холоднее к хвосту
      const sp=new THREE.Sprite(new THREE.SpriteMaterial({map:TEX.glow,color:tmpc.getHex(),transparent:true,depthWrite:false,blending:THREE.AdditiveBlending}));
      sp.userData.t=t; sp.userData.bs=1.6*(1-0.6*t)+0.4; sp.userData.bz=0.3+t*3.8;  // крупнее, плотнее, перекрываются
      sp.position.set(x,-0.15,11.5); g.add(sp); afterburners.push(sp);
    }
  });

  g.traverse(o=>{if(o.isMesh)o.castShadow=true;});
  return g;
}

function buildF16(mainCol,scale){
  mainCol=mainCol||0x7d7468; scale=scale||1;
  const g=new THREE.Group();
  const body=new THREE.MeshStandardMaterial({color:mainCol,metalness:0.5,roughness:0.5});
  const dark=new THREE.MeshStandardMaterial({color:0x2c261e,metalness:0.5,roughness:0.55});
  const glass=new THREE.MeshStandardMaterial({color:0x2a1e10,metalness:0.9,roughness:0.06});
  const fus=new THREE.Mesh(new THREE.CylinderGeometry(0.85,1.05,12,12),body); fus.rotation.x=Math.PI/2; g.add(fus);
  const nose=new THREE.Mesh(new THREE.ConeGeometry(0.85,3.4,12),body); nose.rotation.x=-Math.PI/2; nose.position.z=-7.7; g.add(nose);
  // фонарь-капля (вытянутый)
  const canopy=new THREE.Mesh(new THREE.SphereGeometry(0.9,14,10,0,Math.PI*2,0,Math.PI*0.6),glass);
  canopy.scale.set(1,0.9,2.0); canopy.position.set(0,0.75,-3); g.add(canopy);
  // подфюзеляжный воздухозаборник (характерный для F-16)
  const intake=new THREE.Mesh(new THREE.BoxGeometry(1.6,1.3,3),dark); intake.position.set(0,-1.0,-2); g.add(intake);
  // наплыв корпуса
  const lerx=new THREE.Mesh(new THREE.BoxGeometry(3,0.25,4),body); lerx.position.set(0,0,-2.5); g.add(lerx);
  // кропнутая дельта с настоящей стреловидностью (планформа, а не коробка)
  for(const s of [1,-1]){
    const wing=horizPanel([[0.9*s,-1.6],[5.3*s,1.4],[5.3*s,2.3],[0.9*s,3.0]],0.26,body);
    wing.position.y=-0.1; g.add(wing);
    // законцовка с пусковой направляющей
    const rail3=new THREE.Mesh(new THREE.BoxGeometry(0.12,0.16,2.2),dark);
    rail3.position.set(5.25*s,-0.02,1.1); g.add(rail3);
    // подкрыльевой пилон
    const pyl3=new THREE.Mesh(new THREE.BoxGeometry(0.13,0.28,0.7),dark);
    pyl3.position.set(3.2*s,-0.34,1.2); g.add(pyl3);
    // элерон-закрылок на задней кромке
    const flp=new THREE.Mesh(new THREE.BoxGeometry(2.6,0.1,0.8),body);
    flp.position.set(3.0*s,-0.12,2.7); g.add(flp);
  }
  // цельноповоротные стабилизаторы
  for(const s of [1,-1]){
    const ht=horizPanel([[0.8*s,4.6],[3.2*s,5.9],[3.2*s,6.6],[0.8*s,7.0]],0.22,body); g.add(ht); }
  // один киль + подфюзеляжные гребни
  const vt=vertPanel([[3.2,0.5],[4.6,3.8],[5.8,3.8],[6.4,0.5]],0.24,body); g.add(vt);
  const rud=vertPanel([[5.9,0.7],[6.3,3.4],[6.9,3.4],[6.9,0.7]],0.2,dark); g.add(rud);
  for(const s of [1,-1]){ const vf=new THREE.Mesh(new THREE.BoxGeometry(0.16,1.1,1.6),dark); vf.position.set(s*0.9,-1,5); vf.rotation.z=s*0.5; g.add(vf); }
  const engine=new THREE.Mesh(new THREE.CylinderGeometry(0.9,0.72,2.4,12),dark); engine.rotation.x=Math.PI/2; engine.position.z=6.2; g.add(engine);
  // --- детали F-16 ---
  const rail2=new THREE.MeshStandardMaterial({color:0xc8ccc4,metalness:0.3,roughness:0.6});
  const frame2=new THREE.MeshStandardMaterial({color:0x2f2a22,metalness:0.5,roughness:0.55});
  const noz=new THREE.Mesh(new THREE.CylinderGeometry(0.72,0.62,0.9,14),
    new THREE.MeshStandardMaterial({color:0x3a3a3a,metalness:0.7,roughness:0.35}));
  noz.rotation.x=Math.PI/2; noz.position.z=7.4; g.add(noz);
  for(let k=0;k<10;k++){ const pet=new THREE.Mesh(new THREE.BoxGeometry(0.07,0.32,0.9),rail2);
    const a=k/10*Math.PI*2; pet.position.set(Math.cos(a)*0.66,Math.sin(a)*0.66,7.4); pet.rotation.z=a; g.add(pet); }
  // ракеты на законцовках (AIM-9)
  for(const s2 of [1,-1]){
    const tip=new THREE.Mesh(new THREE.CylinderGeometry(0.11,0.11,2.6,8),rail2);
    tip.rotation.x=Math.PI/2; tip.position.set(4.9*s2,-0.1,1.0); g.add(tip);
    const tn=new THREE.Mesh(new THREE.ConeGeometry(0.11,0.5,8),rail2);
    tn.rotation.x=-Math.PI/2; tn.position.set(4.9*s2,-0.1,-0.4); g.add(tn);
    const pyl=new THREE.Mesh(new THREE.BoxGeometry(0.14,0.3,0.8),dark);
    pyl.position.set(2.6*s2,-0.32,1.0); g.add(pyl);
  }
  // ПВД и антенны
  const probe=new THREE.Mesh(new THREE.CylinderGeometry(0.04,0.06,1.6,6),rail2);
  probe.rotation.x=Math.PI/2; probe.position.set(0,0,-10.0); g.add(probe);
  const ant=new THREE.Mesh(new THREE.BoxGeometry(0.06,0.3,0.4),dark); ant.position.set(0,0.95,2.2); g.add(ant);
  // аэронавигационные огни (на самих законцовках)
  for(const [cl,x] of [[0xff3020,-4.9],[0x30ff50,4.9]]){
    const l=new THREE.Mesh(new THREE.SphereGeometry(0.09,6,5),new THREE.MeshBasicMaterial({color:cl}));
    l.position.set(x,-0.05,1.2); g.add(l); }
  // --- дополнительная детализация ---
  // подфюзеляжный воздухозаборник с губой
  const lip=new THREE.Mesh(new THREE.CylinderGeometry(0.85,0.85,0.45,14,1,true),
    new THREE.MeshStandardMaterial({color:0x1a1a1a,side:THREE.DoubleSide,roughness:0.9}));
  lip.rotation.x=Math.PI/2; lip.position.set(0,-1.0,-3.5); g.add(lip);
  // фонарь: переплёт и заголовник
  const bow=new THREE.Mesh(new THREE.TorusGeometry(0.9,0.05,6,16,Math.PI),frame2);
  bow.position.set(0,0.6,-4.1); bow.rotation.z=Math.PI; bow.rotation.x=0.2; g.add(bow);
  const hr=new THREE.Mesh(new THREE.BoxGeometry(0.5,0.4,0.3),dark); hr.position.set(0,0.75,-1.4); g.add(hr);
  // подкрыльевые пилоны с баками
  for(const s2 of [1,-1]){
    const pyl2=new THREE.Mesh(new THREE.BoxGeometry(0.16,0.34,0.9),dark); pyl2.position.set(1.7*s2,-0.42,1.1); g.add(pyl2);
    const tank=new THREE.Mesh(new THREE.CylinderGeometry(0.34,0.28,4.2,10),body);
    tank.rotation.x=Math.PI/2; tank.position.set(1.7*s2,-0.78,1.1); g.add(tank);
    const tn=new THREE.Mesh(new THREE.ConeGeometry(0.34,0.9,10),body);
    tn.rotation.x=-Math.PI/2; tn.position.set(1.7*s2,-0.78,-1.4); g.add(tn);
  }
  // швы обшивки и подфюзеляжные гребни уже есть; добавим створки и антенну снизу
  for(const z2 of [-5,-1,3]){
    const sm=new THREE.Mesh(new THREE.TorusGeometry(1.02,0.018,6,16),dark);
    sm.rotation.y=Math.PI/2; sm.rotation.x=Math.PI/2; sm.position.set(0,0,z2); g.add(sm); }
  const bant=new THREE.Mesh(new THREE.BoxGeometry(0.05,0.22,0.3),dark); bant.position.set(0,-1.15,0.5); g.add(bant);
  g.scale.setScalar(scale);
  g.traverse(o=>{if(o.isMesh)o.castShadow=true;});
  return g;
}

// тяжёлый бомбардировщик (крупный, 4 двигателя, прямое крыло)
function buildBomber(){
  const g=new THREE.Group();
  const body=new THREE.MeshStandardMaterial({color:0x55603f,metalness:0.4,roughness:0.6});
  const dark=new THREE.MeshStandardMaterial({color:0x2a301f,metalness:0.5,roughness:0.5});
  const glass=new THREE.MeshStandardMaterial({color:0x203028,metalness:0.9,roughness:0.1});
  const fus=new THREE.Mesh(new THREE.CylinderGeometry(2.4,2.8,34,16),body); fus.rotation.x=Math.PI/2; g.add(fus);
  const nose=new THREE.Mesh(new THREE.SphereGeometry(2.4,16,12),glass); nose.scale.z=1.6; nose.position.z=-18; g.add(nose);
  const wing=new THREE.Mesh(new THREE.BoxGeometry(52,1.1,9),body); wing.position.set(0,0.6,-1); g.add(wing);
  const vt=new THREE.Mesh(new THREE.BoxGeometry(0.9,9,7),body); vt.position.set(0,5,15); g.add(vt);
  const ht=new THREE.Mesh(new THREE.BoxGeometry(20,0.9,5),body); ht.position.set(0,0.5,15); g.add(ht);
  for(const x of [-16,-9,9,16]){
    const e=new THREE.Mesh(new THREE.CylinderGeometry(1.5,1.5,7,12),dark); e.rotation.x=Math.PI/2; e.position.set(x,-1.4,-1); g.add(e);
    const pyl=new THREE.Mesh(new THREE.BoxGeometry(0.5,1.4,2.6),body); pyl.position.set(x,-0.3,-1); g.add(pyl);
    const intake=new THREE.Mesh(new THREE.CylinderGeometry(1.52,1.52,0.5,12,1,true),
      new THREE.MeshStandardMaterial({color:0x141814,side:THREE.DoubleSide,roughness:0.95}));
    intake.rotation.x=Math.PI/2; intake.position.set(x,-1.4,-4.6); g.add(intake); }
  // оборонительные турели, антенны, огни
  for(const [tx,ty,tz] of [[0,3.2,6],[0,-2.6,4]]){
    const tur=new THREE.Mesh(new THREE.SphereGeometry(1.5,10,8),dark); tur.position.set(tx,ty,tz); g.add(tur);
    const brl=new THREE.Mesh(new THREE.CylinderGeometry(0.15,0.15,3,6),dark);
    brl.rotation.x=Math.PI/2; brl.position.set(tx,ty,tz+2); g.add(brl); }
  for(const [cl,x] of [[0xff3020,-26],[0x30ff50,26]]){
    const l=new THREE.Mesh(new THREE.SphereGeometry(0.4,6,5),new THREE.MeshBasicMaterial({color:cl}));
    l.position.set(x,0.6,-1); g.add(l); }
  const rad=new THREE.Mesh(new THREE.SphereGeometry(1.8,12,8),dark); rad.scale.y=0.4; rad.position.set(0,2.6,-6); g.add(rad);
  g.traverse(o=>{if(o.isMesh)o.castShadow=true;});
  return g;
}

// наземный ЗРК/ЗАК: база + вращающиеся стволы
function buildAAA(){
  const g=new THREE.Group();
  const base=new THREE.MeshStandardMaterial({color:0x4a4f3a,metalness:0.4,roughness:0.8});
  const met =new THREE.MeshStandardMaterial({color:0x2c2f24,metalness:0.6,roughness:0.5});
  const b=new THREE.Mesh(new THREE.BoxGeometry(6,3,6),base); b.position.y=1.5; g.add(b);
  const turret=new THREE.Group(); turret.position.y=3.2; g.add(turret);
  const dome=new THREE.Mesh(new THREE.CylinderGeometry(2,2.4,2,12),met); turret.add(dome);
  for(const x of [-0.7,0.7]){ const bar=new THREE.Mesh(new THREE.CylinderGeometry(0.2,0.2,6,8),met);
    bar.rotation.x=Math.PI/2.4; bar.position.set(x,0.6,-2.2); turret.add(bar); }
  g.traverse(o=>{if(o.isMesh)o.castShadow=true;});
  g.userData.turret=turret;
  return g;
}

/* ---------- ракеты ---------- */
function buildMissileMesh(color,cls){
  const g=new THREE.Group();
  const mat=new THREE.MeshStandardMaterial({color:color||0xd8dcd2,metalness:0.45,roughness:0.5});
  const dark=new THREE.MeshStandardMaterial({color:0x33373c,metalness:0.5,roughness:0.5});
  const seekMat=new THREE.MeshStandardMaterial({color:cls==='ir'?0x3a2a1a:0x1c2630,metalness:0.8,roughness:0.15});
  const body=new THREE.Mesh(new THREE.CylinderGeometry(0.2,0.2,4.4,10),mat); body.rotation.x=Math.PI/2; g.add(body);
  const nose=new THREE.Mesh(new THREE.ConeGeometry(0.2,1.1,10),mat); nose.rotation.x=-Math.PI/2; nose.position.z=-2.75; g.add(nose);
  // головка самонаведения
  const seek=new THREE.Mesh(new THREE.SphereGeometry(0.2,10,8),seekMat); seek.position.z=-2.75; seek.scale.z=1.4; g.add(seek);
  // передние рули (канарды)
  for(let k=0;k<4;k++){ const c=new THREE.Mesh(new THREE.BoxGeometry(0.05,0.6,0.5),dark); c.position.z=-1.4; c.rotation.z=k*Math.PI/2+Math.PI/4; g.add(c); }
  // хвостовое оперение
  for(let k=0;k<4;k++){ const fin=new THREE.Mesh(new THREE.BoxGeometry(0.05,0.85,0.75),mat); fin.position.z=1.9; fin.rotation.z=k*Math.PI/2; g.add(fin); }
  const nozzle=new THREE.Mesh(new THREE.CylinderGeometry(0.18,0.14,0.4,10),dark); nozzle.rotation.x=Math.PI/2; nozzle.position.z=2.3; g.add(nozzle);
  const flame=new THREE.Sprite(new THREE.SpriteMaterial({map:TEX.flash,color:0xffd08a,transparent:true,depthWrite:false,blending:THREE.AdditiveBlending}));
  flame.position.z=2.7; flame.scale.set(2.2,2.2,1); g.add(flame);
  return g;
}

// наземные объекты-цели: бункер, топливный бак, склад, радар
function buildStructure(kind){
  const g=new THREE.Group(); let hp=90;
  const concrete=new THREE.MeshStandardMaterial({color:0x6a6f63,roughness:0.95});
  const metal=new THREE.MeshStandardMaterial({color:0x8a7a52,roughness:0.55,metalness:0.45});
  const dark=new THREE.MeshStandardMaterial({color:0x3a3d34,roughness:0.8});
  if(kind==='bunker'){
    const base=new THREE.Mesh(new THREE.BoxGeometry(18,7,14),concrete); base.position.y=3.5; g.add(base);
    const roof=new THREE.Mesh(new THREE.BoxGeometry(20,2,16),dark); roof.position.y=7.5; g.add(roof);
    const door=new THREE.Mesh(new THREE.BoxGeometry(4,5,0.6),dark); door.position.set(0,2.5,7.2); g.add(door);
    const vent=new THREE.Mesh(new THREE.CylinderGeometry(0.8,0.8,2,8),metal); vent.position.set(6,9.5,0); g.add(vent);
    hp=110;
  } else if(kind==='fuel'){
    const tank=new THREE.Mesh(new THREE.CylinderGeometry(6,6,11,20),metal); tank.position.y=5.5; g.add(tank);
    const dome=new THREE.Mesh(new THREE.SphereGeometry(6,20,8,0,6.2832,0,Math.PI/2),metal); dome.position.y=11; g.add(dome);
    for(let b=0;b<2;b++){ const band=new THREE.Mesh(new THREE.TorusGeometry(6.06,0.22,6,22),dark); band.rotation.x=Math.PI/2; band.position.y=3.5+b*4; g.add(band); }
    const pipe=new THREE.Mesh(new THREE.CylinderGeometry(0.5,0.5,8,8),dark); pipe.rotation.z=Math.PI/2; pipe.position.set(8,2,0); g.add(pipe);
    hp=80;
  } else if(kind==='warehouse'){
    const body=new THREE.Mesh(new THREE.BoxGeometry(26,8,14),concrete); body.position.y=4; g.add(body);
    const rL=new THREE.Mesh(new THREE.BoxGeometry(26,0.7,8.2),dark); rL.position.set(0,9.4,-3.4); rL.rotation.x=-0.5; g.add(rL);
    const rR=new THREE.Mesh(new THREE.BoxGeometry(26,0.7,8.2),dark); rR.position.set(0,9.4,3.4); rR.rotation.x=0.5; g.add(rR);
    hp=100;
  } else {
    const pad=new THREE.Mesh(new THREE.BoxGeometry(8,3,8),concrete); pad.position.y=1.5; g.add(pad);
    const mast=new THREE.Mesh(new THREE.CylinderGeometry(0.8,1.1,8,8),metal); mast.position.y=6; g.add(mast);
    const dish=new THREE.Mesh(new THREE.SphereGeometry(4,18,10,0,6.2832,0,Math.PI/2.2),metal); dish.rotation.x=-0.9; dish.position.y=10.5; g.add(dish);
    hp=70;
  }
  g.traverse(o=>{if(o.isMesh)o.castShadow=true;});
  return {group:g,hp};
}

// текстура пламени (горячее ядро → жёлтый → оранжевый → красный, вытянуто вверх)

// детальное форсажное сопло (лепестки + шроуд + тёмное нутро), ось по +Z
function buildNozzle(){
  const grp=new THREE.Group();
  const nozMat=new THREE.MeshStandardMaterial({color:0x4a4d52,metalness:0.75,roughness:0.35});
  const hotMat=new THREE.MeshStandardMaterial({color:0x140f0c,metalness:0.3,roughness:0.8});
  const shroud=new THREE.Mesh(new THREE.CylinderGeometry(0.92,0.72,1.5,24,1,true),nozMat); shroud.rotation.x=Math.PI/2; grp.add(shroud);
  for(let k=0;k<14;k++){ const a=k/14*Math.PI*2;
    const petal=new THREE.Mesh(new THREE.BoxGeometry(0.1,0.5,1.5),nozMat);
    petal.position.set(Math.cos(a)*0.78,Math.sin(a)*0.78,0.05); petal.rotation.z=a; grp.add(petal); }
  const throat=new THREE.Mesh(new THREE.CylinderGeometry(0.62,0.5,1.9,20),hotMat); throat.rotation.x=Math.PI/2; throat.position.z=-0.1; grp.add(throat);
  grp.traverse(o=>{if(o.isMesh)o.castShadow=true;});
  return grp;
}

// конус пламени: широкое основание в сопле (локальный z=0), остриё назад (+Z), единичная длина
function flameCone(color,rad){
  const geo=new THREE.ConeGeometry(rad,1,16,1,true); geo.translate(0,0.5,0); geo.rotateX(Math.PI/2);
  return new THREE.Mesh(geo,new THREE.MeshBasicMaterial({color,transparent:true,opacity:0.4,
    blending:THREE.AdditiveBlending,depthWrite:false,side:THREE.DoubleSide}));
}

// ---- интерьер кабины (пропорции человека; ориентир — вид из AC7) ----
function buildCockpit(){
  const g=new THREE.Group();
  const frame=new THREE.MeshStandardMaterial({color:0x2b343c,metalness:0.55,roughness:0.55});
  const dark =new THREE.MeshStandardMaterial({color:0x171d23,metalness:0.3,roughness:0.9});
  const panelMat=new THREE.MeshStandardMaterial({map:mfdInit(),metalness:0.15,roughness:0.85,
    emissive:0x114a38,emissiveIntensity:0.65});
  const consMat =new THREE.MeshStandardMaterial({map:consoleTex(),metalness:0.2,roughness:0.85,
    emissive:0x0b2b22,emissiveIntensity:0.35});

  // ПРИБОРНАЯ ДОСКА — ниже линии взгляда, чтобы не перекрывать обзор
  const panel=new THREE.Mesh(new THREE.BoxGeometry(0.92,0.34,0.10),panelMat);
  panel.position.set(0,-0.52,-0.70); panel.rotation.x=-0.42; g.add(panel);
  // противобликовый козырёк над доской
  const coam=new THREE.Mesh(new THREE.BoxGeometry(0.98,0.045,0.22),frame);
  coam.position.set(0,-0.345,-0.76); coam.rotation.x=-0.24; g.add(coam);

  // БОКОВЫЕ ПУЛЬТЫ с кнопками
  for(const s2 of [1,-1]){
    const cons=new THREE.Mesh(new THREE.BoxGeometry(0.16,0.11,0.72),consMat);
    cons.position.set(0.46*s2,-0.55,-0.20); cons.rotation.z=s2*0.18; g.add(cons);
  }

  // ФОНАРЬ: передняя дуга, дуга над головой и наклонные стойки по бортам
  const bowF=new THREE.Mesh(new THREE.TorusGeometry(0.56,0.018,7,22,Math.PI),frame);
  bowF.position.set(0,-0.16,-0.95); bowF.rotation.z=Math.PI; bowF.rotation.x=0.18; g.add(bowF);
  const arch=new THREE.Mesh(new THREE.TorusGeometry(0.60,0.022,7,26,Math.PI),frame);
  arch.position.set(0,-0.10,0.16); arch.rotation.z=Math.PI; g.add(arch);          // дуга над головой
  // рёбра жёсткости на дуге (как на референсе)
  for(let i=1;i<7;i++){ const a=Math.PI*i/7;
    const rib=new THREE.Mesh(new THREE.BoxGeometry(0.03,0.05,0.05),frame);
    rib.position.set(Math.cos(a)*0.60,-0.10+Math.sin(a)*0.60,0.16);
    rib.rotation.z=a; g.add(rib); }
  for(const s2 of [1,-1]){                                   // наклонные стойки к носу
    const post=new THREE.Mesh(new THREE.BoxGeometry(0.026,0.026,0.95),frame);
    post.position.set(0.545*s2,-0.10,-0.44); post.rotation.y=s2*0.12; post.rotation.z=s2*0.15; g.add(post);
    const rail=new THREE.Mesh(new THREE.BoxGeometry(0.05,0.05,1.30),frame);       // рельс остекления
    rail.position.set(0.56*s2,-0.38,0.05); g.add(rail);
  }
  // задняя дуга за головой
  const bowB=new THREE.Mesh(new THREE.TorusGeometry(0.47,0.022,7,20,Math.PI),frame);
  bowB.position.set(0,-0.12,0.70); bowB.rotation.z=Math.PI; g.add(bowB);

  // ЗАКРЫТЫЙ ФОНАРЬ: остекление вокруг пилота + переплёт
  const glassMat=new THREE.MeshPhysicalMaterial({color:0xbfe0ff,transparent:true,opacity:0.10,
    roughness:0.04,metalness:0.0,transmission:0.0,side:THREE.BackSide,depthWrite:false});
  const canopy=new THREE.Mesh(new THREE.SphereGeometry(0.72,24,18,0,Math.PI*2,0,Math.PI*0.60),glassMat);
  canopy.scale.set(1.05,1.0,1.85); canopy.position.set(0,-0.30,-0.10); g.add(canopy);
  // блик по остеклению сверху
  const sheen=new THREE.Mesh(new THREE.SphereGeometry(0.70,20,10,0,Math.PI*2,0,Math.PI*0.26),
    new THREE.MeshBasicMaterial({color:0xffffff,transparent:true,opacity:0.05,side:THREE.BackSide,depthWrite:false}));
  sheen.scale.set(1.05,1.0,1.85); sheen.position.set(0,-0.28,-0.10); g.add(sheen);
  // продольные переплёты фонаря (замыкают кабину сверху)
  for(const s2 of [1,-1]){
    const spine=new THREE.Mesh(new THREE.TorusGeometry(0.58,0.014,6,20,Math.PI*0.72),frame);
    spine.position.set(0,-0.10,-0.10); spine.rotation.y=Math.PI/2*s2*0+0;
    spine.rotation.z=Math.PI; spine.rotation.x=0; spine.position.x=0.0;
    g.add(spine); spine.rotation.y=s2*0.0;
  }
  // боковые дуги — соединяют переднюю и заднюю рамы
  for(const s2 of [1,-1]){
    const side=new THREE.Mesh(new THREE.BoxGeometry(0.022,0.022,1.75),frame);
    side.position.set(0.50*s2,-0.02,-0.10); side.rotation.z=s2*0.12; g.add(side);
  }
  // заголовник за спиной
  const hrest=new THREE.Mesh(new THREE.BoxGeometry(0.30,0.20,0.10),dark);
  hrest.position.set(0,-0.08,0.40); g.add(hrest);

  // ручка управления
  const stick=new THREE.Mesh(new THREE.CylinderGeometry(0.017,0.022,0.20,8),frame);
  stick.position.set(0,-0.72,-0.28); g.add(stick);
  const grip=new THREE.Mesh(new THREE.SphereGeometry(0.034,8,6),dark);
  grip.position.set(0,-0.62,-0.28); g.add(grip);

  // подсветка кабины: мягкий заполняющий свет + зеленоватый отблеск от экранов
  const fill=new THREE.PointLight(0xbfd4e8,0.9,3.2); fill.position.set(0,0.25,-0.15); g.add(fill);
  const glow=new THREE.PointLight(0x4dffc0,0.5,1.4); glow.position.set(0,-0.30,-0.52); g.add(glow);

  g.traverse(o=>{ if(o.isMesh){ o.castShadow=false; o.receiveShadow=false; o.renderOrder=2; } });
  g.visible=false;
  return g;
}



// текстура приборной панели: экраны МФИ, ряды кнопок, подписи (рисуем на canvas)
// текстура боковых пультов

// живая приборная панель: реальная телеметрия на трёх МФИ
const MFD={cv:null,ctx:null,tex:null,t:0};
function mfdInit(){
  MFD.cv=document.createElement('canvas'); MFD.cv.width=1024; MFD.cv.height=420;
  MFD.ctx=MFD.cv.getContext('2d');
  MFD.tex=new THREE.CanvasTexture(MFD.cv); MFD.tex.encoding=THREE.sRGBEncoding;
  return MFD.tex;
}
function mfdUpdate(dt){
  if(!MFD.ctx||!cockpit||!cockpit.visible)return;
  MFD.t-=dt; if(MFD.t>0)return; MFD.t=0.08;             // ~12 обновлений в секунду
  const g=MFD.ctx,W=1024,H=420;
  g.fillStyle='#11161a'; g.fillRect(0,0,W,H);
  g.strokeStyle='#1c242b'; g.lineWidth=3;
  for(let x=0;x<W;x+=128){ g.beginPath(); g.moveTo(x,0); g.lineTo(x,H); g.stroke(); }
  const V=state.vel.length(), hdg=(()=>{const f=new V3(0,0,-1).applyQuaternion(state.quat);
    let h=Math.atan2(f.x,-f.z)*180/Math.PI; return h<0?h+360:h;})();
  const G='rgba(120,255,200,';
  const box=(x,y,w,h,title)=>{ g.fillStyle='#0a0f12'; g.fillRect(x-8,y-8,w+16,h+16);
    g.fillStyle='#07241b'; g.fillRect(x,y,w,h);
    g.strokeStyle=G+'.35)'; g.lineWidth=1.5; g.strokeRect(x+5,y+5,w-10,h-10);
    g.fillStyle=G+'.75)'; g.font='bold 15px monospace'; g.fillText(title,x+12,y+24);
    g.fillStyle='#2a343c'; for(let i=0;i<5;i++){ g.fillRect(x+10+i*((w-40)/4),y-26,26,16); g.fillRect(x+10+i*((w-40)/4),y+h+10,26,16); } };
  // ЛЕВЫЙ МФИ — параметры полёта
  box(120,70,220,190,'FLIGHT');
  g.font='14px monospace'; g.fillStyle=G+'.9)';
  g.fillText('SPD  '+Math.round(V*3.6).toString().padStart(4)+' km/h',132,66+40);
  g.fillText('ALT  '+Math.round(state.pos.y).toString().padStart(4)+' m',132,66+62);
  g.fillText('HDG  '+String(Math.round(hdg)).padStart(3,'0'),132,66+84);
  g.fillText('AOA  '+(state.alpha*57.3).toFixed(1)+'\u00B0',132,66+106);
  g.fillText('FLAP '+Math.round(flaps.pos*100)+'%',132,66+128);
  // шкала тяги
  g.strokeStyle=G+'.5)'; g.strokeRect(132,66+140,190,14);
  g.fillStyle=G+'.7)'; g.fillRect(133,66+141,188*state.throttle,12);
  // ЦЕНТРАЛЬНЫЙ МФИ — обзор целей
  box(402,55,240,205,'TACTICAL');
  const cx0=402+120, cy0=55+118, R0=78;
  g.strokeStyle=G+'.35)'; g.beginPath(); g.arc(cx0,cy0,R0,0,Math.PI*2); g.stroke();
  g.beginPath(); g.arc(cx0,cy0,R0*0.5,0,Math.PI*2); g.stroke();
  g.beginPath(); g.moveTo(cx0-R0,cy0); g.lineTo(cx0+R0,cy0); g.moveTo(cx0,cy0-R0); g.lineTo(cx0,cy0+R0); g.stroke();
  {const f=new V3(0,0,-1).applyQuaternion(state.quat); const fl=Math.hypot(f.x,f.z)||1;
   const fx=f.x/fl, fz=f.z/fl, rx2=-fz, rz2=fx;
   for(const e of enemies){ if(!e.alive)continue;
     const dx=e.pos.x-state.pos.x, dz=e.pos.z-state.pos.z;
     const fc=(dx*fx+dz*fz)/6000, rc=(dx*rx2+dz*rz2)/6000;
     if(Math.hypot(fc,rc)>1)continue;
     g.fillStyle='rgba(255,90,90,.95)'; g.fillRect(cx0+rc*R0-3,cy0-fc*R0-3,6,6); }
   for(const a of allies){ if(!a.alive)continue;
     const dx=a.pos.x-state.pos.x, dz=a.pos.z-state.pos.z;
     const fc=(dx*fx+dz*fz)/6000, rc=(dx*rx2+dz*rz2)/6000;
     if(Math.hypot(fc,rc)>1)continue;
     g.fillStyle='rgba(120,190,255,.95)'; g.fillRect(cx0+rc*R0-3,cy0-fc*R0-3,6,6); } }
  g.fillStyle=G+'.85)'; g.font='13px monospace';
  g.fillText('TGT '+(lock.target?tgtLabel(lock.target):'---'),412,55+195);
  // ПРАВЫЙ МФИ — состояние машины и вооружение
  box(700,70,220,190,'SYSTEMS');
  g.font='14px monospace';
  const hpF=state.hp/state.maxHp;
  g.fillStyle=hpF>0.5?G+'.9)':(hpF>0.25?'rgba(255,190,90,.95)':'rgba(255,90,90,.95)');
  g.fillText('HULL '+Math.round(hpF*100)+'%',712,66+40);
  g.strokeStyle=G+'.5)'; g.strokeRect(712,66+50,190,14);
  g.fillStyle=hpF>0.25?G+'.7)':'rgba(255,90,90,.8)'; g.fillRect(713,66+51,188*Math.max(0,hpF),12);
  g.fillStyle=G+'.9)';
  g.fillText('GUN  \u221E',712,66+90);
  g.fillText('BOMB '+state.bombs,712,66+112);
  g.fillText(MISSILES[selMsl].name+'  '+loadout[selMsl],712,66+134);
  g.fillStyle=lock.locked?'rgba(255,90,90,.95)':G+'.5)';
  g.fillText(lock.locked?'LOCK ON':'NO LOCK',712,66+160);
  // сигнальные лампы
  const lamps=[['#c9452f',state.hp<state.maxHp*0.35],['#c9a02f',flaps.pos>0.2],
               ['#3fa86a',state.throttle>0.05],['#3f7ea8',lock.locked]];
  lamps.forEach((L,i)=>{ g.globalAlpha=L[1]?1:0.18; g.fillStyle=L[0]; g.fillRect(60+i*18,352,12,16); });
  g.globalAlpha=1;
  MFD.tex.needsUpdate=true;
}

// текстура обшивки: технологические швы, лючки, лёгкая потёртость
function skinTex(){
  const W=512,H=512,c=document.createElement('canvas'); c.width=W;c.height=H;
  const g=c.getContext('2d');
  g.fillStyle='#8d9aa8'; g.fillRect(0,0,W,H);
  for(let i=0;i<5000;i++){ g.fillStyle='rgba(0,0,0,'+(Math.random()*0.035)+')';
    g.fillRect(Math.random()*W,Math.random()*H,3,3); }
  g.strokeStyle='rgba(40,50,60,.35)'; g.lineWidth=1.4;   // продольные швы
  for(let y=28;y<H;y+=52){ g.beginPath(); g.moveTo(0,y); g.lineTo(W,y); g.stroke(); }
  for(let x=40;x<W;x+=86){ g.beginPath(); g.moveTo(x,0); g.lineTo(x,H); g.stroke(); }
  g.strokeStyle='rgba(40,50,60,.5)'; g.lineWidth=1.8;    // лючки обслуживания
  for(let i=0;i<14;i++){ const x=Math.random()*(W-70), y=Math.random()*(H-50);
    g.strokeRect(x,y,40+Math.random()*30,22+Math.random()*16); }
  g.fillStyle='rgba(255,255,255,.05)';                    // блик сверху
  g.fillRect(0,0,W,H*0.18);
  const t=new THREE.CanvasTexture(c); t.wrapS=t.wrapT=THREE.RepeatWrapping;
  t.repeat.set(2,2); t.encoding=THREE.sRGBEncoding; return t;
}

// звезда ВВС для обозначений на плоскостях и килях
