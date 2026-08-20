(() => {
  "use strict";

  const OLD_TITLE = /統神\s*(?:vs|VS)\s*薛喜\s*[:：]\s*讀人/i;
  const SUITS = ["♠", "♥", "♦", "♣"];
  const RANKS = [2,3,4,5,6,7,8,9,10,11,12,13,14];
  const RANK_LABEL = {11:"J",12:"Q",13:"K",14:"A"};
  const STREET = ["PRE-FLOP", "FLOP", "TURN", "RIVER"];
  const DECISION_MS = 12000;
  const MAX_HANDS = 5;

  let bridgeMode = false;
  let session = null;
  let originalButtons = [];

  const TELLS = {
    freeze: ["統神忽然不講話，手停在籌碼上。","他整個人定住，只盯著桌面。","他把背挺直，這次沒有立刻碎念。"],
    fidget: ["他把兩枚籌碼換了位置，又換回去。","手指敲了兩下桌邊，第三下突然停住。","他碰了一下牌角，很快把手收回去。"],
    glance: ["他先看你的籌碼，再掃一眼公共牌。","視線在你的手和牌桌間來回一次。","他抬眼看你半秒，又低頭看牌。"],
    breathe: ["他往後靠，呼吸比剛才慢。","肩膀放鬆，下注前多停了半拍。","他靠回椅背，像是在等你先動。"],
    snap: ["籌碼幾乎沒有停頓就被推進中央。","這次下注速度明顯比上一輪快。","他用指尖把籌碼彈進底池，動作很乾脆。"]
  };

  function shuffle(a){
    for(let i=a.length-1;i>0;i--){
      const j=Math.floor(Math.random()*(i+1));
      [a[i],a[j]]=[a[j],a[i]];
    }
    return a;
  }
  function freshDeck(){ return shuffle(SUITS.flatMap(s=>RANKS.map(r=>({r,s})))); }
  function rankText(r){ return RANK_LABEL[r] || String(r); }
  function red(c){ return c && (c.s==="♥" || c.s==="♦"); }
  function cardHTML(c,{hidden=false,slot=false,cls="",delay=0}={}){
    if(slot) return `<div class="adv-card-slot"></div>`;
    if(hidden) return `<div class="adv-card card-back ${cls}" style="--delay:${delay}ms"><i></i></div>`;
    return `<div class="adv-card ${red(c)?"red":""} ${cls}" style="--delay:${delay}ms"><b>${rankText(c.r)}</b><span>${c.s}</span><em>${c.s}</em></div>`;
  }

  function compareScore(a,b){
    for(let i=0;i<Math.max(a.length,b.length);i++){
      const d=(a[i]||0)-(b[i]||0);
      if(d) return d;
    }
    return 0;
  }
  function eval5(cards){
    const ranks=cards.map(c=>c.r).sort((a,b)=>b-a);
    const counts=new Map(); ranks.forEach(r=>counts.set(r,(counts.get(r)||0)+1));
    const groups=[...counts.entries()].sort((a,b)=>b[1]-a[1]||b[0]-a[0]);
    const flush=cards.every(c=>c.s===cards[0].s);
    const uniq=[...new Set(ranks)]; if(uniq.includes(14)) uniq.push(1); uniq.sort((a,b)=>b-a);
    let straight=0;
    for(let i=0;i<=uniq.length-5;i++) if(uniq[i]-uniq[i+4]===4){ straight=uniq[i]; break; }
    if(flush&&straight) return [8,straight];
    if(groups[0][1]===4) return [7,groups[0][0],groups.find(g=>g[1]===1)?.[0]||0];
    if(groups[0][1]===3&&groups[1]?.[1]>=2) return [6,groups[0][0],groups[1][0]];
    if(flush) return [5,...ranks];
    if(straight) return [4,straight];
    if(groups[0][1]===3) return [3,groups[0][0],...groups.filter(g=>g[1]===1).map(g=>g[0]).sort((a,b)=>b-a)];
    const pairs=groups.filter(g=>g[1]===2).map(g=>g[0]).sort((a,b)=>b-a);
    if(pairs.length>=2){
      const kicker=groups.filter(g=>g[1]===1).map(g=>g[0]).sort((a,b)=>b-a)[0]||0;
      return [2,pairs[0],pairs[1],kicker];
    }
    if(pairs.length===1) return [1,pairs[0],...groups.filter(g=>g[1]===1).map(g=>g[0]).sort((a,b)=>b-a)];
    return [0,...ranks];
  }
  function bestScore(cards){
    if(cards.length<5) return null;
    let best=null,n=cards.length;
    for(let a=0;a<n-4;a++) for(let b=a+1;b<n-3;b++) for(let c=b+1;c<n-2;c++) for(let d=c+1;d<n-1;d++) for(let e=d+1;e<n;e++){
      const s=eval5([cards[a],cards[b],cards[c],cards[d],cards[e]]);
      if(!best||compareScore(s,best)>0) best=s;
    }
    return best;
  }
  function scoreName(s){ return s?["高牌","一對","兩對","三條","順子","同花","葫蘆","四條","同花順"][s[0]]:"未成牌"; }
  function preflopName(h){
    if(h[0].r===h[1].r) return `${rankText(h[0].r)} 口袋對`;
    return `${rankText(Math.max(h[0].r,h[1].r))} 高張`;
  }
  function strength(hole,board){
    if(board.length<3){
      const [a,b]=hole.map(c=>c.r).sort((x,y)=>y-x);
      let s=(a/14)*.34+(b/14)*.15;
      if(a===b) s+=.33+a/75;
      if(hole[0].s===hole[1].s) s+=.07;
      if(Math.abs(a-b)<=2) s+=.05;
      if(a>=12&&b>=10) s+=.08;
      return Math.max(.08,Math.min(.95,s));
    }
    const sc=bestScore(hole.concat(board));
    const base=[.15,.39,.56,.66,.74,.81,.88,.95,.99][sc[0]];
    return Math.min(.995,base+((sc[1]||0)/14)*.045);
  }
  function randomTell(power,bluff){
    let type;
    if(bluff) type=Math.random()<.55?"fidget":"snap";
    else if(power>.72) type=Math.random()<.52?"freeze":"breathe";
    else if(power>.48) type=Math.random()<.5?"glance":"breathe";
    else type=Math.random()<.5?"glance":"fidget";
    if(Math.random()<.28){
      const all=Object.keys(TELLS).filter(x=>x!==type);
      type=all[Math.floor(Math.random()*all.length)];
    }
    const lines=TELLS[type];
    return {type,text:lines[Math.floor(Math.random()*lines.length)]};
  }

  function startTakeover(body, buttons){
    if(session) session.cleanup();
    originalButtons=buttons.slice();

    let alive=true, timer=null, token=0;
    let handNo=0, player=16, god=16, pot=0, street=0;
    let deck=[], playerHole=[], godHole=[], board=[];
    let facing=0, decisionLocked=false, showdown=false;
    let tell={type:"glance",text:"統神把兩張牌壓在桌面上。"};
    let actionText="等待發牌", resultText="", resultTone="";
    let foldCount=0, raiseCount=0, freshStreet=false, dealing=false, handPot=0;

    function cleanup(){
      if(!alive) return;
      alive=false; token++; clearTimeout(timer);
      if(session?.cleanup===cleanup) session=null;
    }
    session={cleanup};
    document.getElementById("modalClose")?.addEventListener("click",cleanup,{once:true});

    const visibleCount=()=>street===0?0:street===1?3:street===2?4:5;
    const visibleBoard=()=>board.slice(0,visibleCount());
    const myHand=()=>visibleCount()<3?preflopName(playerHole):scoreName(bestScore(playerHole.concat(visibleBoard())));

    function setBody(html){ if(alive) body.innerHTML=html; }

    function showRules(){
      setBody(`<div class="poker-v2 poker-rules">
        <div class="eyebrow">HEADS-UP HOLD'EM</div>
        <h2>午夜德州：統神 VS 薛喜</h2>
        <div class="poker-rule-board">
          <div><b>01</b><span>使用 2 張底牌與 5 張公共牌組成最佳牌型。</span></div>
          <div><b>02</b><span>每一輪觀察牌面、下注節奏與對手動作，再決定 Check、Call、Bet、Raise 或 Fold。</span></div>
          <div><b>03</b><span>每次決策都有時間限制；五局後籌碼較多者獲勝，籌碼歸零會提前結束。</span></div>
          <div><b>04</b><span>對手會改變打法，也可能 Bluff。遊戲不提供表情與動作的答案表。</span></div>
        </div>
        <p class="poker-rule-note">只告訴你規則，不告訴你該怎麼讀他。自己看。</p>
        <button id="pokerV2Start" class="primary poker-start" type="button">坐下發牌</button>
      </div>`);
      body.querySelector("#pokerV2Start").onclick=startHand;
    }

    function pay(which,amount){
      if(which==="player"){
        const n=Math.min(player,Math.max(0,amount)); player-=n; pot+=n; animateChips("player",n); return n;
      }
      const n=Math.min(god,Math.max(0,amount)); god-=n; pot+=n; animateChips("opponent",n); return n;
    }
    function award(winner){
      const n=pot; handPot=n;
      if(winner==="player") player+=n;
      else if(winner==="god") god+=n;
      else { const a=Math.floor(n/2); player+=a; god+=n-a; }
      pot=0; return n;
    }

    function startHand(){
      if(!alive) return;
      clearTimeout(timer); token++;
      handNo++; pot=0; street=0; facing=0; showdown=false; resultText=""; resultTone=""; freshStreet=false; dealing=true; handPot=0;
      deck=freshDeck();
      playerHole=[deck.pop(),deck.pop()]; godHole=[deck.pop(),deck.pop()];
      board=[deck.pop(),deck.pop(),deck.pop(),deck.pop(),deck.pop()];
      pay("player",1); pay("god",1);
      tell={type:"glance",text:handNo>MAX_HANDS?"平手。統神把下一副牌直接推進桌面。":"統神把底牌壓低，沒有讓你看到牌面。"};
      actionText=handNo>MAX_HANDS?"SUDDEN DEATH · Ante 1":"雙方 Ante 1";
      render(false);
      const t=++token;
      setTimeout(()=>{ if(alive&&t===token){dealing=false; beginStreet();} },1050);
    }

    function beginStreet(){
      if(!alive) return;
      decisionLocked=false; facing=0; freshStreet=street>0;
      const pwr=strength(godHole,visibleBoard());
      const adapt=Math.min(.15,foldCount*.025)-Math.min(.10,raiseCount*.018);
      const bluff=pwr<.53 && Math.random() < (.18+street*.03+adapt);
      const mood=pwr+(bluff?.30:0)+(Math.random()-.5)*.22;
      tell=randomTell(pwr,bluff);

      if(god<=0||player<=0){ return showdownHand(); }
      if(mood>.70){
        const size=mood>.88?4:mood>.79?3:2;
        facing=pay("god",size);
        actionText=`統神 BET ${facing}`;
      }else{
        actionText="統神 CHECK";
      }
      render(true);
      startTimer();
    }

    function actionsHTML(reraised=false){
      if(facing>0){
        const call=Math.min(player,facing);
        if(reraised) return `<button data-act="fold" class="danger">FOLD<small>放棄本局</small></button><button data-act="call">CALL ${call}<small>跟上反加</small></button>`;
        return `<button data-act="fold" class="danger">FOLD<small>放棄本局</small></button><button data-act="call">CALL ${call}<small>跟注</small></button><button data-act="raise">RAISE<small>加壓 2</small></button>`;
      }
      return `<button data-act="check">CHECK<small>看下一張牌</small></button><button data-act="bet2">BET 2<small>小注試探</small></button><button data-act="bet4">BET 4<small>重注施壓</small></button>`;
    }

    function boardHTML(){
      const n=visibleCount();
      return board.map((c,i)=>{
        if(i>=n) return cardHTML(null,{slot:true});
        const isNew=freshStreet && (street===1?i<3:street===2?i===3:i===4);
        return cardHTML(c,{cls:isNew?"board-reveal":"",delay:(street===1?i*110:0)});
      }).join("");
    }

    function render(decision=false,reraised=false){
      if(!alive) return;
      const oppCards=showdown
        ? godHole.map((c,i)=>cardHTML(c,{cls:"showdown-card",delay:i*150})).join("")
        : godHole.map((_,i)=>cardHTML(null,{hidden:true,cls:dealing?"deal-opponent":"",delay:150+i*130})).join("");
      const myCards=playerHole.map((c,i)=>cardHTML(c,{cls:dealing?"deal-player":"",delay:100+i*130})).join("");
      const stageClass=["poker-v2-stage",dealing?"is-dealing":"",showdown?"is-showdown":"",reraised?"is-reraise":""].filter(Boolean).join(" ");
      setBody(`<div class="poker-v2">
        <div class="poker-v2-head"><div><div class="eyebrow">MIDNIGHT HOLD'EM</div><h2>午夜德州：統神 VS 薛喜</h2></div>
          <div class="poker-score"><span>HAND <b>${handNo}${handNo>MAX_HANDS?" SD":" / "+MAX_HANDS}</b></span><span>薛喜 <b>${player}</b></span><span>統神 <b>${god}</b></span></div></div>
        <div id="pokerV2Stage" class="${stageClass}"><div class="poker-v2-bg"></div>
          <div class="poker-opponent-v2"><div class="poker-avatar-v2 tell-${tell.type}"><img src="assets/characters/tongshen.webp" alt=""><i></i></div><div class="poker-hole-v2">${oppCards}</div><div class="poker-nameplate">統神 <span>${god} CHIPS</span></div></div>
          <div class="poker-table-v2"><div class="street-badge">${STREET[street]}</div><div class="pot-v2">POT <b>${pot||handPot}</b></div><div class="community-v2">${boardHTML()}</div><div class="opponent-action-v2">${actionText}</div><div class="tell-v2"><span>OBSERVE</span>${tell.text}</div>${resultText?`<div class="poker-result-v2 ${resultTone}">${resultText}</div>`:""}</div>
          <div class="poker-player-v2"><div class="poker-hole-v2 player-hole">${myCards}</div><div class="poker-nameplate player">薛喜 <span>${player} CHIPS</span></div><div class="my-hand-v2">目前牌型 <b>${myHand()}</b></div></div>
        </div>
        ${decision?`<div class="poker-decision-v2"><div class="poker-clock"><i></i><span>DECISION</span></div><div class="poker-actions-v2">${actionsHTML(reraised)}</div></div>`:""}
      </div>`);
      if(decision) body.querySelectorAll("[data-act]").forEach(b=>b.onclick=()=>playerAct(b.dataset.act,false));
    }

    function startTimer(){
      clearTimeout(timer);
      timer=setTimeout(()=>playerAct(facing>0?"fold":"check",true),DECISION_MS);
    }

    function playerAct(act,timedOut){
      if(!alive||decisionLocked) return;
      decisionLocked=true; clearTimeout(timer); token++;
      if(act==="fold"){
        foldCount++;
        resultText=timedOut?"TIME OUT · FOLD":"FOLD"; resultTone="lose";
        award("god"); actionText="統神收下底池"; render(false); return nextHandSoon();
      }
      if(act==="check"){
        actionText=timedOut?"時間到 · 薛喜 CHECK":"薛喜 CHECK";
        return nextStreetSoon();
      }
      if(act==="call"){
        const n=pay("player",facing); facing=0; actionText=`薛喜 CALL ${n}`;
        return nextStreetSoon();
      }
      if(act==="raise"){
        raiseCount++;
        const call=facing; const paid=pay("player",call+2); facing=0; actionText=`薛喜 RAISE ${paid}`;
        return opponentVsBet(Math.max(0,paid-call),true);
      }
      const amount=act==="bet4"?4:2;
      const paid=pay("player",amount); raiseCount++;
      actionText=`薛喜 BET ${paid}`;
      return opponentVsBet(paid,false);
    }

    function opponentVsBet(amount,wasRaise){
      const pwr=strength(godHole,visibleBoard());
      const bluffDefend=pwr<.44 && Math.random()<.20;
      const foldChance=pwr<.29?.64:pwr<.44?.34:pwr<.58?.13:.03;
      tell=randomTell(pwr,bluffDefend);
      if(!bluffDefend&&Math.random()<foldChance){
        actionText="統神 FOLD"; resultText="你拿下底池"; resultTone="win"; award("player"); render(false); return nextHandSoon();
      }
      const canReraise=god>amount+2&&player>0;
      const reraise=canReraise && (pwr>.78 || (bluffDefend&&Math.random()<.40));
      if(reraise){
        pay("god",amount); const extra=pay("god",2);
        facing=Math.min(player,extra);
        actionText=`統神 RE-RAISE · 再補 ${facing}`;
        decisionLocked=false; render(true,true); startTimer(); return;
      }
      const n=pay("god",amount); actionText=`統神 CALL ${n}`;
      return nextStreetSoon();
    }

    function nextStreetSoon(){
      const t=++token; render(false);
      setTimeout(()=>{
        if(!alive||t!==token) return;
        if(street>=3||player<=0||god<=0) showdownHand();
        else { street++; beginStreet(); }
      },720);
    }

    function showdownHand(){
      clearTimeout(timer); token++; showdown=true; street=3; freshStreet=true;
      const ps=bestScore(playerHole.concat(board)), gs=bestScore(godHole.concat(board));
      const cmp=compareScore(ps,gs); const winner=cmp>0?"player":cmp<0?"god":"tie";
      const n=pot; award(winner);
      if(winner==="player"){ resultText=`SHOWDOWN WIN · ${scoreName(ps)} +${n}`; resultTone="win"; }
      else if(winner==="god"){ resultText=`SHOWDOWN LOST · 統神 ${scoreName(gs)}`; resultTone="lose"; }
      else { resultText=`SPLIT POT · ${scoreName(ps)}`; resultTone="tie"; }
      actionText=`統神亮牌：${scoreName(gs)}`; render(false); nextHandSoon(1900);
    }

    function nextHandSoon(ms=1450){
      clearTimeout(timer); const t=++token;
      setTimeout(()=>{
        if(!alive||t!==token) return;
        if(god<=0) return finish(true,"統神籌碼歸零");
        if(player<=0) return finish(false,"你的籌碼歸零");
        if(handNo>=MAX_HANDS && player!==god) return finish(player>god,`五局結束 · ${player}：${god}`);
        startHand();
      },ms);
    }

    function finish(win,detail){
      clearTimeout(timer);
      if(win){
        setBody(`<div class="poker-v2 poker-finish"><div class="eyebrow">MATCH COMPLETE</div><h2>你讀贏了統神</h2><p>${detail}</p><button id="pokerClaim" class="primary" type="button">拿走點名簿鑰匙</button></div>`);
        body.querySelector("#pokerClaim").onclick=completeOriginalPoker;
      }else{
        setBody(`<div class="poker-v2 poker-finish"><div class="eyebrow">BUSTED</div><h2>統神把你讀穿了</h2><p>${detail}</p><button id="pokerRetry" class="primary" type="button">再來一場</button></div>`);
        body.querySelector("#pokerRetry").onclick=()=>{ handNo=0; player=16; god=16; pot=0; foldCount=0; raiseCount=0; showRules(); };
      }
    }

    function animateChips(from,amount){
      if(!amount) return;
      requestAnimationFrame(()=>{
        const stage=body.querySelector("#pokerV2Stage"); if(!stage) return;
        for(let i=0;i<Math.min(5,amount);i++){
          const c=document.createElement("i"); c.className=`poker-chip-flight from-${from}`; c.style.setProperty("--chip-i",String(i)); stage.appendChild(c); setTimeout(()=>c.remove(),760);
        }
      });
    }

    function completeOriginalPoker(){
      if(bridgeMode) return;
      bridgeMode=true; clearTimeout(timer); alive=false; token++;
      body.style.opacity="0";
      try{
        let btns=originalButtons;
        if(!btns?.length) throw new Error("missing original poker buttons");
        btns[1]?.click();
        btns=[...document.querySelectorAll("#pokerButtons button")];
        btns[1]?.click();
        btns=[...document.querySelectorAll("#pokerButtons button")];
        btns[0]?.click();
      }catch(err){
        console.error("[Poker V2 bridge]",err);
        body.style.opacity="1";
      }
      setTimeout(()=>{ bridgeMode=false; body.style.opacity="1"; if(session?.cleanup===cleanup) session=null; },80);
    }

    showRules();
  }

  function detect(){
    if(bridgeMode||session) return;
    const body=document.getElementById("modalBody");
    const overlay=document.getElementById("modalOverlay");
    if(!body||!overlay?.classList.contains("show")) return;
    const title=body.querySelector("h2")?.textContent?.trim()||"";
    if(!OLD_TITLE.test(title)) return;
    const buttons=[...body.querySelectorAll("#pokerButtons button")];
    if(buttons.length<3) return;
    startTakeover(body,buttons);
  }

  function boot(){
    detect();
    const root=document.getElementById("modalOverlay")||document.body;
    new MutationObserver(()=>{
      if(session && !document.getElementById("modalOverlay")?.classList.contains("show")) session.cleanup();
      detect();
    }).observe(root,{childList:true,subtree:true,characterData:true,attributes:true,attributeFilter:["class"]});
  }

  if(document.readyState==="loading") document.addEventListener("DOMContentLoaded",boot,{once:true});
  else boot();
})();
