const W = 800, H = 600, GRAVITY = 1550;
const platforms = [{x:0,y:565,w:800,h:35},{x:110,y:465,w:220,h:18},{x:470,y:465,w:220,h:18},{x:280,y:365,w:240,h:18},{x:70,y:260,w:240,h:18},{x:490,y:260,w:240,h:18},{x:330,y:155,w:140,h:18}];
const hazards = [{x:335,y:548,w:130,h:17,type:'lava'},{x:160,y:448,w:70,h:17,type:'water'},{x:565,y:448,w:70,h:17,type:'lava'}];
const gemLayout = [{x:180,y:425,color:'#ff6b35'},{x:590,y:425,color:'#35cfee'},{x:395,y:325,color:'#ff9900'},{x:150,y:220,color:'#ff6b35'},{x:650,y:220,color:'#35cfee'},{x:365,y:115,color:'#ff9900'},{x:430,y:115,color:'#ff9900'},{x:245,y:425,color:'#ff9900'},{x:525,y:425,color:'#ff9900'},{x:400,y:525,color:'#ff9900'}];

export function createWatergirlFireboyEngine(canvas, callbacks={}) {
  const ctx=canvas.getContext('2d'); canvas.width=W; canvas.height=H;
  let frame=0,destroyed=false,running=false,muted=false,audio,last=performance.now(),timer=45,gems=[],particles=[];
  const keys={fireLeft:false,fireRight:false,fireJump:false,waterLeft:false,waterRight:false,waterJump:false};
  const makePlayer=(x,color,type)=>({x,y:520,w:30,h:42,vx:0,vy:0,onGround:false,color,type,portal:false});
  let fire=makePlayer(95,'#ff6b35','fire'),water=makePlayer(675,'#35cfee','water');
  const sound=(freq,d=.08)=>{if(muted)return;try{audio??=new(window.AudioContext||window.webkitAudioContext)();const o=audio.createOscillator(),g=audio.createGain();o.frequency.value=freq;g.gain.setValueAtTime(.07,audio.currentTime);g.gain.exponentialRampToValueAtTime(.001,audio.currentTime+d);o.connect(g).connect(audio.destination);o.start();o.stop(audio.currentTime+d)}catch{/* optional */}};
  const burst=(x,y,color)=>{for(let i=0;i<14;i++)particles.push({x,y,vx:(Math.random()-.5)*220,vy:(Math.random()-.8)*220,life:.65,color})};
  const intersects=(a,b)=>a.x<b.x+b.w&&a.x+a.w>b.x&&a.y<b.y+b.h&&a.y+a.h>b.y;
  const reset=()=>{fire=makePlayer(95,'#ff6b35','fire');water=makePlayer(675,'#35cfee','water');gems=gemLayout.map((g,i)=>({...g,id:i,taken:false,w:18,h:18}));particles=[];timer=45;};
  const emit=()=>callbacks.onUpdate?.({timer,gems:gems.filter(g=>g.taken).length,total:gems.length,firePortal:fire.portal,waterPortal:water.portal});
  const finish=(success,cause)=>{if(!running)return;running=false;sound(success?950:90,.3);callbacks.onFinish?.({gems:gems.filter(g=>g.taken).length,secondsRemaining:timer,success,cause})};
  const updatePlayer=(p,left,right,jump,dt)=>{
    p.vx=((keys[left]?-1:0)+(keys[right]?1:0))*220;
    if(keys[jump]&&p.onGround){p.vy=-590;p.onGround=false;keys[jump]=false;sound(p.type==='fire'?430:520)}
    p.vy+=GRAVITY*dt;p.x+=p.vx*dt;p.x=Math.max(0,Math.min(W-p.w,p.x));p.y+=p.vy*dt;p.onGround=false;
    for(const block of platforms){if(p.vy>=0&&p.x+p.w>block.x&&p.x<block.x+block.w&&p.y+p.h>=block.y&&p.y+p.h-p.vy*dt<=block.y+5){p.y=block.y-p.h;p.vy=0;p.onGround=true}}
    if(p.y>H+60)finish(false,`${p.type.toUpperCase()} FELL OUT OF BOUNDS`);
    for(const h of hazards){if(intersects(p,h)&&h.type!==p.type)finish(false,`${p.type.toUpperCase()} ENTERED ${h.type.toUpperCase()}`)}
    for(const gem of gems){if(!gem.taken&&Math.hypot(p.x+p.w/2-gem.x,p.y+p.h/2-gem.y)<28){gem.taken=true;burst(gem.x,gem.y,gem.color);sound(700+gem.id*18)}}
    const portal=p.type==='fire'?{x:350,y:104,w:38,h:51}:{x:412,y:104,w:38,h:51};p.portal=intersects(p,portal);
  };
  const draw=()=>{
    const bg=ctx.createLinearGradient(0,0,0,H);bg.addColorStop(0,'#111b29');bg.addColorStop(1,'#070b10');ctx.fillStyle=bg;ctx.fillRect(0,0,W,H);
    ctx.strokeStyle='#ff990012';ctx.lineWidth=1;for(let x=0;x<W;x+=40){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,H);ctx.stroke()}for(let y=0;y<H;y+=40){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(W,y);ctx.stroke()}
    for(const b of platforms){ctx.fillStyle='#283746';ctx.fillRect(b.x,b.y,b.w,b.h);ctx.fillStyle='#ff9900';ctx.fillRect(b.x,b.y,b.w,3)}
    for(const h of hazards){ctx.fillStyle=h.type==='lava'?'#ff5722':'#00b8d9';ctx.shadowBlur=14;ctx.shadowColor=ctx.fillStyle;ctx.fillRect(h.x,h.y,h.w,h.h);ctx.shadowBlur=0}
    [{x:350,c:'#ff6b35',label:'F'},{x:412,c:'#35cfee',label:'W'}].forEach(p=>{ctx.strokeStyle=p.c;ctx.lineWidth=4;ctx.strokeRect(p.x,104,38,51);ctx.fillStyle=p.c+'33';ctx.fillRect(p.x,104,38,51);ctx.fillStyle=p.c;ctx.font='bold 18px monospace';ctx.fillText(p.label,p.x+13,136)});
    for(const g of gems){if(g.taken)continue;ctx.save();ctx.translate(g.x,g.y);ctx.rotate(Math.PI/4);ctx.fillStyle=g.color;ctx.shadowBlur=15;ctx.shadowColor=g.color;ctx.fillRect(-8,-8,16,16);ctx.restore()}
    const drawPlayer=p=>{ctx.save();ctx.translate(p.x+p.w/2,p.y+p.h/2);ctx.shadowBlur=18;ctx.shadowColor=p.color;ctx.fillStyle=p.color;ctx.beginPath();ctx.arc(0,-8,13,0,Math.PI*2);ctx.fill();ctx.beginPath();ctx.roundRect(-14,3,28,20,7);ctx.fill();ctx.fillStyle='#fff';ctx.fillRect(-6,-12,4,4);ctx.fillRect(3,-12,4,4);ctx.restore()};drawPlayer(fire);drawPlayer(water);
  };
  const loop=now=>{if(destroyed)return;const dt=Math.min(.035,(now-last)/1000);last=now;draw();if(running){timer=Math.max(0,timer-dt);updatePlayer(fire,'fireLeft','fireRight','fireJump',dt);updatePlayer(water,'waterLeft','waterRight','waterJump',dt);if(fire.portal&&water.portal)finish(true,'BOTH PORTALS REACHED');if(timer<=0)finish(false,'MISSION TIME EXPIRED');emit()}particles=particles.filter(p=>{p.x+=p.vx*dt;p.y+=p.vy*dt;p.vy+=300*dt;p.life-=dt;ctx.globalAlpha=Math.max(0,p.life);ctx.fillStyle=p.color;ctx.fillRect(p.x,p.y,5,5);return p.life>0});ctx.globalAlpha=1;frame=requestAnimationFrame(loop)};
  reset();frame=requestAnimationFrame(loop);
  return{start(){reset();running=true;last=performance.now();emit();sound(330,.1)},setInput(name,value){if(name in keys)keys[name]=value},mute(value){muted=value;if(value)audio?.suspend();else audio?.resume()},resize(){},destroy(){destroyed=true;running=false;cancelAnimationFrame(frame);audio?.close().catch(()=>{});particles=[]}};
}
