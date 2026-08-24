// webfly — world
// (модуль загружается классическим <script>; глобальное состояние общее)

/* ---------- сцена ---------- */
function initScene(){
  scene=new THREE.Scene(); scene.fog=new THREE.Fog(0x86abd6,6500,20000);
  renderer=new THREE.WebGLRenderer({antialias:true,logarithmicDepthBuffer:true});
  renderer.setSize(innerWidth,innerHeight); renderer.setPixelRatio(Math.min(devicePixelRatio,2));
  renderer.outputEncoding=THREE.sRGBEncoding; renderer.toneMapping=THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure=1.02; renderer.shadowMap.enabled=true; renderer.shadowMap.type=THREE.PCFSoftShadowMap;
  document.getElementById('app').appendChild(renderer.domElement);
  camera=new THREE.PerspectiveCamera(64,innerWidth/innerHeight,0.08,20000);

  TEX.cloud=softDot('rgba(255,255,255,1)');
  TEX.ally =softDot('rgba(255,240,150,1)');
  TEX.foe  =softDot('rgba(255,120,60,1)');
  TEX.flash=softDot('rgba(255,200,120,1)');
  TEX.glow=glowTex(); TEX.smoke=smokeTex(); TEX.spark=sparkTex(); TEX.fire=fireTex();
  Object.values(TEX).forEach(t=>{ if(t)t.__shared=true; });
  initDebrisRes();   // общие текстуры не освобождаем

  const pmrem=new THREE.PMREMGenerator(renderer);
  scene.environment=pmrem.fromEquirectangular(skyEquirect()).texture;

  window.__sunDir=new V3(-0.5,0.72,0.48).normalize();
  const skyMat=new THREE.ShaderMaterial({ side:THREE.BackSide,depthWrite:false,fog:false,
    uniforms:{top:{value:new THREE.Color(0x1a5fce)},bot:{value:new THREE.Color(0xc9e4fb)},
              sunDir:{value:window.__sunDir.clone()},sunCol:{value:new THREE.Color(0xffe6bc)},
              haze:{value:new THREE.Color(0xd6e6f4)},off:{value:400},exp:{value:0.55}},
    vertexShader:`varying vec3 wp; void main(){ vec4 w=modelMatrix*vec4(position,1.); wp=w.xyz; gl_Position=projectionMatrix*viewMatrix*w; }`,
    fragmentShader:`varying vec3 wp; uniform vec3 top; uniform vec3 bot; uniform vec3 sunDir; uniform vec3 sunCol; uniform vec3 haze; uniform float off; uniform float exp;
      void main(){
        vec3 dir=normalize(wp+vec3(0.,off,0.)); float h=dir.y;
        vec3 col=mix(bot,top,pow(max(h,0.),exp));
        col=mix(col,haze,pow(1.0-clamp(h,0.0,1.0),8.0)*0.6);         // дымка у горизонта
        float s=max(dot(normalize(wp),sunDir),0.0);
        col+=sunCol*pow(s,6.0)*0.35;                                  // широкое сияние вокруг солнца
        col+=sunCol*pow(s,220.0)*1.2;                                 // яркое ядро
        gl_FragColor=vec4(col,1.0); }` });
  const skyMesh=new THREE.Mesh(new THREE.SphereGeometry(9000,32,16),skyMat);
  skyMesh.frustumCulled=false; window.__sky=skyMesh; scene.add(skyMesh);

  sunLight=new THREE.DirectionalLight(0xfff0c8,2.7); sunLight.castShadow=true;
  sunLight.shadow.mapSize.set(2048,2048);
  const sc=sunLight.shadow.camera; sc.near=1;sc.far=2500; sc.left=sc.bottom=-800; sc.right=sc.top=800; sc.updateProjectionMatrix();
  sunLight.shadow.bias=-0.0004; scene.add(sunLight); scene.add(sunLight.target);
  scene.add(new THREE.HemisphereLight(0x9cc4ec,0x2c5423,0.4));
  const sunPos=window.__sunDir.clone().multiplyScalar(7000);
  const sunHalo=new THREE.Sprite(new THREE.SpriteMaterial({map:TEX.glow,color:0xfff0c0,transparent:true,
    depthWrite:false,depthTest:false,blending:THREE.AdditiveBlending}));
  sunHalo.scale.set(2800,2800,1); sunHalo.position.copy(sunPos); window.__sunHalo=sunHalo; scene.add(sunHalo);
  const sunCore=new THREE.Sprite(new THREE.SpriteMaterial({map:TEX.glow,color:0xffffff,transparent:true,
    depthWrite:false,depthTest:false,blending:THREE.AdditiveBlending}));
  sunCore.scale.set(950,950,1); sunCore.position.copy(sunPos); window.__sunCore=sunCore; scene.add(sunCore);

  buildTerrain(); buildWater(); buildTrees(); buildClouds();
  player=buildSu27(); scene.add(player);
  cockpit=buildCockpit(); scene.add(cockpit);          // кабина отдельно от модели
  startMission();
  // прогрев: компилируем материалы кабины заранее — иначе рывок при первом переключении
  cockpit.visible=true; renderer.compile(scene,camera); cockpit.visible=false;
  setupComposer();
  addEventListener('resize',onResize); onResize();
}

