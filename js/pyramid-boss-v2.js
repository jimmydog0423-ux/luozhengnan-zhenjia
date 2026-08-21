(() => {
  "use strict";

  const body = document.getElementById("modalBody");
  const overlay = document.getElementById("modalOverlay");
  const modalCard = document.getElementById("modalCard");
  if (!body || !overlay || !modalCard) return;

  const W = 960, H = 600;
  const BOSS_MAX_HP = 3000;
  const PLAYER_MAX_HP = 5;
  const PLAYER_R = 8;
  const QUESTIONS = [
    {q:"二年三班真正異常的是？", a:["黑板","第 32 張桌子","窗簾"], c:1, clue:"名冊只有 31 人，但多出第 32 張桌子。"},
    {q:"哪個地方的數量對不上外牆？", a:["音樂教室","二樓第 8 扇窗","圖書館"], c:1, clue:"外牆 7 扇，二樓內側卻有第 8 扇窗。"},
    {q:"超負荷真正想完成的是？", a:["繼續留校","三件沒完成的心願","打敗所有學生"], c:1, clue:"三個心願碎片才是他沒辦法放學的原因。"}
  ];
  const BAN_TRUTHS = [
    {note:"CASE NOTE：名冊 31 人，異常的是第 32 張桌子。", labels:["31","32","33"], c:1},
    {note:"CASE NOTE：外牆只有 7 扇，真正多出來的是第 8 扇窗。", labels:["7","8","9"], c:1},
    {note:"CASE NOTE：地下機房真正連向深處的是紅色電纜。", labels:["BLACK","RED","BLUE"], c:1},
    {note:"CASE NOTE：逆拍樂譜每第 4 小節故意少一拍。", labels:["3rd","4th","5th"], c:1}
  ];

  let session = null;
  let scheduled = false;
  let bridgeMode = false;

  const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
  const rand=(a,b)=>a+Math.random()*(b-a);
  const d2=(ax,ay,bx,by)=>{const dx=ax-bx,dy=ay-by;return dx*dx+dy*dy};

  function legacyOpen(){
    if (bridgeMode || session || !overlay.classList.contains("show")) return false;
    if (body.querySelector(".pyramid-boss-v2")) return false;
    const p=body.querySelector(".boss-panel");
    return !!p && /金字塔紹安/.test(p.querySelector("h2")?.textContent||"") && !!body.querySelector("[data-q]");
  }

  function stopSession(){
    const s=session;if(!s)return;
    s.dead=true;
    if(s.raf)cancelAnimationFrame(s.raf);
    document.removeEventListener("keydown",s.keyDown,true);
    document.removeEventListener("keyup",s.keyUp,true);
    modalCard.classList.remove("pyramid-boss-modal");
    session=null;
  }

  function takeover(){
    if(!legacyOpen())return;
    const legacyFirstCorrect=[...body.querySelectorAll("[data-q]")].find(b=>/第 32 張桌子/.test(b.textContent));
    const legacyFirstWrong=[...body.querySelectorAll("[data-q]")].find(b=>!/第 32 張桌子/.test(b.textContent));

    body.innerHTML=`<div class="pyramid-boss-v2">
      <div class="pyr2-head"><div><div class="eyebrow">HIDDEN FINAL BOSS · TRUTH COLLAPSE</div><h2>金字塔紹安</h2></div><div class="pyr2-phase" data-phase>MEMORY JUDGEMENT</div></div>
      <div class="pyr2-bars"><div><span>SHAOAN</span><i class="pyr2-bossbar"><b data-bossbar></b></i></div><div><span>ROGER</span><i class="pyr2-playerbar"><b data-playerbar></b></i></div><div class="pyr2-resolve"><span>CASE BREAK</span><i><b data-resolve></b></i></div></div>
      <div class="pyr2-stage-wrap"><canvas class="pyr2-canvas" width="${W}" height="${H}"></canvas><button type="button" class="pyr2-confirm" data-confirm>確認 / SPACE</button></div>
      <div class="pyr2-foot"><span>滑鼠／觸控移動 · 方向鍵可輔助</span><span>Shift 精密移動 · 擦彈累積 CASE BREAK</span></div>
    </div>`;
    modalCard.classList.add("pyramid-boss-modal");
    const root=body.querySelector(".pyramid-boss-v2"),canvas=root.querySelector("canvas"),ctx=canvas.getContext("2d");
    const s={root,canvas,ctx,dead:false,raf:0,last:performance.now(),elapsed:0,phaseTime:0,phase:1,transition:0,
      countdown:3.75,started:false,boss:{x:480,y:92,hp:BOSS_MAX_HP,max:BOSS_MAX_HP},
      player:{x:480,y:525,hp:PLAYER_MAX_HP,inv:0,shot:0,targetX:480,targetY:525,pointer:false},
      bullets:[],shots:[],lasers:[],particles:[],keys:new Set(),attack:0,pattern:0,score:0,resolve:0,graze:0,shake:0,
      q:0,qLock:.8,feedback:"",feedbackT:0,roomMode:0,roomModeT:0,ban:null,banNext:2.8,banIndex:0,
      legacyFirstCorrect,legacyFirstWrong};
    session=s;
    bindInput(s);
    updateDom(s);
    window.GameAudio?.setMode?.("boss");
    s.raf=requestAnimationFrame(t=>frame(s,t));
  }

  function bindInput(s){
    const pos=e=>{const r=s.canvas.getBoundingClientRect();return{x:(e.clientX-r.left)*W/r.width,y:(e.clientY-r.top)*H/r.height}};
    s.canvas.addEventListener("pointerdown",e=>{e.preventDefault();s.canvas.setPointerCapture?.(e.pointerId);const p=pos(e);s.player.pointer=true;s.player.targetX=p.x;s.player.targetY=p.y;});
    s.canvas.addEventListener("pointermove",e=>{if(!s.player.pointer)return;const p=pos(e);s.player.targetX=p.x;s.player.targetY=p.y;});
    const end=e=>{try{s.canvas.releasePointerCapture?.(e.pointerId)}catch(_){}s.player.pointer=false};
    s.canvas.addEventListener("pointerup",end);s.canvas.addEventListener("pointercancel",end);
    s.root.querySelector("[data-confirm]").onclick=()=>special(s);
    s.keyDown=e=>{if(!session||session!==s)return;const k=e.key.toLowerCase();if(["arrowleft","arrowright","arrowup","arrowdown","w","a","s","d","shift"," "].includes(k)||e.key===" "){e.preventDefault();s.keys.add(k);if(e.key===" "&&!e.repeat)special(s)}};
    s.keyUp=e=>{s.keys.delete(e.key.toLowerCase())};
    document.addEventListener("keydown",s.keyDown,true);document.addEventListener("keyup",s.keyUp,true);
  }

  function special(s){
    if(!s.started||s.transition>0)return;
    if(s.phase===1){confirmAnswer(s);return}
    if(s.resolve>=100){s.resolve=0;s.bullets.length=0;s.lasers=s.lasers.filter(l=>l.tele>0);s.player.inv=Math.max(s.player.inv,1);s.boss.hp=clamp(s.boss.hp-135,0,s.boss.max);s.shake=.25;s.feedback="CASE BREAK · 真相清場";s.feedbackT=1.1;burstParticles(s,s.player.x,s.player.y,"#fff0b0",24)}
  }

  function confirmAnswer(s){
    if(s.qLock>0||s.q>=QUESTIONS.length)return;
    const zones=answerZones();let pick=-1;
    zones.forEach((z,i)=>{if(d2(s.player.x,s.player.y,z.x,z.y)<z.r*z.r)pick=i});
    if(pick<0){s.feedback="先移動到答案區";s.feedbackT=.8;return}
    const q=QUESTIONS[s.q];
    if(pick===q.c){s.boss.hp=clamp(s.boss.hp-250,0,s.boss.max);s.q++;s.bullets.length=0;s.lasers.length=0;s.resolve=clamp(s.resolve+18,0,100);s.feedback="TRUTH ACCEPTED";s.feedbackT=1;s.qLock=1;if(s.q>=QUESTIONS.length)enterPhase(s,2,"TRIANGLE HELL");}
    else{hitPlayer(s,true);s.feedback="FALSE MEMORY";s.feedbackT=1;s.qLock=.75;spawnRing(s,s.boss.x,s.boss.y,16,150,"#ff315c",false)}
  }

  function answerZones(){return[{x:175,y:482,r:78},{x:480,y:482,r:78},{x:785,y:482,r:78}]}

  function enterPhase(s,p,label){
    s.phase=p;s.phaseTime=0;s.attack=.8;s.transition=2.25;s.bullets.length=0;s.lasers.length=0;s.shots.length=0;s.player.inv=2.3;s.feedback=`PHASE ${p} · ${label}`;s.feedbackT=2.1;
    if(p===3){s.roomMode=0;s.roomModeT=0}
    if(p===4){s.banNext=2.4;s.root.classList.add("ban-mode")}
    updateDom(s);
  }

  function frame(s,now){
    if(s.dead||session!==s||!document.contains(s.root)){stopSession();return}
    const dt=clamp((now-s.last)/1000,0,.04);s.last=now;s.elapsed+=dt;
    if(s.feedbackT>0)s.feedbackT-=dt;if(s.shake>0)s.shake-=dt;if(s.qLock>0)s.qLock-=dt;
    if(!s.started){s.countdown-=dt;if(s.countdown<=0){s.started=true;s.feedback="JUDGEMENT START";s.feedbackT=.9}else{draw(s);s.raf=requestAnimationFrame(t=>frame(s,t));return}}
    if(s.transition>0){s.transition-=dt;updatePlayer(s,dt);draw(s);s.raf=requestAnimationFrame(t=>frame(s,t));return}
    s.phaseTime+=dt;updatePlayer(s,dt);updateShots(s,dt);updateAttacks(s,dt);updateBullets(s,dt);updateLasers(s,dt);updateParticles(s,dt);checkPhase(s);updateDom(s);draw(s);
    if(s.player.hp<=0){bridgeResult(s,false);return}
    if(s.boss.hp<=0){bridgeResult(s,true);return}
    s.raf=requestAnimationFrame(t=>frame(s,t));
  }

  function updatePlayer(s,dt){
    const p=s.player;if(p.inv>0)p.inv-=dt;
    let dx=0,dy=0;if(s.keys.has("arrowleft")||s.keys.has("a"))dx--;if(s.keys.has("arrowright")||s.keys.has("d"))dx++;if(s.keys.has("arrowup")||s.keys.has("w"))dy--;if(s.keys.has("arrowdown")||s.keys.has("s"))dy++;
    const sp=s.keys.has("shift")?175:330;if(dx||dy){const m=Math.hypot(dx,dy)||1;p.x+=dx/m*sp*dt;p.y+=dy/m*sp*dt;p.pointer=false}else if(p.pointer){const ddx=p.targetX-p.x,ddy=p.targetY-p.y,m=Math.hypot(ddx,ddy);if(m>2){const step=Math.min(m,430*dt);p.x+=ddx/m*step;p.y+=ddy/m*step}}
    p.x=clamp(p.x,28,W-28);p.y=clamp(p.y,185,H-28);
    if(s.phase>1){p.shot-=dt;if(p.shot<=0){p.shot=.105;s.shots.push({x:p.x-5,y:p.y-10,vy:-610},{x:p.x+5,y:p.y-10,vy:-610})}}
  }

  function updateShots(s,dt){
    for(let i=s.shots.length-1;i>=0;i--){const a=s.shots[i];a.y+=a.vy*dt;if(a.y<-15){s.shots.splice(i,1);continue}if(s.phase>1&&d2(a.x,a.y,s.boss.x,s.boss.y)<46*46){s.boss.hp=clamp(s.boss.hp-5,0,s.boss.max);s.score+=10;s.shots.splice(i,1)}}
  }

  function updateAttacks(s,dt){
    s.attack-=dt;
    if(s.phase===1){if(s.attack<=0){s.attack=.72;memoryAttack(s)}return}
    if(s.phase===2){if(s.attack<=0){s.attack=.58;triangleAttack(s)}return}
    if(s.phase===3){s.roomModeT+=dt;if(s.roomModeT>4.6){s.roomMode=(s.roomMode+1)%4;s.roomModeT=0;s.bullets.length=0;s.feedback=`ROOM SHIFT · ${["二年三班","圖書館","音樂教室","地下機房"][s.roomMode]}`;s.feedbackT=1.1}if(s.attack<=0)roomAttack(s);return}
    if(s.phase===4){s.banNext-=dt;if(s.ban&&!s.ban.done){s.ban.time-=dt;if(s.ban.time<=0)resolveBan(s)}else if(s.banNext<=0)startBan(s);if(s.attack<=0){s.attack=.34;banAttack(s)}}
  }

  function memoryAttack(s){
    if(Math.random()<.55){const x=rand(80,W-80);for(let i=-2;i<=2;i++)spawnBullet(s,x,105,i*38,170+Math.abs(i)*9,7,"#8d5cff",false,{wave:rand(1.5,3)})}
    else aimedFan(s,Math.random()<.5?90:870,120,s.player.x,s.player.y,5,.17,185,"#ff5575",false);
  }

  function triangleAttack(s){
    const corners=[[95,118],[865,118],[480,65]],k=s.pattern++%7;
    if(k===0||k===3){corners.forEach((c,n)=>aimedFan(s,c[0],c[1],s.player.x,s.player.y,5,.13,205+n*8,n===2?"#ffd052":"#ff315c",false))}
    else if(k===1){spawnRing(s,s.boss.x,s.boss.y,20,155,"#9d69ff",false)}
    else if(k===2){const c=corners[(s.pattern>>1)%3];for(let i=0;i<8;i++){const a=i*Math.PI/4+s.elapsed*.8;spawnBullet(s,c[0],c[1],Math.cos(a)*190,Math.sin(a)*190,7,"#ff6b90",false,{curve:(i%2?.55:-.55)})}}
    else if(k===4){for(let x=90;x<W;x+=95)spawnBullet(s,x,-10,rand(-18,18),180+rand(0,55),6,"#70e4ff",false,{text:"CHAT"})}
    else if(k===5){queueLaser(s,rand(160,800),0,rand(160,800),H,1.05,.42,"#ff284e",false)}
    else{corners.forEach(c=>spawnRing(s,c[0],c[1],10,175,"#e754ff",false))}
  }

  function roomAttack(s){
    const m=s.roomMode;
    if(m===0){s.attack=.62;const y=rand(245,535),from=Math.random()<.5?-30:W+30,vx=from<0?210:-210;for(let j=0;j<3;j++)spawnBullet(s,from,y+j*28,vx,0,12,"#b7795a",false,{shape:"desk"})}
    else if(m===1){s.attack=.24;spawnBullet(s,rand(45,W-45),-15,rand(-55,55),155+rand(0,70),7,"#e8ddc5",false,{shape:"paper",wave:rand(2,4)})}
    else if(m===2){s.attack=.403;const lane=Math.floor(rand(0,6)),x=120+lane*144;for(let j=-1;j<=1;j++)if(j!==0||Math.random()<.45)spawnBullet(s,x+j*24,-12,0,220,8,"#ff6ccf",false,{shape:"note"});if(s.pattern++%4===0)spawnRing(s,s.boss.x,s.boss.y,12,145,"#7bdcff",false)}
    else{s.attack=.88;const x=rand(110,850);queueLaser(s,x,80,x+rand(-80,80),H,1,.48,"#ff203f",false);aimedFan(s,s.boss.x,s.boss.y,s.player.x,s.player.y,3,.12,205,"#ff6a49",false)}
  }

  function banAttack(s){
    const fake=Math.random()<.43;
    if(Math.random()<.5)aimedFan(s,s.boss.x,s.boss.y,s.player.x,s.player.y,3,.16,225,fake?"#8d5cff":"#ff244d",fake);
    else{const a=rand(0,Math.PI*2);for(let i=0;i<8;i++){const q=a+i*Math.PI/4;spawnBullet(s,s.boss.x,s.boss.y,Math.cos(q)*190,Math.sin(q)*190,7,fake?"#8060ad":"#ff315c",fake,{curve:(i%2?.32:-.32)})}}
    if(s.pattern++%7===0)queueLaser(s,rand(110,850),0,rand(110,850),H,.9,.4,Math.random()<.5?"#73518f":"#ff244d",Math.random()<.5);
  }

  function startBan(s){
    const t=BAN_TRUTHS[s.banIndex++%BAN_TRUTHS.length],fakeChoices=[0,1,2].filter(i=>i!==t.c);s.ban={truth:t,time:3.5,done:false,fake:fakeChoices[Math.floor(Math.random()*fakeChoices.length)]};s.banNext=999;s.feedback="BAN PROTOCOL · 不要相信系統提示";s.feedbackT=1.3;
  }
  function banZones(){return[{x:175,y:485,r:78},{x:480,y:485,r:78},{x:785,y:485,r:78}]}
  function resolveBan(s){
    if(!s.ban)return;const z=banZones()[s.ban.truth.c],safe=d2(s.player.x,s.player.y,z.x,z.y)<z.r*z.r;s.ban.done=true;
    if(safe){s.boss.hp=clamp(s.boss.hp-145,0,s.boss.max);s.resolve=clamp(s.resolve+24,0,100);s.feedback="TRUTH FILTER PASSED";burstParticles(s,s.player.x,s.player.y,"#8fffc8",20)}else{hitPlayer(s,true);s.feedback="BAN · FALSE SAFE ZONE"}
    s.feedbackT=1.1;s.bullets.length=0;s.lasers.length=0;s.ban=null;s.banNext=3.6;
  }

  function spawnBullet(s,x,y,vx,vy,r,color,fake=false,extra={}){s.bullets.push({x,y,vx,vy,r,color,fake,age:0,graze:false,...extra})}
  function aimedFan(s,x,y,tx,ty,count,spread,speed,color,fake){const base=Math.atan2(ty-y,tx-x),mid=(count-1)/2;for(let i=0;i<count;i++){const a=base+(i-mid)*spread;spawnBullet(s,x,y,Math.cos(a)*speed,Math.sin(a)*speed,7,color,fake)}}
  function spawnRing(s,x,y,count,speed,color,fake){const off=s.elapsed*.65;for(let i=0;i<count;i++){const a=off+i*Math.PI*2/count;spawnBullet(s,x,y,Math.cos(a)*speed,Math.sin(a)*speed,7,color,fake)}}
  function queueLaser(s,x1,y1,x2,y2,tele,active,color,fake){s.lasers.push({x1,y1,x2,y2,tele,active,maxTele:tele,maxActive:active,color,fake,hit:false})}

  function updateBullets(s,dt){
    const p=s.player;
    for(let i=s.bullets.length-1;i>=0;i--){const b=s.bullets[i];b.age+=dt;if(b.curve){const a=b.curve*dt,c=Math.cos(a),sn=Math.sin(a),vx=b.vx*c-b.vy*sn,vy=b.vx*sn+b.vy*c;b.vx=vx;b.vy=vy}if(b.wave)b.x+=Math.sin(b.age*b.wave*3)*22*dt;b.x+=b.vx*dt;b.y+=b.vy*dt;
      if(b.x<-70||b.x>W+70||b.y<-80||b.y>H+80){s.bullets.splice(i,1);continue}
      const rr=b.r+PLAYER_R;if(!b.fake&&p.inv<=0&&d2(b.x,b.y,p.x,p.y)<rr*rr){s.bullets.splice(i,1);hitPlayer(s,false);continue}
      if(!b.fake&&!b.graze&&d2(b.x,b.y,p.x,p.y)<(b.r+31)*(b.r+31)){b.graze=true;s.graze++;s.resolve=clamp(s.resolve+2.1,0,100);s.score+=35}
    }
  }

  function lineDist(px,py,x1,y1,x2,y2){const dx=x2-x1,dy=y2-y1,l=dx*dx+dy*dy||1,t=clamp(((px-x1)*dx+(py-y1)*dy)/l,0,1),x=x1+t*dx,y=y1+t*dy;return Math.hypot(px-x,py-y)}
  function updateLasers(s,dt){for(let i=s.lasers.length-1;i>=0;i--){const l=s.lasers[i];if(l.tele>0){l.tele-=dt;continue}l.active-=dt;if(l.active<=0){s.lasers.splice(i,1);continue}if(!l.fake&&!l.hit&&s.player.inv<=0&&lineDist(s.player.x,s.player.y,l.x1,l.y1,l.x2,l.y2)<15){l.hit=true;hitPlayer(s,false)}}}

  function hitPlayer(s,forced){const p=s.player;if(!forced&&p.inv>0)return;p.hp--;p.inv=1.05;s.shake=.35;s.resolve=clamp(s.resolve+8,0,100);s.feedback="HIT";s.feedbackT=.55;burstParticles(s,p.x,p.y,"#ff315c",18)}
  function burstParticles(s,x,y,color,n){for(let i=0;i<n;i++){const a=rand(0,Math.PI*2),sp=rand(45,170);s.particles.push({x,y,vx:Math.cos(a)*sp,vy:Math.sin(a)*sp,life:rand(.25,.65),max:.65,color})}}
  function updateParticles(s,dt){for(let i=s.particles.length-1;i>=0;i--){const p=s.particles[i];p.life-=dt;p.x+=p.vx*dt;p.y+=p.vy*dt;p.vx*=.97;p.vy*=.97;if(p.life<=0)s.particles.splice(i,1)}}

  function checkPhase(s){
    if(s.phase===2&&s.boss.hp<=1550)enterPhase(s,3,"ROOM DISTORTION");
    else if(s.phase===3&&s.boss.hp<=750)enterPhase(s,4,"BAN MODE");
  }

  function updateDom(s){
    s.root.querySelector("[data-bossbar]").style.width=`${clamp(s.boss.hp/s.boss.max*100,0,100)}%`;
    s.root.querySelector("[data-playerbar]").style.width=`${clamp(s.player.hp/PLAYER_MAX_HP*100,0,100)}%`;
    s.root.querySelector("[data-resolve]").style.width=`${s.resolve}%`;
    const names=["","MEMORY JUDGEMENT","TRIANGLE HELL","ROOM DISTORTION","BAN MODE"];s.root.querySelector("[data-phase]").textContent=names[s.phase];
    const c=s.root.querySelector("[data-confirm]");c.hidden=s.phase!==1;c.disabled=s.transition>0||s.qLock>0;
  }

  function draw(s){
    const c=s.ctx;c.save();if(s.shake>0)c.translate(rand(-5,5),rand(-5,5));
    const g=c.createLinearGradient(0,0,0,H);g.addColorStop(0,"#100514");g.addColorStop(.55,"#090712");g.addColorStop(1,"#030306");c.fillStyle=g;c.fillRect(0,0,W,H);
    c.strokeStyle="rgba(174,71,255,.08)";c.lineWidth=1;for(let x=0;x<W;x+=48){c.beginPath();c.moveTo(x,0);c.lineTo(x,H);c.stroke()}for(let y=0;y<H;y+=48){c.beginPath();c.moveTo(0,y);c.lineTo(W,y);c.stroke()}
    if(s.phase===4)drawGlitch(c,s);
    drawBoss(c,s);drawLasers(c,s);drawBullets(c,s);drawShots(c,s);drawZones(c,s);drawParticles(c,s);drawPlayer(c,s);drawHud(c,s);
    c.restore();
  }

  function drawBoss(c,s){
    const x=s.boss.x,y=s.boss.y;c.save();c.translate(x,y);c.rotate(Math.sin(s.elapsed*.7)*.035);c.shadowBlur=28;c.shadowColor=s.phase===4?"#ff244d":"#9b52ff";c.strokeStyle=s.phase===4?"#ff3659":"#b66cff";c.fillStyle="rgba(35,8,45,.78)";c.lineWidth=5;c.beginPath();c.moveTo(0,-48);c.lineTo(58,43);c.lineTo(-58,43);c.closePath();c.fill();c.stroke();c.shadowBlur=12;c.fillStyle="#fff";c.beginPath();c.ellipse(0,6,22,10,0,0,Math.PI*2);c.fill();c.fillStyle="#d51c4a";c.beginPath();c.arc(0,6,7,0,Math.PI*2);c.fill();c.restore();
  }
  function drawPlayer(c,s){const p=s.player;c.save();if(p.inv>0&&Math.floor(p.inv*14)%2===0)c.globalAlpha=.35;c.shadowBlur=15;c.shadowColor="#73e7ff";c.fillStyle="#eafcff";c.beginPath();c.moveTo(p.x,p.y-13);c.lineTo(p.x+9,p.y+10);c.lineTo(p.x,p.y+6);c.lineTo(p.x-9,p.y+10);c.closePath();c.fill();c.shadowBlur=8;c.fillStyle="#ff315c";c.beginPath();c.arc(p.x,p.y,PLAYER_R*.46,0,Math.PI*2);c.fill();c.restore()}
  function drawShots(c,s){c.save();c.strokeStyle="#8df7ff";c.lineWidth=3;c.shadowBlur=8;c.shadowColor="#8df7ff";for(const a of s.shots){c.beginPath();c.moveTo(a.x,a.y+8);c.lineTo(a.x,a.y-8);c.stroke()}c.restore()}
  function drawBullets(c,s){for(const b of s.bullets){c.save();c.globalAlpha=b.fake?.26:1;c.translate(b.x,b.y);if(b.shape==="paper"){c.rotate(Math.sin(b.age*6)*.5);c.fillStyle=b.color;c.fillRect(-8,-5,16,10)}else if(b.shape==="desk"){c.fillStyle=b.color;c.fillRect(-14,-9,28,18)}else if(b.shape==="note"){c.fillStyle=b.color;c.font="bold 20px sans-serif";c.fillText("♪",-7,7)}else if(b.text){c.fillStyle=b.color;c.font="bold 9px monospace";c.fillText("●",-4,4)}else{c.shadowBlur=b.fake?0:9;c.shadowColor=b.color;c.fillStyle=b.color;c.beginPath();c.arc(0,0,b.r,0,Math.PI*2);c.fill();if(!b.fake){c.fillStyle="rgba(255,255,255,.82)";c.beginPath();c.arc(0,0,Math.max(2,b.r*.28),0,Math.PI*2);c.fill()}}c.restore()}}
  function drawLasers(c,s){for(const l of s.lasers){c.save();if(l.tele>0){c.globalAlpha=l.fake?.18:.38;c.strokeStyle=l.color;c.lineWidth=5;c.setLineDash([16,14])}else{c.globalAlpha=l.fake?.2:1;c.strokeStyle=l.color;c.lineWidth=l.fake?9:18;c.shadowBlur=l.fake?0:22;c.shadowColor=l.color}c.beginPath();c.moveTo(l.x1,l.y1);c.lineTo(l.x2,l.y2);c.stroke();c.restore()}}
  function drawParticles(c,s){for(const p of s.particles){c.save();c.globalAlpha=clamp(p.life/p.max,0,1);c.fillStyle=p.color;c.fillRect(p.x-2,p.y-2,4,4);c.restore()}}

  function drawZones(c,s){
    if(s.phase===1&&s.q<QUESTIONS.length){const q=QUESTIONS[s.q],zs=answerZones();c.save();c.textAlign="center";zs.forEach((z,i)=>{const inside=d2(s.player.x,s.player.y,z.x,z.y)<z.r*z.r;c.fillStyle=inside?"rgba(108,234,255,.16)":"rgba(74,37,96,.22)";c.strokeStyle=inside?"#8df7ff":"rgba(190,120,255,.58)";c.lineWidth=inside?4:2;c.beginPath();c.arc(z.x,z.y,z.r,0,Math.PI*2);c.fill();c.stroke();c.fillStyle="#fff";c.font="700 16px sans-serif";wrapText(c,q.a[i],z.x,z.y+5,135,19)});c.restore()}
    if(s.phase===4&&s.ban){const z=banZones(),t=s.ban.truth;c.save();c.textAlign="center";z.forEach((a,i)=>{const fake=i===s.ban.fake;c.fillStyle=fake?"rgba(80,255,125,.12)":"rgba(130,60,160,.13)";c.strokeStyle=fake?"rgba(80,255,125,.78)":"rgba(185,105,230,.5)";c.lineWidth=fake?5:2;c.beginPath();c.arc(a.x,a.y,a.r,0,Math.PI*2);c.fill();c.stroke();c.fillStyle="#fff";c.font="800 18px monospace";c.fillText(t.labels[i],a.x,a.y+6)});c.fillStyle="#ff4f6f";c.font="800 15px monospace";c.fillText(`SYSTEM SAFE → ${t.labels[s.ban.fake]}  (可能是偽造訊息)`,480,365);c.fillStyle="#fff0b0";c.font="700 14px sans-serif";wrapText(c,t.note,480,392,650,18);c.restore()}
  }

  function drawHud(c,s){
    c.save();c.fillStyle="rgba(0,0,0,.58)";c.fillRect(18,18,270,66);c.fillStyle="#fff";c.font="800 13px monospace";c.fillText(`SCORE ${String(s.score).padStart(6,"0")}`,30,42);c.fillText(`GRAZE ${s.graze}`,30,64);
    if(s.phase===1&&s.q<QUESTIONS.length){c.textAlign="center";c.fillStyle="rgba(8,5,12,.82)";c.fillRect(185,128,590,68);c.fillStyle="#fff";c.font="800 20px sans-serif";wrapText(c,QUESTIONS[s.q].q,480,158,535,24);c.fillStyle="#c9a6ff";c.font="12px sans-serif";c.fillText("移動到答案區，再按 SPACE／確認",480,184)}
    if(!s.started){const n=s.countdown>2.8?"3":s.countdown>1.8?"2":s.countdown>.8?"1":"JUDGE";c.textAlign="center";c.fillStyle="#fff";c.font="900 72px sans-serif";c.shadowBlur=28;c.shadowColor="#b35cff";c.fillText(n,480,330)}
    if(s.feedbackT>0){c.textAlign="center";c.fillStyle="#fff";c.font="900 25px sans-serif";c.shadowBlur=18;c.shadowColor="#ff315c";c.fillText(s.feedback,480,238)}
    if(s.phase===3){c.textAlign="right";c.fillStyle="#ffd67a";c.font="800 13px monospace";c.fillText(`ROOM: ${["CLASS 203","LIBRARY","MUSIC","BASEMENT"][s.roomMode]}`,930,38)}
    c.restore();
  }

  function drawGlitch(c,s){c.save();for(let i=0;i<5;i++){if(Math.random()<.45){c.fillStyle=`rgba(255,20,70,${rand(.015,.045)})`;c.fillRect(rand(0,W),rand(0,H),rand(80,320),rand(2,9))}}c.restore()}
  function wrapText(c,text,x,y,max,line){const a=String(text).split(""),rows=[];let row="";for(const ch of a){const t=row+ch;if(c.measureText(t).width>max&&row){rows.push(row);row=ch}else row=t}if(row)rows.push(row);rows.slice(0,3).forEach((r,i)=>c.fillText(r,x,y+i*line))}

  function bridgeResult(s,won){
    if(s.dead)return;s.dead=true;bridgeMode=true;if(s.raf)cancelAnimationFrame(s.raf);document.removeEventListener("keydown",s.keyDown,true);document.removeEventListener("keyup",s.keyUp,true);modalCard.classList.remove("pyramid-boss-modal");session=null;
    const first=s.legacyFirstCorrect;if(first)first.click();
    let tries=0;
    const step=()=>{
      tries++;if(tries>60){bridgeMode=false;return}
      if(!overlay.classList.contains("show")){bridgeMode=false;return}
      const qs=[...body.querySelectorAll("[data-q]")];
      if(qs.length){const correctTexts=["第 32 張桌子","二樓窗戶","完成放學前沒完成的三件事"];const b=qs.find(x=>correctTexts.some(t=>x.textContent.includes(t)));if(b){b.click();setTimeout(step,35);return}}
      const lanes=[...body.querySelectorAll("#pyramidLanes [data-lane]")];
      if(lanes.length){const log=body.querySelector(".boss-log")?.textContent||"",m=log.match(/第\s*(\d+)\s*線/),danger=m?Number(m[1])-1:0;const b=won?lanes.find(x=>Number(x.dataset.lane)!==danger):lanes.find(x=>Number(x.dataset.lane)===danger);b?.click();setTimeout(step,45);return}
      setTimeout(step,45);
    };
    setTimeout(step,40);
  }

  function scan(){scheduled=false;if(session&&!document.contains(session.root))stopSession();if(legacyOpen())takeover()}
  function schedule(){if(scheduled)return;scheduled=true;requestAnimationFrame(scan)}
  new MutationObserver(schedule).observe(body,{childList:true,subtree:true});
  new MutationObserver(schedule).observe(overlay,{attributes:true,attributeFilter:["class","aria-hidden"]});
  schedule();
})();
