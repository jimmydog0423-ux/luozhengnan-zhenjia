(() => {
  "use strict";
  const RUN_KEY="red_school_roger_run_v3";
  const roomName=document.getElementById("roomName"),layer=document.getElementById("objectLayer"),objective=document.getElementById("objectiveText"),modalBody=document.getElementById("modalBody"),message=document.getElementById("messageBox"),soundBtn=document.getElementById("soundBtn"),winCount=document.getElementById("winCount");

  function run(){try{return JSON.parse(localStorage.getItem(RUN_KEY)||"null")}catch(_){return null}}
  function npcCount(d){const f=d?.flags||{};return [f.fingerWon,f.toyzWon,f.pokerWon].filter(Boolean).length}
  function has(d,k){return Array.isArray(d?.clues)&&d.clues.includes(k)}
  function label(btn){return String(btn?.dataset?.label||btn?.getAttribute?.("aria-label")||btn?.textContent||"").replace(/^已完成[:：]?\s*/,"").trim()}
  function say(text){if(!message)return;message.textContent=text;message.classList.add("show");clearTimeout(say.t);say.t=setTimeout(()=>message.classList.remove("show"),3200)}

  function syncNpcGate(){
    const d=run();if(!d)return;
    const npc=npcCount(d),ready=has(d,"window")&&has(d,"roll")&&npc>=2;
    if(winCount)winCount.textContent=String(npc);
    if(roomName?.textContent?.trim()==="紅色禮堂"){
      const door=[...(layer?.querySelectorAll("button.scene-object")||[])].find(b=>label(b).includes("舞台深處"));
      if(door){door.disabled=!ready;door.classList.toggle("locked",!ready);door.setAttribute("aria-disabled",String(!ready));door.title=ready?"進入超負荷 Boss 戰":`還缺：第八扇窗、點名簿、NPC 挑戰 2 位（目前 ${npc}/2）`;}
    }
    if(!d.pyramidKey&&objective){
      const hearts=["heart1","heart2","heart3"].filter(k=>has(d,k)).length;
      if(ready)objective.textContent=hearts===3?"三個心願碎片已集齊。前往紅色禮堂舞台深處。":"舞台門已可開啟；若想找出真相，先找齊三個心願碎片。";
      else{const tasks=[];if(!has(d,"window"))tasks.push("確認二樓第八扇窗");if(!has(d,"roll"))tasks.push("取得教職員室點名簿");if(npc<2)tasks.push(`完成 NPC 挑戰 ${npc}/2（中指通／TOYZ／統神）`);objective.textContent=tasks.join("・")||"繼續調查校園異常。"}
    }
  }

  layer?.addEventListener("click",e=>{
    const btn=e.target.closest?.("button.scene-object");if(!btn||!label(btn).includes("舞台深處"))return;
    const d=run(),npc=npcCount(d);if(has(d,"window")&&has(d,"roll")&&npc>=2)return;
    e.preventDefault();e.stopImmediatePropagation();
    const miss=[];if(!has(d,"window"))miss.push("第八扇窗");if(!has(d,"roll"))miss.push("點名簿");if(npc<2)miss.push(`NPC 挑戰 ${npc}/2`);say(`舞台深處仍被鎖住：還缺 ${miss.join("、")}。`);
  },true);

  function injectTerminalEvidence(){
    const h=modalBody?.querySelector("h2");if(!h||!h.textContent.includes("四台機器啟動順序")||modalBody.querySelector(".terminal-evidence"))return;
    const p=h.nextElementSibling;
    const box=document.createElement("div");box.className="terminal-evidence";box.innerHTML=`<b>維修紀錄已貼在主機旁</b><div><span>電腦 1</span><strong>2012</strong><small>正常時間</small></div><div><span>電腦 2</span><strong>2016</strong><small>正常時間</small></div><div class="reverse"><span>電腦 3</span><strong>8002 → 2008</strong><small>系統時間倒著顯示</small></div><div><span>電腦 4</span><strong>2020</strong><small>正常時間</small></div><em>依「實際年份」從最舊到最新啟動。</em>`;
    (p||h).insertAdjacentElement("afterend",box);
    if(p&&/從最舊到最新/.test(p.textContent))p.textContent="線索：牆上的維修紀錄能直接判斷四台電腦的實際年份。注意第 3 台的時間是反向顯示。";
  }

  function rhythmActive(){return !!modalBody?.querySelector('.rhythm-v2[data-playing="1"]')}
  function silenceRoomBgm(){
    if(!rhythmActive())return;
    const list=window.__redSchoolAudioRegistry||[];
    list.forEach(a=>{if(!a?.dataset?.bgmMode)return;try{a.pause();a.volume=0}catch(_){}});
  }
  soundBtn?.addEventListener("click",()=>setTimeout(silenceRoomBgm,0),true);
  document.addEventListener("visibilitychange",()=>{if(!document.hidden)setTimeout(silenceRoomBgm,30)});
  if(modalBody)new MutationObserver(()=>{injectTerminalEvidence();silenceRoomBgm()}).observe(modalBody,{childList:true,subtree:true,attributes:true,attributeFilter:["data-playing"]});

  setInterval(()=>{syncNpcGate();injectTerminalEvidence();silenceRoomBgm()},180);
  syncNpcGate();injectTerminalEvidence();
})();