// постобработка (bloom). ВЫКЛ по умолчанию: в r128 композер легко пересвечивает.
// Чтобы попробовать — поставь USE_BLOOM=true (порог/сила подобраны консервативно).
function setupComposer(){
  const USE_BLOOM=false;
  if(!USE_BLOOM) return;
  try{
    if(typeof THREE.EffectComposer!=='function'||typeof THREE.RenderPass!=='function'||typeof THREE.UnrealBloomPass!=='function') return;
    let rt;
    const sz=renderer.getDrawingBufferSize(new THREE.Vector2());
    if(typeof THREE.WebGLMultisampleRenderTarget==='function') rt=new THREE.WebGLMultisampleRenderTarget(sz.width,sz.height);
    composer=new THREE.EffectComposer(renderer, rt);
    composer.setPixelRatio(renderer.getPixelRatio());
    composer.setSize(innerWidth,innerHeight);
    composer.addPass(new THREE.RenderPass(scene,camera));
    const bloom=new THREE.UnrealBloomPass(new THREE.Vector2(innerWidth,innerHeight),0.35,0.4,0.9); // слабее и только по ярким
    composer.addPass(bloom); window.__bloom=bloom;
    if(THREE.ShaderPass && THREE.GammaCorrectionShader){        // корректная гамма на выходе (иначе «молоко»)
      const gc=new THREE.ShaderPass(THREE.GammaCorrectionShader); composer.addPass(gc);
    }
  }catch(e){ composer=null; }
}

function onResize(){
  camera.aspect=innerWidth/innerHeight; camera.updateProjectionMatrix();
  renderer.setSize(innerWidth,innerHeight);
  if(composer){ composer.setPixelRatio(renderer.getPixelRatio()); composer.setSize(innerWidth,innerHeight); }
  const ov=document.getElementById('overlay'); const dpr=Math.min(devicePixelRatio||1,2);
  ov.width=Math.round(innerWidth*dpr); ov.height=Math.round(innerHeight*dpr);
  ov.style.width=innerWidth+'px'; ov.style.height=innerHeight+'px'; ov._dpr=dpr;
}

