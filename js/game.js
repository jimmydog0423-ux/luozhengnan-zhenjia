(() => {
"use strict";

const $ = (id) => document.getElementById(id);
const UI = {
  roomArtUse: $("roomArtUse"), objectLayer: $("objectLayer"), roomName: $("roomName"), roomSub: $("roomSub"),
  clueCount: $("clueCount"), winCount: $("winCount"), roomProgress: $("roomProgress"), objectiveText: $("objectiveText"), messageBox: $("messageBox"),
  title: $("titleOverlay"), modal: $("modalOverlay"), modalCard: $("modalCard"), modalBody: $("modalBody"), modalClose: $("modalClose"),
  pause: $("pauseOverlay"), ending: $("endingOverlay"), endingTitle: $("endingTitle"), endingText: $("endingText"), endingStats: $("endingStats"),
  continueBtn: $("continueBtn"), hintBtn: $("hintBtn"), saveStatus: $("saveStatus")
};

const SAVE_KEY = "red_school_roger_click_v3";
const RUN_KEY = "red_school_roger_run_v3";
const loadSave = () => { try { return Object.assign({clears:0,badEnds:0,trueEnds:0,best:null}, JSON.parse(localStorage.getItem(SAVE_KEY)||"{}")); } catch { return {clears:0,badEnds:0,trueEnds:0,best:null}; } };
let save = loadSave();
const persist = () => localStorage.setItem(SAVE_KEY, JSON.stringify(save));

const ROOMS = {
  gate:{name:"校門",sub:"紅色學校・正門",doors:[["courtyard",1450,610,"往中庭"]]},
  courtyard:{name:"中庭",sub:"時計停在 00:13",doors:[["gate",140,650,"回校門"],["hall1",1450,610,"一樓走廊"],["gym",780,150,"體育館"],["auditorium",1150,150,"紅色禮堂"]]},
  hall1:{name:"一樓走廊",sub:"教室門牌從 101 開始",doors:[["courtyard",130,610,"回中庭"],["class203",540,170,"二年三班"],["infirmary",950,170,"保健室"],["computer",1370,170,"電腦教室"],["hall2",1450,610,"二樓樓梯"]]},
  class203:{name:"二年三班",sub:"桌椅比名冊多一張",doors:[["hall1",1450,610,"回走廊"]]},
  infirmary:{name:"保健室",sub:"藥櫃玻璃裡有第二層倒影",doors:[["hall1",1450,610,"回走廊"]]},
  computer:{name:"電腦教室",sub:"所有螢幕都停在同一篇舊貼文",doors:[["hall1",1450,610,"回走廊"]]},
  hall2:{name:"二樓走廊",sub:"這裡的窗戶比外牆多一扇",doors:[["hall1",130,610,"回一樓"],["music",540,170,"音樂教室"],["library",960,170,"圖書館"],["staff",1370,170,"教職員室"],["oldhall",1450,610,"舊校舍"]]},
  music:{name:"音樂教室",sub:"沒有插電的節拍器還在動",doors:[["hall2",1450,610,"回走廊"]]},
  library:{name:"圖書館",sub:"同一本校刊被撕掉不同頁",doors:[["hall2",1450,610,"回走廊"]]},
  staff:{name:"教職員室",sub:"點名簿最後一列不是姓名",doors:[["hall2",1450,610,"回走廊"]]},
  gym:{name:"體育館",sub:"看台下有人在等你",doors:[["courtyard",140,650,"回中庭"]]},
  auditorium:{name:"紅色禮堂",sub:"布幕後面的牆是濕的",doors:[["courtyard",140,650,"回中庭"],["boss",1450,610,"舞台深處"]]},
  oldhall:{name:"舊校舍",sub:"地圖上沒有這一區",doors:[["hall2",130,610,"回二樓"],["basement",1450,610,"往地下"]]},
  basement:{name:"地下機房",sub:"電纜像樹根一樣往更深處延伸",doors:[["oldhall",130,610,"回舊校舍"],["pyramid",1450,610,"更下面"]]}
};

const PROPS = {
  gate:[["sign",270,250,"校牌"],["booth",580,330,"警衛室"],["notice",980,270,"公告欄"],["exit",130,650,"離開學校"]],
  courtyard:[["clock",760,210,"停住的鐘"],["tree",420,430,"老榕樹"],["fountain",1020,470,"乾掉的噴水池"],["shoe",1250,570,"單隻室內鞋"]],
  hall1:[["poster",310,270,"破掉的校慶海報"],["locker",700,380,"置物櫃"],["blood",1120,520,"拖行痕跡"]],
  class203:[["deskA",330,350,"31 號桌"],["deskB",610,350,"32 號桌"],["blackboard",820,170,"黑板"],["photo",1260,300,"班級照片"],["drawer",350,570,"抽屜"]],
  infirmary:[["bed",350,350,"病床"],["cabinet",840,260,"藥櫃"],["mirror",1180,280,"鏡子"],["uv",650,560,"紫外線燈"]],
  computer:[["pc1",330,320,"電腦 A"],["pc2",650,320,"電腦 B"],["pc3",970,320,"電腦 C"],["server",1260,270,"伺服器櫃"]],
  hall2:[["window",330,220,"窗戶"],["extra",820,220,"不存在的窗戶"],["radio",1180,450,"無線電"]],
  music:[["piano",310,300,"鋼琴"],["metronome",790,300,"節拍器"],["score",1040,250,"泛黃樂譜"],["npcFinger",1280,560,"中指通"]],
  library:[["shelf",260,240,"校刊書架"],["table",660,420,"閱覽桌"],["photoWall",1120,230,"歷屆照片"],["npcToyz",1280,580,"TOYZ"]],
  staff:[["desk",330,350,"教師桌"],["roll",790,260,"點名簿"],["safe",1170,350,"老式保險箱"],["npcGod",1280,590,"統神"]],
  gym:[["bleacher",330,260,"看台"],["ball",560,600,"籃球"],["locker",1120,500,"器材櫃"]],
  auditorium:[["curtain",360,170,"紅色布幕"],["seat",340,520,"觀眾席"],["wish",1260,300,"後台紙箱"]],
  oldhall:[["locker",320,300,"鏽蝕置物櫃"],["door",720,260,"封死的教室"],["shaxy",1130,520,"薛喜？"],["stairs",1300,400,"地下樓梯"]],
  basement:[["panel",310,280,"主配電盤"],["cable",750,420,"紅色電纜"],["tape",1210,300,"舊錄音帶"]]
};

const CLUE_INFO = {
  shoe:["單隻室內鞋","鞋底沾著紅色粉末，尺寸比羅正男小。"], photo32:["多出來的第 32 張桌子","名冊只有 31 人，照片卻在最右側多出模糊身影。"],
  uv:["鏡面上的字","紫外線下寫著：『不要相信會叫你阿傑的人。』"], post:["舊貼文","有人在十年前就提到『00:13 後會多出一間紅色教室』。"],
  window:["多出來的窗","從中庭數外牆只有 7 扇，二樓走廊內側卻有 8 扇。"], score:["逆拍樂譜","樂譜每第四小節都故意少一拍。"],
  yearbook:["被改過的校刊","每屆照片裡都出現同一個肥胖男生，但名字被塗掉。"], roll:["點名簿最後一列","最後一列不是姓名，而是『還沒放學』。"],
  cable:["紅色電纜","不是學校原有線路，全部通向禮堂地下。"], tape:["錄音帶","有人說：『他不是源頭，只是被留在這裡。真正的東西在金字塔下面。』"],
  heart1:["心願碎片：便當袋","寫著『想再吃一次下課後的雞排』。"], heart2:["心願碎片：遊戲卡","背面寫著『想贏一次，不要再被笑』。"], heart3:["心願碎片：畢業照","照片背面只寫『想跟大家一起畢業』。 "]
};

const DIALOGUES = {
  intro:[
    {who:"羅正男",p:"roger",t:"所以我們半夜跑來廢校，是因為聊天室說這裡有鬼？"},
    {who:"薛喜",p:"shaxy",t:"不是。是因為三個不同的人都拍到同一扇『不存在的窗戶』。"},
    {who:"羅正男",p:"roger",t:"啊不就窗戶。"},
    {who:"薛喜",p:"shaxy",t:"外牆七扇，裡面八扇。你等一下不要第一個去開第八扇。"},
    {who:"羅正男",p:"roger",t:"我偏要。"}
  ],
  finger:[{who:"中指通",p:"finger",t:"想問音樂教室的事？先證明你手指不是裝飾。"},{who:"羅正男",p:"roger",t:"薛喜你上。"},{who:"薛喜",p:"shaxy",t:"為什麼每次有技術含量的都我？"}],
  toyz:[{who:"TOYZ",p:"toyz",t:"校刊我有看過。但先來個紙捲競速。不是比快而已，捲爛一樣算輸。"},{who:"羅正男",p:"roger",t:"這又是什麼校園社團。"}],
  god:[{who:"統神",p:"god",t:"你們要點名簿後面的密碼？薛喜跟我玩一把。"},{who:"薛喜",p:"shaxy",t:"又我？"},{who:"統神",p:"god",t:"羅正男在旁邊閉嘴就是最大幫忙。"}],
  fakeShaxy:[{who:"薛喜？",p:"shaxy",t:"阿傑，別查了。我找到出口了，跟我走。"}],
  overloadReveal:[{who:"超負荷",p:"overload",t:"你們以為是我把這裡變成這樣？"},{who:"羅正男",p:"roger",t:"不然勒。整間學校都你的聲音。"},{who:"超負荷",p:"overload",t:"我只是一直沒辦法『放學』。它拿我的聲音、我的樣子，叫每個留下來的人繼續陪它。"}],
  pyramidReveal:[{who:"超負荷",p:"overload",t:"你真的把那三件東西找回來了……那我告訴你。"},{who:"超負荷",p:"overload",t:"控制這裡的不是我。地下機房那條紅線，通往一個根本不該存在的地方。"},{who:"薛喜",p:"shaxy",t:"哪裡？"},{who:"超負荷",p:"overload",t:"金字塔。裡面有個一直被叫做『紹安』的東西。別把名字當成真人，這裡的名字都只是面具。"}]
};

let G;
let messageTimer = null;

function freshState(){
  return {running:true,startedAt:performance.now()/1000,room:"gate",visited:new Set(["gate"]),fastTravel:new Set(["gate"]),clues:new Set(),notes:[],examined:new Set(),flags:{},miniWins:0,wrongChoices:0,shaxyTrust:0,overloadHeart:0,pyramidKey:false,dialogue:null,boss:null};
}

function elapsedSeconds(){ return Math.max(0, Math.floor(performance.now()/1000 - G.startedAt)); }
function saveRun(){
  if(!G?.running || G.boss) return;
  const data={
    room:G.room,visited:[...G.visited],fastTravel:[...G.fastTravel],clues:[...G.clues],notes:G.notes,examined:[...G.examined],
    flags:G.flags,miniWins:G.miniWins,wrongChoices:G.wrongChoices,shaxyTrust:G.shaxyTrust,overloadHeart:G.overloadHeart,pyramidKey:G.pyramidKey,elapsed:elapsedSeconds()
  };
  localStorage.setItem(RUN_KEY,JSON.stringify(data));
  refreshContinueButton();
}
function hasRunSave(){ try{return !!JSON.parse(localStorage.getItem(RUN_KEY)||"null")}catch{return false} }
function restoreRun(){
  try{
    const d=JSON.parse(localStorage.getItem(RUN_KEY)||"null"); if(!d)return false;
    G=freshState(); G.room=d.room&&ROOMS[d.room]?d.room:"gate"; G.visited=new Set(d.visited||[G.room]); G.fastTravel=new Set(d.fastTravel||[G.room]);
    G.clues=new Set(d.clues||[]); G.notes=Array.isArray(d.notes)?d.notes:[]; G.examined=new Set(d.examined||[]); G.flags=d.flags||{};
    G.miniWins=d.miniWins||0; G.wrongChoices=d.wrongChoices||0; G.shaxyTrust=d.shaxyTrust||0; G.overloadHeart=d.overloadHeart||0; G.pyramidKey=!!d.pyramidKey;
    G.startedAt=performance.now()/1000-(d.elapsed||0); G.dialogue=null; G.boss=null; return true;
  }catch{return false}
}
function clearRunSave(){ localStorage.removeItem(RUN_KEY); refreshContinueButton(); }
function refreshContinueButton(){ if(UI.continueBtn)UI.continueBtn.hidden=!hasRunSave(); }

function art(symbol, cls="") { return `<svg class="${cls}" viewBox="0 0 300 380" aria-hidden="true"><use href="assets/art.svg#${symbol}" width="100%" height="100%"></use></svg>`; }
function objectSymbol(id){
  if(id.startsWith("npc") || id==="shaxy") return "npc";
  if(["notice","poster","photo","score","roll","wish","tape"].includes(id)) return "obj-paper";
  if(["deskA","deskB","desk","table","bed","piano","bleacher","seat"].includes(id)) return "obj-desk";
  if(["locker","cabinet","safe","drawer","panel","booth"].includes(id)) return "obj-cabinet";
  if(["pc1","pc2","pc3","server","radio","uv","clock"].includes(id)) return "obj-electronics";
  if(["blackboard","mirror","window","extra","photoWall"].includes(id)) return "obj-window";
  if(["metronome"].includes(id)) return "obj-music";
  if(id==="tree") return "obj-tree"; if(id==="fountain") return "obj-fountain"; if(id==="shoe") return "obj-shoe";
  if(id==="ball") return "obj-ball"; if(id==="curtain") return "obj-curtain"; if(id==="stairs") return "obj-stairs"; if(id==="cable"||id==="blood") return "obj-cable";
  if(id==="sign") return "obj-sign"; if(id==="door"||id==="exit") return "door"; return "obj-paper";
}
function propClass(id){ return id.startsWith("npc") || id==="shaxy" ? "npc" : (id==="door"||id==="exit" ? "door" : ""); }

function propKey(room,id){return `${room}:${id}`}
function propDone(room,id){
  const clueByProp={
    "courtyard:shoe":"shoe","class203:photo":"photo32","class203:drawer":"heart1","infirmary:uv":"uv",
    "computer:pc1":"post","computer:pc2":"post","computer:pc3":"post","hall2:extra":"window","music:score":"score",
    "library:photoWall":"yearbook","library:table":"heart2","staff:roll":"roll","auditorium:wish":"heart3","basement:cable":"cable","basement:tape":"tape"
  };
  const clue=clueByProp[propKey(room,id)]; if(clue&&G.clues.has(clue))return true;
  if(room==="music"&&id==="npcFinger")return !!G.flags.fingerWon;
  if(room==="library"&&id==="npcToyz")return !!G.flags.toyzWon;
  if(room==="staff"&&id==="npcGod")return !!G.flags.pokerWon;
  if(room==="oldhall"&&id==="shaxy")return !!G.flags.fakeSeen;
  return false;
}
function roomProgress(){
  const props=PROPS[G.room]||[]; const done=props.filter(([id])=>G.examined.has(propKey(G.room,id))||propDone(G.room,id)).length; return [done,props.length];
}
function bossReady(){return G.clues.has("roll")&&G.clues.has("window")&&G.miniWins>=2}
function objective(){
  if(G.pyramidKey)return G.room==="basement"?"找到地下機房中新出現的入口，面對金字塔紹安。":"前往地下機房，追查控制紅色學校的真正源頭。";
  const hearts=["heart1","heart2","heart3"].filter(x=>G.clues.has(x)).length;
  if(bossReady())return hearts===3?"三個心願碎片已集齊。前往紅色禮堂舞台深處。":"舞台門已可開啟；若想找出真相，先找齊三個心願碎片。";
  const tasks=[]; if(!G.clues.has("window"))tasks.push("確認二樓第八扇窗"); if(!G.clues.has("roll"))tasks.push("取得教職員室點名簿"); if(G.miniWins<2)tasks.push(`完成 NPC 挑戰 ${G.miniWins}/2`);
  return tasks.length?tasks.join("・"):"繼續調查校園異常。";
}
function deductionStatus(){
  const rules=[
    ["舞台門條件",G.clues.has("window")&&G.clues.has("roll")&&G.miniWins>=2,`第八扇窗 ${G.clues.has("window")?"✓":"○"}　點名簿 ${G.clues.has("roll")?"✓":"○"}　NPC 協助 ${Math.min(G.miniWins,2)}/2`],
    ["超負荷的心願",["heart1","heart2","heart3"].every(x=>G.clues.has(x)),`心願碎片 ${["heart1","heart2","heart3"].filter(x=>G.clues.has(x)).length}/3`],
    ["地下的真正源頭",G.clues.has("cable")&&G.clues.has("tape"),`紅色電纜 ${G.clues.has("cable")?"✓":"○"}　舊錄音帶 ${G.clues.has("tape")?"✓":"○"}`]
  ];
  return rules;
}

function renderRoom(){
  const room = ROOMS[G.room];
  UI.roomArtUse.setAttribute("href", `assets/art.svg#room-${G.room}`);
  UI.roomName.textContent = room.name; UI.roomSub.textContent = room.sub;
  UI.clueCount.textContent = G.clues.size; UI.winCount.textContent = G.miniWins;
  const [done,total]=roomProgress(); if(UI.roomProgress)UI.roomProgress.textContent=`${done}/${total}`; if(UI.objectiveText)UI.objectiveText.textContent=objective();
  UI.objectLayer.innerHTML = "";

  for(const [id,x,y,label] of PROPS[G.room]||[]){
    const seen=G.examined.has(propKey(G.room,id)), doneProp=propDone(G.room,id);
    const b = document.createElement("button");
    b.type="button"; b.className=`scene-object ${propClass(id)}${seen?" seen":""}${doneProp?" done":""}`; b.dataset.label=`${doneProp?"已完成":"調查"}：${label}`; b.setAttribute("aria-label",`${doneProp?"已完成":"調查"} ${label}`);
    b.style.left=`${x/16}%`; b.style.top=`${y/9}%`;
    b.innerHTML=`<svg viewBox="0 0 180 180" aria-hidden="true"><use href="assets/art.svg#${objectSymbol(id)}" width="100%" height="100%"></use></svg>${doneProp?'<span class="done-mark">✓</span>':''}`;
    b.addEventListener("click",()=>interactProp(id)); UI.objectLayer.appendChild(b);
  }
  for(const [target,x,y,label] of room.doors){
    const b=document.createElement("button"); b.type="button"; b.className=`scene-object door${target==="boss"&&!bossReady()?" locked":""}${target==="pyramid"&&!G.pyramidKey?" locked":""}`; b.dataset.label=label; b.setAttribute("aria-label",label);
    b.style.left=`${x/16}%`; b.style.top=`${y/9}%`;
    b.innerHTML='<svg viewBox="0 0 100 160" aria-hidden="true"><use href="assets/art.svg#door" width="100%" height="100%"></use></svg>';
    b.addEventListener("click",()=>changeRoom(target)); UI.objectLayer.appendChild(b);
  }
}

function setMsg(text, ms=2400){
  clearTimeout(messageTimer); UI.messageBox.textContent=text; UI.messageBox.classList.add("show");
  messageTimer=setTimeout(()=>UI.messageBox.classList.remove("show"),ms);
}
function addClue(id){
  if(G.clues.has(id)) { setMsg("這條線索已經記錄過了。",1200); return; }
  G.clues.add(id); const c=CLUE_INFO[id]; if(c){G.notes.push(c); setMsg(`取得線索：${c[0]}`);}
  renderRoom(); saveRun();
}

function showModal(html,{closable=true,onClose=null}={}){
  UI.modalBody.innerHTML=html; UI.modal.classList.add("show"); UI.modal.setAttribute("aria-hidden","false"); UI.modalClose.style.display=closable?"block":"none";
  UI.modalClose.onclick=()=>{ if(onClose)onClose(); hideModal(); };
}
function hideModal(){ UI.modal.classList.remove("show"); UI.modal.setAttribute("aria-hidden","true"); UI.modalBody.innerHTML=""; }

function startDialogue(lines,onDone=null){ G.dialogue={lines,index:0,onDone}; renderDialogue(); }
function renderDialogue(){
  const d=G.dialogue, line=d.lines[d.index];
  showModal(`<div class="dialogue-layout"><div class="portrait">${art(`portrait-${line.p}`)}</div><div><div class="eyebrow">DIALOGUE</div><div class="dialogue-who">${line.who}</div><div class="dialogue-text">${line.t}</div><div class="dialogue-actions"><button id="dialogueNext" class="primary" type="button">${d.index===d.lines.length-1?"結束對話":"下一句"}</button></div></div></div>`,{closable:false});
  $("dialogueNext").onclick=()=>{ d.index++; if(d.index>=d.lines.length){ const cb=d.onDone; G.dialogue=null; hideModal(); if(cb)cb(); } else renderDialogue(); };
}
function showChoice(title,choices,onChoice){
  showModal(`<div class="eyebrow">CHOICE</div><h2 class="modal-title">${title}</h2><div id="choiceButtons" class="grid-buttons"></div>`,{closable:false});
  const box=$("choiceButtons"); choices.forEach((c,i)=>{const b=document.createElement("button");b.type="button";b.textContent=c;b.onclick=()=>{hideModal();onChoice(i)};box.appendChild(b)});
}

function changeRoom(id){
  if(id==="boss"){ startOverloadBoss(); return; }
  if(id==="pyramid"){ if(G.pyramidKey) startPyramidBoss(); else setMsg("下面只有封死的牆。你還不知道真正入口在哪。"); return; }
  G.room=id; G.visited.add(id); G.fastTravel.add(id); renderRoom(); saveRun();
}

function interactProp(id){
  G.examined.add(propKey(G.room,id)); saveRun(); renderRoom();
  if(id==="exit"){ endGame("BAD END：放學","羅正男覺得事情太麻煩，直接離開。隔天早上，薛喜的手機仍留在學校裡，但沒有人記得他什麼時候回去過。","bad"); return; }
  if(G.room==="courtyard"&&id==="shoe") return addClue("shoe");
  if(G.room==="class203"&&id==="photo"){ if(!G.flags.photoGame){G.flags.photoGame=true;startPhotoMini()} else addClue("photo32"); return; }
  if(G.room==="class203"&&id==="drawer"){G.overloadHeart=Math.max(G.overloadHeart,1);return addClue("heart1")}
  if(G.room==="infirmary"&&id==="uv") return startUvMini();
  if(G.room==="computer"&&["pc1","pc2","pc3"].includes(id)) return startTerminalMini();
  if(G.room==="hall2"&&id==="extra") return addClue("window");
  if(G.room==="music"&&id==="score") return addClue("score");
  if(G.room==="music"&&id==="npcFinger"){ if(!G.flags.fingerWon) startDialogue(DIALOGUES.finger,startRhythmMini); else setMsg("中指通：你手指確實能用。"); return; }
  if(G.room==="library"&&id==="photoWall"){ if(G.flags.toyzWon)addClue("yearbook"); else setMsg("照片牆缺一張標示頁。TOYZ 說他看過。"); return; }
  if(G.room==="library"&&id==="npcToyz"){ if(!G.flags.toyzWon)startDialogue(DIALOGUES.toyz,startRollMini); else setMsg("TOYZ：校刊那頁你自己去看啦。"); return; }
  if(G.room==="library"&&id==="table") return addClue("heart2");
  if(G.room==="staff"&&id==="roll"){ if(G.flags.pokerWon)addClue("roll"); else setMsg("點名簿被鎖在透明盒裡。統神拿著鑰匙。"); return; }
  if(G.room==="staff"&&id==="npcGod"){ if(!G.flags.pokerWon)startDialogue(DIALOGUES.god,startPokerMini); else setMsg("統神：下一把再說。"); return; }
  if(G.room==="auditorium"&&id==="wish") return addClue("heart3");
  if(G.room==="oldhall"&&id==="shaxy"){ if(!G.flags.fakeSeen){G.flags.fakeSeen=true;saveRun();startDialogue(DIALOGUES.fakeShaxy,startFakeChoice)} else setMsg("那個『薛喜』已經不見了。"); return; }
  if(G.room==="basement"&&id==="cable") return addClue("cable");
  if(G.room==="basement"&&id==="tape") return addClue("tape");
  setMsg(genericPropText(G.room,id));
}
function genericPropText(room,id){
  if(id==="locker"&&room==="hall1")return "置物櫃裡塞著很多沒領走的學生證，最下面一張照片被刮掉臉。";
  if(id==="locker"&&room==="oldhall")return "鏽蝕的門縫裡傳出手機震動，但打開後只有一條紅線。";
  const map={sign:"校名被紅漆蓋掉，只剩『紅色學校』四個字。",booth:"警衛室裡沒有灰塵，像今天還有人使用。",notice:"公告日期全部停在同一天：7 月 14 日。",clock:"時鐘停在 00:13，但秒針還在微微抖。",tree:"樹根纏著幾條褪色紅線。",fountain:"池底有很多硬幣，但全部都是同一年。",poster:"海報上的表演名單有一個名字被整塊挖掉。",blood:"不是血，是紅色粉筆灰。",deskA:"普通的學生桌，桌底刻著『不要坐 32』。",deskB:"桌面比其他桌乾淨，像剛被放進來。",blackboard:"黑板角落寫著：『31 + 1 = 32？』",bed:"病床床單底下壓著一根紅線。",cabinet:"藥罐標籤全部被換成學生名字。",mirror:"你和薛喜的倒影慢了半拍。",server:"伺服器上只有一個資料夾：RED_SCHOOL_ARCHIVE。",window:"外面數得到七扇窗。",radio:"無線電偶爾傳出一個人喘氣的聲音。",piano:"有一個琴鍵按下去沒有聲音，卻會讓門外的燈閃一下。",metronome:"節拍器一直卡在 13、13、13、13。",shelf:"每一本校刊的第 32 頁都被撕掉。",safe:"保險箱不是鎖著，是從裡面被頂住。",bleacher:"看台底下貼滿『今天可以放學嗎』的紙條。",ball:"籃球裡面有東西在滾。",curtain:"布幕背後有非常新的手掌印。",seat:"所有椅子都朝舞台，只有最後一張朝出口。",door:"門把被紅線纏死。",stairs:"樓梯往下，但從外面看學校根本沒有地下室。",panel:"配電盤上有一條完全不在圖紙裡的紅色迴路。"};
  return map[id]||"看起來普通，但你總覺得哪裡不對。";
}

function openMap(){
  let html='<div class="eyebrow">FAST TRAVEL</div><h2 class="modal-title">紅色學校平面圖</h2><p>到過的房間可以直接移動；尚未踏入的區域會保留鎖定狀態。</p><div id="mapGrid" class="map-grid"></div>';
  showModal(html); const box=$("mapGrid");
  Object.entries(ROOMS).forEach(([id,room])=>{
    const visited=G.fastTravel.has(id), b=document.createElement("button"); b.type="button"; b.disabled=!visited;
    b.className=[id===G.room?"current":"",visited?"visited":"locked-map"].filter(Boolean).join(" ");
    b.innerHTML=`<b>${visited?(id===G.room?"● ":"✓ "):"🔒 "}${room.name}</b><small>${visited?room.sub:"尚未探索"}</small>`;
    if(visited)b.onclick=()=>{hideModal();changeRoom(id)}; box.appendChild(b);
  });
}
function openNotes(){
  const notes=G.notes.length?G.notes.map(([a,b])=>`<div class="note"><b>${a}</b><span>${b}</span></div>`).join(""):"<p>目前還沒有記錄到線索。</p>";
  const deductions=deductionStatus().map(([name,ok,detail])=>`<div class="deduction ${ok?"complete":""}"><div><b>${ok?"✓":"○"} ${name}</b><span>${detail}</span></div><strong>${ok?"推理成立":"尚缺線索"}</strong></div>`).join("");
  showModal(`<div class="eyebrow">CASE NOTES</div><h2 class="modal-title">案件筆記</h2><div class="case-summary"><span>線索 ${G.clues.size}/13</span><span>NPC 協助 ${G.miniWins}</span><span>探索房間 ${G.visited.size}/${Object.keys(ROOMS).length}</span></div><h3>推理進度</h3><div class="deduction-list">${deductions}</div><h3>已取得線索</h3><div class="notes-list">${notes}</div>`);
}

function startPhotoMini(){
  const found=new Set();
  showModal(`<div class="eyebrow">INVESTIGATION</div><h2>班級照片：找出 3 個異常點</h2><div class="mini-stage"><svg viewBox="0 0 1600 900"><use href="assets/art.svg#mini-photo" width="1600" height="900"></use></svg><button class="hotspot" data-i="0" style="left:23%;top:33%" aria-label="照片異常點一"></button><button class="hotspot" data-i="1" style="left:54%;top:43%" aria-label="照片異常點二"></button><button class="hotspot" data-i="2" style="left:79%;top:62%" aria-label="照片異常點三"></button></div><p id="miniStatus">找到 0 / 3</p>`,{closable:true});
  document.querySelectorAll(".hotspot").forEach(b=>b.onclick=()=>{b.classList.add("found");found.add(Number(b.dataset.i));$("miniStatus").textContent=`找到 ${found.size} / 3`;if(found.size===3){setTimeout(()=>{hideModal();G.miniWins++;addClue("photo32")},250)}});
}
function startUvMini(){
  const found=new Set();
  showModal(`<div class="eyebrow">INVESTIGATION</div><h2>紫外線調查：照出被擦掉的 3 段字</h2><div class="mini-stage"><svg viewBox="0 0 1600 900"><use href="assets/art.svg#mini-uv" width="1600" height="900"></use></svg><button class="hotspot" data-i="0" style="left:32%;top:34%" aria-label="紫外線痕跡一"></button><button class="hotspot" data-i="1" style="left:56%;top:54%" aria-label="紫外線痕跡二"></button><button class="hotspot" data-i="2" style="left:74%;top:33%" aria-label="紫外線痕跡三"></button></div><p id="miniStatus">找到 0 / 3</p>`,{closable:true});
  document.querySelectorAll(".hotspot").forEach(b=>b.onclick=()=>{b.classList.add("found");found.add(Number(b.dataset.i));$("miniStatus").textContent=`找到 ${found.size} / 3`;if(found.size===3){setTimeout(()=>{hideModal();G.miniWins++;addClue("uv")},250)}});
}
function startTerminalMini(){
  const code=[2,0,1,3], slots=[];
  const draw=()=>{showModal(`<div class="eyebrow">TERMINAL</div><h2>四台機器啟動順序</h2><p>線索：從最舊到最新，但第 3 台的系統時間倒著走。</p><div class="sequence">${slots.map(x=>`<span>${x+1}</span>`).join("")||"<span>尚未輸入</span>"}</div><div id="terminalButtons" class="grid-buttons"></div>`,{closable:true});const box=$("terminalButtons");[0,1,2,3].forEach(i=>{const b=document.createElement("button");b.textContent=`電腦 ${i+1}`;b.onclick=()=>{slots.push(i);if(slots.length===4){const ok=slots.every((v,n)=>v===code[n]);if(ok){hideModal();G.miniWins++;addClue("post");return}G.wrongChoices++;slots.length=0;setMsg("順序錯了，四台電腦全部重新關機。") }draw()};box.appendChild(b)})}; draw();
}
function startRhythmMini(){
  const seq=[0,2,1,4,3,5,0,5,2,4,1,3], names=["左一","左二","左三","右一","右二","右三"]; let pos=0,miss=0;
  const draw=()=>{showModal(`<div class="eyebrow">RHYTHM</div><h2>中指通：六指逆拍</h2><p>不用鍵盤。看亮起來的拍點，直接點六個節拍區。</p><div class="sequence">${seq.map((_,i)=>`<span class="${i<pos?"done":i===pos?"now":""}">${i<pos?"✓":i===pos?"●":"·"}</span>`).join("")}</div><div id="rhythmButtons" class="grid-buttons"></div><p>失誤：${miss}</p>`,{closable:true});const box=$("rhythmButtons");names.forEach((n,i)=>{const b=document.createElement("button");b.textContent=n;if(i===seq[pos])b.classList.add("primary");b.onclick=()=>{if(i===seq[pos])pos++;else{miss++;G.wrongChoices++}if(pos>=seq.length){hideModal();if(miss<=4){G.flags.fingerWon=true;G.miniWins++;addClue("score");setMsg("中指通：可以。你有跟上逆拍。") }else setMsg("中指通：失誤太多，再練一次。");renderRoom();return}draw()};box.appendChild(b)})};draw();
}
function startRollMini(){
  let quality=55, progress=0, opponent=0;
  const draw=()=>{showModal(`<div class="eyebrow">TOYZ CHALLENGE</div><h2>紙捲競速</h2><p>用按鈕調整鬆緊，品質保持在綠區時再捲動。</p><h3>品質 ${quality}</h3><div class="meter"><i style="width:${quality}%"></i></div><h3>你的進度 ${progress}%</h3><div class="meter"><i style="width:${progress}%"></i></div><p>TOYZ 進度：${opponent}%</p><div class="grid-buttons"><button id="loose">放鬆</button><button id="roll" class="primary">捲動</button><button id="tight">拉緊</button></div>`,{closable:true});
    $("loose").onclick=()=>act(-9,0);$("tight").onclick=()=>act(9,0);$("roll").onclick=()=>act(0,15);
  };
  function act(q,p){quality=Math.max(0,Math.min(100,quality+q));opponent=Math.min(100,opponent+(p?10:5));if(p)progress=Math.min(100,progress+(quality>=37&&quality<=73?p:5));if(progress>=100){hideModal();G.flags.toyzWon=true;G.miniWins++;setMsg("TOYZ：速度有，品質也有。去看照片牆。");renderRoom();saveRun();return}if(opponent>=100){hideModal();G.wrongChoices++;setMsg("TOYZ：太鬆、太緊、太慢都不行。");return}draw()} draw();
}
function startPokerMini(){
  let round=0,player=6,god=6;const patterns=[{face:"快跟",tell:"看牌後立刻整理籌碼",truth:"strong"},{face:"皺眉",tell:"嘴上一直說爛牌，手卻沒放鬆",truth:"strong"},{face:"安靜",tell:"第一次沒有碎念",truth:"bluff"},{face:"大聲",tell:"突然一直催你快點",truth:"bluff"}];
  const draw=()=>{const p=patterns[round%patterns.length];showModal(`<div class="eyebrow">READING GAME</div><h2>統神 vs 薛喜：讀人</h2><p>薛喜籌碼 ${player}　統神 ${god}</p><div class="note"><b>表情：${p.face}</b><span>${p.tell}</span></div><div id="pokerButtons" class="grid-buttons"></div>`,{closable:true});const opts=["跟注／抓 Bluff","蓋牌／尊重大牌","反向讀取"];const box=$("pokerButtons");opts.forEach((t,i)=>{const b=document.createElement("button");b.textContent=t;b.onclick=()=>play(i,p.truth);box.appendChild(b)})};
  function play(choice,truth){let win=choice===0?truth==="bluff":choice===1?truth==="strong":round%2===0;if(win){player+=2;god-=2}else{player-=2;god+=2;G.wrongChoices++}round++;if(player<=0||god<=0||round>=4){hideModal();if(player>god){G.flags.pokerWon=true;G.miniWins++;setMsg("統神：可以啦。點名簿你拿去。");renderRoom();saveRun()}else setMsg("統神：你們兩個讀人能力還要練。");return}draw()}draw();
}
function startFakeChoice(){ showChoice("你面前有兩個選擇。",["跟這個薛喜走","用無線電叫真正的薛喜報暗號"],i=>{if(i===0)endGame("BAD END：另一個薛喜","你跟著他走進不存在的四樓。真正的薛喜在無線電另一端不斷叫你，但樓梯已經沒有回頭路。","bad");else{G.shaxyTrust++;saveRun();setMsg("無線電那端的薛喜罵了一句你才聽得懂的話。眼前的『薛喜』笑容瞬間僵住，然後消失。")}}); }

function startOverloadBoss(){
  if(!bossReady()){const missing=[];if(!G.clues.has("window"))missing.push("第八扇窗");if(!G.clues.has("roll"))missing.push("點名簿");if(G.miniWins<2)missing.push(`NPC 協助 ${G.miniWins}/2`);setMsg(`舞台深處仍被鎖住：還缺 ${missing.join("、")}。`,3600);return}
  G.boss={kind:"overload",phase:1,hp:30,player:5,side:Math.random()<.5?"L":"R",danger:Math.floor(Math.random()*5),round:0,selectedLane:null};renderBoss();
}
function renderBoss(){
  const b=G.boss;if(!b)return; if(b.kind==="pyramid")return renderPyramid();
  let controls="",log="";
  if(b.phase===1){log=`嘴砲從${b.side==="L"?"左邊":"右邊"}壓過來。點正確方向反擊。`;controls=`<div class="grid-buttons"><button data-side="L">左側反擊</button><button data-side="R">右側反擊</button></div>`}
  else if(b.phase===2){log=`聊天室爆點鎖定第 ${b.danger+1} 區。點其他區域閃避。`;controls=`<div id="laneButtons" class="grid-buttons">${[0,1,2,3,4].map(i=>`<button data-lane="${i}">第 ${i+1} 區</button>`).join("")}</div>`}
  else{log=`OVERLOAD：第 ${b.danger+1} 區有攻擊，嘴砲來自${b.side==="L"?"左":"右"}側。先選安全區，再反擊。`;controls=`<div id="laneButtons" class="grid-buttons">${[0,1,2,3,4].map(i=>`<button data-lane="${i}" class="${b.selectedLane===i?"primary":""}">第 ${i+1} 區</button>`).join("")}</div><div class="grid-buttons"><button data-side="L">左側反擊</button><button data-side="R">右側反擊</button></div>`}
  showModal(`<div class="boss-panel"><div class="boss-art">${art("portrait-overload")}</div><div><div class="eyebrow">BOSS</div><h2>大肥哥超負荷</h2><div class="hp">HP ${Math.max(0,b.hp)}　／　羅正男 ${Math.max(0,b.player)} HP</div><div class="boss-log">${log}</div>${controls}</div></div>`,{closable:false});
  document.querySelectorAll("[data-side]").forEach(x=>x.onclick=()=>overloadSide(x.dataset.side));document.querySelectorAll("[data-lane]").forEach(x=>x.onclick=()=>overloadLane(Number(x.dataset.lane)));
}
function overloadSide(side){const b=G.boss;if(b.phase===1){if(side===b.side)b.hp--;else{b.player--;G.wrongChoices++}if(b.player<=0)return bossBad();if(b.hp<=20){b.phase=2;b.round=0}b.side=Math.random()<.5?"L":"R";renderBoss();return}if(b.phase===3){if(b.selectedLane==null){setMsg("先選一個安全區。");return}if(b.selectedLane===b.danger){b.player--;G.wrongChoices++}if(side===b.side)b.hp--;else{b.player--;G.wrongChoices++}if(b.player<=0)return bossBad();if(b.hp<=0)return overloadDefeated();b.selectedLane=null;b.side=Math.random()<.5?"L":"R";b.danger=Math.floor(Math.random()*5);renderBoss()}}
function overloadLane(lane){const b=G.boss;if(b.phase===2){if(lane===b.danger){b.player--;G.wrongChoices++}b.round++;if(b.player<=0)return bossBad();if(b.round>=7){b.phase=3;b.hp=10;b.selectedLane=null}else b.danger=Math.floor(Math.random()*5);renderBoss();return}if(b.phase===3){b.selectedLane=lane;renderBoss()}}
function bossBad(){hideModal();G.boss=null;endGame("BAD END：過載","聊天室、音樂、畫面與叫聲同時壓上來。羅正男最後分不清哪一個提示是真的。","bad")}
function overloadDefeated(){hideModal();G.boss=null;if(G.clues.has("heart1")&&G.clues.has("heart2")&&G.clues.has("heart3"))startDialogue(DIALOGUES.overloadReveal,startOverloadChoice);else endGame("NORMAL END：超負荷","你擊敗了紅色禮堂裡的超負荷。學校暫時安靜，但地下機房仍有紅光。你們帶著『應該結束了吧』的錯覺離開。","normal")}
function startOverloadChoice(){showChoice("超負荷沒有繼續攻擊。你要怎麼做？",["離開，事情已經解決","把三個心願碎片交給他"],i=>{if(i===0)endGame("NORMAL END：差一步","你選擇離開。超負荷沒有追上來，但他最後一句『不是我』一直留在羅正男腦中。","normal");else startDialogue(DIALOGUES.pyramidReveal,()=>{G.pyramidKey=true;G.room="basement";G.visited.add("basement");G.fastTravel.add("basement");renderRoom();saveRun();setMsg("TRUE ROUTE：地下機房出現新的門。")})})}

function startPyramidBoss(){G.boss={kind:"pyramid",phase:1,hp:10,player:4,q:0,danger:Math.floor(Math.random()*3)};renderPyramid()}
function renderPyramid(){const b=G.boss;const qs=[["二年三班真正異常的是？",["黑板","第 32 張桌子","窗簾"],1],["哪個地方的數量對不上外牆？",["音樂教室","二樓窗戶","圖書館書架"],1],["超負荷真正想要的是？",["繼續留校","完成放學前沒完成的三件事","打敗所有學生"],1]];let body;if(b.phase===1){const q=qs[b.q];body=`<div class="boss-log">${q[0]}</div><div id="pyramidChoices" class="grid-buttons">${q[1].map((x,i)=>`<button data-q="${i}">${x}</button>`).join("")}</div>`}else{body=`<div class="boss-log">紅線落在第 ${b.danger+1} 線。點安全線反擊。</div><div id="pyramidLanes" class="grid-buttons">${[0,1,2].map(i=>`<button data-lane="${i}">第 ${i+1} 線</button>`).join("")}</div>`}showModal(`<div class="boss-panel"><div class="boss-art">${art("portrait-pyramid")}</div><div><div class="eyebrow">HIDDEN BOSS</div><h2>金字塔紹安</h2><div class="hp">HP ${b.hp}　／　羅正男 ${b.player} HP</div>${body}</div></div>`,{closable:false});document.querySelectorAll("[data-q]").forEach(x=>x.onclick=()=>pyramidAnswer(Number(x.dataset.q),qs[b.q][2]));document.querySelectorAll("#pyramidLanes [data-lane]").forEach(x=>x.onclick=()=>pyramidLane(Number(x.dataset.lane)))}
function pyramidAnswer(i,correct){const b=G.boss;if(i===correct)b.q++;else{b.player--;G.wrongChoices++}if(b.player<=0){hideModal();G.boss=null;return endGame("BAD END：錯誤的學校","你把錯誤的記憶當成真相。金字塔重新排列所有房間，紅色學校從此只剩下錯誤版本。","bad")}if(b.q>=3)b.phase=2;renderPyramid()}
function pyramidLane(lane){const b=G.boss;if(lane===b.danger){b.player--;G.wrongChoices++}else b.hp--;if(b.player<=0){hideModal();G.boss=null;return endGame("BAD END：BAN","畫面只剩 CONNECTION LOST。你以為重新整理能解決一切，但紅色學校從此再也沒有入口。","bad")}if(b.hp<=0){hideModal();G.boss=null;return endGame("TRUE END：金字塔之下","紅色電纜終於熄滅。超負荷第一次走出禮堂，學校的第八扇窗在天亮前消失。羅正男問：『所以真的結束了？』薛喜沒有回答。","true")}b.danger=Math.floor(Math.random()*3);renderPyramid()}

function endGame(title,text,type="bad"){
  G.running=false; clearRunSave(); save.clears++; if(type==="bad")save.badEnds++; if(type==="true")save.trueEnds++;
  const sec=Math.floor(performance.now()/1000-G.startedAt); if(save.best==null||sec<save.best)save.best=sec; persist(); hideModal();
  UI.endingTitle.textContent=title; UI.endingText.textContent=text; UI.endingStats.innerHTML=[["線索",`${G.clues.size}/13`],["挑戰",String(G.miniWins)],["錯誤選擇",String(G.wrongChoices)],["結局",type.toUpperCase()]].map(([a,b])=>`<div class="stat">${a}<b>${b}</b></div>`).join(""); UI.ending.classList.add("show");
}

function resetGame(){clearRunSave();G=freshState();UI.pause.classList.remove("show");UI.ending.classList.remove("show");hideModal();renderRoom();saveRun();startDialogue(DIALOGUES.intro,saveRun)}
function continueGame(){if(!restoreRun()){setMsg("找不到可用的自動存檔。");refreshContinueButton();return}UI.title.classList.remove("show");UI.pause.classList.remove("show");UI.ending.classList.remove("show");hideModal();renderRoom();setMsg("已載入上次的調查進度。") }

$("startBtn").onclick=()=>{UI.title.classList.remove("show");resetGame()};
if(UI.continueBtn)UI.continueBtn.onclick=continueGame;
$("mapBtn").onclick=()=>{if(G?.running)openMap()}; $("notesBtn").onclick=()=>{if(G?.running)openNotes()};
if(UI.hintBtn)UI.hintBtn.onclick=()=>{const on=!UI.objectLayer.classList.contains("hint-mode");UI.objectLayer.classList.toggle("hint-mode",on);UI.hintBtn.classList.toggle("primary",on);UI.hintBtn.setAttribute("aria-pressed",String(on));UI.hintBtn.textContent=on?"隱藏互動點":"顯示互動點"};
$("pauseBtn").onclick=()=>{if(G?.running){saveRun();if(UI.saveStatus)UI.saveStatus.textContent=`已自動儲存：${ROOMS[G.room].name}・${G.clues.size}/13 線索`;UI.pause.classList.add("show")}}; $("resumeBtn").onclick=()=>UI.pause.classList.remove("show");
$("restartBtn").onclick=resetGame; $("againBtn").onclick=resetGame;

G=freshState(); G.running=false; renderRoom(); refreshContinueButton();
})();
