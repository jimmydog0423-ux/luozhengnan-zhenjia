(() => {
  "use strict";

  const CHECKPOINT_KEY = "red_school_roger_checkpoint_v2";
  const OLD_CHECKPOINT_KEY = "red_school_roger_checkpoint_v1";
  const AUTO_RESUME_KEY = "red_school_roger_checkpoint_resume_v2";
  const OLD_RESUME_KEY = "red_school_roger_checkpoint_resume_v1";
  const RUN_KEYS = ["red_school_roger_run_v3", "red_school_roger_click_v3"];

  const roomName = document.getElementById("roomName");
  const layer = document.getElementById("objectLayer");
  const modalBody = document.getElementById("modalBody");
  const ending = document.getElementById("endingOverlay");
  const endingTitle = document.getElementById("endingTitle");
  const againBtn = document.getElementById("againBtn");
  const startBtn = document.getElementById("startBtn");
  const continueBtn = document.getElementById("continueBtn");

  let lastRun = "";
  let lastBossKey = "";
  let retryInjected = false;
  let toastTimer = 0;

  function readRun() {
    for (const key of RUN_KEYS) {
      const raw = localStorage.getItem(key);
      if (!raw) continue;
      try {
        const data = JSON.parse(raw);
        if (data?.room) return { key, raw, data };
      } catch (_) {}
    }
    return null;
  }

  function readCheckpoint() {
    for (const key of [CHECKPOINT_KEY, OLD_CHECKPOINT_KEY]) {
      try {
        const cp = JSON.parse(localStorage.getItem(key) || "null");
        if (cp?.run) return cp;
      } catch (_) {}
    }
    return null;
  }

  function clearCheckpoint() {
    localStorage.removeItem(CHECKPOINT_KEY);
    localStorage.removeItem(OLD_CHECKPOINT_KEY);
    sessionStorage.removeItem(AUTO_RESUME_KEY);
    sessionStorage.removeItem(OLD_RESUME_KEY);
    delete window.__bossResumeIntent;
    lastRun = "";
    lastBossKey = "";
  }

  function toast(text) {
    let el = document.getElementById("checkpointToast");
    if (!el) {
      el = document.createElement("div");
      el.id = "checkpointToast";
      el.className = "checkpoint-toast";
      el.setAttribute("role", "status");
      document.body.appendChild(el);
    }
    el.textContent = text;
    el.classList.remove("show");
    void el.offsetWidth;
    el.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove("show"), 1450);
  }

  function bossMeta() {
    const overload = modalBody?.querySelector(".overload-boss-v2");
    if (overload) {
      const phase = Math.max(1, Math.min(3, Number(overload.dataset.phase) || 1));
      return { boss:"overload", phase, label:`超負荷 Phase ${phase}` };
    }
    const pyramid = modalBody?.querySelector(".pyramid-boss-v2");
    if (pyramid) {
      const phase = Math.max(1, Math.min(4, Number(pyramid.dataset.phase) || 1));
      const names = ["","MEMORY JUDGEMENT","TRIANGLE HELL","ROOM DISTORTION","BAN MODE"];
      return { boss:"pyramid", phase, label:`紹安 ${names[phase]}` };
    }
    const legacy = modalBody?.querySelector(".boss-panel h2")?.textContent || "";
    if (/超負荷/.test(legacy)) return { boss:"overload", phase:1, label:"超負荷 Phase 1" };
    if (/金字塔紹安/.test(legacy)) return { boss:"pyramid", phase:1, label:"紹安 MEMORY JUDGEMENT" };
    return null;
  }

  function writeCheckpoint(reason="autosave", meta=null) {
    const run = readRun();
    if (!run) return false;
    const old = readCheckpoint();
    const cp = {
      version:2,
      savedAt:Date.now(),
      reason,
      room:run.data.room,
      runKey:run.key,
      run:run.raw,
      boss:meta?.boss ?? null,
      phase:meta?.phase ?? null,
      label:meta?.label || roomName?.textContent?.trim() || old?.label || "最近紀錄點"
    };
    localStorage.setItem(CHECKPOINT_KEY, JSON.stringify(cp));
    localStorage.removeItem(OLD_CHECKPOINT_KEY);
    lastRun = run.raw;
    return true;
  }

  function syncAutosave() {
    const run = readRun();
    if (!run || run.raw === lastRun || bossMeta()) return;
    lastRun = run.raw;
    writeCheckpoint("autosave", null);
  }

  function syncBoss(showToast=false) {
    const meta = bossMeta();
    if (!meta) { lastBossKey = ""; return; }
    const key = `${meta.boss}:${meta.phase}`;
    if (key === lastBossKey) return;
    lastBossKey = key;

    const old = readCheckpoint();
    if (old?.run) {
      const cp = {
        ...old,
        version:2,
        savedAt:Date.now(),
        reason:"boss-phase",
        boss:meta.boss,
        phase:meta.phase,
        label:meta.label
      };
      localStorage.setItem(CHECKPOINT_KEY, JSON.stringify(cp));
      localStorage.removeItem(OLD_CHECKPOINT_KEY);
    } else {
      writeCheckpoint("boss-phase", meta);
    }
    if (showToast) toast(`CHECKPOINT · ${meta.label}`);
  }

  function isBadEnd() {
    return ending?.classList.contains("show") && /^BAD END/.test(endingTitle?.textContent?.trim() || "");
  }

  function escapeHtml(text) {
    return String(text).replace(/[&<>"']/g, ch => ({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"})[ch]);
  }

  function injectRetry() {
    if (!isBadEnd()) {
      retryInjected = false;
      document.getElementById("checkpointRetryBtn")?.remove();
      return;
    }
    const cp = readCheckpoint();
    if (!cp || retryInjected) return;
    retryInjected = true;
    const btn = document.createElement("button");
    btn.id = "checkpointRetryBtn";
    btn.type = "button";
    btn.className = "primary checkpoint-retry-btn";
    btn.innerHTML = `<span>從最近檢查點重試</span><small>${escapeHtml(cp.label || "最近紀錄點")}</small>`;
    btn.onclick = () => retry(cp);
    againBtn?.parentNode?.insertBefore(btn, againBtn);
  }

  function retry(cp) {
    if (!cp?.run) return;
    const key = RUN_KEYS.includes(cp.runKey) ? cp.runKey : RUN_KEYS[0];
    localStorage.setItem(key, cp.run);
    localStorage.setItem(RUN_KEYS[0], cp.run);
    const intent = {
      boss:cp.boss || null,
      phase:Number(cp.phase) || null,
      room:cp.room || null,
      label:cp.label || null,
      at:Date.now()
    };
    sessionStorage.setItem(AUTO_RESUME_KEY, JSON.stringify(intent));
    sessionStorage.removeItem(OLD_RESUME_KEY);
    location.reload();
  }

  function findDoor(label) {
    return [...(layer?.querySelectorAll("button.scene-object") || [])].find(btn => {
      const raw = btn.dataset.label || btn.getAttribute("aria-label") || btn.textContent || "";
      return String(raw).includes(label);
    }) || null;
  }

  async function autoResume() {
    let pending = null;
    try { pending = JSON.parse(sessionStorage.getItem(AUTO_RESUME_KEY) || "null"); } catch (_) {}
    if (!pending) return;
    window.__bossResumeIntent = pending;

    try { await window.GamePreloader?.ready; } catch (_) {}

    let tries = 0;
    while ((!continueBtn || continueBtn.hidden) && tries++ < 80) {
      await new Promise(r => setTimeout(r, 100));
    }
    if (!continueBtn || continueBtn.hidden) return;
    continueBtn.click();

    if (!pending.boss) {
      sessionStorage.removeItem(AUTO_RESUME_KEY);
      delete window.__bossResumeIntent;
      toast("已回到最近紀錄點");
      return;
    }

    const target = pending.boss === "pyramid" ? "更下面" : "舞台深處";
    tries = 0;
    while (tries++ < 100) {
      const door = findDoor(target);
      if (door && !door.disabled && !door.classList.contains("locked")) {
        toast(`準備從 ${pending.label || `Phase ${pending.phase}`} 繼續`);
        setTimeout(() => door.click(), 240);
        return;
      }
      await new Promise(r => setTimeout(r, 100));
    }
    toast("已回到最近紀錄房間");
  }

  startBtn?.addEventListener("click", clearCheckpoint, true);
  againBtn?.addEventListener("click", clearCheckpoint, true);

  if (modalBody) {
    new MutationObserver(() => syncBoss(true)).observe(modalBody, {
      childList:true, subtree:true, attributes:true, attributeFilter:["data-phase"]
    });
  }
  if (ending) {
    new MutationObserver(() => {
      if (ending.classList.contains("show") && !isBadEnd() && endingTitle?.textContent) clearCheckpoint();
      injectRetry();
    }).observe(ending, {childList:true,subtree:true,attributes:true,attributeFilter:["class"]});
  }
  if (roomName) {
    new MutationObserver(() => setTimeout(syncAutosave, 0)).observe(roomName, {childList:true,subtree:true,characterData:true});
  }

  setInterval(() => { syncAutosave(); syncBoss(false); injectRetry(); }, 650);
  setTimeout(() => { syncAutosave(); autoResume(); }, 100);
})();