function buildTerrain(){
  const seg=DATA_WORLD.terrainSegments,size=DATA_WORLD.mapSize,half=size/2,step=size/seg; const pos=[],col=[],idx=[];
  const cSand=new THREE.Color(0x7d6b3e),                    // песок у воды
        cG =new THREE.Color(0x3a7a22), cG2=new THREE.Color(0x24581a),  // луга → лес
        cG3=new THREE.Color(0x163d14),                       // тёмный хвойник
        cBr=new THREE.Color(0x4a3a24), cR=new THREE.Color(0x3b3227), // земля / камень
        tmp=new THREE.Color(), tmp2=new THREE.Color();
  for(let j=0;j<=seg;j++)for(let i=0;i<=seg;i++){
    const x=-half+i*step,z=-half+j*step,h=terrainHeight(x,z); pos.push(x,h,z);
    // наклон склона (по конечным разностям)
    const hx=terrainHeight(x+step,z)-terrainHeight(x-step,z), hz=terrainHeight(x,z+step)-terrainHeight(x,z-step);
    const slope=Math.min(1,Math.hypot(hx,hz)/(step*1.3));
    if(h<3)         tmp.copy(cSand);
    else if(h<60)   tmp.copy(cSand).lerp(cG,Math.min(1,(h-3)/22));   // берег → луг
    else if(h<150)  tmp.copy(cG).lerp(cG2,(h-60)/90);                // луг → лес
    else if(h<230)  tmp.copy(cG2).lerp(cG3,(h-150)/80);              // лес → тёмный хвойник
    else            tmp.copy(cG3).lerp(cBr,Math.min(1,(h-230)/90));  // вершины — бурые, без снега
    if(h>6) tmp.lerp(cR,slope*0.55);                                 // проплешины камня на склонах
    // пятнистость: крупные массивы леса/полян + мелкая фактура
    const patch=fbm(x*0.0016+7,z*0.0016+3);
    tmp2.copy(h<150?cG2:cBr); tmp.lerp(tmp2,THREE.MathUtils.clamp((patch-0.45)*1.6,0,0.5));
    const v=0.88+fbm(x*0.02,z*0.02)*0.26;
    col.push(tmp.r*v,tmp.g*v,tmp.b*v);
  }
  for(let j=0;j<seg;j++)for(let i=0;i<seg;i++){ const a=j*(seg+1)+i,b=a+1,c=a+seg+1,d=c+1; idx.push(a,c,b,b,c,d); }
  const g=new THREE.BufferGeometry();
  g.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));
  g.setAttribute('color',new THREE.Float32BufferAttribute(col,3)); g.setIndex(idx); g.computeVertexNormals();
  const mesh=new THREE.Mesh(g,new THREE.MeshStandardMaterial({vertexColors:true,roughness:0.95,metalness:0}));
  mesh.receiveShadow=true; scene.add(mesh);
}

function buildWater(){
  const mat=new THREE.ShaderMaterial({
    transparent:true, fog:false,
    uniforms:{
      time:{value:0},
      deep:{value:new THREE.Color(0x073a5c)}, shallow:{value:new THREE.Color(0x2f9fd6)},
      sunDir:{value:(window.__sunDir||new V3(-0.5,0.72,0.48)).clone()},
      fogCol:{value:new THREE.Color(0x86abd6)}
    },
    vertexShader:`
      uniform float time; varying vec3 vW; varying vec3 vN;
      void main(){
        vec4 wp0=modelMatrix*vec4(position,1.0);
        float wx=wp0.x, wz=wp0.z;
        float w=sin(wx*0.045+time*1.3)*0.7 + cos(wz*0.055+time*1.05)*0.6 + sin((wx+wz)*0.02+time*0.7)*0.5;
        vec3 wp=vec3(wp0.x, wp0.y+w, wp0.z);
        float dx=cos(wx*0.045+time*1.3)*0.045*0.7 + cos((wx+wz)*0.02+time*0.7)*0.02*0.5;
        float dz=-sin(wz*0.055+time*1.05)*0.055*0.6 + cos((wx+wz)*0.02+time*0.7)*0.02*0.5;
        vN=normalize(vec3(-dx,1.0,-dz)); vW=wp;
        gl_Position=projectionMatrix*viewMatrix*vec4(wp,1.0);
      }`,
    fragmentShader:`
      uniform vec3 deep; uniform vec3 shallow; uniform vec3 sunDir; uniform vec3 fogCol;
      varying vec3 vW; varying vec3 vN;
      void main(){
        vec3 V=normalize(cameraPosition-vW); vec3 N=normalize(vN);
        float fres=pow(1.0-max(dot(N,V),0.0),3.0);
        vec3 col=mix(deep,shallow,clamp(fres,0.0,1.0));
        vec3 H=normalize(sunDir+V);
        col+=vec3(1.0,0.96,0.85)*pow(max(dot(N,H),0.0),140.0)*1.3;   // блик солнца
        float d=length(cameraPosition-vW);
        col=mix(col,fogCol,smoothstep(6500.0,20000.0,d));            // подгонка под туман сцены
        gl_FragColor=vec4(col,0.92);
      }`
  });
  mat.polygonOffset=true; mat.polygonOffsetFactor=-2; mat.polygonOffsetUnits=-2;
  const w=new THREE.Mesh(new THREE.PlaneGeometry(17000,17000,110,110),mat);
  w.rotation.x=-Math.PI/2; w.position.y=-0.6; w.renderOrder=1;
  w.onBeforeRender=()=>{ mat.uniforms.time.value=performance.now()*0.0011; };
  window.__water=w; window.__waterMat=mat; scene.add(w);
}

