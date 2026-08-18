(() => {
"use strict";

const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");
ctx.imageSmoothingEnabled = false;
const W=1600,H=900;

const UI={
  title:document.getElementById("titleOverlay"),
  pause:document.getElementById("pauseOverlay"),
  ending:document.getElementById("endingOverlay"),
  endingTitle:document.getElementById("endingTitle"),
  endingText:document.getElementById("endingText"),
  endingStats:document.getElementById("endingStats")
};

const K={
  bg:"#07070a",white:"#f1edf3",muted:"#99909f",red:"#ff5f6c",darkred:"#8d2635",
  cyan:"#62dfdb",gold:"#e7c85e",green:"#6cc58d",blue:"#6f8fc7",purple:"#a97bd4",
  orange:"#d99363",wall:"#3b3641",floor:"#19171d",floor2:"#201c23",wood:"#59424a",
  skin:"#d5a58a",black:"#141118"
};

let audioCtx=null;
function beep(freq=340,d=.05,type="square",vol=.025){
  try{
    if(!audioCtx)audioCtx=new (window.AudioContext||window.webkitAudioContext)();
    const o=audioCtx.createOscillator(),g=audioCtx.createGain();
    o.type=type;o.frequency.value=freq;g.gain.value=vol;o.connect(g);g.connect(audioCtx.destination);o.start();o.stop(audioCtx.currentTime+d);
  }catch{}
}
function clamp(v,a,b){return Math.max(a,Math.min(b,v))}
function dist(ax,ay,bx,by){return Math.hypot(ax-bx,ay-by)}
function panel(x,y,w,h,a=.93){ctx.fillStyle=`rgba(10,8,13,${a})`;ctx.fillRect(x,y,w,h);ctx.strokeStyle="#473b4f";ctx.lineWidth=2;ctx.strokeRect(x+1,y+1,w-2,h-2)}
function txt(s,x,y,size=18,color=K.white,align="left",weight=700){ctx.font=`${weight} ${size}px "Microsoft JhengHei",sans-serif`;ctx.textAlign=align;ctx.fillStyle=color;ctx.fillText(s,x,y)}
function wrap(s,x,y,max,lineH,size=18,color=K.white,align="left",weight=650){
  ctx.font=`${weight} ${size}px "Microsoft JhengHei",sans-serif`;ctx.textAlign=align;ctx.fillStyle=color;
  let line="",yy=y;for(const ch of s){const t=line+ch;if(ctx.measureText(t).width>max){ctx.fillText(line,x,yy);line=ch;yy+=lineH}else line=t}if(line)ctx.fillText(line,x,yy)
}
function rng(seed){let x=Math.sin(seed*999.17)*43758.5453;return x-Math.floor(x)}
function hitRect(px,py,r,o){const nx=clamp(px,o.x,o.x+o.w),ny=clamp(py,o.y,o.y+o.h),dx=px-nx,dy=py-ny;return dx*dx+dy*dy<r*r}

const input={held:new Set(),pressed:new Set(),mouse:false,mx:0,my:0};
const SAVE_KEY="red_school_roger_v1";
function loadSave(){try{return Object.assign({clears:0,badEnds:0,trueEnds:0,best:null},JSON.parse(localStorage.getItem(SAVE_KEY)||"{}"))}catch{return{clears:0,badEnds:0,trueEnds:0,best:null}}}
let save=loadSave(); function persist(){localStorage.setItem(SAVE_KEY,JSON.stringify(save))}

const P={x:250,y:620,r:18,speed:220,faceX:1,faceY:0,dash:0,dashCd:0};
const SHAXY={x:190,y:660};
const G={
  running:false,paused:false,time:0,last:0,startedAt:0,
  mode:"room",room:"gate",message:"",messageT:0,prompt:"",
  dialogue:null,dialogueIndex:0,choiceIndex:0,
  visited:new Set(["gate"]),fastTravel:new Set(["gate"]),
  clues:new Set(),flags:{},
  notes:[],ending:null,
  mini:null,boss:null,
  roomTransition:0,redLevel:0,
  shaxyTrust:0,overloadHeart:0,pyramidKey:false,
  badCount:0,miniWins:0,wrongChoices:0,
};

const ROOMS={
  gate:{name:"校門",sub:"紅色學校・正門",tone:"#21191d",doors:[["courtyard",1450,610,"往中庭"]]},
  courtyard:{name:"中庭",sub:"時計停在 00:13",tone:"#20231f",doors:[["gate",140,650,"回校門"],["hall1",1450,610,"一樓走廊"],["gym",780,150,"體育館"],["auditorium",1150,150,"紅色禮堂"]]},
  hall1:{name:"一樓走廊",sub:"教室門牌從 101 開始",tone:"#1c1f23",doors:[["courtyard",130,610,"回中庭"],["class203",540,170,"二年三班"],["infirmary",950,170,"保健室"],["computer",1370,170,"電腦教室"],["hall2",1450,610,"二樓樓梯"]]},
  class203:{name:"二年三班",sub:"桌椅比名冊多一張",tone:"#25201f",doors:[["hall1",1450,610,"回走廊"]]},
  infirmary:{name:"保健室",sub:"藥櫃玻璃裡有第二層倒影",tone:"#20242a",doors:[["hall1",1450,610,"回走廊"]]},
  computer:{name:"電腦教室",sub:"所有螢幕都停在同一篇舊貼文",tone:"#1c2028",doors:[["hall1",1450,610,"回走廊"]]},
  hall2:{name:"二樓走廊",sub:"這裡的窗戶比外牆多一扇",tone:"#201c24",doors:[["hall1",130,610,"回一樓"],["music",540,170,"音樂教室"],["library",960,170,"圖書館"],["staff",1370,170,"教職員室"],["oldhall",1450,610,"舊校舍"]]},
  music:{name:"音樂教室",sub:"沒有插電的節拍器還在動",tone:"#241d28",doors:[["hall2",1450,610,"回走廊"]]},
  library:{name:"圖書館",sub:"同一本校刊被撕掉不同頁",tone:"#25221c",doors:[["hall2",1450,610,"回走廊"]]},
  staff:{name:"教職員室",sub:"點名簿最後一列不是姓名",tone:"#28201d",doors:[["hall2",1450,610,"回走廊"]]},
  gym:{name:"體育館",sub:"看台下有人在等你",tone:"#20251f",doors:[["courtyard",140,650,"回中庭"]]},
  auditorium:{name:"紅色禮堂",sub:"布幕後面的牆是濕的",tone:"#2c171d",doors:[["courtyard",140,650,"回中庭"],["boss",1450,610,"舞台深處"]]},
  oldhall:{name:"舊校舍",sub:"地圖上沒有這一區",tone:"#1c181d",doors:[["hall2",130,610,"回二樓"],["basement",1450,610,"往地下"]]},
  basement:{name:"地下機房",sub:"電纜像樹根一樣往更深處延伸",tone:"#181d20",doors:[["oldhall",130,610,"回舊校舍"],["pyramid",1450,610,"更下面"]]},
};

const PROPS={
 gate:[
  ["sign",270,250,90,90,"校牌"],["booth",580,330,180,150,"警衛室"],["notice",980,270,120,90,"公告欄"],["exit",130,650,70,120,"離開學校"]
 ],
 courtyard:[
  ["clock",760,210,110,110,"停住的鐘"],["tree",420,430,120,180,"老榕樹"],["fountain",1020,470,180,120,"乾掉的噴水池"],["shoe",1250,570,50,35,"單隻室內鞋"]
 ],
 hall1:[
  ["poster",310,270,90,130,"破掉的校慶海報"],["locker",700,380,180,110,"置物櫃"],["blood",1120,520,120,40,"拖行痕跡"]
 ],
 class203:[
  ["deskA",330,350,120,80,"31 號桌"],["deskB",610,350,120,80,"32 號桌"],["blackboard",820,170,420,120,"黑板"],["photo",1260,300,110,90,"班級照片"],["drawer",350,570,80,55,"抽屜"]
 ],
 infirmary:[
  ["bed",350,350,280,120,"病床"],["cabinet",840,260,160,180,"藥櫃"],["mirror",1180,280,130,180,"鏡子"],["uv",650,560,70,50,"紫外線燈"]
 ],
 computer:[
  ["pc1",330,320,150,110,"電腦 A"],["pc2",650,320,150,110,"電腦 B"],["pc3",970,320,150,110,"電腦 C"],["server",1260,270,150,180,"伺服器櫃"]
 ],
 hall2:[
  ["window",330,220,180,120,"窗戶"],["extra",820,220,180,120,"不存在的窗戶"],["radio",1180,450,90,70,"無線電"]
 ],
 music:[
  ["piano",310,300,310,150,"鋼琴"],["metronome",790,300,80,120,"節拍器"],["score",1040,250,150,110,"泛黃樂譜"],["npcFinger",1280,560,80,80,"中指通"]
 ],
 library:[
  ["shelf",260,240,220,340,"校刊書架"],["table",660,420,330,130,"閱覽桌"],["photoWall",1120,230,240,200,"歷屆照片"],["npcToyz",1280,580,80,80,"TOYZ"]
 ],
 staff:[
  ["desk",330,350,300,120,"教師桌"],["roll",790,260,160,100,"點名簿"],["safe",1170,350,150,150,"老式保險箱"],["npcGod",1280,590,80,80,"統神"]
 ],
 gym:[
  ["bleacher",330,260,900,180,"看台"],["ball",560,600,55,55,"籃球"],["locker",1120,500,180,110,"器材櫃"]
 ],
 auditorium:[
  ["curtain",360,170,880,200,"紅色布幕"],["seat",340,520,900,90,"觀眾席"],["wish",1260,300,110,110,"後台紙箱"]
 ],
 oldhall:[
  ["locker",320,300,190,150,"鏽蝕置物櫃"],["door",720,260,170,210,"封死的教室"],["shaxy",1130,520,80,80,"薛喜？"],["stairs",1300,400,100,180,"地下樓梯"]
 ],
 basement:[
  ["panel",310,280,250,160,"主配電盤"],["cable",750,420,380,90,"紅色電纜"],["tape",1210,300,110,80,"舊錄音帶"]
 ],
};

const CLUE_INFO={
  shoe:["單隻室內鞋","鞋底沾著紅色粉末，尺寸比羅正男小。"],
  photo32:["多出來的第 32 張桌子","名冊只有 31 人，照片卻在最右側多出模糊身影。"],
  uv:["鏡面上的字","紫外線下寫著：『不要相信會叫你阿傑的人。』"],
  post:["舊貼文","有人在十年前就提到『00:13 後會多出一間紅色教室』。"],
  window:["多出來的窗","從中庭數外牆只有 7 扇，二樓走廊內側卻有 8 扇。"],
  score:["逆拍樂譜","樂譜每第四小節都故意少一拍。"],
  yearbook:["被改過的校刊","每屆照片裡都出現同一個肥胖男生，但名字被塗掉。"],
  roll:["點名簿最後一列","最後一列不是姓名，而是『還沒放學』。"],
  cable:["紅色電纜","不是學校原有線路，全部通向禮堂地下。"],
  tape:["錄音帶","有人說：『他不是源頭，只是被留在這裡。真正的東西在金字塔下面。』"],
  heart1:["心願碎片：便當袋","寫著『想再吃一次下課後的雞排』。"],
  heart2:["心願碎片：遊戲卡","背面寫著『想贏一次，不要再被笑』。"],
  heart3:["心願碎片：畢業照","照片背面只寫『想跟大家一起畢業』。"],
};

const DIALOGUES={
 intro:[
  {who:"羅正男",side:"left",p:"roger",t:"所以我們半夜跑來廢校，是因為聊天室說這裡有鬼？"},
  {who:"薛喜",side:"right",p:"shaxy",t:"不是。是因為三個不同的人都拍到同一扇『不存在的窗戶』。"},
  {who:"羅正男",side:"left",p:"roger",t:"啊不就窗戶。"},
  {who:"薛喜",side:"right",p:"shaxy",t:"外牆七扇，裡面八扇。你等一下不要第一個去開第八扇。"},
  {who:"羅正男",side:"left",p:"roger",t:"我偏要。"},
 ],
 finger:[
  {who:"中指通",side:"right",p:"finger",t:"想問音樂教室的事？先證明你手指不是裝飾。"},
  {who:"羅正男",side:"left",p:"roger",t:"薛喜你上。"},
  {who:"薛喜",side:"right",p:"shaxy",t:"為什麼每次有技術含量的都我？"},
 ],
 toyz:[
  {who:"TOYZ",side:"right",p:"toyz",t:"校刊我有看過。但先來個紙捲競速。不是比快而已，捲爛一樣算輸。"},
  {who:"羅正男",side:"left",p:"roger",t:"這又是什麼校園社團。"},
 ],
 god:[
  {who:"統神",side:"right",p:"god",t:"你們要點名簿後面的密碼？薛喜跟我玩一把。"},
  {who:"薛喜",side:"left",p:"shaxy",t:"又我？"},
  {who:"統神",side:"right",p:"god",t:"羅正男在旁邊閉嘴就是最大幫忙。"},
 ],
 fakeShaxy:[
  {who:"薛喜？",side:"right",p:"fake",t:"阿傑，別查了。我找到出口了，跟我走。"},
 ],
 overloadReveal:[
  {who:"超負荷",side:"right",p:"overload",t:"你們以為是我把這裡變成這樣？"},
  {who:"羅正男",side:"left",p:"roger",t:"不然勒。整間學校都你的聲音。"},
  {who:"超負荷",side:"right",p:"overload",t:"我只是一直沒辦法『放學』。它拿我的聲音、我的樣子，叫每個留下來的人繼續陪它。"},
 ],
 pyramidReveal:[
  {who:"超負荷",side:"right",p:"overload",t:"你真的把那三件東西找回來了……那我告訴你。"},
  {who:"超負荷",side:"right",p:"overload",t:"控制這裡的不是我。地下機房那條紅線，通往一個根本不該存在的地方。"},
  {who:"薛喜",side:"left",p:"shaxy",t:"哪裡？"},
  {who:"超負荷",side:"right",p:"overload",t:"金字塔。裡面有個一直被叫做『紹安』的東西。別把名字當成真人，這裡的名字都只是面具。"},
 ]
};

function setMsg(s,t=2){G.message=s;G.messageT=t}
function addClue(id){
  if(G.clues.has(id))return;
  G.clues.add(id);
  for(const roomId of G.visited)G.fastTravel.add(roomId);
  const c=CLUE_INFO[id];if(c){G.notes.push(c);setMsg(`取得線索：${c[0]}`,2.2);beep(650,.07)}
}
function startDialogue(lines,onDone=null){
  G.dialogue={lines,onDone};G.dialogueIndex=0;G.mode="dialogue";beep(330,.03)
}
function nextDialogue(){
  G.dialogueIndex++;
  if(G.dialogueIndex>=G.dialogue.lines.length){
    const cb=G.dialogue.onDone;G.dialogue=null;G.mode="room";if(cb)cb();
  }else beep(390,.025)
}
function endGame(title,text,type="bad"){
  G.running=false;save.clears++;if(type==="bad"){save.badEnds++;G.badCount++}if(type==="true")save.trueEnds++;
  const sec=Math.floor(performance.now()/1000-G.startedAt);if(save.best==null||sec<save.best)save.best=sec;persist();
  UI.endingTitle.textContent=title;UI.endingText.textContent=text;
  UI.endingStats.innerHTML=[
    ["線索",`${G.clues.size}/12`],["NPC 挑戰",`${G.miniWins}/3`],["錯誤選擇",String(G.wrongChoices)],["結局",type.toUpperCase()]
  ].map(([a,b])=>`<div class="stat">${a}<b>${b}</b></div>`).join("");
  UI.ending.classList.add("show")
}

function roomProps(){return PROPS[G.room]||[]}
function roomDoors(){return ROOMS[G.room].doors||[]}
function isDoorNear(){for(const d of roomDoors()){if(dist(P.x,P.y,d[1],d[2])<80)return d}return null}
function propNear(){for(const p of roomProps()){if(dist(P.x,P.y,p[1],p[2])<80)return p}return null}

function changeRoom(id,spawn="auto"){
  if(id==="boss"){startOverloadBoss();return}
  if(id==="pyramid"){
    if(G.pyramidKey){startPyramidBoss();return}
    setMsg("下面只有封死的牆。你還不知道真正入口在哪。",2);return
  }
  G.room=id;
  G.visited.add(id);
  G.fastTravel.add(id); // 親自走到過一次後，永久開啟快速移動
  P.x=240;P.y=650;SHAXY.x=175;SHAXY.y=685;G.roomTransition=.28;beep(220,.04);
}

function updateRoom(dt){
  P.dash=Math.max(0,P.dash-dt);P.dashCd=Math.max(0,P.dashCd-dt);
  let dx=(input.held.has("KeyD")||input.held.has("ArrowRight")?1:0)-(input.held.has("KeyA")||input.held.has("ArrowLeft")?1:0);
  let dy=(input.held.has("KeyS")||input.held.has("ArrowDown")?1:0)-(input.held.has("KeyW")||input.held.has("ArrowUp")?1:0);
  if(dx||dy){const l=Math.hypot(dx,dy);dx/=l;dy/=l;P.faceX=dx;P.faceY=dy}
  if((input.pressed.has("ShiftLeft")||input.pressed.has("ShiftRight"))&&P.dashCd<=0){P.dash=.14;P.dashCd=.6;beep(230,.03)}
  const sp=P.dash>0?390:P.speed;P.x=clamp(P.x+dx*sp*dt,80,1520);P.y=clamp(P.y+dy*sp*dt,145,795);
  SHAXY.x+=(P.x-70-SHAXY.x)*Math.min(1,dt*4);SHAXY.y+=(P.y+30-SHAXY.y)*Math.min(1,dt*4);

  G.prompt="";
  const prop=propNear(),door=isDoorNear();
  if(prop)G.prompt=`E 調查：${prop[4]}`;
  else if(door)G.prompt=`E ${door[3]}`;

  if(input.pressed.has("KeyE")){
    if(prop)interactProp(prop);
    else if(door)changeRoom(door[0]);
  }
  if(input.pressed.has("KeyM")){
    const arr=mapSelectable();
    const currentIndex=arr.indexOf(G.room);
    mapIndex=currentIndex>=0?currentIndex:0;
    G.mode="map";
  }
  if(input.pressed.has("KeyQ"))G.mode="notes";
}

function interactProp(p){
  const id=p[0];
  if(id==="exit"){
    endGame("BAD END：放學","羅正男覺得事情太麻煩，直接離開。隔天早上，薛喜的手機仍留在學校裡，但沒有人記得他什麼時候回去過。","bad");return
  }
  if(G.room==="courtyard"&&id==="shoe"){addClue("shoe");return}
  if(G.room==="class203"&&id==="photo"){
    if(!G.flags.photoGame){G.flags.photoGame=true;startPhotoMini()}else addClue("photo32");return
  }
  if(G.room==="class203"&&id==="drawer"){addClue("heart1");G.overloadHeart=Math.max(G.overloadHeart,1);return}
  if(G.room==="infirmary"&&id==="uv"){startUvMini();return}
  if(G.room==="computer"&&(id==="pc1"||id==="pc2"||id==="pc3")){startTerminalMini();return}
  if(G.room==="hall2"&&id==="extra"){addClue("window");return}
  if(G.room==="music"&&id==="score"){addClue("score");return}
  if(G.room==="music"&&id==="npcFinger"){
    if(!G.flags.fingerWon)startDialogue(DIALOGUES.finger,()=>startRhythmMini());else setMsg("中指通：你手指確實能用。",1.5);return
  }
  if(G.room==="library"&&id==="photoWall"){
    if(G.flags.toyzWon)addClue("yearbook");else setMsg("照片牆缺一張標示頁。TOYZ 說他看過。",1.8);return
  }
  if(G.room==="library"&&id==="npcToyz"){
    if(!G.flags.toyzWon)startDialogue(DIALOGUES.toyz,()=>startRollMini());else setMsg("TOYZ：校刊那頁你自己去看啦。",1.5);return
  }
  if(G.room==="library"&&id==="table"){addClue("heart2");return}
  if(G.room==="staff"&&id==="roll"){
    if(G.flags.pokerWon)addClue("roll");else setMsg("點名簿被鎖在透明盒裡。統神拿著鑰匙。",1.7);return
  }
  if(G.room==="staff"&&id==="npcGod"){
    if(!G.flags.pokerWon)startDialogue(DIALOGUES.god,()=>startPokerMini());else setMsg("統神：下一把再說。",1.2);return
  }
  if(G.room==="auditorium"&&id==="wish"){addClue("heart3");return}
  if(G.room==="oldhall"&&id==="shaxy"){
    if(!G.flags.fakeSeen){
      G.flags.fakeSeen=true;
      startDialogue(DIALOGUES.fakeShaxy,()=>startFakeChoice());
    }else setMsg("那個『薛喜』已經不見了。",1.4);return
  }
  if(G.room==="basement"&&id==="cable"){addClue("cable");return}
  if(G.room==="basement"&&id==="tape"){addClue("tape");return}
  setMsg(genericPropText(G.room,id),1.7)
}
function genericPropText(room,id){
  if(id==="locker"&&room==="hall1")return "置物櫃裡塞著很多沒領走的學生證，最下面一張照片被刮掉臉。";
  if(id==="locker"&&room==="oldhall")return "鏽蝕的門縫裡傳出手機震動，但打開後只有一條紅線。";
  const map={
    sign:"校名被紅漆蓋掉，只剩『紅色學校』四個字。",
    booth:"警衛室裡沒有灰塵，像今天還有人使用。",
    notice:"公告日期全部停在同一天：7 月 14 日。",
    clock:"時鐘停在 00:13，但秒針還在微微抖。",
    tree:"樹根纏著幾條褪色紅線。",
    fountain:"池底有很多硬幣，但全部都是同一年。",
    poster:"海報上的表演名單有一個名字被整塊挖掉。",

    blood:"不是血，是紅色粉筆灰。",
    deskA:"普通的學生桌，桌底刻著『不要坐 32』。",
    deskB:"桌面比其他桌乾淨，像剛被放進來。",
    blackboard:"黑板角落寫著：『31 + 1 = 32？』",
    bed:"病床床單底下壓著一根紅線。",
    cabinet:"藥罐標籤全部被換成學生名字。",
    mirror:"你和薛喜的倒影慢了半拍。",
    server:"伺服器上只有一個資料夾：RED_SCHOOL_ARCHIVE。",
    window:"外面數得到七扇窗。",
    radio:"無線電偶爾傳出一個人喘氣的聲音。",
    piano:"有一個琴鍵按下去沒有聲音，卻會讓門外的燈閃一下。",
    metronome:"節拍器一直卡在 13、13、13、13。",
    shelf:"每一本校刊的第 32 頁都被撕掉。",
    safe:"保險箱不是鎖著，是從裡面被頂住。",
    bleacher:"看台底下貼滿『今天可以放學嗎』的紙條。",
    ball:"籃球裡面有東西在滾。",
    curtain:"布幕背後有非常新的手掌印。",
    seat:"所有椅子都朝舞台，只有最後一張朝出口。",

    door:"門把被紅線纏死。",
    stairs:"樓梯往下，但從外面看學校根本沒有地下室。",
    panel:"配電盤上有一條完全不在圖紙裡的紅色迴路。"
  };return map[id]||"看起來普通，但你總覺得哪裡不對。"
}

// ---------- Investigation mini games ----------
function startPhotoMini(){
  G.mini={type:"photo",found:new Set(),timer:45};G.mode="mini"
}
function startUvMini(){
  G.mini={type:"uv",progress:0,spots:[{x:510,y:315,r:45,hit:false},{x:850,y:410,r:38,hit:false},{x:1120,y:290,r:42,hit:false}],timer:50};G.mode="mini"
}
function startTerminalMini(){
  G.mini={type:"terminal",code:[2,0,1,3],slots:[],timer:50};G.mode="mini"
}
function startRhythmMini(){
  const keys=["KeyA","KeyS","KeyD","KeyJ","KeyK","KeyL"];
  const notes=[];for(let i=0;i<34;i++)notes.push({t:1.1+i*.43+(i%7===0?.12:0),key:keys[(i*3+i%4)%6],hit:false,miss:false});
  G.mini={type:"rhythm",notes,start:G.time,score:0,combo:0,miss:0};G.mode="mini"
}
function startRollMini(){
  G.mini={type:"roll",quality:55,progress:0,opponent:0,phase:0,done:false};G.mode="mini"
}
function startPokerMini(){
  G.mini={type:"poker",round:0,playerChips:6,godChips:6,history:[],prompt:null};nextPokerRound();G.mode="mini"
}
function startFakeChoice(){
  G.mode="choice";G.choiceIndex=0;G.dialogue={choiceTitle:"你面前有兩個選擇。",choices:["跟這個薛喜走","用無線電叫真正的薛喜報暗號"],onChoice:(i)=>{
    if(i===0)endGame("BAD END：另一個薛喜","你跟著他走進不存在的四樓。真正的薛喜在無線電另一端不斷叫你，但樓梯已經沒有回頭路。","bad");
    else{G.shaxyTrust++;G.wrongChoices+=0;setMsg("無線電那端的薛喜罵了一句你才聽得懂的話。眼前的『薛喜』笑容瞬間僵住，然後消失。",3);G.mode="room"}
  }}
}
function nextPokerRound(){
  const m=G.mini;if(!m)return;
  const patterns=[
    {face:"快跟",tell:"他看牌後立刻整理籌碼",truth:"strong"},
    {face:"皺眉",tell:"嘴上一直說爛牌，手卻沒放鬆",truth:"strong"},
    {face:"安靜",tell:"第一次沒有碎念",truth:"bluff"},
    {face:"大聲",tell:"突然一直催你快點",truth:"bluff"},
  ];
  m.prompt=patterns[m.round%patterns.length]
}

// ---------- Overload boss ----------
function startOverloadBoss(){
  if(!(G.clues.has("roll")&&G.clues.has("window")&&G.miniWins>=2)){
    setMsg("舞台深處的門沒有打開。你還缺足夠的校園規則與至少兩位 NPC 的協助。",2.5);return
  }
  G.mode="boss";G.boss={kind:"overload",phase:1,hp:30,player:5,timer:0,attack:0,side:"L",lane:2,laneTarget:2,chat:[],resolved:false};beep(90,.2,"sawtooth",.06)
}
function startPyramidBoss(){
  G.mode="boss";G.boss={kind:"pyramid",phase:1,hp:18,player:4,timer:0,q:0,lane:1,bullets:[],anomaly:0};beep(70,.25,"sawtooth",.06)
}

function updateMini(dt){
  const m=G.mini;
  if(!m)return;
  if(m.type==="photo"){
    m.timer-=dt;
    if(input.mouse){
      const pts=[[420,330],[835,360],[1120,505]];
      pts.forEach((p,i)=>{if(dist(input.mx,input.my,p[0],p[1])<60)m.found.add(i)});
    }
    if(m.found.size===3){addClue("photo32");G.mode="room";G.mini=null;G.miniWins++;return}
    if(m.timer<=0){G.wrongChoices++;setMsg("你盯太久了。重新整理一下再看。",1.8);G.mode="room";G.mini=null}
  }
  if(m.type==="uv"){
    m.timer-=dt;
    if(input.mouse){
      for(const s of m.spots)if(dist(input.mx,input.my,s.x,s.y)<s.r)s.hit=true;
    }
    if(m.spots.every(s=>s.hit)){addClue("uv");G.mode="room";G.mini=null;G.miniWins++;return}
    if(m.timer<=0){G.wrongChoices++;G.mode="room";G.mini=null;setMsg("你漏掉了東西。紫外線不是照一下就算。",1.8)}
  }
  if(m.type==="terminal"){
    m.timer-=dt;
    for(let i=0;i<4;i++)if(input.pressed.has(`Digit${i+1}`)){m.slots.push(i);beep(300+i*70,.03);if(m.slots.length>4)m.slots.shift()}
    if(m.slots.length===4){
      const ok=m.slots.every((v,i)=>v===m.code[i]);
      if(ok){addClue("post");G.mode="room";G.mini=null;G.miniWins++;return}
      else{m.slots=[];G.wrongChoices++;beep(90,.08,"sawtooth")}
    }
    if(m.timer<=0){G.mode="room";G.mini=null}
  }
  if(m.type==="rhythm"){
    const t=G.time-m.start;
    const map={KeyA:0,KeyS:1,KeyD:2,KeyJ:3,KeyK:4,KeyL:5};
    for(const [k,lane] of Object.entries(map)){
      if(input.pressed.has(k)){
        let best=null,bd=.16;
        for(const n of m.notes){if(!n.hit&&!n.miss&&n.key===k){const d=Math.abs(n.t-t);if(d<bd){bd=d;best=n}}}
        if(best){best.hit=true;m.score++;m.combo++;beep(520+lane*45,.025)}
        else{m.miss++;m.combo=0;beep(110,.04,"square")}
      }
    }
    for(const n of m.notes)if(!n.hit&&!n.miss&&t>n.t+.18){n.miss=true;m.miss++;m.combo=0}
    if(t>m.notes[m.notes.length-1].t+1){
      if(m.score>=26){G.flags.fingerWon=true;G.miniWins++;addClue("score");setMsg("中指通：可以。你有跟上逆拍。",2)}
      else{G.wrongChoices++;setMsg("中指通：手指太僵，回去練。",1.7)}
      G.mode="room";G.mini=null
    }
  }
  if(m.type==="roll"){
    if(input.held.has("KeyA"))m.quality-=18*dt;
    if(input.held.has("KeyD"))m.quality+=18*dt;
    if(input.held.has("Space")){m.progress+=22*dt;const dev=Math.abs(m.quality-55);m.progress-=dev*.02*dt}
    else m.progress-=2*dt;
    m.quality=clamp(m.quality,0,100);m.progress=clamp(m.progress,0,100);m.opponent+=11*dt;
    if(m.progress>=100||m.opponent>=100){
      if(m.progress>=100&&Math.abs(m.quality-55)<18){G.flags.toyzWon=true;G.miniWins++;setMsg("TOYZ：速度有，品質也有。去看照片牆。",2)}
      else{G.wrongChoices++;setMsg("TOYZ：太鬆、太緊、太慢都不行。",1.8)}
      G.mode="room";G.mini=null
    }
  }
  if(m.type==="poker"){
    if(input.pressed.has("Digit1")||input.pressed.has("Digit2")||input.pressed.has("Digit3")){
      const choice=input.pressed.has("Digit1")?0:input.pressed.has("Digit2")?1:2;
      const truth=m.prompt.truth;
      let win=false;
      if(choice===0)win=(truth==="bluff");
      if(choice===1)win=(truth==="strong");
      if(choice===2)win=(m.round%2===0);
      if(win){m.playerChips+=2;m.godChips-=2;beep(620,.05)}
      else{m.playerChips-=2;m.godChips+=2;G.wrongChoices++;beep(100,.07,"sawtooth")}
      m.history.push({choice,truth});
      m.round++;
      if(m.playerChips<=0||m.godChips<=0||m.round>=4){
        if(m.playerChips>m.godChips){G.flags.pokerWon=true;G.miniWins++;setMsg("統神：可以啦。點名簿你拿去。",2)}
        else setMsg("統神：你們兩個讀人能力還要練。",1.8);
        G.mode="room";G.mini=null;return
      }
      nextPokerRound()
    }
  }
}

function updateBoss(dt){
  const b=G.boss;if(!b)return;
  if(b.kind==="overload")updateOverload(dt,b);else updatePyramid(dt,b)
}
function updateOverload(dt,b){
  b.timer+=dt;
  if(b.phase===1){
    if(b.attack<=0){b.attack=.9-Math.min(.35,(30-b.hp)*.012);b.side=Math.random()<.5?"L":"R"}
    b.attack-=dt;
    if(b.attack<.18&&!b.hitWindow)b.hitWindow=true;
    if(b.hitWindow){
      const key=b.side==="L"?"KeyA":"KeyD";
      if(input.pressed.has(key)){b.hp-=1;b.hitWindow=false;b.attack=.4;beep(600,.03)}
      else if(input.pressed.has(b.side==="L"?"KeyD":"KeyA")){b.player--;b.hitWindow=false;b.attack=.4;beep(90,.07,"sawtooth")}
    }
    if(b.attack<=0&&b.hitWindow){b.player--;b.hitWindow=false;beep(90,.07,"sawtooth")}
    if(b.hp<=20){b.phase=2;b.attack=0;b.timer=0}
  }else if(b.phase===2){
    if(b.attack<=0){b.attack=.72;b.laneTarget=Math.floor(Math.random()*5);b.chat.push({lane:b.laneTarget,life:.7})}
    b.attack-=dt;
    if(input.pressed.has("ArrowLeft")||input.pressed.has("KeyA"))b.lane=clamp(b.lane-1,0,4);
    if(input.pressed.has("ArrowRight")||input.pressed.has("KeyD"))b.lane=clamp(b.lane+1,0,4);
    for(const c of b.chat)c.life-=dt;
    if(b.chat.some(c=>c.life<.08&&c.life>0&&c.lane===b.lane)){b.player--;b.chat=b.chat.filter(c=>c.life>.08);beep(90,.06,"sawtooth")}
    b.chat=b.chat.filter(c=>c.life>0);
    if(b.timer>13){b.hp=10;b.phase=3;b.timer=0;b.attack=0}
  }else{
    if(b.attack<=0){b.attack=.48;b.side=Math.random()<.5?"L":"R";b.laneTarget=Math.floor(Math.random()*5)}
    b.attack-=dt;
    if(input.pressed.has("ArrowLeft")||input.pressed.has("KeyA"))b.lane=clamp(b.lane-1,0,4);
    if(input.pressed.has("ArrowRight")||input.pressed.has("KeyD"))b.lane=clamp(b.lane+1,0,4);
    const parry=b.side==="L"?"KeyJ":"KeyL";
    if(b.attack<.14&&input.pressed.has(parry)){b.hp-=1;b.attack=.3;beep(680,.025)}
    if(b.attack<=0){if(b.lane===b.laneTarget)b.player--;b.attack=.35}
  }
  if(b.player<=0){G.wrongChoices++;endGame("BAD END：過載","聊天室、音樂、畫面與叫聲同時壓上來。羅正男最後分不清哪一個提示是真的。","bad");return}
  if(b.hp<=0){
    if(G.clues.has("heart1")&&G.clues.has("heart2")&&G.clues.has("heart3")){
      startDialogue(DIALOGUES.overloadReveal,()=>startOverloadChoice())
    }else{
      endGame("NORMAL END：超負荷","你擊敗了紅色禮堂裡的超負荷。學校暫時安靜，但地下機房仍有紅光。你們帶著『應該結束了吧』的錯覺離開。","normal")
    }
    G.boss=null
  }
}
function startOverloadChoice(){
  G.mode="choice";G.choiceIndex=0;G.dialogue={choiceTitle:"超負荷沒有繼續攻擊。你要怎麼做？",choices:["離開，事情已經解決","把三個心願碎片交給他"],onChoice:(i)=>{
    if(i===0)endGame("NORMAL END：差一步","你選擇離開。超負荷沒有追上來，但他最後一句『不是我』一直留在羅正男腦中。","normal");
    else{
      G.overloadHeart=3;startDialogue(DIALOGUES.pyramidReveal,()=>{
        G.pyramidKey=true;G.mode="room";G.room="basement";G.visited.add("basement");G.fastTravel.add("basement");setMsg("TRUE ROUTE：地下機房出現新的門。",3)
      })
    }
  }}
}
function updatePyramid(dt,b){
  b.timer+=dt;
  if(b.phase===1){
    const qs=[
      ["二年三班真正異常的是？",["黑板","第 32 張桌子","窗簾"],1],
      ["哪個地方的數量對不上外牆？",["音樂教室","二樓窗戶","圖書館書架"],1],
      ["超負荷真正想要的是？",["繼續留校","完成放學前沒完成的三件事","打敗所有學生"],1],
    ];
    const q=qs[b.q];
    if(!q){b.phase=2;b.timer=0;return}
    for(let i=0;i<3;i++)if(input.pressed.has(`Digit${i+1}`)){
      if(i===q[2]){b.q++;beep(620,.04)}
      else{b.player--;G.wrongChoices++;beep(90,.08,"sawtooth")}
    }
    if(b.player<=0){
      endGame("BAD END：錯誤的學校","你把錯誤的記憶當成真相。金字塔重新排列所有房間，紅色學校從此只剩下錯誤版本。","bad");
      return;
    }
  }else{
    if(input.pressed.has("ArrowLeft")||input.pressed.has("KeyA"))b.lane=clamp(b.lane-1,0,2);
    if(input.pressed.has("ArrowRight")||input.pressed.has("KeyD"))b.lane=clamp(b.lane+1,0,2);
    if(Math.random()<dt*2.6)b.bullets.push({lane:Math.floor(Math.random()*3),y:-30,spd:230+rng(G.time)*120});
    for(const x of b.bullets)x.y+=x.spd*dt;
    for(const x of b.bullets)if(x.y>660&&x.y<720&&x.lane===b.lane&&!x.hit){x.hit=true;b.player--;beep(80,.07,"sawtooth")}
    b.bullets=b.bullets.filter(x=>x.y<800);
    if(input.pressed.has("Space")){b.hp-=1;beep(540,.025)}
    if(b.player<=0){endGame("BAD END：BAN","畫面只剩 CONNECTION LOST。你以為重新整理能解決一切，但紅色學校從此再也沒有入口。","bad");return}
    if(b.hp<=0){
      endGame("TRUE END：金字塔之下","紅色電纜終於熄滅。超負荷第一次走出禮堂，學校的第八扇窗在天亮前消失。羅正男問：『所以真的結束了？』薛喜沒有回答。","true")
    }
  }
}

function updateChoice(){
  const d=G.dialogue;
  if(input.pressed.has("ArrowUp"))G.choiceIndex=clamp(G.choiceIndex-1,0,d.choices.length-1);
  if(input.pressed.has("ArrowDown"))G.choiceIndex=clamp(G.choiceIndex+1,0,d.choices.length-1);
  if(input.pressed.has("Enter")||input.pressed.has("Space")){
    const cb=d.onChoice,idx=G.choiceIndex;G.dialogue=null;cb(idx)
  }
}

function update(dt){
  if(!G.running||G.paused)return;
  G.time+=dt;G.messageT=Math.max(0,G.messageT-dt);G.roomTransition=Math.max(0,G.roomTransition-dt);
  if(G.mode==="room")updateRoom(dt);
  else if(G.mode==="mini")updateMini(dt);
  else if(G.mode==="boss")updateBoss(dt);
  else if(G.mode==="choice")updateChoice();
  input.pressed.clear();input.mouse=false;
}

// ---------- Drawing ----------
function drawRoom(){
  const r=ROOMS[G.room];ctx.fillStyle=r.tone;ctx.fillRect(0,0,W,H);
  drawRoomArchitecture(G.room);
  drawProps(G.room);
  drawCharacter(P.x,P.y,"rogerSmall");
  drawCharacter(SHAXY.x,SHAXY.y,"shaxySmall");
  drawHUD()
}
function drawRoomArchitecture(room){
  // floor
  for(let y=120;y<H;y+=42){ctx.fillStyle=((y/42)%2)?K.floor:K.floor2;ctx.fillRect(0,y,W,42)}
  // walls
  ctx.fillStyle="#302b35";ctx.fillRect(0,0,W,140);ctx.fillStyle="#47404b";ctx.fillRect(0,132,W,8);
  // windows / lamps / doors
  for(let x=120;x<1500;x+=280){
    ctx.fillStyle="#12141a";ctx.fillRect(x,38,160,72);ctx.strokeStyle="#605666";ctx.strokeRect(x,38,160,72);
    ctx.fillStyle=(room==="auditorium"||room==="oldhall")?"#57232e":"#334454";ctx.fillRect(x+8,46,144,56)
  }
  const doors=roomDoors();for(const d of doors){ctx.fillStyle="#2a2026";ctx.fillRect(d[1]-38,d[2]-70,76,140);ctx.strokeStyle="#72505a";ctx.strokeRect(d[1]-38,d[2]-70,76,140)}
  // room label
  txt(ROOMS[room].name,50,80,28,K.white);txt(ROOMS[room].sub,50,110,13,K.muted)
  // decorative clutter
  const seed=Object.keys(ROOMS).indexOf(room)+1;
  for(let i=0;i<18;i++){
    const x=120+rng(seed*100+i)*1360,y=180+rng(seed*300+i)*560;
    ctx.fillStyle=i%3===0?"#4b3d43":i%3===1?"#2c353a":"#5b5048";
    ctx.fillRect(x,y,10+rng(i)*28,7+rng(i+4)*18)
  }
  if(room==="class203"){
    for(let row=0;row<3;row++)for(let col=0;col<6;col++){ctx.fillStyle="#60494d";ctx.fillRect(180+col*190,280+row*150,105,55);ctx.fillStyle="#312a2f";ctx.fillRect(188+col*190,338+row*150,12,40);ctx.fillRect(268+col*190,338+row*150,12,40)}
  }
  if(room==="library"){
    for(let i=0;i<5;i++){ctx.fillStyle="#44363a";ctx.fillRect(140+i*280,190,210,430);for(let j=0;j<7;j++){ctx.fillStyle=j%2?"#755c4e":"#4f6570";ctx.fillRect(155+i*280,210+j*55,180,35)}}
  }
  if(room==="computer"){
    for(let i=0;i<4;i++){ctx.fillStyle="#4c4149";ctx.fillRect(180+i*340,360,240,90);ctx.fillStyle="#101319";ctx.fillRect(220+i*340,260,160,90);ctx.strokeStyle="#4d7082";ctx.strokeRect(220+i*340,260,160,90)}
  }
  if(room==="music"){ctx.fillStyle="#4a393d";ctx.fillRect(190,300,360,180);ctx.fillStyle="#101014";ctx.fillRect(210,325,320,40)}
  if(room==="gym"){ctx.fillStyle="#493d42";ctx.fillRect(170,250,1100,260);for(let i=0;i<6;i++){ctx.fillStyle=i%2?"#594b50":"#433940";ctx.fillRect(190,270+i*36,1060,26)}}
  if(room==="auditorium"){ctx.fillStyle="#6c2431";ctx.fillRect(250,150,1050,260);ctx.fillStyle="#24151a";ctx.fillRect(300,190,950,170)}
  if(room==="basement"){for(let i=0;i<8;i++){ctx.strokeStyle=i%2?K.red:"#4c4048";ctx.lineWidth=8;ctx.beginPath();ctx.moveTo(0,220+i*70);ctx.bezierCurveTo(500,120+i*90,900,760-i*50,1600,300+i*45);ctx.stroke()}}
}
function drawProps(room){
  for(const p of roomProps()){
    const near=dist(P.x,P.y,p[1],p[2])<80;drawProp(p,near)
  }
}
function drawProp(p,near){
  const [id,x,y]=p;
  ctx.save();ctx.translate(x,y);
  if(near){ctx.strokeStyle=K.gold;ctx.lineWidth=2;ctx.beginPath();ctx.arc(0,0,38+Math.sin(G.time*5)*4,0,Math.PI*2);ctx.stroke()}
  if(id.startsWith("npc")){drawNpcSprite(id);ctx.restore();return}
  if(id==="shaxy"){drawCharacter(0,0,"fakeSmall");ctx.restore();return}
  ctx.fillStyle=id==="blood"?K.red:id==="shoe"?K.white:id==="clock"?K.gold:"#67525b";
  if(["photo","notice","poster","score","roll","wish","tape"].includes(id)){ctx.fillRect(-42,-30,84,60);ctx.strokeStyle="#baa9a5";ctx.strokeRect(-42,-30,84,60)}
  else if(["pc1","pc2","pc3","server"].includes(id)){ctx.fillStyle="#11151a";ctx.fillRect(-55,-40,110,80);ctx.strokeStyle=K.cyan;ctx.strokeRect(-55,-40,110,80)}
  else if(["deskA","deskB","table","desk","bed","piano"].includes(id)){ctx.fillRect(-70,-35,140,70);ctx.fillStyle="#372f34";ctx.fillRect(-60,35,12,35);ctx.fillRect(48,35,12,35)}
  else if(["cabinet","safe","locker","booth"].includes(id)){ctx.fillRect(-60,-65,120,130);ctx.strokeStyle="#8b7379";ctx.strokeRect(-60,-65,120,130)}
  else{ctx.beginPath();ctx.arc(0,0,36,0,Math.PI*2);ctx.fill()}
  ctx.restore()
}
function drawNpcSprite(id){
  const kind=id==="npcFinger"?"finger":id==="npcToyz"?"toyz":"god";
  drawCharacter(0,0,kind+"Small")
}
function drawCharacter(x,y,kind){
  ctx.save();ctx.translate(x,y);let coat="#a34243",accent=K.red;
  if(kind.startsWith("shaxy")){coat="#44694f";accent=K.green}
  if(kind.startsWith("fake")){coat="#4d4a51";accent=K.red}
  if(kind.startsWith("finger")){coat="#654c7f";accent=K.purple}
  if(kind.startsWith("toyz")){coat="#6c5d3d";accent=K.gold}
  if(kind.startsWith("god")){coat="#435c77";accent=K.blue}
  ctx.fillStyle="rgba(0,0,0,.3)";ctx.fillRect(-20,25,40,7);
  ctx.fillStyle=coat;ctx.fillRect(-16,-24,32,44);ctx.fillStyle=K.skin;ctx.fillRect(-11,-44,22,20);ctx.fillStyle=K.black;ctx.fillRect(-13,-50,26,10);
  ctx.fillStyle=accent;ctx.fillRect(kind.startsWith("fake")?-7:4,-38,5,4);ctx.restore()
}
function drawHUD(){
  panel(26,742,420,122,.82);txt("羅正男 ＋ 薛喜",48,776,17,K.white);txt(`線索 ${G.clues.size}/12　NPC ${G.miniWins}/3`,48,808,13,K.muted);
  txt("M 地圖　Q 筆記",48,838,13,K.muted);
  if(G.prompt){panel(520,790,560,52,.88);txt(G.prompt,800,824,15,K.gold,"center")}
  if(G.messageT>0){panel(470,680,660,70,.92);wrap(G.message,800,722,600,23,15,K.white,"center")}
}
function drawPortrait(kind,x,y,flip=false,active=true){
  ctx.save();ctx.translate(x,y);if(flip)ctx.scale(-1,1);ctx.globalAlpha=active?1:.42;
  let coat="#a34243",accent=K.red;
  if(kind==="shaxy"){coat="#466e52";accent=K.green}
  if(kind==="fake"){coat="#56505c";accent=K.red}
  if(kind==="finger"){coat="#6f5587";accent=K.purple}
  if(kind==="toyz"){coat="#7c643d";accent=K.gold}
  if(kind==="god"){coat="#466486";accent=K.blue}
  if(kind==="overload"){coat="#814757";accent="#ff7c8a"}
  ctx.fillStyle=coat;ctx.fillRect(-125,-30,250,300);ctx.fillStyle="#e0d8d0";ctx.fillRect(-42,-20,84,255);
  ctx.fillStyle=K.skin;ctx.fillRect(-42,-108,84,82);ctx.fillRect(-100,-265,200,165);
  ctx.fillStyle=K.black;ctx.fillRect(-105,-285,210,56);ctx.fillRect(-100,-250,40,60);ctx.fillRect(60,-250,40,60);
  ctx.fillStyle="#5b403b";ctx.fillRect(-48,-190,20,7);ctx.fillRect(30,-190,20,7);
  ctx.fillStyle=accent;ctx.fillRect(34,-188,9,5);ctx.fillStyle="#7b5048";ctx.fillRect(-20,-132,40,8);
  if(kind==="overload"){ctx.fillStyle="#b75b68";ctx.fillRect(-80,-82,160,34);ctx.fillStyle="#23151a";ctx.fillRect(-28,-152,56,12)}
  ctx.restore()
}
function drawDialogue(){
  drawRoom();ctx.fillStyle="rgba(5,4,8,.54)";ctx.fillRect(0,0,W,H);
  const line=G.dialogue.lines[G.dialogueIndex];
  const other=(G.dialogue.lines.find(v=>v.p!=="roger")||{p:"shaxy"}).p;
  let lk="roger",rk=other;if(line.side==="left"){lk=line.p;rk=line.p==="roger"?"shaxy":"roger"}else{rk=line.p;lk=line.p==="roger"?"shaxy":"roger"}
  drawPortrait(lk,280,610,false,line.side==="left");drawPortrait(rk,1320,610,true,line.side==="right");
  panel(70,620,1460,230,.97);txt(line.who,120,670,24,line.side==="left"?K.cyan:K.gold);wrap(line.t,120,725,1340,38,25,K.white);txt("SPACE / ENTER",1470,824,12,K.muted,"right")
}
const MAP_LAYOUT={
  gate:[190,650],courtyard:[430,650],hall1:[690,650],class203:[600,450],infirmary:[800,450],computer:[1000,450],
  hall2:[1230,650],music:[1100,250],library:[1280,250],staff:[1460,250],gym:[420,250],auditorium:[650,250],
  oldhall:[1330,650],basement:[1430,650]
};

function drawMap(){
  ctx.fillStyle="#09080d";ctx.fillRect(0,0,W,H);panel(90,65,1420,770,.97);txt("紅色學校平面圖",140,115,30,K.white);txt("已探索的安全區可快速移動。事件中、Boss 前與未知房間不能傳送。",140,150,13,K.muted);
  const layout=MAP_LAYOUT;
  const selectable=mapSelectable();
  if(mapIndex>=selectable.length)mapIndex=Math.max(0,selectable.length-1);
  const selected=selectable[mapIndex]||null;
  for(const [id,pos] of Object.entries(layout)){
    const seen=G.visited.has(id);if(!seen)continue;
    const active=G.fastTravel.has(id);
    ctx.fillStyle=id===G.room?"#3b2230":id===selected?"#29322f":active?"#18272a":"#18151d";ctx.fillRect(pos[0]-70,pos[1]-28,140,56);
    ctx.strokeStyle=id===selected?K.gold:id===G.room?K.red:active?K.cyan:"#4a404d";
    ctx.lineWidth=id===selected?3:1;
    ctx.strokeRect(pos[0]-70,pos[1]-28,140,56);
    txt(ROOMS[id].name,pos[0],pos[1]+6,13,id===selected?K.gold:active?K.white:K.muted,"center")
  }
  if(selected)txt(`目前選擇：${ROOMS[selected].name}`,140,755,15,K.gold);
  txt("方向鍵 / WASD 選擇　ENTER / SPACE 移動　也可直接滑鼠點房間　M / ESC 關閉",140,792,13,K.muted)
}
function drawNotes(){
  drawRoom();ctx.fillStyle="rgba(5,4,8,.84)";ctx.fillRect(0,0,W,H);panel(100,70,1400,760,.97);txt("案件筆記",150,125,30,K.white);txt("只記錄你真的調查到的東西。",150,158,13,K.muted);
  let y=210;for(const [a,b] of G.notes){ctx.fillStyle="#17131c";ctx.fillRect(145,y-28,1310,72);ctx.strokeStyle="#403649";ctx.strokeRect(145,y-28,1310,72);txt(a,170,y,18,K.gold);wrap(b,430,y,980,22,14,"#b9b0bd");y+=88}
}
function drawChoice(){
  drawRoom();ctx.fillStyle="rgba(5,4,8,.72)";ctx.fillRect(0,0,W,H);panel(210,180,1180,520,.97);txt(G.dialogue.choiceTitle,260,240,26,K.white);
  G.dialogue.choices.forEach((c,i)=>{const y=340+i*110;ctx.fillStyle=i===G.choiceIndex?"#2b2130":"#17131c";ctx.fillRect(260,y-42,1080,72);ctx.strokeStyle=i===G.choiceIndex?K.gold:"#463a4e";ctx.strokeRect(260,y-42,1080,72);txt(`${i+1}. ${c}`,295,y,20,i===G.choiceIndex?K.gold:K.white)})
}
function drawMini(){
  const m=G.mini;ctx.fillStyle="#09080d";ctx.fillRect(0,0,W,H);
  if(m.type==="photo"){
    txt("調查小遊戲：找出照片中 3 個不自然的地方",100,90,26,K.white);txt(`剩餘 ${m.timer.toFixed(1)} 秒`,1460,90,16,K.gold,"right");
    ctx.fillStyle="#3d3539";ctx.fillRect(170,150,1260,620);
    // class photo blocks
    for(let r=0;r<4;r++)for(let c=0;c<8;c++){ctx.fillStyle=(r*8+c===31)?"#7d4050":"#74645e";ctx.fillRect(240+c*140,220+r*120,62,72);ctx.fillStyle="#d0a184";ctx.fillRect(254+c*140,190+r*120,34,30)}
    [[420,330],[835,360],[1120,505]].forEach((p,i)=>{if(m.found.has(i)){ctx.strokeStyle=K.cyan;ctx.lineWidth=4;ctx.beginPath();ctx.arc(p[0],p[1],48,0,Math.PI*2);ctx.stroke()}})
    txt("點擊你認為異常的細節",800,825,15,K.muted,"center")
  }else if(m.type==="uv"){
    txt("紫外線調查：拖動滑鼠光源，找出三段被擦掉的字",100,90,26,K.white);txt(`剩餘 ${m.timer.toFixed(1)} 秒`,1460,90,16,K.gold,"right");
    ctx.fillStyle="#252229";ctx.fillRect(180,150,1240,600);for(const s of m.spots){if(s.hit){ctx.fillStyle=K.red;ctx.fillRect(s.x-90,s.y-16,180,32);txt("不要相信",s.x,s.y+6,18,K.white,"center")}}
    const g=ctx.createRadialGradient(input.mx,input.my,5,input.mx,input.my,110);g.addColorStop(0,"rgba(180,110,255,.45)");g.addColorStop(1,"rgba(180,110,255,0)");ctx.fillStyle=g;ctx.beginPath();ctx.arc(input.mx,input.my,110,0,Math.PI*2);ctx.fill()
  }else if(m.type==="terminal"){
    txt("電腦教室：四台機器啟動順序",100,90,26,K.white);txt("線索：從最舊到最新，但第 3 台的系統時間倒著走。",100,125,14,K.muted);
    for(let i=0;i<4;i++){const x=230+i*300;ctx.fillStyle="#11151a";ctx.fillRect(x,250,210,170);ctx.strokeStyle=K.cyan;ctx.strokeRect(x,250,210,170);txt(String(i+1),x+105,350,42,K.white,"center")}
    txt("已輸入："+m.slots.map(v=>v+1).join(" → "),800,520,22,K.gold,"center");txt("按 1~4 輸入順序",800,610,15,K.muted,"center")
  }else if(m.type==="rhythm"){
    txt("中指通：六指逆拍",100,80,28,K.white);txt("A S D　J K L",800,120,18,K.gold,"center");const lanes=["A","S","D","J","K","L"];
    for(let i=0;i<6;i++){const x=280+i*170;ctx.fillStyle="#17131c";ctx.fillRect(x,160,110,600);txt(lanes[i],x+55,800,18,K.muted,"center")}
    const t=G.time-m.start;
    for(const n of m.notes){if(n.hit||n.miss)continue;const lane={KeyA:0,KeyS:1,KeyD:2,KeyJ:3,KeyK:4,KeyL:5}[n.key];const y=720-(n.t-t)*320;if(y>-50&&y<760){ctx.fillStyle=K.cyan;ctx.fillRect(300+lane*170,y,70,22)}}
    ctx.strokeStyle=K.red;ctx.lineWidth=3;ctx.strokeRect(260,690,980,45);txt(`SCORE ${m.score}　MISS ${m.miss}　COMBO ${m.combo}`,800,855,16,K.white,"center")
  }else if(m.type==="roll"){
    txt("TOYZ：紙捲競速",100,90,28,K.white);txt("A / D 控制鬆緊　SPACE 捲動",100,130,15,K.muted);
    txt("品質",230,270,18,K.white);ctx.fillStyle="#2c2630";ctx.fillRect(330,245,900,38);ctx.fillStyle=Math.abs(m.quality-55)<18?K.green:K.red;ctx.fillRect(330,245,m.quality*9,38);ctx.strokeStyle=K.gold;ctx.strokeRect(330+55*9-18*9,238,36*9,52);
    txt("你的進度",230,390,18,K.white);ctx.fillStyle="#2c2630";ctx.fillRect(330,365,900,35);ctx.fillStyle=K.cyan;ctx.fillRect(330,365,m.progress*9,35);
    txt("TOYZ",230,510,18,K.white);ctx.fillStyle="#2c2630";ctx.fillRect(330,485,900,35);ctx.fillStyle=K.gold;ctx.fillRect(330,485,m.opponent*9,35)
  }else if(m.type==="poker"){
    txt("統神 vs 薛喜：讀人，不是賭錢",100,90,28,K.white);txt(`薛喜籌碼 ${m.playerChips}　統神 ${m.godChips}`,800,145,18,K.gold,"center");
    panel(260,210,1080,250,.95);txt(`表情：${m.prompt.face}`,320,270,22,K.white);wrap(`細節：${m.prompt.tell}`,320,330,930,32,20,K.muted);
    txt("1 跟注／抓 Bluff　　2 蓋牌／尊重大牌　　3 反向讀取",800,600,19,K.cyan,"center");txt("羅正男：我覺得他沒有啦。",800,690,16,K.red,"center")
  }
}
function drawBoss(){
  const b=G.boss;ctx.fillStyle="#09070c";ctx.fillRect(0,0,W,H);
  if(b.kind==="overload")drawOverload(b);else drawPyramid(b)
}
function drawOverload(b){
  ctx.fillStyle="#31151d";ctx.fillRect(0,0,W,H);for(let i=0;i<20;i++){ctx.fillStyle=i%2?"#3a1821":"#251218";ctx.fillRect(0,i*45,W,28)}
  drawPortrait("overload",800,530,false,true);txt("大肥哥超負荷",800,100,34,K.red,"center");txt(`HP ${Math.max(0,b.hp)}　你 ${"■".repeat(Math.max(0,b.player))}`,800,145,18,K.white,"center");
  if(b.phase===1){txt("PHASE 1：左右嘴砲　A / D 精準防反",800,210,18,K.gold,"center");txt(b.side==="L"?"← 左邊來了":"右邊來了 →",800,700,34,b.attack<.2?K.red:K.white,"center")}
  else if(b.phase===2){txt("PHASE 2：聊天室過載　左右移動躲掉真正攻擊",800,210,18,K.gold,"center");for(let i=0;i<5;i++){ctx.fillStyle=i===b.lane?"#4a3038":"#20171d";ctx.fillRect(360+i*180,560,120,120)}for(const c of b.chat){ctx.fillStyle=c.life<.18?K.red:"#8c6a73";ctx.fillRect(370+c.lane*180,350+c.life*250,100,34)}}
  else{txt("PHASE 3：OVERLOAD　A/D 移動，J/L 對應左右攻擊",800,210,18,K.gold,"center");for(let i=0;i<5;i++){ctx.fillStyle=i===b.lane?"#513640":"#20171d";ctx.fillRect(360+i*180,560,120,120)}txt(b.side==="L"?"J":"L",800,720,48,K.red,"center")}
}
function drawPyramid(b){
  ctx.fillStyle="#050508";ctx.fillRect(0,0,W,H);ctx.strokeStyle=K.gold;ctx.lineWidth=5;ctx.beginPath();ctx.moveTo(800,80);ctx.lineTo(260,760);ctx.lineTo(1340,760);ctx.closePath();ctx.stroke();txt("金字塔紹安",800,105,32,K.gold,"center");txt(`HP ${b.hp}　你 ${"■".repeat(Math.max(0,b.player))}`,800,150,17,K.white,"center");
  if(b.phase===1){
    const qs=[
      ["二年三班真正異常的是？",["黑板","第 32 張桌子","窗簾"],1],
      ["哪個地方的數量對不上外牆？",["音樂教室","二樓窗戶","圖書館書架"],1],
      ["超負荷真正想要的是？",["繼續留校","完成放學前沒完成的三件事","打敗所有學生"],1]
    ],q=qs[b.q];
    if(q){wrap(q[0],800,300,900,40,28,K.white,"center");q[1].forEach((o,i)=>txt(`${i+1}. ${o}`,800,410+i*80,21,i===q[2]?K.gold:K.white,"center"))}
  }else{
    txt("Phase 2：三線金字塔　A/D 移動，SPACE 反擊",800,230,18,K.cyan,"center");
    for(let i=0;i<3;i++){ctx.fillStyle=i===b.lane?"#4e3c22":"#17141b";ctx.fillRect(470+i*260,650,160,90)}
    for(const x of b.bullets){ctx.fillStyle=K.red;ctx.beginPath();ctx.arc(550+x.lane*260,x.y,16,0,Math.PI*2);ctx.fill()}
  }
}
function draw(){
  if(G.mode==="room")drawRoom();
  else if(G.mode==="dialogue")drawDialogue();
  else if(G.mode==="map")drawMap();
  else if(G.mode==="notes")drawNotes();
  else if(G.mode==="choice")drawChoice();
  else if(G.mode==="mini")drawMini();
  else if(G.mode==="boss")drawBoss();
  // vignette
  const g=ctx.createRadialGradient(W/2,H/2,250,W/2,H/2,950);g.addColorStop(0,"rgba(0,0,0,0)");g.addColorStop(1,"rgba(0,0,0,.55)");ctx.fillStyle=g;ctx.fillRect(0,0,W,H)
}

function resetGame(){
  G.running=true;G.paused=false;G.time=0;G.last=0;G.startedAt=performance.now()/1000;G.mode="room";G.room="gate";G.message="";G.messageT=0;G.prompt="";
  G.visited=new Set(["gate"]);G.fastTravel=new Set(["gate"]);G.clues=new Set();G.flags={};G.notes=[];G.ending=null;G.redLevel=0;G.shaxyTrust=0;G.overloadHeart=0;G.pyramidKey=false;G.badCount=0;G.miniWins=0;G.wrongChoices=0;G.mini=null;G.boss=null;
  P.x=250;P.y=620;SHAXY.x=180;SHAXY.y=660;
  startDialogue(DIALOGUES.intro)
}

// map selection
let mapIndex=0;
function mapSelectable(){return [...G.fastTravel]}
function handleMapKey(e){
  const arr=mapSelectable();
  if(!arr.length)return;

  if(e.code==="ArrowLeft"||e.code==="ArrowUp"||e.code==="KeyA"||e.code==="KeyW"){
    e.preventDefault();
    mapIndex=(mapIndex-1+arr.length)%arr.length;
    beep(300,.02);
    return;
  }
  if(e.code==="ArrowRight"||e.code==="ArrowDown"||e.code==="KeyD"||e.code==="KeyS"){
    e.preventDefault();
    mapIndex=(mapIndex+1)%arr.length;
    beep(360,.02);
    return;
  }
  if(e.code==="Enter"||e.code==="Space"){
    e.preventDefault();
    const target=arr[mapIndex];
    if(target){
      changeRoom(target);
      G.mode="room";
    }
    return;
  }
  if(e.code==="KeyM"||e.code==="Escape"){
    G.mode="room";
  }
}
function handleNotesKey(e){if(e.code==="KeyQ"||e.code==="Escape")G.mode="room"}
function handleDialogueKey(e){if(e.code==="Space"||e.code==="Enter"||e.code==="KeyE")nextDialogue();if(e.code==="Escape"){G.dialogue=null;G.mode="room"}}

window.addEventListener("keydown",e=>{
  if(["ArrowUp","ArrowDown","ArrowLeft","ArrowRight","Space"].includes(e.code))e.preventDefault();
  if(!input.held.has(e.code))input.pressed.add(e.code);input.held.add(e.code);
  if(!G.running)return;
  if(G.mode==="dialogue"){handleDialogueKey(e);return}
  if(G.mode==="map"){handleMapKey(e);return}
  if(G.mode==="notes"){handleNotesKey(e);return}
  if(e.code==="Escape"&&G.mode==="room"){G.paused=!G.paused;UI.pause.classList.toggle("show",G.paused)}
});
window.addEventListener("keyup",e=>input.held.delete(e.code));
canvas.addEventListener("mousemove",e=>{const r=canvas.getBoundingClientRect();input.mx=(e.clientX-r.left)/r.width*W;input.my=(e.clientY-r.top)/r.height*H});
canvas.addEventListener("mousedown",()=>{
  input.mouse=true;

  if(G.running && G.mode==="map"){
    const r=canvas.getBoundingClientRect();
    const mx=input.mx, my=input.my;
    const arr=mapSelectable();

    for(const id of arr){
      const pos=MAP_LAYOUT[id];
      if(!pos)continue;
      if(mx>=pos[0]-78 && mx<=pos[0]+78 && my>=pos[1]-36 && my<=pos[1]+36){
        mapIndex=arr.indexOf(id);
        if(id===G.room){
          G.mode="room";
          setMsg("你已經在這裡。",1);
        }else{
          changeRoom(id);
          G.mode="room";
        }
        beep(520,.035);
        break;
      }
    }
  }
});

document.getElementById("startBtn").onclick=()=>{audioCtx=audioCtx||new (window.AudioContext||window.webkitAudioContext)();UI.title.classList.remove("show");resetGame()};
document.getElementById("resumeBtn").onclick=()=>{G.paused=false;UI.pause.classList.remove("show")};
document.getElementById("restartBtn").onclick=()=>{UI.pause.classList.remove("show");resetGame()};
document.getElementById("againBtn").onclick=()=>{UI.ending.classList.remove("show");resetGame()};

function loop(ts){
  const now=ts/1000,dt=Math.min(.033,G.last?now-G.last:.016);G.last=now;
  if(G.running&&!G.paused)update(dt);
  draw();requestAnimationFrame(loop)
}
draw();requestAnimationFrame(loop);
})();