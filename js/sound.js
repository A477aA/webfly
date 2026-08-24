// webfly — звук (WebAudio, всё синтезируется на лету, внешних файлов нет)

const SND={ ctx:null, master:null, engGain:null, engFilter:null, on:true, ready:false };

function audioInit(){
  if(SND.ctx)return;
  const AC=window.AudioContext||window.webkitAudioContext; if(!AC)return;
  SND.ctx=new AC();
  SND.master=SND.ctx.createGain(); SND.master.gain.value=0.4; SND.master.connect(SND.ctx.destination);
  // непрерывный гул двигателей: шум через полосовой фильтр + низкий тон
  const buf=SND.ctx.createBuffer(1,SND.ctx.sampleRate*2,SND.ctx.sampleRate);
  const d=buf.getChannelData(0); for(let i=0;i<d.length;i++)d[i]=Math.random()*2-1;
  const src=SND.ctx.createBufferSource(); src.buffer=buf; src.loop=true;
  SND.engFilter=SND.ctx.createBiquadFilter(); SND.engFilter.type='lowpass';
  SND.engFilter.frequency.value=160; SND.engFilter.Q.value=0.4;
  SND.engGain=SND.ctx.createGain(); SND.engGain.gain.value=0;
  src.connect(SND.engFilter); SND.engFilter.connect(SND.engGain); SND.engGain.connect(SND.master);
  src.start();
  SND.ready=true;
}
function audioResume(){ if(SND.ctx&&SND.ctx.state==='suspended')SND.ctx.resume(); }
function sndVolume(v){ if(SND.master)SND.master.gain.value=v; }

// затухание громкости по расстоянию
function distGain(pos,ref){
  if(!pos)return 1;
  const d=pos.distanceTo(state.pos);
  return Math.max(0,Math.min(1,(ref||900)/(d+(ref||900))*1.6-0.15));
}
// короткий шумовой всплеск (выстрелы, взрывы)
function noiseBurst(dur,freq,q,vol,type){
  if(!SND.ready||!SND.on)return;
  const ctx=SND.ctx, n=Math.max(1,Math.floor(ctx.sampleRate*dur));
  const buf=ctx.createBuffer(1,n,ctx.sampleRate), d=buf.getChannelData(0);
  for(let i=0;i<n;i++){ const t=i/n; d[i]=(Math.random()*2-1)*Math.pow(1-t,2.2); }
  const src=ctx.createBufferSource(); src.buffer=buf;
  const f=ctx.createBiquadFilter(); f.type=type||'bandpass'; f.frequency.value=freq; f.Q.value=q||1;
  const g=ctx.createGain(); g.gain.value=vol;
  src.connect(f); f.connect(g); g.connect(SND.master); src.start();
}
// тональный сигнал (захват, предупреждения)
function beep(freq,dur,vol,type){
  if(!SND.ready||!SND.on)return;
  const ctx=SND.ctx, o=ctx.createOscillator(), g=ctx.createGain();
  o.type=type||'square'; o.frequency.value=freq;
  g.gain.setValueAtTime(0,ctx.currentTime);
  g.gain.linearRampToValueAtTime(vol,ctx.currentTime+0.012);
  g.gain.exponentialRampToValueAtTime(0.0001,ctx.currentTime+dur);
  o.connect(g); g.connect(SND.master); o.start(); o.stop(ctx.currentTime+dur+0.02);
}

/* --- игровые события --- */
function sndGun(){
  noiseBurst(0.045,320,1.1,0.135,'lowpass');
  noiseBurst(0.02,1800,3.0,0.055,'bandpass');
}
function sndExplosion(pos,size){
  const g=distGain(pos,1600)*Math.min(1,size/34);
  if(g<=0.03)return;
  noiseBurst(0.75,60,0.5,0.30*g,'lowpass');     // низкий раскат
  noiseBurst(0.30,180,0.7,0.14*g,'lowpass');    // тело
  beep(52,0.5,0.10*g,'sine');                   // подкат баса
}
function sndLaunch(){
  if(!SND.ready||!SND.on)return;
  const ctx=SND.ctx, t0=ctx.currentTime;
  // 1) резкий хлопок схода с направляющей
  noiseBurst(0.06,900,1.2,0.16,'bandpass');
  // 2) рёв двигателя: шум, который набирает мощь и уходит вдаль (фильтр закрывается)
  const dur=1.5, n=Math.floor(ctx.sampleRate*dur);
  const buf=ctx.createBuffer(1,n,ctx.sampleRate), d=buf.getChannelData(0);
  for(let i=0;i<n;i++){ const x=i/n; d[i]=(Math.random()*2-1)*Math.min(1,x*14)*Math.pow(1-x,1.1); }
  const src=ctx.createBufferSource(); src.buffer=buf;
  const f=ctx.createBiquadFilter(); f.type='lowpass';
  f.frequency.setValueAtTime(2600,t0);
  f.frequency.exponentialRampToValueAtTime(260,t0+dur);      // удаляется — глохнет
  const g=ctx.createGain();
  g.gain.setValueAtTime(0.0001,t0);
  g.gain.exponentialRampToValueAtTime(0.20,t0+0.10);
  g.gain.exponentialRampToValueAtTime(0.0001,t0+dur);
  src.connect(f); f.connect(g); g.connect(SND.master); src.start();
  // 3) низкий подкат тяги
  const o=ctx.createOscillator(), og=ctx.createGain();
  o.type='sawtooth'; o.frequency.setValueAtTime(90,t0);
  o.frequency.exponentialRampToValueAtTime(38,t0+dur);
  og.gain.setValueAtTime(0.0001,t0);
  og.gain.exponentialRampToValueAtTime(0.07,t0+0.09);
  og.gain.exponentialRampToValueAtTime(0.0001,t0+dur);
  o.connect(og); og.connect(SND.master); o.start(); o.stop(t0+dur+0.05);
}
function sndHit(){ noiseBurst(0.07,900,1.6,0.05,'bandpass'); beep(120,0.10,0.025,'sine'); }
function sndLock(){ beep(880,0.07,0.045,'sine'); }
function sndLockDone(){ beep(1180,0.13,0.055,'sine'); }
function sndWarn(){ beep(620,0.12,0.07,'triangle'); }
function sndFlare(){ noiseBurst(0.18,700,1.2,0.07,'bandpass'); }
function sndBomb(){ noiseBurst(0.3,300,0.8,0.12,'lowpass'); }
// гул двигателей по тяге и скорости
// гул двигателей: низкий, ненавязчивый, зависит от тяги и скорости
function sndEngine(dt){
  if(!SND.ready||!SND.on||!SND.engGain)return;
  const th=state.throttle, v=state.vel.length();
  const target=state.alive?(0.02+th*0.075):0;
  SND.engGain.gain.value += (target-SND.engGain.gain.value)*Math.min(1,dt*3);
  SND.engFilter.frequency.value += (70+th*130+v*0.12 - SND.engFilter.frequency.value)*Math.min(1,dt*3);
}