function buildTrees(){
  const N=1200,fol=new THREE.InstancedMesh(new THREE.ConeGeometry(6,18,7),new THREE.MeshStandardMaterial({color:0x236020,roughness:1}),N);
  fol.castShadow=true;
  const trk=new THREE.InstancedMesh(new THREE.CylinderGeometry(1.1,1.4,7,5),new THREE.MeshStandardMaterial({color:0x4a3623,roughness:1}),N);
  const mtx=new THREE.Matrix4(),q=new QUAT(),s=new V3(); let placed=0,tries=0;
  while(placed<N&&tries<N*8){ tries++; const x=(Math.random()-0.5)*15000,z=(Math.random()-0.5)*15000,h=terrainHeight(x,z);
    if(h<8||h>160)continue; const sc=0.7+Math.random()*0.8; s.set(sc,sc,sc);
    mtx.compose(new V3(x,h+9*sc,z),q,s); fol.setMatrixAt(placed,mtx);
    mtx.compose(new V3(x,h+3.5*sc,z),q,s); trk.setMatrixAt(placed,mtx); placed++; }
  fol.count=placed; trk.count=placed; fol.instanceMatrix.needsUpdate=true; trk.instanceMatrix.needsUpdate=true;
  scene.add(fol); scene.add(trk);
}

function buildClouds(){
  const sunDir=window.__sunDir||new V3(-0.5,0.72,0.48);
  for(let i=0;i<46;i++){
    const cx=(Math.random()-0.5)*14000, cy=650+Math.random()*900, cz=(Math.random()-0.5)*14000;
    const puffs=3+Math.floor(Math.random()*5), spread=180+Math.random()*260, base=260+Math.random()*300;
    const group=new THREE.Group();
    for(let p=0;p<puffs;p++){
      const dx=(Math.random()-0.5)*spread, dy=(Math.random()-0.5)*spread*0.35, dz=(Math.random()-0.5)*spread;
      // светлее сверху/со стороны солнца, темнее снизу
      const lit=THREE.MathUtils.clamp(0.72+ (dy/spread)*0.6 + sunDir.x*0.05, 0.5, 1.0);
      const col=new THREE.Color().setRGB(lit,lit,Math.min(1,lit*1.03));
      const m=new THREE.SpriteMaterial({map:TEX.smoke,color:col,transparent:true,opacity:0.5+Math.random()*0.35,depthWrite:false});
      const s=new THREE.Sprite(m); const sc=base*(0.7+Math.random()*0.7);
      s.scale.set(sc,sc*0.72,1); s.position.set(cx+dx,cy+dy,cz+dz); group.add(s);
    }
    scene.add(group);
  }
}

