(() => {
  "use strict";

  const RUN_KEY = "red_school_roger_click_v3";
  const CHECKPOINT_KEY = "red_school_roger_checkpoint_v1";
  const AUTO_RESUME_KEY = "red_school_roger_checkpoint_resume_v1";

  // Current game run key used by game.js. Keep the old key name here as a
  // compatibility fallback because earlier builds used it during development.
  const RUN_KEYS = ["red_school_roger_run_v3", RUN_KEY];

  const roomName = document.getElementById("roomName");
  const layer = document.getElementById("objectLayer");
  const modalBody = document.getElementById("modalBody");
  const ending = document.getElementById("endingOverlay");
  const endingTitle = document.getElementById("endingTitle");
  const againBtn = document.getElementById("againBtn");
  const startBtn = document.getElementById("startBtn");
  const continueBtn = document.getElementById("continueBtn");

  let activeRunKey = "red_school_roger_run_v3";
  let lastRun = "";
  let lastBoss = "";
  let lastPhase = "";
  let toastTimer = 0;
  let endingRetryInjected = false;

  function readRun() {
    for (const key of RUN_KEYS) {
      const raw = localStorage.getItem(key);
      if (!raw) continue;
      try {
        const data = JSON.parse(raw);
        if (data && data.room) {
          activeRunKey = key;
          return { raw, data, key };
        }
      } catch (_) {}
    }
    return null;
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
      return { boss: "overload", phase, label: "超負荷 Boss 入口" };
    }

    const pyramid = modalBody?.querySelector(".pyramid-boss-v2");
    if (pyramid) {
      const phaseText = pyramid.querySelector("[data-phase]")?.textContent?.trim() || "MEMORY JUDGEMENT";
      return { boss: "pyramid", phase: phaseText, label: "紹安 Hidden Boss 入口" };
    }

    const legacyTitle = modalBody?.querySelector(".boss-panel h2")?.textContent || "";
    if (/大肥哥超負荷/.test(legacyTitle)) return { boss: "overload", phase: "1", label: "超負荷 Boss 入口" };
    if (/金字塔紹安/.test(legacyTitle)) return { boss: "pyramid", phase: "MEMORY JUDGEMENT", label: "紹安 Hidden Boss 入口" };
    return null;
  }

  function pickOption(options, key, fallback) {
    return Object.prototype.hasOwnProperty.call(options, key) ? options[key] : fallback;
  }

  function writeCheckpoint(reason = "auto", options = {}) {
    const run = readRun();
    if (!run) return false;

    const bossMeta = currentBossMeta();
    const old = readCheckpoint();
    const bossFallback = bossMeta?.boss ?? old?.boss ?? null;
    const phaseFallback = bossMeta?.phase ?? old?.phase ?? null;
    const labelFallback = bossMeta?.label ?? old?.label ?? roomName?.textContent?.trim() ?? "最近紀錄點";

    const cp = {
      version: 1,
      savedAt: Date.now(),
      reason,
      room: run.data.room,
      runKey: run.key,
      run: run.raw,
      boss: pickOption(options, "boss", bossFallback),
      phase: pickOption(options, "phase", phaseFallback),
      label: pickOption(options, "label", labelFallback)
    };

    localStorage.setItem(CHECKPOINT_KEY, JSON.stringify(cp));
    lastRun = run.raw;
    return true;
  }

  function syncRunCheckpoint() {
    const run = readRun();
    if (!run || run.raw === lastRun) return;
    lastRun = run.raw;

    // During an active Boss fight, keep the safe snapshot from immediately
    // before the encounter. The game intentionally stops regular saves in Boss mode.
    if (currentBossMeta()) return;

    writeCheckpoint("autosave", {
      boss: null,
      phase: null,
      label: roomName?.textContent?.trim() || "自動存檔"
    });
  }

  function syncBossCheckpoint(showToast = false) {
    const meta = currentBossMeta();
    if (!meta) return;
    const key = `${meta.boss}:${meta.phase}`;
    if (key === `${lastBoss}:${lastPhase}`) return;

    lastBoss = meta.boss;
    lastPhase = meta.phase;

    // Phase is recorded as metadata so the player knows where the failure happened.
    // Respawn is intentionally the safe Boss entrance, avoiding a restart in the
    // middle of an already-live bullet pattern.
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

    if (showToast) {
      const phaseText = meta.boss === "overload"
        ? `Phase ${String(meta.phase).replace(/\s*\/.*$/, "")}`
        : String(meta.phase);
      toast(`CHECKPOINT · ${phaseText}`);
    }
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
    const key = cp.runKey || activeRunKey || "red_school_roger_run_v3";
    localStorage.setItem(key, cp.run);
    if (key !== "red_school_roger_run_v3") localStorage.setItem("red_school_roger_run_v3", cp.run);

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

  // A deliberately new investigation means the previous death checkpoint should
  // not bleed into the new run.
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
        if (endingTitle?.textContent && !/^BAD END/.test(endingTitle.textContent.trim())) clearCheckpoint();
      }
      injectRetryButton();
    }).observe(ending, { childList: true, subtree: true, attributes: true, attributeFilter: ["class"] });
  }

  if (roomName) {
    new MutationObserver(() => setTimeout(syncRunCheckpoint, 0))
      .observe(roomName, { childList: true, subtree: true, characterData: true });
  }

  setInterval(watch, 650);
  setTimeout(() => {
    syncRunCheckpoint();
    autoResumeIfNeeded();
  }, 80);
})();
