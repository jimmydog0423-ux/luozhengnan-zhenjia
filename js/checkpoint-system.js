(() => {
  "use strict";

  const RUN_KEY = "red_school_roger_run_v3";
  const CHECKPOINT_KEY = "red_school_roger_checkpoint_v1";
  const AUTO_RESUME_KEY = "red_school_roger_checkpoint_resume_v1";

  const roomName = document.getElementById("roomName");
  const layer = document.getElementById("objectLayer");
  const modal = document.getElementById("modalOverlay");
  const modalBody = document.getElementById("modalBody");
  const ending = document.getElementById("endingOverlay");
  const endingTitle = document.getElementById("endingTitle");
  const againBtn = document.getElementById("againBtn");
  const startBtn = document.getElementById("startBtn");
  const continueBtn = document.getElementById("continueBtn");

  let lastRun = "";
  let lastBoss = "";
  let lastPhase = "";
  let toastTimer = 0;
  let endingRetryInjected = false;

  function readRun() {
    const raw = localStorage.getItem(RUN_KEY);
    if (!raw) return null;
    try {
      const data = JSON.parse(raw);
      return data && data.room ? { raw, data } : null;
    } catch (_) {
      return null;
    }
  }

  function readCheckpoint() {
    try {
      const cp = JSON.parse(localStorage.getItem(CHECKPOINT_KEY) || "null");
      return cp && cp.run ? cp : null;
    } catch (_) {
      return null;
    }
  }

  function clearCheckpoint() {
    localStorage.removeItem(CHECKPOINT_KEY);
    sessionStorage.removeItem(AUTO_RESUME_KEY);
    lastRun = "";
    lastBoss = "";
    lastPhase = "";
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
    toastTimer = setTimeout(() => el.classList.remove("show"), 1250);
  }

  function currentBossMeta() {
    const overload = modalBody?.querySelector(".overload-boss-v2");
    if (overload) {
      const phase = overload.dataset.phase || overload.querySelector("[data-phase-label]")?.textContent?.trim() || "1";
      return { boss: "overload", phase, label: `超負荷 Phase ${String(phase).replace(/\s*\/.*$/, "")}` };
    }

    const pyramid = modalBody?.querySelector(".pyramid-boss-v2");
    if (pyramid) {
      const phaseText = pyramid.querySelector("[data-phase]")?.textContent?.trim() || "MEMORY JUDGEMENT";
      return { boss: "pyramid", phase: phaseText, label: `紹安 ${phaseText}` };
    }

    const legacyTitle = modalBody?.querySelector(".boss-panel h2")?.textContent || "";
    if (/大肥哥超負荷/.test(legacyTitle)) return { boss: "overload", phase: "1", label: "超負荷 Boss" };
    if (/金字塔紹安/.test(legacyTitle)) return { boss: "pyramid", phase: "MEMORY JUDGEMENT", label: "紹安 Hidden Boss" };
    return null;
  }

  function writeCheckpoint(reason = "auto", options = {}) {
    const run = readRun();
    if (!run) return false;

    const bossMeta = currentBossMeta();
    const old = readCheckpoint();
    const cp = {
      version: 1,
      savedAt: Date.now(),
      reason,
      room: run.data.room,
      run: run.raw,
      boss: bossMeta?.boss || options.boss || old?.boss || null,
      phase: bossMeta?.phase || options.phase || old?.phase || null,
      label: bossMeta?.label || options.label || old?.label || roomName?.textContent?.trim() || "最近紀錄點"
    };

    localStorage.setItem(CHECKPOINT_KEY, JSON.stringify(cp));
    lastRun = run.raw;
    return true;
  }

  function syncRunCheckpoint() {
    const run = readRun();
    if (!run || run.raw === lastRun) return;
    lastRun = run.raw;

    // Do not overwrite a Boss checkpoint merely because the old run save is still
    // present behind a live Boss fight. The Boss entrance remains the safe respawn.
    if (currentBossMeta()) return;

    writeCheckpoint("autosave", { boss: null, phase: null, label: roomName?.textContent?.trim() || "自動存檔" });
  }

  function syncBossCheckpoint(showToast = false) {
    const meta = currentBossMeta();
    if (!meta) return;
    const key = `${meta.boss}:${meta.phase}`;
    if (key === `${lastBoss}:${lastPhase}`) return;

    lastBoss = meta.boss;
    lastPhase = meta.phase;

    // The run save represents the safe state immediately before entering the boss.
    // Keep that snapshot and attach the current phase as metadata, so a death can
    // return the player straight to this encounter instead of wiping the run.
    const cp = readCheckpoint();
    if (cp?.run) {
      cp.savedAt = Date.now();
      cp.reason = "boss";
      cp.boss = meta.boss;
      cp.phase = meta.phase;
      cp.label = meta.label;
      localStorage.setItem(CHECKPOINT_KEY, JSON.stringify(cp));
    } else {
      writeCheckpoint("boss", meta);
    }

    if (showToast) toast(`CHECKPOINT · ${meta.label}`);
  }

  function isBadEnding() {
    if (!ending?.classList.contains("show")) return false;
    return /^BAD END/.test(endingTitle?.textContent?.trim() || "");
  }

  function injectRetryButton() {
    if (!isBadEnding()) {
      endingRetryInjected = false;
      document.getElementById("checkpointRetryBtn")?.remove();
      return;
    }

    const cp = readCheckpoint();
    if (!cp || endingRetryInjected) return;
    endingRetryInjected = true;

    const btn = document.createElement("button");
    btn.id = "checkpointRetryBtn";
    btn.type = "button";
    btn.className = "primary checkpoint-retry-btn";
    btn.innerHTML = `<span>從最近檢查點重試</span><small>${escapeHtml(cp.label || "最近紀錄點")}</small>`;
    btn.addEventListener("click", () => retryCheckpoint(cp));

    if (againBtn?.parentNode) againBtn.parentNode.insertBefore(btn, againBtn);
  }

  function escapeHtml(text) {
    return String(text).replace(/[&<>"']/g, ch => ({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"})[ch]);
  }

  function retryCheckpoint(cp) {
    if (!cp?.run) return;
    localStorage.setItem(RUN_KEY, cp.run);
    sessionStorage.setItem(AUTO_RESUME_KEY, JSON.stringify({
      boss: cp.boss || null,
      phase: cp.phase || null,
      room: cp.room || null,
      at: Date.now()
    }));
    location.reload();
  }

  function findDoor(label) {
    return [...(layer?.querySelectorAll("button.scene-object") || [])].find(b => {
      const raw = b.dataset.label || b.getAttribute("aria-label") || b.textContent || "";
      return String(raw).trim() === label || String(raw).includes(label);
    }) || null;
  }

  function autoResumeIfNeeded() {
    let pending = null;
    try { pending = JSON.parse(sessionStorage.getItem(AUTO_RESUME_KEY) || "null"); } catch (_) {}
    if (!pending) return;
    sessionStorage.removeItem(AUTO_RESUME_KEY);

    const clickContinue = () => {
      if (continueBtn && !continueBtn.hidden) {
        continueBtn.click();
        waitForRoomThenBoss(pending);
        return true;
      }
      return false;
    };

    if (clickContinue()) return;
    let tries = 0;
    const timer = setInterval(() => {
      if (clickContinue() || ++tries > 40) clearInterval(timer);
    }, 100);
  }

  function waitForRoomThenBoss(pending) {
    if (!pending?.boss) {
      toast("已回到最近紀錄點");
      return;
    }

    const targetLabel = pending.boss === "pyramid" ? "更下面" : "舞台深處";
    let tries = 0;
    const timer = setInterval(() => {
      const door = findDoor(targetLabel);
      if (door && !door.classList.contains("locked")) {
        clearInterval(timer);
        toast(`已恢復 ${pending.boss === "pyramid" ? "紹安" : "超負荷"} Boss 紀錄點`);
        setTimeout(() => door.click(), 280);
      } else if (++tries > 50) {
        clearInterval(timer);
        toast("已回到最近紀錄房間");
      }
    }, 100);
  }

  function watch() {
    syncRunCheckpoint();
    syncBossCheckpoint(false);
    injectRetryButton();
  }

  startBtn?.addEventListener("click", clearCheckpoint, true);
  againBtn?.addEventListener("click", clearCheckpoint, true);

  if (modalBody) {
    new MutationObserver(() => {
      const before = `${lastBoss}:${lastPhase}`;
      syncBossCheckpoint(true);
      if (!currentBossMeta() && before !== ":") {
        lastBoss = "";
        lastPhase = "";
      }
    }).observe(modalBody, { childList: true, subtree: true, attributes: true, attributeFilter: ["data-phase"] });
  }

  if (ending) {
    new MutationObserver(() => {
      if (ending.classList.contains("show") && !isBadEnding()) {
        // A real clear/normal ending should not leave an old death checkpoint behind.
        if (endingTitle?.textContent && !/^BAD END/.test(endingTitle.textContent.trim())) clearCheckpoint();
      }
      injectRetryButton();
    }).observe(ending, { childList: true, subtree: true, attributes: true, attributeFilter: ["class"] });
  }

  if (roomName) new MutationObserver(() => setTimeout(syncRunCheckpoint, 0)).observe(roomName, { childList: true, subtree: true, characterData: true });

  setInterval(watch, 650);
  setTimeout(() => {
    syncRunCheckpoint();
    autoResumeIfNeeded();
  }, 80);
})();