function spawnAirbase(){
  const sp=findSpot(h=>h>8&&h<55), bx=sp.x, bz=sp.z, by=Math.max(sp.h,4);
  const rw=new THREE.Mesh(new THREE.PlaneGeometry(70,900),new THREE.MeshStandardMaterial({color:0x20232a,roughness:0.9}));
  rw.rotation.x=-Math.PI/2; rw.position.set(bx,by+0.4,bz); scene.add(rw); decor.push(rw);
  for(let i=0;i<3;i++){ const m=new THREE.Mesh(new THREE.BoxGeometry(28,14,20),new THREE.MeshStandardMaterial({color:0x5a5f52,roughness:0.85}));
    m.position.set(bx+95,by+7,bz-200+i*135); m.castShadow=true; scene.add(m);
    targets.push({mesh:m,pos:m.position.clone(),hp:140,alive:true,poi:true,radius:18}); }
  const tw=new THREE.Group();
  const leg=new THREE.Mesh(new THREE.BoxGeometry(4,20,4),new THREE.MeshStandardMaterial({color:0x777c6e})); leg.position.y=10; tw.add(leg);
  const cab=new THREE.Mesh(new THREE.BoxGeometry(9,5,9),new THREE.MeshStandardMaterial({color:0x24404f,metalness:0.6,roughness:0.3})); cab.position.y=21; tw.add(cab);
  tw.position.set(bx-70,by,bz); tw.traverse(o=>{if(o.isMesh)o.castShadow=true;}); scene.add(tw);
  targets.push({mesh:tw,pos:new V3(bx-70,by+12,bz),hp:120,alive:true,poi:true,radius:12});
  for(let i=0;i<2;i++){ const jet=buildF16(0x6b6256); jet.position.set(bx-24+i*48,by+1.5,bz+240); jet.rotation.y=Math.PI; scene.add(jet);
    targets.push({mesh:jet,pos:jet.position.clone(),hp:70,alive:true,poi:true,radius:10}); }
}

