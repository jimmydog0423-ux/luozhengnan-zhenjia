(() => {
"use strict";

const C = document.getElementById("game");
const X = C.getContext("2d");
const W = C.width, H = C.height;
X.imageSmoothingEnabled = false;

const UI = {
  start: document.getElementById("start"),
  pause: document.getElementById("pause"),
  ending: document.getElementById("ending"),
  endingTitle: document.getElementById("endingTitle"),
  endingText: document.getElementById("endingText"),
  endingStats: document.getElementById("endingStats"),
  chapter: document.getElementById("chapterLabel"),
  hint: document.getElementById("hintLabel"),
};

const SAVE_KEY = "luozhengnan_zhenjia_v1";
const input = { held:new Set(), press:new Set(), mouse:false, mx:0, my:0 };

let mute = false;
let audioCtx = null;
function beep(freq=320,d=.06,type="square",vol=.028){
  if(mute)return;
  try{
    if(!audioCtx) audioCtx = new (window.AudioContext||window.webkitAudioContext)();
    const o=audioCtx.createOscillator(), g=audioCtx.createGain();
    o.type=type;o.frequency.value=freq;g.gain.value=vol;
    o.connect(g);g.connect(audioCtx.destination);o.start();o.stop(audioCtx.currentTime+d);
  }catch{}
}

function loadSave(){
  try{return Object.assign({
    clears:0, fakeDeaths:0, beitouTalks:0, packsOpened:0,
    rankedWins:0, finalWins:0, lastDeck:[], firstChoice:"", bestTime:null
  },JSON.parse(localStorage.getItem(SAVE_KEY)||"{}"))}catch{return{}}
}
let save = loadSave();
function saveNow(){ localStorage.setItem(SAVE_KEY,JSON.stringify(save)); }

const G = {
  running:false, paused:false, scene:"intro2026", t:0, last:0, sceneT:0,
  message:"", msgT:0, shake:0, flash:0, glitch:0, startedAt:0,
  particles:[], bullets:[], echoes:[], cards:[], hover:-1, turnTimer:0,
  streamHeat:0, fakeScore:0, packs:0, packAnim:0, rankRound:0,
  deck:[], hand:[], boardP:[null,null,null], boardE:[null,null,null],
  hpP:18,hpE:18,energy:3,enemyEnergy:3,turn:"player",enemyThinking:0,
  fatigue:0, finalMode:false, clonePhase:0, cloneHP:28, cloneTimer:0,
  sessionRankWins:0, choiceMemory:[],
};

const P = {
  x:245,y:410,vx:0,vy:0,r:16,speed:225,faceX:1,faceY:0,
  dash:0,dashCd:0,inv:0,action:0,hp:5,maxHp:5,anim:0
};

const COLORS = {
  ink:"#efeaf3", black:"#09080c", red:"#ff5b64", cyan:"#67dedb",
  gold:"#eac65e", purple:"#9c73d4", green:"#72c695", skin:"#d8aa8d",
  hair:"#17131b", jacket:"#b2443e", pants:"#242129", shoe:"#c6b8a0"
};

function setChapter(a,b){UI.chapter.textContent=a;UI.hint.textContent=b}
function msg(s,t=2.2){G.message=s;G.msgT=t}
function clamp(v,a,b){return Math.max(a,Math.min(b,v))}
function rnd(a,b){return a+Math.random()*(b-a)}
function dist(ax,ay,bx,by){return Math.hypot(ax-bx,ay-by)}
function rectHitCircle(r,cx,cy,cr){
  const nx=clamp(cx,r.x,r.x+r.w), ny=clamp(cy,r.y,r.y+r.h);
  const dx=cx-nx,dy=cy-ny; return dx*dx+dy*dy<cr*cr;
}
function press(code){return input.press.has(code)}
function held(...codes){return codes.some(c=>input.held.has(c))}
function particle(x,y,color,n=8,spd=120){
  for(let i=0;i<n;i++){
    const a=Math.random()*Math.PI*2,s=rnd(spd*.35,spd);
    G.particles.push({x,y,vx:Math.cos(a)*s,vy:Math.sin(a)*s,life:rnd(.25,.7),c:color,sz:rnd(2,5)});
  }
}
function textNoise(txt,x,y,size=14,color="#aaa",align="left"){
  X.save();X.font=`700 ${size}px "Microsoft JhengHei",sans-serif`;X.textAlign=align;
  X.fillStyle=color;X.fillText(txt,x,y);
  if(G.glitch>.2){
    X.globalAlpha=.45;X.fillStyle=COLORS.cyan;X.fillText(txt,x+2,y);
    X.fillStyle=COLORS.red;X.fillText(txt,x-2,y+1);
  }X.restore();
}
function panel(x,y,w,h,alpha=.88){
  X.fillStyle=`rgba(10,8,13,${alpha})`;X.fillRect(x,y,w,h);
  X.strokeStyle="#403648";X.strokeRect(x+.5,y+.5,w-1,h-1);
}
function vignette(){
  const g=X.createRadialGradient(W/2,H/2,180,W/2,H/2,720);
  g.addColorStop(0,"rgba(0,0,0,0)");g.addColorStop(1,"rgba(0,0,0,.68)");
  X.fillStyle=g;X.fillRect(0,0,W,H);
}
function glitchPass(){
  if(G.glitch<=0)return;
  const count=Math.floor(2+G.glitch*12);
  for(let i=0;i<count;i++){
    const y=Math.floor(Math.random()*H),h=Math.floor(rnd(2,14)),off=Math.floor(rnd(-24,24)*G.glitch);
    try{const img=X.getImageData(0,y,W,h);X.putImageData(img,off,y)}catch{}
  }
}

function drawRoger(x,y,scale=1,ghost=false,flip=false){
  X.save();X.translate(Math.round(x),Math.round(y));if(flip)X.scale(-1,1);X.scale(scale,scale);
  const bob=Math.sin(G.t*8+x*.01)*1.2;
  X.translate(0,bob);
  if(ghost)X.globalAlpha=.36;
  // shadow
  X.fillStyle="rgba(0,0,0,.35)";X.fillRect(-13,22,28,7);
  // legs
  X.fillStyle=COLORS.pants;X.fillRect(-10,4,8,22);X.fillRect(3,4,8,22);
  X.fillStyle=COLORS.shoe;X.fillRect(-12,23,11,5);X.fillRect(3,23,11,5);
  // torso distinctive red jacket / pale shirt
  X.fillStyle=COLORS.jacket;X.fillRect(-15,-20,30,27);
  X.fillStyle="#ded4c4";X.fillRect(-5,-18,10,20);
  X.fillStyle="#7f302d";X.fillRect(-15,-17,5,21);X.fillRect(10,-17,5,21);
  // neck/head
  X.fillStyle=COLORS.skin;X.fillRect(-5,-27,10,8);X.fillRect(-13,-46,26,21);
  // angular hair
  X.fillStyle=COLORS.hair;X.fillRect(-14,-49,28,8);X.fillRect(-14,-45,7,9);
  X.fillRect(7,-46,7,7);X.fillRect(-8,-52,16,5);
  // one cyan "authenticity" eye
  X.fillStyle=ghost?COLORS.red:COLORS.cyan;X.fillRect(4,-39,4,3);
  X.fillStyle="#5c4540";X.fillRect(-6,-39,3,3);
  X.restore();
}

function drawFake(x,y,s=1,alpha=.8){
  drawRoger(x,y,s,true,Math.sin(x+y)>0);
  X.save();X.globalAlpha=alpha;X.strokeStyle=COLORS.red;X.lineWidth=2;
  X.strokeRect(x-18*s,y-54*s,36*s,84*s);X.restore();
}

function drawChat(lines, x=930,y=65,w=320,h=560){
  panel(x,y,w,h,.76);
  textNoise("LIVE CHAT",x+16,y+28,12,COLORS.red);
  X.save();X.beginPath();X.rect(x+8,y+38,w-16,h-50);X.clip();
  let yy=y+h-22;
  for(let i=lines.length-1;i>=0;i--){
    const l=lines[i];X.font="13px sans-serif";
    X.fillStyle=l.fake?COLORS.red:(l.old?COLORS.gold:"#c7bfcc");
    X.fillText(l.name+"：",x+16,yy);
    X.fillStyle="#aaa2b0";X.fillText(l.text,x+86,yy);
    yy-=25;
    if(yy<y+52)break;
  }
  X.restore();
}

const chat2026 = [
  {name:"傑寶001",text:"真假",old:true},{name:"高金生",text:"確實"},
  {name:"羅正男",text:"今天玩什麼？",fake:true},
  {name:"羅正男2486",text:"我是本人",fake:true},
  {name:"羅正男",text:"上面都是假的",fake:true},
];

const beitouNPCs = [
  {x:310,y:265,name:"米特姨",lines:["你至少選一條正常的人生吧。","晚餐放桌上，記得吃。"],c:"#a37b68"},
  {x:815,y:240,name:"便利店店長",lines:["明天七點。不要又睡過頭。","制服在後面。"],c:"#567b8e"},
  {x:865,y:535,name:"朋友",lines:["欸，有一款卡牌遊戲。","你不是很會看人打嗎？自己試啊。"],c:"#6f8a58"},
];

const worldWalls = [
  {x:0,y:0,w:W,h:38},{x:0,y:H-38,w:W,h:38},{x:0,y:0,w:38,h:H},{x:W-38,y:0,w:38,h:H},
  {x:410,y:95,w:36,h:250},{x:410,y:420,w:36,h:210},
  {x:690,y:38,w:36,h:205},{x:690,y:340,w:36,h:342},
];
const locations = [
  {x:80,y:90,w:250,h:135,name:"家",sub:"北投存檔點"},
  {x:760,y:82,w:300,h:128,name:"便利商店",sub:"正常人生 A"},
  {x:760,y:430,w:310,h:175,name:"網咖",sub:"另一條路"},
  {x:95,y:470,w:240,h:135,name:"學校",sub:"沒有按下確認"},
];

function resetPlayer(x,y){P.x=x;P.y=y;P.vx=P.vy=0;P.hp=P.maxHp;P.inv=1;P.dash=0;P.dashCd=0}
function nextScene(name){
  G.scene=name;G.sceneT=0;G.bullets.length=0;G.particles.length=0;G.glitch=0;G.flash=0;
  if(name==="intro2026"){setChapter("2026：頭貼軍團","別相信每一個叫「羅正男」的人。");resetPlayer(260,430);G.clonePhase=0}
  if(name==="beitou"){setChapter("2013：北投存檔點","沒有任務箭頭。四處走走。");resetPlayer(175,360);msg("雨停了。你還是不知道下一步要去哪。",2.7)}
  if(name==="packs"){setChapter("2014：四十包零傳說","拆完四十包，再想辦法組出能打的牌。");G.packs=0;G.packAnim=0}
  if(name==="deck"){setChapter("2014：爛牌也要打","挑 8 張牌。你沒有傳說卡。");initDeckBuilder()}
  if(name==="ranked"){setChapter("2014：第六天・凌晨 03:17","最後三場。睡覺，還是繼續排？");G.sessionRankWins=0;initBattle(false)}
  if(name==="return2026"){setChapter("2026：到底哪一個是我","它學會了你剛才的打法。");resetPlayer(220,360);G.cloneHP=28;G.clonePhase=0;G.cloneTimer=0;G.glitch=.2}
}

function updateMove(dt,walls=worldWalls){
  P.inv=Math.max(0,P.inv-dt);P.dash=Math.max(0,P.dash-dt);P.dashCd=Math.max(0,P.dashCd-dt);P.action=Math.max(0,P.action-dt);
  let dx=(held("KeyD","ArrowRight")?1:0)-(held("KeyA","ArrowLeft")?1:0);
  let dy=(held("KeyS","ArrowDown")?1:0)-(held("KeyW","ArrowUp")?1:0);
  if(dx||dy){const l=Math.hypot(dx,dy);dx/=l;dy/=l;P.faceX=dx;P.faceY=dy}
  if(press("ShiftLeft")||press("ShiftRight")){
    if(P.dashCd<=0){P.dash=.16;P.dashCd=.72;P.inv=Math.max(P.inv,.18);beep(260,.04);particle(P.x,P.y,COLORS.cyan,5,70)}
  }
  const sp=P.dash>0?560:P.speed;
  P.x+=dx*sp*dt; for(const r of walls) if(rectHitCircle(r,P.x,P.y,P.r)){P.x-=dx*sp*dt;break}
  P.y+=dy*sp*dt; for(const r of walls) if(rectHitCircle(r,P.x,P.y,P.r)){P.y-=dy*sp*dt;break}
  P.x=clamp(P.x,40,W-40);P.y=clamp(P.y,40,H-40);
}
function hurt(n=1){
  if(P.inv>0)return;P.hp-=n;P.inv=.75;G.shake=8;G.flash=.16;beep(95,.09,"sawtooth",.05);particle(P.x,P.y,COLORS.red,10,150);
  if(P.hp<=0){save.fakeDeaths=(save.fakeDeaths||0)+1;saveNow(); if(G.scene==="return2026")nextScene("return2026");else nextScene("intro2026")}
}

function updateIntro2026(dt){
  updateMove(dt,[]);
  G.streamHeat+=dt;
  if(G.sceneT>1.5 && G.clonePhase===0){G.clonePhase=1;msg("聊天室：『羅正男』加入聊天室。",2)}
  if(G.sceneT>3.6 && G.clonePhase===1){G.clonePhase=2;msg("聊天室：『羅正男』加入聊天室。",2);G.glitch=.25}
  if(G.sceneT>6 && G.clonePhase===2){G.clonePhase=3;G.glitch=.45;msg("這不是你的帳號。",2)}
  const n=Math.max(0,Math.min(16,Math.floor((G.sceneT-3)*1.1)));
  for(let i=0;i<n;i++){
    const a=G.t*.38+i*2.399, rr=170+(i%4)*34;
    const fx=600+Math.cos(a)*rr,fy=360+Math.sin(a*.9)*rr*.65;
    if(dist(P.x,P.y,fx,fy)<34)hurt(1);
  }
  if(G.sceneT>9){
    // computer becomes escape target
    if(P.x>1080 && P.y<180){G.glitch=1;beep(60,.3,"sawtooth",.06);setTimeout(()=>nextScene("beitou"),100)}
  }
}

function drawIntro2026(){
  X.fillStyle="#0d0911";X.fillRect(0,0,W,H);
  // room
  X.fillStyle="#19131c";X.fillRect(40,40,850,640);
  X.fillStyle="#241a26";X.fillRect(70,90,300,220);
  X.fillStyle="#0b0b0e";X.fillRect(92,114,255,150);
  X.fillStyle="#6b2030";X.fillRect(97,119,245,8);
  textNoise("STREAM OFFLINE?",219,195,20,"#9e4050","center");
  X.fillStyle="#201925";X.fillRect(555,100,245,130);
  X.fillStyle="#09090c";X.fillRect(572,116,212,98);
  X.fillStyle="#be4b58";X.fillRect(582,125,120,6);
  X.fillStyle="#211824";X.fillRect(930,42,310,636);
  // desk / pc target
  X.fillStyle="#493841";X.fillRect(1010,92,180,14);X.fillRect(1030,106,14,88);X.fillRect(1160,106,14,88);
  X.fillStyle="#11151a";X.fillRect(1050,65,110,72);X.strokeStyle=COLORS.cyan;X.strokeRect(1050,65,110,72);
  if(G.sceneT>9){X.strokeStyle=COLORS.gold;X.lineWidth=2;X.strokeRect(1042,57,126,88);textNoise("?",1105,115,28,COLORS.gold,"center")}
  const n=Math.max(0,Math.min(16,Math.floor((G.sceneT-3)*1.1)));
  for(let i=0;i<n;i++){
    const a=G.t*.38+i*2.399, rr=170+(i%4)*34;
    drawFake(600+Math.cos(a)*rr,360+Math.sin(a*.9)*rr*.65,.72,.56);
  }
  drawRoger(P.x,P.y,1,false,P.faceX<0);
  drawChat(chat2026.concat(
    Array.from({length:Math.max(0,n-3)},(_,i)=>({name:"羅正男"+(i+2),text:i%2?"真假":"我才是真的",fake:true}))
  ),930,220,310,420);
  if(G.sceneT>9) textNoise("跑去你的電腦。",640,665,15,COLORS.gold,"center");
}

function updateBeitou(dt){
  updateMove(dt,worldWalls);
  let near=null;
  for(const n of beitouNPCs) if(dist(P.x,P.y,n.x,n.y)<62)near=n;
  if(near&&press("KeyE")){
    save.beitouTalks=(save.beitouTalks||0)+1;saveNow();
    msg(`${near.name}：${near.lines[Math.floor(G.sceneT)%near.lines.length]}`,2.5);beep(380,.04);
  }
  // enter netcafe from doorway
  if(P.x>760&&P.x<1090&&P.y>430&&P.y<620&&press("KeyE")){
    const friend=beitouNPCs[2];
    if(dist(P.x,P.y,friend.x,friend.y)<120){
      save.firstChoice=save.beitouTalks>1?"先四處看看":"直接進網咖";saveNow();
      G.glitch=.25;msg("朋友丟來一個連結：《魔牌傳說》",1.6);
      setTimeout(()=>nextScene("packs"),600);
    }
  }
}
function drawBeitou(){
  X.fillStyle="#17171b";X.fillRect(0,0,W,H);
  // wet asphalt
  for(let y=38;y<H-38;y+=24){X.fillStyle=(y/24)%2?"#1d1d21":"#1a1a1e";X.fillRect(38,y,W-76,24)}
  // rain reflection
  X.globalAlpha=.22;
  for(let i=0;i<90;i++){X.fillStyle=i%3?COLORS.cyan:COLORS.gold;X.fillRect((i*137)%W,60+(i*83)%(H-120),2,10)}
  X.globalAlpha=1;
  // buildings
  for(const l of locations){
    X.fillStyle=l.name==="網咖"?"#2b1f32":"#25242a";X.fillRect(l.x,l.y,l.w,l.h);
    X.strokeStyle="#4b4651";X.strokeRect(l.x,l.y,l.w,l.h);
    textNoise(l.name,l.x+18,l.y+32,18,l.name==="網咖"?COLORS.purple:"#d5cfd8");
    textNoise(l.sub,l.x+18,l.y+55,11,"#7e7683");
  }
  // neon netcafe
  X.strokeStyle=COLORS.purple;X.strokeRect(784,455,160,46);textNoise("24H INTERNET",864,485,13,COLORS.purple,"center");
  // walls separators
  for(const w of worldWalls.slice(4)){X.fillStyle="#343137";X.fillRect(w.x,w.y,w.w,w.h)}
  // npcs
  for(const n of beitouNPCs){
    X.fillStyle=n.c;X.fillRect(n.x-10,n.y-28,20,35);X.fillStyle="#d2aa91";X.fillRect(n.x-8,n.y-42,16,14);
    if(dist(P.x,P.y,n.x,n.y)<62){textNoise("E",n.x,n.y-55,12,COLORS.gold,"center")}
  }
  drawRoger(P.x,P.y,1,false,P.faceX<0);
  textNoise("北投・雨後",65,660,14,"#857d88");
}

function updatePacks(dt){
  if(G.packAnim>0){G.packAnim-=dt;return}
  if((press("Space")||input.mouse) && G.packs<40){
    G.packs++;save.packsOpened=G.packs;saveNow();G.packAnim=.16;beep(G.packs%5===0?520:330,.05);
    const rare=(G.packs%7===0||G.packs===39)?"稀有":"普通";
    particle(W/2,H/2,rare==="稀有"?COLORS.gold:COLORS.purple,16,180);
    if(G.packs===40){G.glitch=.25;msg("40 包。0 張傳說。",2.8);setTimeout(()=>nextScene("deck"),1700)}
  }
}
function drawPacks(){
  X.fillStyle="#120e17";X.fillRect(0,0,W,H);
  // desk
  X.fillStyle="#211923";X.fillRect(80,80,1120,560);
  X.fillStyle="#100d13";X.fillRect(110,110,1060,500);
  // unopened stack
  for(let i=Math.min(12,40-G.packs);i>0;i--){
    X.fillStyle=i%2?"#673855":"#553245";X.fillRect(180+i*2,245-i*3,170,225);
    X.strokeStyle="#b26e89";X.strokeRect(180+i*2,245-i*3,170,225);
  }
  if(G.packs<40){
    X.save();X.translate(W/2,340);const s=1+Math.sin(G.t*4)*.025;
    X.scale(s,s);X.fillStyle="#552e4f";X.fillRect(-115,-145,230,290);X.strokeStyle=COLORS.gold;X.lineWidth=3;X.strokeRect(-105,-135,210,270);
    X.fillStyle="#1b1520";X.beginPath();X.arc(0,0,70,0,Math.PI*2);X.fill();
    textNoise("魔",0,18,55,COLORS.gold,"center");X.restore();
    textNoise("空白鍵 / 點擊　拆包",W/2,565,16,"#c8bfce","center");
  } else textNoise("沒有傳說。",W/2,355,28,COLORS.red,"center");
  textNoise(`${G.packs} / 40`,1080,130,24,COLORS.ink,"right");
  textNoise("右手運氣：？",1080,158,12,"#867d8c","right");
}

const CARD_POOL = [
  {id:"hound",name:"北投獵犬",cost:1,atk:2,hp:1,tag:"rush",desc:"當回合可立即攻擊。"},
  {id:"cheap",name:"二費生物",cost:2,atk:3,hp:2,tag:"plain",desc:"普通，但很有效率。"},
  {id:"trap",name:"假動作",cost:1,atk:1,hp:3,tag:"guard",desc:"敵人優先攻擊它。"},
  {id:"coach",name:"看台學習",cost:2,atk:1,hp:4,tag:"draw",desc:"打出時抽 1 張。"},
  {id:"knife",name:"節奏短刀",cost:2,atk:4,hp:1,tag:"rush",desc:"快，但活不久。"},
  {id:"brick",name:"爛牌硬打",cost:3,atk:4,hp:4,tag:"plain",desc:"沒有特效。"},
  {id:"read",name:"讀牌",cost:2,atk:2,hp:3,tag:"peek",desc:"降低下回合敵方攻擊。"},
  {id:"sleep",name:"再一把",cost:1,atk:1,hp:2,tag:"energy",desc:"下回合能量 +1。"},
  {id:"stream",name:"實況觀摩",cost:3,atk:2,hp:5,tag:"draw",desc:"打出時抽 1 張。"},
  {id:"hunter",name:"獵人直覺",cost:3,atk:5,hp:2,tag:"rush",desc:"高壓時更強。"},
  {id:"coin",name:"硬幣",cost:0,atk:0,hp:1,tag:"energy",desc:"下回合能量 +1。"},
  {id:"taunt",name:"聊天室誤導",cost:1,atk:1,hp:4,tag:"guard",desc:"好像有用。"},
];
function initDeckBuilder(){G.deck=[];G.hover=-1}
function updateDeck(dt){
  if(press("Enter")&&G.deck.length===8){save.lastDeck=G.deck.map(c=>c.id);saveNow();nextScene("ranked");return}
  if(input.mouse){
    const c=cardAtMouse();
    if(c){
      const idx=G.deck.findIndex(d=>d.id===c.id);
      if(idx>=0){G.deck.splice(idx,1);beep(210,.04)}
      else if(G.deck.length<8){G.deck.push(c);beep(440,.04)}
    }
  }
}
function cardAtMouse(){
  const cols=6,cw=150,ch=205,gap=24,startX=90,startY=135;
  for(let i=0;i<CARD_POOL.length;i++){
    const col=i%cols,row=Math.floor(i/cols);const x=startX+col*(cw+gap),y=startY+row*(ch+gap);
    if(input.mx>=x&&input.mx<=x+cw&&input.my>=y&&input.my<=y+ch)return CARD_POOL[i];
  }return null;
}
function drawCard(c,x,y,w=150,h=205,selected=false,dim=false){
  X.save();if(dim)X.globalAlpha=.45;
  X.fillStyle=selected?"#2b2536":"#16121b";X.fillRect(x,y,w,h);
  X.strokeStyle=selected?COLORS.gold:"#4a3d52";X.lineWidth=selected?3:1;X.strokeRect(x+.5,y+.5,w-1,h-1);
  X.fillStyle="#34263b";X.fillRect(x+8,y+8,w-16,70);
  // abstract card art
  X.fillStyle=c.tag==="rush"?COLORS.red:c.tag==="guard"?COLORS.cyan:c.tag==="draw"?COLORS.purple:COLORS.gold;
  X.beginPath();X.moveTo(x+25,y+68);X.lineTo(x+w/2,y+20);X.lineTo(x+w-24,y+68);X.closePath();X.fill();
  textNoise(String(c.cost),x+17,y+25,16,COLORS.cyan);
  textNoise(c.name,x+w/2,y+101,14,COLORS.ink,"center");
  textNoise(`${c.atk} / ${c.hp}`,x+w/2,y+133,16,COLORS.gold,"center");
  X.font="11px sans-serif";X.fillStyle="#9c93a4";X.textAlign="center";
  wrapText(c.desc,x+w/2,y+157,w-18,15);
  X.restore();
}
function wrapText(s,x,y,max,lineH){
  let line="",yy=y;for(const ch of s){const test=line+ch;if(X.measureText(test).width>max){X.fillText(line,x,yy);line=ch;yy+=lineH}else line=test}if(line)X.fillText(line,x,yy)
}
function drawDeck(){
  X.fillStyle="#0d0b11";X.fillRect(0,0,W,H);
  textNoise("四十包零傳說",90,70,26,COLORS.ink);
  textNoise("沒有豪華卡。選 8 張，把理解力當稀有度。",90,100,13,"#8f8795");
  const cols=6,cw=150,ch=205,gap=24,startX=90,startY=135;
  for(let i=0;i<CARD_POOL.length;i++){
    const c=CARD_POOL[i],col=i%cols,row=Math.floor(i/cols),x=startX+col*(cw+gap),y=startY+row*(ch+gap);
    drawCard(c,x,y,cw,ch,G.deck.some(d=>d.id===c.id));
  }
  textNoise(`${G.deck.length} / 8`,1110,70,24,G.deck.length===8?COLORS.cyan:COLORS.gold,"right");
  if(G.deck.length===8) textNoise("ENTER 開始爬梯",1110,100,13,COLORS.cyan,"right");
}

function cloneCard(c){return {...c,hpNow:c.hp,atkNow:c.atk,used:false}}
function makeDeck(){
  let d=G.deck.length?G.deck:CARD_POOL.slice(0,8);
  return d.flatMap(c=>[cloneCard(c),cloneCard(c)]).sort(()=>Math.random()-.5);
}
function initBattle(final=false){
  G.finalMode=final;G.cards=makeDeck();G.hand=[];G.boardP=[null,null,null];G.boardE=[null,null,null];
  G.hpP=18;G.hpE=final?24:16;G.energy=3;G.enemyEnergy=3;G.turn="player";G.turnTimer=final?13:18;G.enemyThinking=0;
  G.fatigue=final?1:0;G.rankRound=0;drawFromDeck(4);
  msg(final?"最後一場。你的眼睛已經開始不相信自己。":"傳說門口。沒有傳說卡。",2.5);
}
function drawFromDeck(n=1){for(let i=0;i<n;i++) if(G.cards.length&&G.hand.length<7)G.hand.push(G.cards.shift())}
function battleClick(){
  if(G.turn!=="player")return;
  // hand cards
  const startX=100, y=548, cw=135, h=156, gap=12;
  for(let i=0;i<G.hand.length;i++){
    const x=startX+i*(cw+gap),c=G.hand[i];
    if(input.mx>=x&&input.mx<=x+cw&&input.my>=y&&input.my<=y+h){
      if(c.cost<=G.energy){
        const lane=G.boardP.findIndex(v=>!v);
        if(lane>=0){
          G.energy-=c.cost;G.boardP[lane]=c;G.hand.splice(i,1);beep(440,.05);
          if(c.tag==="draw")drawFromDeck(1);
          if(c.tag==="energy")G._bonusEnergy=(G._bonusEnergy||0)+1;
          if(c.tag==="peek")G._weakEnemy=true;
        }else msg("場上沒有空位。",1.2);
      }else msg("能量不夠。",1.2);
      return;
    }
  }
  // attack by clicking player's card then enemy lane / face simplified: click own card = attacks same lane or face
  for(let i=0;i<3;i++){
    const bx=320+i*220,by=365;
    if(G.boardP[i]&&input.mx>=bx&&input.mx<=bx+150&&input.my>=by&&input.my<=by+145){
      const c=G.boardP[i];if(c.used){msg("這張本回合已經動過。",1);return}
      c.used=true;
      if(G.boardE[i]){G.boardE[i].hpNow-=c.atkNow;particle(bx+75,260,COLORS.red,8,90);if(G.boardE[i].hpNow<=0)G.boardE[i]=null}
      else{G.hpE-=c.atkNow;particle(1050,170,COLORS.red,8,90)}
      beep(190,.04);return;
    }
  }
}
function endPlayerTurn(){
  if(G.turn!=="player")return;G.turn="enemy";G.enemyThinking=.55;
}
function enemyTurn(){
  // enemy plays simple generated card
  const lane=G.boardE.findIndex(v=>!v);
  if(lane>=0){
    const src=CARD_POOL[(G.rankRound*3+lane+Math.floor(Math.random()*4))%CARD_POOL.length];
    G.boardE[lane]=cloneCard(src);
    if(G._weakEnemy)G.boardE[lane].atkNow=Math.max(0,G.boardE[lane].atkNow-1);
  }
  // attack same lane / face
  for(let i=0;i<3;i++){
    const c=G.boardE[i];if(!c)continue;
    if(G.boardP[i]){G.boardP[i].hpNow-=c.atkNow;if(G.boardP[i].hpNow<=0)G.boardP[i]=null}
    else G.hpP-=c.atkNow;
  }
  G.rankRound++;
  G.turn="player";G.energy=3+(G._bonusEnergy||0);G._bonusEnergy=0;G._weakEnemy=false;G.turnTimer=G.finalMode?Math.max(7,13-G.rankRound*.45):18;
  drawFromDeck(1);G.boardP.forEach(c=>{if(c)c.used=false});
}
function updateRanked(dt){
  if(G.turn==="player"){
    G.turnTimer-=dt;
    if(input.mouse)battleClick();
    if(press("Enter"))endPlayerTurn();
    if(G.turnTimer<=0){G.fatigue++;G.glitch=Math.min(.8,.1+G.fatigue*.12);msg("你恍神了一秒。回合被吃掉。",1.5);endPlayerTurn()}
  }else{
    G.enemyThinking-=dt;if(G.enemyThinking<=0)enemyTurn();
  }
  if(G.hpP<=0){G.fatigue++;msg("輸了。再排。",1.2);setTimeout(()=>initBattle(G.finalMode),650)}
  if(G.hpE<=0){
    if(!G.finalMode){
      G.sessionRankWins++;
      save.rankedWins=(save.rankedWins||0)+1;saveNow();
      if(G.sessionRankWins>=3){G.glitch=.4;msg("傳說。六天。",2.4);setTimeout(()=>{initBattle(true);G.finalMode=true;setChapter("2014：晉級後的那一把","你已經贏了，但你還想證明一次。")},1200)}
      else{msg(`第 ${G.sessionRankWins} 場拿下。還沒結束。`,1.8);setTimeout(()=>initBattle(false),800)}
    } else {
      save.finalWins=(save.finalWins||0)+1;saveNow();G.glitch=1;msg("畫面裡的聊天室，突然出現 2026 的帳號。",2);
      setTimeout(()=>nextScene("return2026"),1300);
    }
  }
}
function drawBattle(){
  const fatig=G.finalMode?G.fatigue:0;
  X.fillStyle="#0d0a10";X.fillRect(0,0,W,H);
  // neon board
  X.fillStyle="#17121b";X.fillRect(65,70,1150,435);
  X.strokeStyle="#3d3046";X.strokeRect(65,70,1150,435);
  for(let i=0;i<3;i++){
    X.fillStyle=i%2?"#1c1622":"#19141f";
    X.fillRect(300+i*220,115,175,145);X.fillRect(300+i*220,345,175,145);
  }
  textNoise("對手",1070,104,13,"#93899b","right");textNoise(String(G.hpE),1070,142,28,COLORS.red,"right");
  textNoise("羅正男",95,468,13,"#93899b");textNoise(String(G.hpP),95,442,28,COLORS.cyan);
  textNoise(`能量 ${G.energy}`,95,505,14,COLORS.gold);
  // enemy board
  for(let i=0;i<3;i++)if(G.boardE[i])drawMiniBattleCard(G.boardE[i],312+i*220,123,true);
  for(let i=0;i<3;i++)if(G.boardP[i])drawMiniBattleCard(G.boardP[i],312+i*220,353,false);
  // hand
  const startX=100,y=548,cw=135,h=156,gap=12;
  for(let i=0;i<G.hand.length;i++)drawCard(G.hand[i],startX+i*(cw+gap),y,cw,h,false,G.hand[i].cost>G.energy);
  textNoise(G.turn==="player"?"ENTER 結束回合":"對手思考中…",1160,690,13,G.turn==="player"?COLORS.cyan:"#887f8e","right");
  if(G.turn==="player")textNoise(`${G.turnTimer.toFixed(1)}s`,1160,650,20,G.turnTimer<5?COLORS.red:COLORS.gold,"right");
  if(G.finalMode){
    textNoise("03:17",110,110,18,COLORS.red);
    textNoise(`疲勞 ${G.fatigue}`,110,138,12,"#8f8493");
    if(G.fatigue>1){
      X.globalAlpha=.09+Math.sin(G.t*7)*.04;X.fillStyle="#b74d66";
      for(let i=0;i<8;i++)X.fillRect(0,80+i*79,W,1);
      X.globalAlpha=1;
    }
  }
}
function drawMiniBattleCard(c,x,y,enemy){
  X.fillStyle=enemy?"#2b1820":"#18262a";X.fillRect(x,y,150,128);
  X.strokeStyle=enemy?"#78404d":"#3e7b80";X.strokeRect(x+.5,y+.5,149,127);
  textNoise(c.name,x+75,y+28,12,"#ddd6e1","center");
  textNoise(`${c.atkNow} / ${c.hpNow}`,x+75,y+70,18,enemy?COLORS.red:COLORS.cyan,"center");
  if(c.used)textNoise("已動",x+75,y+102,10,"#776f7b","center");
}

function updateReturn2026(dt){
  updateMove(dt,[]);
  G.cloneTimer+=dt;
  const clones=6+G.clonePhase*2;
  // attack
  if((press("Space")||input.mouse)&&P.action<=0){
    P.action=.28;beep(500,.04);particle(P.x+P.faceX*25,P.y+P.faceY*25,COLORS.cyan,6,90);
    // hit boss if near center clone swarm
    const tx=850+Math.cos(G.t*.5)*90,ty=360+Math.sin(G.t*.7)*80;
    if(dist(P.x,P.y,tx,ty)<105){G.cloneHP-=2;G.shake=5;beep(140,.05);if(G.cloneHP<=0)finish()}
  }
  // replay-style clone bullets based on selected deck tags
  if(G.cloneTimer>.8){
    G.cloneTimer=0;
    const usedRush=G.deck.filter(c=>c.tag==="rush").length;
    const cnt=4+Math.min(4,usedRush);
    for(let i=0;i<cnt;i++){
      const a=Math.atan2(P.y-360,P.x-850)+(i-(cnt-1)/2)*.14;
      G.bullets.push({x:850,y:360,vx:Math.cos(a)*250,vy:Math.sin(a)*250,r:7,life:4});
    }
    if(Math.random()<.45){
      // create an echo that mirrors player's approximate position
      G.echoes.push({x:W-P.x,y:P.y,life:2.2});
    }
  }
  for(let i=G.bullets.length-1;i>=0;i--){
    const b=G.bullets[i];b.x+=b.vx*dt;b.y+=b.vy*dt;b.life-=dt;
    if(dist(P.x,P.y,b.x,b.y)<P.r+b.r){hurt(1);G.bullets.splice(i,1);continue}
    if(b.life<=0||b.x<0||b.x>W||b.y<0||b.y>H)G.bullets.splice(i,1);
  }
  for(let i=G.echoes.length-1;i>=0;i--){G.echoes[i].life-=dt;if(G.echoes[i].life<=0)G.echoes.splice(i,1)}
  G.clonePhase=G.cloneHP>18?0:G.cloneHP>8?1:2;
  G.glitch=.18+G.clonePhase*.15;
}
function drawReturn2026(){
  X.fillStyle="#09070d";X.fillRect(0,0,W,H);
  // giant account feed
  for(let i=0;i<14;i++){
    const yy=40+i*48,off=Math.sin(G.t*.6+i)*24;
    X.fillStyle=i%2?"#121019":"#0f0d14";X.fillRect(40+off,yy,1200,34);
    textNoise("羅正男",65+off,yy+22,11,i%3===0?COLORS.red:"#5f5964");
    textNoise(i%3===0?"真假，我才是本人":"確實　有料　2486",155+off,yy+22,11,"#5d5662");
  }
  // clone core
  const tx=850+Math.cos(G.t*.5)*90,ty=360+Math.sin(G.t*.7)*80;
  for(let i=0;i<7+G.clonePhase*3;i++){
    const a=G.t*.55+i*0.9,rr=45+(i%3)*38;
    drawFake(tx+Math.cos(a)*rr,ty+Math.sin(a*1.15)*rr,.75,.38);
  }
  for(const e of G.echoes)drawRoger(e.x,e.y,.95,true,false);
  for(const b of G.bullets){X.fillStyle=COLORS.red;X.fillRect(b.x-6,b.y-6,12,12)}
  drawRoger(P.x,P.y,1,false,P.faceX<0);
  if(P.action>0){X.strokeStyle=COLORS.cyan;X.lineWidth=4;X.beginPath();X.arc(P.x,P.y,48,Math.atan2(P.faceY,P.faceX)-.8,Math.atan2(P.faceY,P.faceX)+.8);X.stroke()}
  panel(80,80,250,72,.8);textNoise("羅正男？",100,110,13,COLORS.cyan);textNoise(`HP ${P.hp}/${P.maxHp}`,100,138,15,COLORS.ink);
  panel(930,80,250,72,.8);textNoise("羅正男",950,110,13,COLORS.red);textNoise(`${Math.max(0,G.cloneHP)} / 28`,950,138,15,COLORS.ink);
  textNoise("它正在使用你剛才偏好的打法。",W/2,670,13,"#9b919f","center");
}

function finish(){
  G.running=false;save.clears=(save.clears||0)+1;
  const sec=Math.floor((performance.now()/1000)-G.startedAt);
  if(!save.bestTime||sec<save.bestTime)save.bestTime=sec;saveNow();
  UI.endingTitle.textContent="「哪一個才是我？」";
  UI.endingText.textContent="螢幕恢復正常。聊天室問：『今天玩什麼？』你沒有回答。因為剛才那個打字的人，可能也不是你。";
  UI.endingStats.innerHTML=[
    ["四十包",`${G.packs}/40`],["爬梯勝場",String(save.rankedWins||0)],["分身死亡",String(save.fakeDeaths||0)]
  ].map(([a,b])=>`<div class="stat">${a}<b>${b}</b></div>`).join("");
  UI.ending.classList.add("show");
}

function updateParticles(dt){
  for(let i=G.particles.length-1;i>=0;i--){
    const p=G.particles[i];p.life-=dt;p.x+=p.vx*dt;p.y+=p.vy*dt;p.vx*=.96;p.vy*=.96;
    if(p.life<=0)G.particles.splice(i,1);
  }
}
function drawParticles(){
  for(const p of G.particles){X.globalAlpha=clamp(p.life*2,0,1);X.fillStyle=p.c;X.fillRect(p.x,p.y,p.sz,p.sz)}
  X.globalAlpha=1;
}
function drawHUDMessage(){
  if(G.msgT<=0||!G.message)return;
  panel(270,615,740,52,.9);textNoise(G.message,640,648,15,COLORS.ink,"center");
}
function update(dt){
  if(!G.running||G.paused)return;
  G.t+=dt;G.sceneT+=dt;G.msgT=Math.max(0,G.msgT-dt);G.shake=Math.max(0,G.shake-dt*22);G.flash=Math.max(0,G.flash-dt);G.glitch=Math.max(0,G.glitch-dt*.025);
  if(G.scene==="intro2026")updateIntro2026(dt);
  else if(G.scene==="beitou")updateBeitou(dt);
  else if(G.scene==="packs")updatePacks(dt);
  else if(G.scene==="deck")updateDeck(dt);
  else if(G.scene==="ranked")updateRanked(dt);
  else if(G.scene==="return2026")updateReturn2026(dt);
  updateParticles(dt);
  input.press.clear();input.mouse=false;
}
function draw(){
  X.save();
  if(G.shake>0)X.translate(rnd(-G.shake,G.shake),rnd(-G.shake,G.shake));
  if(G.scene==="intro2026")drawIntro2026();
  else if(G.scene==="beitou")drawBeitou();
  else if(G.scene==="packs")drawPacks();
  else if(G.scene==="deck")drawDeck();
  else if(G.scene==="ranked")drawBattle();
  else if(G.scene==="return2026")drawReturn2026();
  drawParticles();drawHUDMessage();
  vignette();glitchPass();
  if(G.flash>0){X.fillStyle=`rgba(255,70,80,${Math.min(.22,G.flash)})`;X.fillRect(0,0,W,H)}
  X.restore();
}
function loop(ts){
  const now=ts/1000,dt=Math.min(.033,G.last?now-G.last:.016);G.last=now;
  update(dt);draw();requestAnimationFrame(loop);
}

function startGame(){
  UI.start.classList.remove("show");UI.ending.classList.remove("show");
  G.running=true;G.paused=false;G.startedAt=performance.now()/1000;G.t=0;G.last=0;
  nextScene("intro2026");msg("LIVE。聊天室人數：2486",2);
}
function togglePause(){
  if(!G.running)return;G.paused=!G.paused;UI.pause.classList.toggle("show",G.paused);
}

window.addEventListener("keydown",e=>{
  if(["ArrowUp","ArrowDown","ArrowLeft","ArrowRight","Space"].includes(e.code))e.preventDefault();
  if(!input.held.has(e.code))input.press.add(e.code);input.held.add(e.code);
  if(e.code==="Escape")togglePause();
});
window.addEventListener("keyup",e=>input.held.delete(e.code));
C.addEventListener("mousemove",e=>{const r=C.getBoundingClientRect();input.mx=(e.clientX-r.left)/r.width*W;input.my=(e.clientY-r.top)/r.height*H});
C.addEventListener("mousedown",e=>{if(e.button===0)input.mouse=true});

document.getElementById("startBtn").onclick=startGame;
document.getElementById("resumeBtn").onclick=togglePause;
document.getElementById("againBtn").onclick=startGame;
document.getElementById("muteBtn").onclick=()=>{mute=!mute;document.getElementById("muteBtn").textContent=`音效：${mute?"關":"開"}`};
document.getElementById("resetBtn").onclick=()=>{if(confirm("清除本機遊戲紀錄？")){localStorage.removeItem(SAVE_KEY);save=loadSave();location.reload()}};

nextScene("intro2026");
draw();
requestAnimationFrame(loop);
})();