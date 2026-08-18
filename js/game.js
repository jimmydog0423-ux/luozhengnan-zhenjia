(() => {
"use strict";

const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");
ctx.imageSmoothingEnabled = false;

const W = 1600, H = 900;
const WORLD_W = 2860, WORLD_H = 1740;
const SAVE_KEY = "luozhengnan_case01_v3";

const UI = {
  title: document.getElementById("titleOverlay"),
  pause: document.getElementById("pauseOverlay"),
  ending: document.getElementById("endingOverlay"),
  endingTitle: document.getElementById("endingTitle"),
  endingText: document.getElementById("endingText"),
  endingStats: document.getElementById("endingStats"),
};

const input = {
  held: new Set(),
  pressed: new Set(),
  mousePressed: false,
  mx: 0, my: 0,
  typed: "",
};

const C = {
  bg:"#08080c", floor:"#19171d", floor2:"#1e1b22", wall:"#3e3944",
  wall2:"#29262d", white:"#eeeaf1", muted:"#99919f", red:"#ff6470",
  cyan:"#60e0dc", gold:"#e6c65c", purple:"#a87ad5", green:"#6cc995",
  orange:"#d89a63", ink:"#0b0a0d", blue:"#708fc9"
};

let audioCtx = null;
function beep(freq=340, duration=.05, type="square", vol=.026){
  try{
    if(!audioCtx) audioCtx = new (window.AudioContext||window.webkitAudioContext)();
    const o=audioCtx.createOscillator(), g=audioCtx.createGain();
    o.type=type; o.frequency.value=freq; g.gain.value=vol;
    o.connect(g); g.connect(audioCtx.destination); o.start(); o.stop(audioCtx.currentTime+duration);
  }catch{}
}

function loadSave(){
  try{
    return Object.assign({
      clears:0, wrongTheories:0, blackoutDeaths:0, bestSeconds:null,
      discovered:[], searchedTerms:[], finalMistakes:0
    }, JSON.parse(localStorage.getItem(SAVE_KEY)||"{}"));
  }catch{
    return {clears:0,wrongTheories:0,blackoutDeaths:0,bestSeconds:null,discovered:[],searchedTerms:[],finalMistakes:0};
  }
}
let save = loadSave();
function persist(){ localStorage.setItem(SAVE_KEY, JSON.stringify(save)); }

const G = {
  running:false, paused:false, mode:"explore",
  time:0, last:0, startedAt:0,
  camX:0, camY:0,
  message:"", messageT:0, prompt:"",
  flash:.0, shake:0, glitch:0,
  dialogue:null, dialogueIndex:0,
  notebookTab:"evidence",
  device:null,
  securityMinute:14, securityFeed:0, securityMarked:[],
  searchInput:"",
  stage:0,
  lightsOn:true,
  flashlight:false,
  blackoutTimer:0,
  watcher:{x:2360,y:730,active:false,targetX:0,targetY:0,repath:0},
  theory:null,
  finalIndex:0, finalHP:3, finalTimer:0, finalMistakes:0,
  hintsUsed:0,
  evidence:new Set(),
  statements:new Set(),
  flags:{
    talkedCrab:false,talkedXue:false,talkedWei:false,
    pcUnlocked:false,officeUnlocked:false,cameraSolved:false,
    clockKnown:false,accessKnown:false,chatShadow:false,
    ventKnown:false,mahjongKnown:false,breakerKnown:false,
    blackoutCleared:false,foundRoger:false
  }
};

const P = {
  x:310,y:1010,r:16,speed:205,faceX:1,faceY:0,
  dash:.0,dashCd:0,inv:0
};

const rooms = [
  {x:110,y:840,w:500,h:640,name:"交誼廳",tone:"#29252c"},
  {x:650,y:870,w:520,h:530,name:"直播間",tone:"#241f2a"},
  {x:1220,y:850,w:470,h:550,name:"練習室",tone:"#22262c"},
  {x:1740,y:850,w:450,h:550,name:"辦公室",tone:"#2b2426"},
  {x:2230,y:850,w:500,h:540,name:"監控室",tone:"#20252a"},
  {x:130,y:180,w:500,h:520,name:"麻將房",tone:"#252925"},
  {x:690,y:180,w:480,h:520,name:"廚房",tone:"#2b2924"},
  {x:1220,y:190,w:470,h:500,name:"儲藏間",tone:"#292524"},
  {x:1730,y:190,w:450,h:510,name:"樓梯間",tone:"#222226"},
  {x:2225,y:180,w:510,h:520,name:"舊錄音室",tone:"#221e27"},
];

const walls = [
  // outer
  {x:60,y:80,w:2740,h:35},{x:60,y:1600,w:2740,h:35},{x:60,y:80,w:35,h:1555},{x:2765,y:80,w:35,h:1555},
  // center horizontal corridor separators
  {x:95,y:760,w:2670,h:28},
  // vertical dividers lower rooms with door gaps
  {x:620,y:840,w:28,h:255},{x:620,y:1200,w:28,h:300},
  {x:1180,y:840,w:28,h:195},{x:1180,y:1140,w:28,h:360},
  {x:1700,y:840,w:28,h:260},{x:1700,y:1205,w:28,h:295},
  {x:2200,y:840,w:28,h:230},{x:2200,y:1170,w:28,h:330},
  // upper dividers
  {x:640,y:150,w:28,h:205},{x:640,y:470,w:28,h:250},
  {x:1180,y:150,w:28,h:250},{x:1180,y:505,w:28,h:215},
  {x:1700,y:150,w:28,h:230},{x:1700,y:485,w:28,h:235},
  {x:2200,y:150,w:28,h:210},{x:2200,y:465,w:28,h:255},
  // furniture obstacles
  {x:240,y:1060,w:245,h:95},{x:760,y:1010,w:280,h:90},{x:1335,y:1050,w:230,h:80},
  {x:1840,y:1010,w:225,h:95},{x:2340,y:1020,w:260,h:100},
  {x:255,y:330,w:250,h:140},{x:790,y:350,w:250,h:110},{x:1325,y:330,w:235,h:120},
];

const NPCS = {
  crab:{id:"crab",name:"蟹老闆",x:390,y:930,color:C.orange,portrait:"crab"},
  xue:{id:"xue",name:"薛西",x:1350,y:950,color:C.green,portrait:"xue"},
  wei:{id:"wei",name:"阿威",x:915,y:555,color:C.blue,portrait:"wei"},
};

const EVIDENCE = {
  obs:{title:"OBS 結束紀錄",desc:"直播軟體顯示最後錄影在 02:18:03 結束。"},
  chat:{title:"聊天室背景影子",desc:"02:17 的聊天室有人提到「後面有人走過去」。"},
  clock:{title:"直播間時鐘偏快",desc:"直播間牆鐘比手機時間快 4 分鐘。"},
  access:{title:"後門刷卡紀錄",desc:"02:21 有『羅正男』的門禁卡刷出紀錄。"},
  badge:{title:"借出的門禁卡",desc:"阿威承認 02:20 左右借過羅正男的卡去拿外送。"},
  mahjong:{title:"麻將桌少一張椅子",desc:"椅子被搬到舊錄音室方向，地上有拖痕。"},
  vent:{title:"服務通道",desc:"儲藏間後方有通往舊錄音室的維修通道。"},
  camera:{title:"監視器時間差",desc:"C3 的時間比其他鏡頭慢 3 分鐘，不能直接比較畫面時間。"},
  audio:{title:"舊錄音室音檔",desc:"02:24 左右留下短暫錄音，能聽見羅正男咳嗽與椅子拖動。"},
  breaker:{title:"跳電紀錄",desc:"02:26 監控室記錄一次異常跳電。"},
};

const HOTSPOTS = [
  {id:"studioPc",x:805,y:970,r:58,label:"直播電腦",kind:"pc"},
  {id:"studioClock",x:1090,y:920,r:50,label:"牆上時鐘",kind:"clock"},
  {id:"mahjong",x:360,y:500,r:72,label:"麻將桌",kind:"mahjong"},
  {id:"storageVent",x:1600,y:600,r:54,label:"牆後異音",kind:"vent"},
  {id:"officeDoor",x:1715,y:1150,r:55,label:"辦公室門",kind:"officeDoor"},
  {id:"officeTerminal",x:1980,y:990,r:55,label:"門禁終端",kind:"officePc"},
  {id:"securityConsole",x:2490,y:990,r:70,label:"監視器主控",kind:"camera"},
  {id:"breaker",x:2680,y:1280,r:58,label:"配電箱",kind:"breaker"},
  {id:"oldStudio",x:2460,y:520,r:90,label:"舊錄音室",kind:"oldStudio"},
  {id:"whiteboard",x:1525,y:920,r:65,label:"案件白板",kind:"theory"},
];

const dialogues = {
  crab1:[
    {speaker:"蟹老闆",side:"left",portrait:"crab",text:"羅正男人勒？兩點十分還說等等會來錄，現在整間宿舍找不到。"},
    {speaker:"你",side:"right",portrait:"player",text:"最後確定看到他是幾點？"},
    {speaker:"蟹老闆",side:"left",portrait:"crab",text:"我記得 02:10 左右。他在直播間。後來有人說後門看到他的卡刷出去。"},
    {speaker:"蟹老闆",side:"left",portrait:"crab",text:"先別急著下結論。這裡每台設備的時間都不一定一樣。"},
  ],
  xue1:[
    {speaker:"薛西",side:"right",portrait:"xue",text:"我 02:16 還有聽到他在隔壁碎念，照理說人還在宿舍。"},
    {speaker:"你",side:"left",portrait:"player",text:"你有看到本人嗎？"},
    {speaker:"薛西",side:"right",portrait:"xue",text:"沒有。只聽聲音。你要查就去看直播間電腦，聊天室比人誠實一點……大概。"},
  ],
  wei1:[
    {speaker:"阿威",side:"right",portrait:"wei",text:"我只知道後門 02:21 有刷卡。不要看我，我那時候在廚房。"},
    {speaker:"你",side:"left",portrait:"player",text:"你的時間很準？"},
    {speaker:"阿威",side:"right",portrait:"wei",text:"手機準。牆上的不準。啊，門禁卡那件事……你先自己查。"},
  ],
  weiBadge:[
    {speaker:"你",side:"left",portrait:"player",text:"後門刷卡的人不是羅正男，對吧？"},
    {speaker:"阿威",side:"right",portrait:"wei",text:"……好啦。我 02:20 左右借他的卡去後門拿外送。"},
    {speaker:"阿威",side:"right",portrait:"wei",text:"我以為五分鐘就回來，懶得登記。你不要跟蟹老闆講得太用力。"},
  ],
  rogerEnd:[
    {speaker:"羅正男",side:"right",portrait:"roger",text:"你們是在找我喔？"},
    {speaker:"你",side:"left",portrait:"player",text:"整間宿舍都以為你跑了。"},
    {speaker:"羅正男",side:"right",portrait:"roger",text:"真假。我只是來舊錄音室躲一下，結果門卡住，手機又沒電。"},
    {speaker:"羅正男",side:"right",portrait:"roger",text:"啊你不要跟蟹老闆說我有先搬椅子。"},
    {speaker:"蟹老闆",side:"left",portrait:"crab",text:"我就在外面。"},
  ]
};

function clamp(v,a,b){return Math.max(a,Math.min(b,v))}
function dist(ax,ay,bx,by){return Math.hypot(ax-bx,ay-by)}
function circleRect(cx,cy,cr,r){
  const nx=clamp(cx,r.x,r.x+r.w), ny=clamp(cy,r.y,r.y+r.h);
  const dx=cx-nx,dy=cy-ny; return dx*dx+dy*dy<cr*cr;
}
function say(text,t=2){G.message=text;G.messageT=t}
function addEvidence(id){
  if(G.evidence.has(id)) return;
  G.evidence.add(id);
  if(!save.discovered.includes(id))save.discovered.push(id);
  persist();
  const e=EVIDENCE[id]; if(e){say(`取得線索：${e.title}`,2.3);beep(620,.07,"square",.03)}
}
function setMode(m){G.mode=m;input.typed=""}

function startDialogue(lines,onDone=null){
  G.dialogue={lines,onDone};G.dialogueIndex=0;setMode("dialogue");beep(300,.04);
}
function advanceDialogue(){
  if(!G.dialogue)return;
  G.dialogueIndex++;
  if(G.dialogueIndex>=G.dialogue.lines.length){
    const cb=G.dialogue.onDone;G.dialogue=null;setMode("explore");if(cb)cb();
  }else beep(360,.025);
}

function playerMove(dt){
  let dx=(input.held.has("KeyD")||input.held.has("ArrowRight")?1:0)-(input.held.has("KeyA")||input.held.has("ArrowLeft")?1:0);
  let dy=(input.held.has("KeyS")||input.held.has("ArrowDown")?1:0)-(input.held.has("KeyW")||input.held.has("ArrowUp")?1:0);
  if(dx||dy){const l=Math.hypot(dx,dy);dx/=l;dy/=l;P.faceX=dx;P.faceY=dy}
  P.dashCd=Math.max(0,P.dashCd-dt);
  if((input.pressed.has("ShiftLeft")||input.pressed.has("ShiftRight"))&&P.dashCd<=0){P.dash=.14;P.dashCd=.55;beep(220,.035)}
  P.dash=Math.max(0,P.dash-dt);
  const sp=P.dash>0?365:P.speed;
  const ox=P.x,oy=P.y;
  P.x+=dx*sp*dt;
  for(const w of walls)if(circleRect(P.x,P.y,P.r,w)){P.x=ox;break}
  P.y+=dy*sp*dt;
  for(const w of walls)if(circleRect(P.x,P.y,P.r,w)){P.y=oy;break}
  P.x=clamp(P.x,80,WORLD_W-80);P.y=clamp(P.y,100,WORLD_H-100);

  if(!G.lightsOn && G.watcher.active) updateWatcher(dt);
  updateCamera(dt);
}

function updateCamera(dt){
  const tx=clamp(P.x-W/2,0,WORLD_W-W),ty=clamp(P.y-H/2,0,WORLD_H-H);
  G.camX+=(tx-G.camX)*Math.min(1,dt*5.3);G.camY+=(ty-G.camY)*Math.min(1,dt*5.3);
}

function updateWatcher(dt){
  const w=G.watcher;
  const d=dist(w.x,w.y,P.x,P.y);
  const canSee=G.flashlight && d<650;
  const speed=canSee?190:110;
  w.repath-=dt;
  if(w.repath<=0){
    w.repath=canSee?.28:.75;
    if(canSee){w.targetX=P.x;w.targetY=P.y}
    else{w.targetX=clamp(P.x+rnd(-320,320),100,WORLD_W-100);w.targetY=clamp(P.y+rnd(-260,260),100,WORLD_H-100)}
  }
  const dx=w.targetX-w.x,dy=w.targetY-w.y,l=Math.hypot(dx,dy)||1;
  w.x+=dx/l*speed*dt;w.y+=dy/l*speed*dt;
  if(dist(w.x,w.y,P.x,P.y)<34){
    save.blackoutDeaths++;persist();
    say("黑暗裡的東西碰到了你。",1.3);
    G.shake=16;G.flash=.5;beep(70,.25,"sawtooth",.06);
    P.x=2120;P.y=1320;w.x=2520;w.y=620;G.flashlight=false;
  }
}

function nearestInteractable(){
  let best=null,bd=82;
  for(const n of Object.values(NPCS)){
    const d=dist(P.x,P.y,n.x,n.y);if(d<bd){bd=d;best={type:"npc",obj:n}}
  }
  for(const h of HOTSPOTS){
    const d=dist(P.x,P.y,h.x,h.y);if(d<Math.max(bd,h.r)){if(d<h.r){bd=d;best={type:"hotspot",obj:h}}}
  }
  return best;
}

function interact(){
  const near=nearestInteractable();
  if(!near){say("這裡沒有值得調查的東西。",1);return}
  if(near.type==="npc"){
    const n=near.obj;
    if(n.id==="crab"){
      if(!G.flags.talkedCrab){G.flags.talkedCrab=true;G.statements.add("crab_0210");startDialogue(dialogues.crab1)}
      else startDialogue([{speaker:"蟹老闆",side:"left",portrait:"crab",text:"不要只聽人講。時間、門禁、影像自己對。"}]);
    }
    if(n.id==="xue"){
      if(!G.flags.talkedXue){G.flags.talkedXue=true;G.statements.add("xue_voice");startDialogue(dialogues.xue1)}
      else startDialogue([{speaker:"薛西",side:"right",portrait:"xue",text:"你如果看到 02:17 的聊天室，記得看背景，不要只看字。"}]);
    }
    if(n.id==="wei"){
      if(G.evidence.has("access")&&G.evidence.has("clock")&&!G.evidence.has("badge")){
        startDialogue(dialogues.weiBadge,()=>addEvidence("badge"));
      }else if(!G.flags.talkedWei){G.flags.talkedWei=true;G.statements.add("wei_kitchen");startDialogue(dialogues.wei1)}
      else startDialogue([{speaker:"阿威",side:"right",portrait:"wei",text:"我真的沒看到他出去。刷卡紀錄不等於人。"}]);
    }
    return;
  }
  const h=near.obj;
  switch(h.kind){
    case "pc": openStudioPC();break;
    case "clock":
      if(!G.evidence.has("clock")){
        G.flags.clockKnown=true;addEvidence("clock");
        startDialogue([
          {speaker:"你",side:"left",portrait:"player",text:"牆鐘顯示 02:21，手機是 02:17。快了四分鐘。"},
          {speaker:"你",side:"left",portrait:"player",text:"如果有人用牆鐘回憶時間，證詞可能整段偏移。"}
        ]);
      }else say("牆鐘固定快四分鐘。",1.3);
      break;
    case "mahjong":
      if(!G.evidence.has("mahjong")){
        G.flags.mahjongKnown=true;addEvidence("mahjong");
        startDialogue([{speaker:"你",side:"left",portrait:"player",text:"四人桌只剩三張椅子。地板有一路拖向北側走廊的痕跡。"}]);
      }else say("椅腳拖痕往北側延伸。",1);
      break;
    case "vent":
      if(!G.evidence.has("vent")){
        if(G.evidence.has("mahjong")||G.evidence.has("camera")){
          G.flags.ventKnown=true;addEvidence("vent");
          startDialogue([{speaker:"你",side:"left",portrait:"player",text:"牆板後面是維修通道。方向正好通往舊錄音室。"}]);
        }else say("牆後有風聲，但你還不知道為什麼要在意。",1.4);
      }else say("服務通道太窄，人過不去，但可以傳聲。",1);
      break;
    case "officeDoor":
      if(G.flags.officeUnlocked){P.x=1765;say("辦公室已解鎖。",1)}
      else{
        if(G.evidence.has("clock")&&G.evidence.has("chat")) openKeypad();
        else say("四位數密碼。旁邊貼著：『用真正的時間，不要用牆上的。』",2);
      }
      break;
    case "officePc":
      if(!G.flags.officeUnlocked){say("門鎖著，進不去。",1)}
      else openOfficePC();
      break;
    case "camera":
      if(!G.flags.officeUnlocked){say("監控室需要辦公室權限才能啟用主控。",1.4)}
      else openSecurity();
      break;
    case "breaker":
      if(G.lightsOn){say("配電箱目前正常。",1)}
      else{
        if(G.flags.cameraSolved){
          G.lightsOn=true;G.watcher.active=false;G.flags.blackoutCleared=true;addEvidence("breaker");
          say("你重新接上備援電源。黑暗中的腳步聲停了。",2.4);
        }else say("你不知道哪一路該先接。監控主控裡可能有跳電紀錄。",2);
      }
      break;
    case "oldStudio":
      if(!G.flags.blackoutCleared){say("門後沒有反應。你需要先恢復電力。",1.5)}
      else if(!(G.evidence.has("audio")&&G.evidence.has("vent")&&G.evidence.has("badge")&&G.evidence.has("camera"))){
        const missing=[];
        if(!G.evidence.has("audio"))missing.push("能證明裡面有人的資料");
        if(!G.evidence.has("vent"))missing.push("聲音如何傳出去");
        if(!G.evidence.has("badge"))missing.push("後門刷卡者的身分");
        if(!G.evidence.has("camera"))missing.push("監視器時間差");
        say("你還不能收束案件。缺少："+missing.join("、")+"。",2.6)
      }
      else{
        G.flags.foundRoger=true;
        startDialogue(dialogues.rogerEnd,()=>startFinal());
      }
      break;
    case "theory": openTheory();break;
  }
}

function openStudioPC(){
  G.device={type:"studio",screen:"home"};G.searchInput="";setMode("device");
}
function openOfficePC(){G.device={type:"office",screen:"access"};setMode("device")}
function openKeypad(){G.device={type:"keypad",code:""};setMode("device")}
function openSecurity(){G.device={type:"security"};G.securityMinute=14;G.securityFeed=0;setMode("device")}

function searchChat(term){
  term=term.trim();
  if(!term)return;
  if(!save.searchedTerms.includes(term))save.searchedTerms.push(term);
  persist();
  if(term.includes("02:17")||term.includes("0217")||term.includes("後面")||term.includes("影子")){
    addEvidence("chat");G.flags.chatShadow=true;
    G.device.screen="searchResult";
  }else if(term.includes("羅正男")||term.includes("Roger")){
    G.device.screen="manyResults";
  }else G.device.screen="noResult";
}

function handleDeviceKey(e){
  if(!G.device)return;
  const d=G.device;
  if(e.code==="Escape"){setMode("explore");G.device=null;return}
  if(d.type==="keypad"){
    if(/^Digit[0-9]$/.test(e.code)||/^Numpad[0-9]$/.test(e.code)){
      const n=e.code.replace("Digit","").replace("Numpad","");if(d.code.length<4)d.code+=n;beep(420,.03);
    }
    if(e.code==="Backspace")d.code=d.code.slice(0,-1);
    if(e.code==="Enter"){
      if(d.code==="0217"){
        G.flags.officeUnlocked=true;setMode("explore");G.device=null;say("辦公室門鎖解除。",2);beep(730,.1);
      }else{d.code="";G.shake=6;beep(100,.1,"sawtooth");say("密碼錯誤。",1)}
    }
    return;
  }
  if(d.type==="studio"){
    if(d.screen==="home"){
      if(e.code==="Digit1"){addEvidence("obs");d.screen="obs"}
      if(e.code==="Digit2"){d.screen="chatSearch";G.searchInput=""}
    }else if(d.screen==="chatSearch"){
      if(e.code==="Enter")searchChat(G.searchInput);
      else if(e.code==="Backspace")G.searchInput=G.searchInput.slice(0,-1);
      else if(e.key&&e.key.length===1&&G.searchInput.length<20)G.searchInput+=e.key;
    }else if(e.code==="Backspace"){d.screen="home"}
    return;
  }
  if(d.type==="office"){
    if(e.code==="Digit1"){addEvidence("access");G.flags.accessKnown=true}
    if(e.code==="Digit2"){
      addEvidence("audio");
      if(G.lightsOn){
        G.lightsOn=false;G.watcher.active=true;G.watcher.x=2550;G.watcher.y=520;
        setMode("explore");G.device=null;G.flashlight=false;
        say("整棟宿舍跳電。你聽見北側走廊有腳步。F 可以開手電筒。",3);
        beep(55,.35,"sawtooth",.07);G.flash=.6;G.glitch=.5;
      }
    }
    return;
  }
  if(d.type==="security"){
    if(e.code==="ArrowLeft")G.securityMinute=clamp(G.securityMinute-1,14,24);
    if(e.code==="ArrowRight")G.securityMinute=clamp(G.securityMinute+1,14,24);
    if(/^Digit[1-4]$/.test(e.code))G.securityFeed=parseInt(e.code.slice(-1))-1;
    if(e.code==="Space"){
      const key=`${G.securityFeed}:${G.securityMinute}`;
      if(!G.securityMarked.includes(key))G.securityMarked.push(key);
      beep(520,.04);
      // correct observations: feed1 minute17 shadow, feed2 minute21 card runner, feed3 minute18 offset marker
      const required=["0:17","1:21","2:18"];
      if(required.every(k=>G.securityMarked.includes(k))){
        G.flags.cameraSolved=true;addEvidence("camera");say("你標出了三段不能直接用同一時間比較的畫面。",2.2);
      }
    }
  }
}

function openTheory(){
  G.theory={step:0,answers:[]};setMode("theory");
}
const THEORY_Q = [
  {q:"後門 02:21 的刷卡紀錄能直接證明羅正男離開宿舍嗎？",opts:["能，卡就是本人","不能，卡可能被別人使用","不能，因為後門不存在"],correct:1},
  {q:"哪一個時間最值得當作統一基準？",opts:["直播間牆鐘","手機／系統紀錄","每個人自己的記憶"],correct:1},
  {q:"目前最合理的方向？",opts:["羅正男已經離開宿舍","羅正男仍可能在北側區域","所有人都在說謊"],correct:1},
];

function handleTheoryChoice(n){
  const q=THEORY_Q[G.theory.step];
  G.theory.answers.push(n);
  if(n!==q.correct){
    save.wrongTheories++;persist();G.shake=8;beep(90,.12,"sawtooth");
    say("推理可以成立一部分，但會把你帶到錯的方向。你浪費了幾分鐘。",2.3);
  }else beep(620,.05);
  G.theory.step++;
  if(G.theory.step>=THEORY_Q.length){
    const ok=G.theory.answers.every((a,i)=>a===THEORY_Q[i].correct);
    if(ok){
      say("推理成立：『刷卡的人未必是羅正男；他可能仍在宿舍北側。』",3);
      if(G.evidence.has("access")&&G.evidence.has("clock")&&!G.evidence.has("badge"))say("現在再去問阿威一次。",2.8);
    }
    setMode("explore");G.theory=null;
  }
}

function updateExplore(dt){
  playerMove(dt);
  if(input.pressed.has("KeyE"))interact();
  if(input.pressed.has("KeyQ"))setMode("notebook");
  if(input.pressed.has("KeyF")&&!G.lightsOn){G.flashlight=!G.flashlight;beep(G.flashlight?700:180,.035)}
  G.prompt="";
  const near=nearestInteractable();
  if(near)G.prompt=`E  ${near.obj.name||near.obj.label}`;
}

function startFinal(){
  G.finalIndex=0;G.finalHP=3;G.finalTimer=22;G.finalMistakes=0;setMode("final");
}
const FINAL_ITEMS = [
  {s:"02:21 後門刷卡＝羅正男本人離開",cat:2,why:"門禁卡被阿威借走，刷卡不等於本人。"},
  {s:"薛西 02:16 聽到羅正男聲音",cat:1,why:"是證詞，沒有目擊，只能證明聲音來源。"},
  {s:"直播間牆鐘比手機快四分鐘",cat:0,why:"你親自比對過時間。"},
  {s:"舊錄音室 02:24 有羅正男咳嗽聲",cat:0,why:"系統音檔可重播驗證。"},
  {s:"羅正男一定跑去打麻將",cat:3,why:"麻將桌只有椅子拖痕，沒有足夠證據。"},
  {s:"監視器所有鏡頭時間完全同步",cat:2,why:"C3 慢三分鐘。"},
  {s:"阿威說自己一直在廚房",cat:1,why:"這是當事人說法；門禁資料顯示他至少去過後門。"},
  {s:"服務通道能把舊錄音室聲音傳到練習室",cat:0,why:"你在儲藏間確認了通道。"},
];
const CAT_LABEL=["已驗證","人物證詞","被證據否定","目前無法確認"];

function updateFinal(dt){
  G.finalTimer-=dt;
  if(G.finalTimer<=0){G.finalHP--;G.finalTimer=18;G.finalMistakes++;beep(80,.12,"sawtooth");if(G.finalHP<=0)restartFinal()}
  for(let i=0;i<4;i++)if(input.pressed.has(`Digit${i+1}`)){
    const item=FINAL_ITEMS[G.finalIndex];
    if(i===item.cat){
      beep(650,.05);G.finalIndex++;G.finalTimer=Math.max(10,G.finalTimer+3);
      if(G.finalIndex>=FINAL_ITEMS.length)finishCase();
    }else{
      G.finalHP--;G.finalMistakes++;G.shake=10;beep(85,.1,"sawtooth");
      say(item.why,2);
      if(G.finalHP<=0)restartFinal();
    }
  }
}
function restartFinal(){
  save.finalMistakes+=G.finalMistakes;persist();G.finalIndex=0;G.finalHP=3;G.finalTimer=22;G.finalMistakes=0;say("資訊被混在一起了。重新分類。",2.2)
}
function finishCase(){
  const sec=Math.floor(performance.now()/1000-G.startedAt);
  save.clears++;save.finalMistakes+=G.finalMistakes;
  if(save.bestSeconds==null||sec<save.bestSeconds)save.bestSeconds=sec;
  persist();G.running=false;
  UI.endingTitle.textContent="案件暫時解體。";
  UI.endingText.textContent="羅正男沒有消失。真正讓所有人判斷錯誤的，是不同步的時間、借出去的門禁卡，以及每個人只記得自己看到的那一小段。";
  UI.endingStats.innerHTML=[
    ["找到線索",`${G.evidence.size}/10`],
    ["錯誤推理",String(save.wrongTheories)],
    ["黑暗失手",String(save.blackoutDeaths)]
  ].map(([a,b])=>`<div class="stat">${a}<b>${b}</b></div>`).join("");
  UI.ending.classList.add("show");
}

function update(dt){
  if(!G.running||G.paused)return;
  G.time+=dt;G.messageT=Math.max(0,G.messageT-dt);G.shake=Math.max(0,G.shake-dt*26);G.flash=Math.max(0,G.flash-dt);G.glitch=Math.max(0,G.glitch-dt*.08);
  if(G.mode==="explore")updateExplore(dt);
  else if(G.mode==="final")updateFinal(dt);
  input.pressed.clear();input.mousePressed=false;
}

function panel(x,y,w,h,a=.9){
  ctx.fillStyle=`rgba(10,8,13,${a})`;ctx.fillRect(x,y,w,h);
  ctx.strokeStyle="#45394e";ctx.lineWidth=2;ctx.strokeRect(x+1,y+1,w-2,h-2);
}
function txt(s,x,y,size=18,color=C.white,align="left",weight=700){
  ctx.font=`${weight} ${size}px "Microsoft JhengHei",sans-serif`;ctx.textAlign=align;ctx.fillStyle=color;ctx.fillText(s,x,y);
}
function wrap(s,x,y,maxW,lineH,size=18,color=C.white,align="left",weight=600){
  ctx.font=`${weight} ${size}px "Microsoft JhengHei",sans-serif`;ctx.textAlign=align;ctx.fillStyle=color;
  let line="",yy=y;
  for(const ch of s){
    const t=line+ch;
    if(ctx.measureText(t).width>maxW){ctx.fillText(line,x,yy);line=ch;yy+=lineH}else line=t;
  }
  if(line)ctx.fillText(line,x,yy);
}
function drawWorld(){
  ctx.fillStyle=C.bg;ctx.fillRect(0,0,W,H);
  ctx.save();ctx.translate(-G.camX,-G.camY);

  ctx.fillStyle="#111015";ctx.fillRect(60,80,2740,1555);

  for(const r of rooms){
    ctx.fillStyle=r.tone;ctx.fillRect(r.x,r.y,r.w,r.h);
    ctx.strokeStyle="#4a4550";ctx.lineWidth=3;ctx.strokeRect(r.x,r.y,r.w,r.h);
    txt(r.name,r.x+18,r.y+32,14,"#716a76");
    // tile details
    ctx.globalAlpha=.16;
    for(let yy=r.y+52;yy<r.y+r.h-15;yy+=48){
      ctx.fillStyle=((yy/48)%2)?"#fff":"#000";ctx.fillRect(r.x+8,yy,r.w-16,1);
    }
    ctx.globalAlpha=1;
  }

  // corridor
  ctx.fillStyle="#15141a";ctx.fillRect(95,788,2670,45);
  for(let x=120;x<2740;x+=100){ctx.fillStyle=x%200===0?"#232027":"#1c1a20";ctx.fillRect(x,797,58,7)}

  for(const w of walls){
    ctx.fillStyle=C.wall2;ctx.fillRect(w.x,w.y,w.w,w.h);
    ctx.fillStyle=C.wall;ctx.fillRect(w.x,w.y,Math.min(w.w,7),w.h);
  }

  drawFurniture();
  drawHotspots();
  for(const n of Object.values(NPCS))drawNPC(n);
  if(!G.lightsOn&&G.watcher.active)drawWatcher();
  drawPlayer();
  drawLighting();

  ctx.restore();
  drawTopHUD();
}
function drawFurniture(){
  // lounge couch
  ctx.fillStyle="#4a3d49";ctx.fillRect(240,1060,245,95);ctx.fillStyle="#665063";ctx.fillRect(252,1072,221,27);
  // studio desk / monitors
  ctx.fillStyle="#4b3b45";ctx.fillRect(760,1010,280,90);
  ctx.fillStyle="#10151a";ctx.fillRect(792,930,94,72);ctx.fillRect(902,930,94,72);
  ctx.strokeStyle=C.purple;ctx.strokeRect(792,930,94,72);ctx.strokeStyle=C.cyan;ctx.strokeRect(902,930,94,72);
  // practice PCs
  ctx.fillStyle="#383c44";ctx.fillRect(1335,1050,230,80);
  for(let i=0;i<3;i++){ctx.fillStyle="#0d1117";ctx.fillRect(1352+i*68,985,54,58);ctx.strokeStyle="#516379";ctx.strokeRect(1352+i*68,985,54,58)}
  // office
  ctx.fillStyle="#56434a";ctx.fillRect(1840,1010,225,95);ctx.fillStyle="#111318";ctx.fillRect(1880,935,120,70);
  // security console
  ctx.fillStyle="#394148";ctx.fillRect(2340,1020,260,100);
  for(let i=0;i<4;i++){ctx.fillStyle="#0b1014";ctx.fillRect(2360+(i%2)*110,930+Math.floor(i/2)*66,95,52);ctx.strokeStyle="#445b68";ctx.strokeRect(2360+(i%2)*110,930+Math.floor(i/2)*66,95,52)}
  // mahjong table + 3 chairs
  ctx.fillStyle="#315243";ctx.fillRect(255,330,250,140);ctx.strokeStyle="#72947f";ctx.strokeRect(265,340,230,120);
  ctx.fillStyle="#55484f";ctx.fillRect(205,365,38,70);ctx.fillRect(515,365,38,70);ctx.fillRect(360,475,70,38);
  // kitchen
  ctx.fillStyle="#565047";ctx.fillRect(790,350,250,110);ctx.fillStyle="#24272c";ctx.fillRect(815,375,60,55);ctx.fillRect(900,375,60,55);
  // storage boxes
  ctx.fillStyle="#53483d";for(let i=0;i<4;i++)ctx.fillRect(1325+(i%2)*120,330+Math.floor(i/2)*125,105,105);
  // old studio chair hint
  ctx.fillStyle="#51444f";ctx.fillRect(2450,470,58,70);ctx.fillRect(2435,535,88,16);
}
function drawHotspots(){
  for(const h of HOTSPOTS){
    const near=dist(P.x,P.y,h.x,h.y)<h.r;
    if(near){
      ctx.strokeStyle=C.gold;ctx.lineWidth=2;ctx.beginPath();ctx.arc(h.x,h.y,28+Math.sin(G.time*5)*3,0,Math.PI*2);ctx.stroke();
    }
  }
}
function drawNPC(n){
  ctx.save();ctx.translate(n.x,n.y);
  ctx.fillStyle="rgba(0,0,0,.3)";ctx.fillRect(-18,20,36,8);
  ctx.fillStyle=n.color;ctx.fillRect(-15,-24,30,40);
  ctx.fillStyle="#d6a98d";ctx.fillRect(-11,-43,22,20);
  ctx.fillStyle="#16131a";ctx.fillRect(-12,-47,24,8);
  ctx.fillStyle="#ddd";ctx.fillRect(3,-37,4,3);
  ctx.restore();
}
function drawPlayer(){
  ctx.save();ctx.translate(P.x,P.y);
  ctx.fillStyle="rgba(0,0,0,.32)";ctx.fillRect(-20,20,40,8);
  ctx.fillStyle="#3e6c7c";ctx.fillRect(-15,-22,30,40);
  ctx.fillStyle="#d6aa90";ctx.fillRect(-11,-42,22,20);
  ctx.fillStyle="#17141a";ctx.fillRect(-12,-47,24,9);
  ctx.fillStyle=C.cyan;ctx.fillRect(P.faceX>=0?4:-8,-36,4,3);
  ctx.restore();
}
function drawWatcher(){
  const w=G.watcher;
  ctx.save();ctx.translate(w.x,w.y);ctx.globalAlpha=.64;
  ctx.fillStyle="#09090c";ctx.beginPath();ctx.ellipse(0,0,24,50,0,0,Math.PI*2);ctx.fill();
  ctx.fillStyle=C.red;ctx.fillRect(-7,-18,4,4);ctx.fillRect(5,-18,4,4);
  ctx.restore();
}
function drawLighting(){
  if(G.lightsOn)return;
  ctx.save();
  ctx.fillStyle="rgba(0,0,0,.88)";ctx.fillRect(G.camX,G.camY,W,H);
  const px=P.x,py=P.y;
  ctx.globalCompositeOperation="destination-out";
  const radius=G.flashlight?420:95;
  const grad=ctx.createRadialGradient(px,py,20,px,py,radius);
  grad.addColorStop(0,"rgba(0,0,0,1)");grad.addColorStop(1,"rgba(0,0,0,0)");
  ctx.fillStyle=grad;ctx.beginPath();ctx.arc(px,py,radius,0,Math.PI*2);ctx.fill();
  ctx.restore();
}
function drawTopHUD(){
  panel(22,20,430,76,.78);
  txt("CASE 01　宿舍失蹤事件",40,49,16,C.white);
  txt(`線索 ${G.evidence.size}/10　　Q 案件筆記`,40,78,13,C.muted);
  if(!G.lightsOn)txt(`F 手電筒：${G.flashlight?"開":"關"}`,300,78,13,G.flashlight?C.cyan:C.red);
  if(G.prompt){panel(W/2-180,H-78,360,44,.84);txt(G.prompt,W/2,H-49,14,C.gold,"center")}
  if(G.messageT>0){panel(390,H-148,820,58,.92);wrap(G.message,800,H-113,760,22,15,C.white,"center",700)}
}

function drawPortrait(kind,x,y,scale=1,flip=false,active=true){
  ctx.save();ctx.translate(x,y);if(flip)ctx.scale(-1,1);ctx.scale(scale,scale);ctx.globalAlpha=active?1:.42;
  let coat="#496d7c",accent=C.cyan,hair="#18141a",skin="#d5a78c";
  if(kind==="crab"){coat="#8b5a3e";accent=C.orange}
  if(kind==="xue"){coat="#496e54";accent=C.green}
  if(kind==="wei"){coat="#526b8c";accent=C.blue}
  if(kind==="roger"){coat="#a64542";accent=C.red}
  if(kind==="player"){coat="#496d7c";accent=C.cyan}
  // torso
  ctx.fillStyle=coat;ctx.fillRect(-115,-40,230,270);
  ctx.fillStyle="#ded7ce";ctx.fillRect(-40,-30,80,245);
  ctx.fillStyle=accent;ctx.fillRect(-115,190,230,18);
  // neck/head
  ctx.fillStyle=skin;ctx.fillRect(-38,-105,76,78);ctx.fillRect(-92,-250,184,155);
  // ears
  ctx.fillRect(-108,-205,25,54);ctx.fillRect(83,-205,25,54);
  // hair silhouettes
  ctx.fillStyle=hair;
  if(kind==="roger"){
    ctx.fillRect(-98,-270,196,48);ctx.fillRect(-92,-245,44,58);ctx.fillRect(52,-252,45,45);ctx.fillRect(-45,-285,110,30);
  }else if(kind==="crab"){
    ctx.fillRect(-100,-270,200,46);ctx.fillRect(-98,-245,36,55);ctx.fillRect(62,-245,36,55);
  }else{
    ctx.fillRect(-98,-272,196,52);ctx.fillRect(-96,-244,34,48);ctx.fillRect(64,-246,34,46);
  }
  // face
  ctx.fillStyle="#60453e";ctx.fillRect(-45,-190,18,8);ctx.fillRect(30,-190,18,8);
  ctx.fillStyle=active?accent:"#5f5962";ctx.fillRect(34,-188,8,5);
  ctx.fillStyle="#7b5048";ctx.fillRect(-18,-135,38,7);
  // expression mark
  if(kind==="crab"){ctx.fillStyle="#3b2a26";ctx.fillRect(-52,-208,38,6);ctx.fillRect(16,-208,38,6)}
  if(kind==="xue"){ctx.fillStyle="#3b2a26";ctx.fillRect(-52,-210,36,5)}
  ctx.restore();
}

function drawDialogue(){
  drawWorld();
  ctx.fillStyle="rgba(7,6,10,.48)";ctx.fillRect(0,0,W,H);
  const line=G.dialogue.lines[G.dialogueIndex];
  const leftActive=line.side==="left";
  const other=(G.dialogue.lines.find(v=>v.portrait!=="player")||{portrait:"crab"}).portrait;
  let leftKind="player", rightKind=other;
  if(line.speaker==="你"){
    if(line.side==="right"){leftKind=other;rightKind="player"}
    else{leftKind="player";rightKind=other}
  }else{
    if(line.side==="left"){leftKind=line.portrait;rightKind="player"}
    else{leftKind="player";rightKind=line.portrait}
  }
  drawPortrait(leftKind,250,595,1.15,false,leftActive);
  drawPortrait(rightKind,1350,595,1.15,true,!leftActive);
  panel(80,620,1440,235,.97);
  txt(line.speaker,125,668,24,line.side==="left"?C.cyan:C.gold);
  wrap(line.text,125,720,1340,38,25,C.white,"left",700);
  txt("SPACE / ENTER",1460,825,12,C.muted,"right");
}

function drawNotebook(){
  drawWorld();
  ctx.fillStyle="rgba(5,4,8,.82)";ctx.fillRect(0,0,W,H);
  panel(110,70,1380,760,.97);
  txt("案件筆記",160,125,30,C.white);
  txt("Q / ESC 關閉",1430,122,13,C.muted,"right");
  txt("目前不是任務清單。這裡只記錄你已經找到的資料。",160,160,13,C.muted);

  let y=210;
  const ids=[...G.evidence];
  if(ids.length===0){txt("尚無可用線索。",160,y,18,C.muted);return}
  for(const id of ids){
    const e=EVIDENCE[id];
    ctx.fillStyle="#17131c";ctx.fillRect(150,y-28,1300,70);
    ctx.strokeStyle="#3f3548";ctx.strokeRect(150,y-28,1300,70);
    txt(e.title,175,y,18,C.gold);
    wrap(e.desc,430,y,980,22,14,"#b7aebd");
    y+=86;if(y>760)break;
  }
}

function drawDevice(){
  drawWorld();ctx.fillStyle="rgba(4,4,6,.74)";ctx.fillRect(0,0,W,H);
  const d=G.device;
  if(d.type==="keypad"){
    panel(560,250,480,390,.98);txt("OFFICE ACCESS",800,310,18,C.red,"center");
    txt(d.code.padEnd(4,"_"),800,405,54,C.white,"center");
    txt("提示：用真正的時間，不要用牆上的。",800,490,15,C.muted,"center");
    txt("數字鍵輸入 / ENTER 確認 / ESC 返回",800,585,13,C.muted,"center");
    return;
  }
  if(d.type==="studio"){
    panel(140,80,1320,740,.98);txt("直播間工作站",190,130,25,C.purple);
    if(d.screen==="home"){
      txt("1　OBS / 錄影紀錄",210,220,22,C.white);
      txt("2　聊天室搜尋",210,270,22,C.white);
      txt("ESC　離開",210,320,18,C.muted);
    }else if(d.screen==="obs"){
      txt("OBS SESSION LOG",190,190,16,C.cyan);
      const logs=["02:02:11　開始錄影","02:11:40　音訊裝置重新連線","02:18:03　錄影結束","02:18:05　程序仍在背景執行"];
      logs.forEach((s,i)=>txt(s,220,250+i*58,19,i===2?C.gold:"#c7c0cc"));
      txt("BACKSPACE 返回",220,560,13,C.muted);
    }else if(d.screen==="chatSearch"){
      txt("CHAT ARCHIVE SEARCH",190,190,16,C.cyan);
      panel(200,230,1150,62,.8);txt(G.searchInput||"輸入關鍵字，例如時間、動作或人物…",225,270,20,G.searchInput?C.white:"#706877");
      txt("ENTER 搜尋　BACKSPACE 刪除　ESC 離開",220,345,13,C.muted);
    }else if(d.screen==="searchResult"){
      txt("搜尋結果",190,190,18,C.cyan);
      const lines=[
        "02:16:48　[免費仔] 他是不是還在碎念",
        "02:17:12　[老傑寶] 後面剛有人走過去？",
        "02:17:19　[剪輯師] 不是羅正男吧 那影子比較高",
        "02:18:03　[系統] 直播中斷"
      ];
      lines.forEach((s,i)=>txt(s,220,245+i*58,18,i===1?C.gold:"#c7c0cc"));
    }else if(d.screen==="manyResults"){
      txt("搜尋結果 1264 筆",190,190,18,C.red);txt("名稱幾乎沒有辨識力。你需要搜尋時間或具體事件。",220,250,19,C.muted);
    }else{
      txt("沒有精確結果。",190,190,18,C.red);txt("聊天室不是資料庫魔法；換個更具體的關鍵字。",220,250,19,C.muted);
    }
    return;
  }
  if(d.type==="office"){
    panel(180,90,1240,720,.98);txt("辦公室內網",230,140,25,C.orange);
    txt("1　門禁進出紀錄",250,240,22,C.white);
    txt("2　舊錄音室備份音檔",250,300,22,C.white);
    txt("ESC　離開",250,360,16,C.muted);
    txt("注意：第二項會喚醒北側老舊設備。",250,690,14,C.red);
    return;
  }
  if(d.type==="security"){
    drawSecurity();
  }
}
function drawSecurity(){
  panel(80,55,1440,790,.98);
  txt("監視器主控",120,105,24,C.cyan);
  txt(`時間 02:${String(G.securityMinute).padStart(2,"0")}　 ← → 調整　 1~4 切鏡頭　 SPACE 標記`,120,145,14,C.muted);
  const feeds=[
    {name:"C1 直播間走廊",offset:0},
    {name:"C2 後門",offset:0},
    {name:"C3 北側走廊",offset:-3},
    {name:"C4 廚房",offset:0},
  ];
  for(let i=0;i<4;i++){
    const x=120+(i%2)*690,y=185+Math.floor(i/2)*305,w=640,h=260;
    ctx.fillStyle=i===G.securityFeed?"#151c20":"#0c0f12";ctx.fillRect(x,y,w,h);
    ctx.strokeStyle=i===G.securityFeed?C.cyan:"#344049";ctx.lineWidth=i===G.securityFeed?3:1;ctx.strokeRect(x,y,w,h);
    txt(feeds[i].name,x+16,y+26,14,i===G.securityFeed?C.cyan:C.muted);
    const shown=G.securityMinute+feeds[i].offset;
    txt(`02:${String(shown).padStart(2,"0")}`,x+w-18,y+26,13,C.red,"right");
    drawSecurityEvent(i,G.securityMinute,x,y,w,h);
    const key=`${i}:${G.securityMinute}`;
    if(G.securityMarked.includes(key)){txt("MARKED",x+w-18,y+h-16,12,C.gold,"right")}
  }
}
function drawSecurityEvent(feed,min,x,y,w,h){
  ctx.globalAlpha=.18;
  for(let i=0;i<60;i++){ctx.fillStyle=i%2?"#fff":"#000";ctx.fillRect(x+8+(i*53)%620,y+40+(i*37)%190,2,2)}
  ctx.globalAlpha=1;
  if(feed===0 && min===17){
    ctx.fillStyle="#6f666e";ctx.fillRect(x+410,y+110,22,90);ctx.fillRect(x+390,y+190,62,12);
    txt("一道人影穿過背景",x+18,y+h-24,14,C.gold);
  }
  if(feed===1 && min===21){
    ctx.fillStyle="#5b6f82";ctx.fillRect(x+300,y+90,26,110);ctx.fillStyle="#c69d82";ctx.fillRect(x+304,y+68,18,22);
    txt("有人用門禁卡離開，體型不像羅正男",x+18,y+h-24,14,C.gold);
  }
  if(feed===2 && min===18){
    ctx.strokeStyle=C.red;ctx.strokeRect(x+40,y+62,210,62);txt("畫面時間與主控差 3 分鐘",x+55,y+100,15,C.red);
  }
  if(feed===3 && min===20){
    ctx.fillStyle="#6a7484";ctx.fillRect(x+380,y+96,24,102);txt("廚房短暫無人",x+18,y+h-24,14,C.muted);
  }
}

function drawTheory(){
  drawWorld();ctx.fillStyle="rgba(5,4,8,.82)";ctx.fillRect(0,0,W,H);
  panel(180,110,1240,680,.98);
  const q=THEORY_Q[G.theory.step];
  txt("案件白板",240,170,28,C.white);
  wrap(q.q,240,245,1100,38,24,C.gold);
  q.opts.forEach((o,i)=>{
    const y=365+i*92;ctx.fillStyle="#17131d";ctx.fillRect(245,y-38,1080,66);ctx.strokeStyle="#43384c";ctx.strokeRect(245,y-38,1080,66);
    txt(`${i+1}. ${o}`,275,y,20,C.white);
  });
  txt("按 1 / 2 / 3 提交。錯誤推理不會立刻 Game Over。",240,720,14,C.muted);
}

function drawFinal(){
  ctx.fillStyle="#09070c";ctx.fillRect(0,0,W,H);
  // wall of messages
  for(let i=0;i<18;i++){
    const y=30+i*48,off=Math.sin(G.time*.6+i)*18;
    ctx.fillStyle=i%2?"#121018":"#0e0c12";ctx.fillRect(40+off,y,1520,34);
    txt(i%3===0?"羅正男":"聊天室",70+off,y+23,11,i%4===0?C.red:"#625b68");
    txt(i%2?"真假 確實 有料":"我記得不是這樣",170+off,y+23,11,"#625b68");
  }
  ctx.fillStyle="rgba(7,6,10,.72)";ctx.fillRect(0,0,W,H);
  panel(150,120,1300,650,.96);
  txt("五十大謊言 / 資訊分類",210,175,28,C.red);
  txt(`生命 ${"■".repeat(G.finalHP)}${"□".repeat(3-G.finalHP)}　剩餘 ${G.finalTimer.toFixed(1)} 秒`,1390,175,16,C.gold,"right");
  const item=FINAL_ITEMS[G.finalIndex];
  txt(`${G.finalIndex+1} / ${FINAL_ITEMS.length}`,210,225,13,C.muted);
  wrap(item.s,210,305,1180,42,30,C.white);
  CAT_LABEL.forEach((c,i)=>{
    const x=220+(i%2)*600,y=470+Math.floor(i/2)*110;
    ctx.fillStyle="#17131d";ctx.fillRect(x,y,550,76);ctx.strokeStyle="#44384d";ctx.strokeRect(x,y,550,76);
    txt(`${i+1}　${c}`,x+28,y+48,21,i===0?C.cyan:i===1?C.gold:i===2?C.red:C.purple);
  });
  txt("答案只來自你這一章親自取得的資料。",210,715,14,C.muted);
}

function draw(){
  ctx.save();
  if(G.shake>0)ctx.translate((Math.random()-.5)*G.shake,(Math.random()-.5)*G.shake);
  if(G.mode==="explore")drawWorld();
  else if(G.mode==="dialogue")drawDialogue();
  else if(G.mode==="notebook")drawNotebook();
  else if(G.mode==="device")drawDevice();
  else if(G.mode==="theory")drawTheory();
  else if(G.mode==="final")drawFinal();
  if(G.flash>0){ctx.fillStyle=`rgba(255,80,90,${Math.min(.28,G.flash)})`;ctx.fillRect(0,0,W,H)}
  // vignette
  const grad=ctx.createRadialGradient(W/2,H/2,260,W/2,H/2,920);grad.addColorStop(0,"rgba(0,0,0,0)");grad.addColorStop(1,"rgba(0,0,0,.54)");ctx.fillStyle=grad;ctx.fillRect(0,0,W,H);
  ctx.restore();
}

function loop(ts){
  const now=ts/1000,dt=Math.min(.033,G.last?now-G.last:.016);G.last=now;
  update(dt);draw();requestAnimationFrame(loop);
}

function resetGame(){
  G.running=true;G.paused=false;G.mode="explore";G.time=0;G.startedAt=performance.now()/1000;G.last=0;
  G.message="";G.messageT=0;G.camX=0;G.camY=700;G.lightsOn=true;G.flashlight=false;
  G.watcher={x:2360,y:730,active:false,targetX:0,targetY:0,repath:0};
  G.evidence=new Set();G.statements=new Set();G.securityMarked=[];G.theory=null;G.finalMistakes=0;
  G.flags={talkedCrab:false,talkedXue:false,talkedWei:false,pcUnlocked:false,officeUnlocked:false,cameraSolved:false,clockKnown:false,accessKnown:false,chatShadow:false,ventKnown:false,mahjongKnown:false,breakerKnown:false,blackoutCleared:false,foundRoger:false};
  P.x=310;P.y=1010;P.faceX=1;P.faceY=0;G.camX=0;G.camY=620;
  say("蟹老闆正在交誼廳找人。你沒有任務箭頭。",2.5);
}

window.addEventListener("keydown",e=>{
  if(["ArrowUp","ArrowDown","ArrowLeft","ArrowRight","Space"].includes(e.code))e.preventDefault();

  if(G.running && G.mode==="device"){handleDeviceKey(e);return}
  if(G.running && G.mode==="dialogue"){
    if(e.code==="Space"||e.code==="Enter"||e.code==="KeyE")advanceDialogue();
    if(e.code==="Escape"){G.dialogue=null;setMode("explore")}
    return;
  }
  if(G.running && G.mode==="notebook"){
    if(e.code==="KeyQ"||e.code==="Escape")setMode("explore");
    return;
  }
  if(G.running && G.mode==="theory"){
    if(/^Digit[1-3]$/.test(e.code))handleTheoryChoice(parseInt(e.code.slice(-1))-1);
    if(e.code==="Escape"){G.theory=null;setMode("explore")}
    return;
  }
  if(G.running && G.mode==="final"){
    if(/^Digit[1-4]$/.test(e.code))input.pressed.add(e.code);
    return;
  }

  if(!input.held.has(e.code))input.pressed.add(e.code);
  input.held.add(e.code);

  if(e.code==="Escape" && G.running){
    G.paused=!G.paused;UI.pause.classList.toggle("show",G.paused);
  }
});
window.addEventListener("keyup",e=>input.held.delete(e.code));
canvas.addEventListener("mousemove",e=>{
  const r=canvas.getBoundingClientRect();input.mx=(e.clientX-r.left)/r.width*W;input.my=(e.clientY-r.top)/r.height*H;
});
canvas.addEventListener("mousedown",()=>input.mousePressed=true);

document.getElementById("startBtn").onclick=()=>{audioCtx=audioCtx||new (window.AudioContext||window.webkitAudioContext)();UI.title.classList.remove("show");resetGame()};
document.getElementById("resumeBtn").onclick=()=>{G.paused=false;UI.pause.classList.remove("show")};
document.getElementById("restartBtn").onclick=()=>{UI.pause.classList.remove("show");resetGame()};
document.getElementById("againBtn").onclick=()=>{UI.ending.classList.remove("show");resetGame()};

draw();
requestAnimationFrame(loop);
})();