function spawnNavy(){
  // Корабль занимает ~185 м, поэтому проверяем прямоугольник вокруг точки,
  // а не одну высоту. Ищем сплошным сканированием — глубокой воды на карте мало.
  const deepEnough=(x,z)=>{
    for(let dx=-140;dx<=140;dx+=70)
      for(let dz=-200;dz<=200;dz+=100)
        if(terrainHeight(x+dx,z+dz)>-25)return false;
    return true;
  };
  let sp=null, bestDepth=0;
  for(let x=-7000;x<=7000&&!sp;x+=350){
    for(let z=-7000;z<=2000;z+=350){
      if(!deepEnough(x,z))continue;
      const d=-terrainHeight(x,z);
      if(d>bestDepth){ bestDepth=d; sp={x,z}; }
      if(bestDepth>60){ break; }
    }
  }
  // запасной вариант: самая глубокая точка карты (гарантированно вода)
  if(!sp){
    let best=1e9;
    for(let x=-7000;x<=7000;x+=200)for(let z=-7000;z<=2000;z+=200){
      const h=terrainHeight(x,z); if(h<best){ best=h; sp={x,z}; }
    }
  }
  const bx=sp.x, bz=sp.z;
  const carrier=new THREE.Group();
  const deck=new THREE.Mesh(new THREE.BoxGeometry(46,4,185),new THREE.MeshStandardMaterial({color:0x3a3f45,roughness:0.8,metalness:0.3})); deck.position.y=3; carrier.add(deck);
  const islMat=new THREE.MeshStandardMaterial({color:0x2a2e33,metalness:0.4,roughness:0.6});
  const island=new THREE.Mesh(new THREE.BoxGeometry(10,14,26),islMat); island.position.set(15,11,20); carrier.add(island);
  // надстройка: мостик, мачта, радары
  const bridge=new THREE.Mesh(new THREE.BoxGeometry(11.5,4,14),new THREE.MeshStandardMaterial({color:0x353a40,metalness:0.4,roughness:0.55}));
  bridge.position.set(15,15,18); carrier.add(bridge);
  const mast=new THREE.Mesh(new THREE.CylinderGeometry(0.5,0.7,16,8),islMat); mast.position.set(15,26,22); carrier.add(mast);
  for(const h of [22,28,32]){ const yard=new THREE.Mesh(new THREE.BoxGeometry(9,0.4,0.4),islMat); yard.position.set(15,h,22); carrier.add(yard); }
  const radar=new THREE.Mesh(new THREE.BoxGeometry(0.4,3.4,5.2),new THREE.MeshStandardMaterial({color:0x9aa3ad,metalness:0.5,roughness:0.4}));
  radar.position.set(15,30,22); carrier.add(radar);
  // разметка палубы и самолёты на стоянке
  const line=new THREE.MeshStandardMaterial({color:0xdedede,roughness:0.9});
  for(let i=0;i<9;i++){ const dash=new THREE.Mesh(new THREE.BoxGeometry(1.1,0.2,7),line);
    dash.position.set(-6,5.1,-70+i*17); carrier.add(dash); }
  for(const [px,pz] of [[-14,55],[-14,30],[16,-30],[16,-55]]){
    const jet=buildF16(0x6b6256,0.55); jet.position.set(px,6.4,pz); jet.rotation.y=Math.PI/2; carrier.add(jet); }
  // спонсоны и зенитные установки
  for(const s2 of [1,-1]) for(const pz of [-60,0,60]){
    const spon=new THREE.Mesh(new THREE.BoxGeometry(4,2.4,9),islMat); spon.position.set(24*s2,3,pz); carrier.add(spon);
    const gun=new THREE.Mesh(new THREE.CylinderGeometry(1.1,1.4,1.8,10),new THREE.MeshStandardMaterial({color:0x4a4f55,metalness:0.5,roughness:0.5}));
    gun.position.set(24*s2,5.2,pz); carrier.add(gun); }
  const ramp=new THREE.Mesh(new THREE.BoxGeometry(46,6,20),new THREE.MeshStandardMaterial({color:0x2f343a})); ramp.position.set(0,5,-92); ramp.rotation.x=0.28; carrier.add(ramp);
  carrier.position.set(bx,0,bz); carrier.traverse(o=>{if(o.isMesh)o.castShadow=true;}); scene.add(carrier);
  targets.push({mesh:carrier,pos:new V3(bx,4,bz),hp:420,alive:true,poi:true,radius:52});
  for(let i=0;i<2;i++){ const x=bx+(i?150:-150), z=bz+(i?130:-100);
    const hullMat=new THREE.MeshStandardMaterial({color:0x40454b,roughness:0.8,metalness:0.3});
    const supMat =new THREE.MeshStandardMaterial({color:0x50565d,roughness:0.7,metalness:0.35});
    const grp=new THREE.Group();
    const s=new THREE.Mesh(new THREE.BoxGeometry(16,7,72),hullMat); s.position.y=3; grp.add(s);
    const bow=new THREE.Mesh(new THREE.ConeGeometry(8,16,4),hullMat);           // острый нос
    bow.rotation.x=-Math.PI/2; bow.rotation.y=Math.PI/4; bow.position.set(0,3,-42); grp.add(bow);
    const sup=new THREE.Mesh(new THREE.BoxGeometry(11,6,20),supMat); sup.position.set(0,9.5,-2); grp.add(sup);
    const brg=new THREE.Mesh(new THREE.BoxGeometry(9,3.4,10),supMat); brg.position.set(0,14,-6); grp.add(brg);
    const mst=new THREE.Mesh(new THREE.CylinderGeometry(0.4,0.6,12,8),supMat); mst.position.set(0,21,-4); grp.add(mst);
    const rdr=new THREE.Mesh(new THREE.BoxGeometry(0.3,2.4,3.6),new THREE.MeshStandardMaterial({color:0x9aa3ad,metalness:0.5,roughness:0.4}));
    rdr.position.set(0,25,-4); grp.add(rdr);
    const turret=new THREE.Mesh(new THREE.CylinderGeometry(2.2,2.6,2.2,12),supMat); turret.position.set(0,7.5,-26); grp.add(turret);
    const barrel=new THREE.Mesh(new THREE.CylinderGeometry(0.28,0.28,7,8),supMat);
    barrel.rotation.x=-Math.PI/2.6; barrel.position.set(0,8.6,-29); grp.add(barrel);
    const vls=new THREE.Mesh(new THREE.BoxGeometry(9,1,7),new THREE.MeshStandardMaterial({color:0x33383e,roughness:0.9}));
    vls.position.set(0,7,22); grp.add(vls);
    grp.position.set(x,0,z); grp.traverse(o=>{if(o.isMesh)o.castShadow=true;}); scene.add(grp);
    const s_=grp;
    targets.push({mesh:s_,pos:new V3(x,6,z),hp:180,alive:true,poi:true,radius:26}); }
}
