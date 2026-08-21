(() => {
  "use strict";

  const RUN_KEY = "red_school_roger_run_v3";
  const FAIL_KEY = "red_school_minigame_fail_v1";
  const MERCY_RESUME_KEY = "red_school_minigame_mercy_resume_v1";
  const CHECKPOINT_KEYS = ["red_school_roger_checkpoint_v2", "red_school_roger_checkpoint_v1"];
  const BOSS_RESUME_KEY = "red_school_roger_checkpoint_resume_v2";

  const CONFIG = {
    toyz: {
      flag: "toyzWon",
      title: "TOYZ 突然被帶走了",
      text: "（虛構搞笑事件）紅色學校突然跳出一張荒謬劇情卡，TOYZ 被劇情警察直接帶離現場。紙捲競速被迫中止，這場算你通過。",
      quote: "薛喜：蛤？這樣也算我們贏？"
    },
    god: {
      flag: "pokerWon",
      title: "003：先回來吃晚餐",
      text: "統神的手機突然響了。003 叫他先回去吃晚餐，統神把牌一蓋直接離場，午夜德州當場中止。",
      quote: "統神：吃飯比較重要啦，點名簿你們拿去。"
    },
    finger: {
      flag: "fingerWon",
      title: "中指通：其實你已經過了",
      text: "你正準備第四次挑戰，中指通卻突然把節拍器按掉。",
      quote: "中指通：「其實你已經過了。」"
    }
  };

  function readJson(key, fallback = null) {
    try { return JSON.parse(localStorage.getItem(key) || "null") ?? fallback; }
    catch (_) { return fallback; }
  }

  function identifyMercy() {
    const body = document.getElementById("modalBody");
    const text = body?.textContent || "";
    if (body?.querySelector(".paper-roll-v2") || /TOYZ/.test(text) && /紙捲/.test(text)) return "toyz";
    if (body?.querySelector(".poker-v2") || /統神/.test(text) && /德州|POKER/i.test(text)) return "god";
    if (body?.querySelector(".rhythm-v2") || /中指通/.test(text) && /逆拍|RHYTHM/i.test(text)) return "finger";
    return null;
  }

  function patchRunForPass(id) {
    const cfg = CONFIG[id];
    const run = readJson(RUN_KEY);
    if (!cfg || !run || typeof run !== "object") return false;

    run.flags = run.flags && typeof run.flags === "object" ? run.flags : {};
    const alreadyWon = !!run.flags[cfg.flag];
    run.flags[cfg.flag] = true;
    if (!alreadyWon) run.miniWins = Math.max(0, Number(run.miniWins) || 0) + 1;

    if (id === "finger") {
      run.clues = Array.isArray(run.clues) ? run.clues : [];
      run.notes = Array.isArray(run.notes) ? run.notes : [];
      if (!run.clues.includes("score")) run.clues.push("score");
      if (!run.notes.some(n => Array.isArray(n) && n[0] === "逆拍樂譜")) {
        run.notes.push(["逆拍樂譜", "樂譜每第四小節都故意少一拍。"]);
      }
    }

    try { localStorage.setItem(RUN_KEY, JSON.stringify(run)); }
    catch (_) { return false; }
    return true;
  }

  function resetFail(id) {
    let fails = readJson(FAIL_KEY, { toyz:0, god:0, finger:0 }) || { toyz:0, god:0, finger:0 };
    fails[id] = 0;
    try { localStorage.setItem(FAIL_KEY, JSON.stringify(fails)); } catch (_) {}
  }

  function showMercyEvent(id) {
    const cfg = CONFIG[id];
    if (!cfg) return;
    document.getElementById("mercyEventOverlay")?.remove();
    const overlay = document.createElement("div");
    overlay.id = "mercyEventOverlay";
    overlay.className = "mercy-event-overlay";
    overlay.innerHTML = `<div class="mercy-event-card"><div class="eyebrow">SPECIAL CLEAR · 三敗保底</div><h2>${cfg.title}</h2><p>${cfg.text}</p><blockquote>${cfg.quote}</blockquote><button type="button" class="primary">繼續調查</button></div>`;
    document.getElementById("app")?.appendChild(overlay);
    requestAnimationFrame(() => overlay.classList.add("show"));
    overlay.querySelector("button")?.addEventListener("click", () => {
      overlay.classList.remove("show");
      setTimeout(() => overlay.remove(), 180);
    }, { once:true });
  }

  function continueCurrentRun() {
    const continueBtn = document.getElementById("continueBtn");
    if (!continueBtn) return false;
    continueBtn.click();
    return true;
  }

  function handleMercyPass(button) {
    const id = identifyMercy();
    if (!id || !patchRunForPass(id)) {
      button.disabled = true;
      button.textContent = "目前沒有可恢復的調查存檔";
      return;
    }

    resetFail(id);
    try { sessionStorage.removeItem(MERCY_RESUME_KEY); } catch (_) {}

    // Restore the patched run inside the existing page. Do not reload the page,
    // otherwise the title preloader is shown again for an in-game clear.
    continueCurrentRun();
    setTimeout(() => showMercyEvent(id), 100);
  }

  function readCheckpoint() {
    for (const key of CHECKPOINT_KEYS) {
      const cp = readJson(key);
      if (cp?.run) return cp;
    }
    return null;
  }

  function findDoor(label) {
    const layer = document.getElementById("objectLayer");
    return [...(layer?.querySelectorAll("button.scene-object") || [])].find(btn => {
      const raw = btn.dataset.label || btn.getAttribute("aria-label") || btn.textContent || "";
      return String(raw).includes(label);
    }) || null;
  }

  function handleCheckpointRetry(button) {
    const cp = readCheckpoint();
    if (!cp?.run) {
      button.disabled = true;
      return;
    }

    const runKey = cp.runKey || RUN_KEY;
    try {
      localStorage.setItem(runKey, cp.run);
      localStorage.setItem(RUN_KEY, cp.run);
    } catch (_) { return; }

    const intent = {
      boss: cp.boss || null,
      phase: Number(cp.phase) || null,
      room: cp.room || null,
      label: cp.label || null,
      at: Date.now()
    };

    window.__bossResumeIntent = intent;
    try { sessionStorage.setItem(BOSS_RESUME_KEY, JSON.stringify(intent)); } catch (_) {}
    continueCurrentRun();

    if (!intent.boss) {
      try { sessionStorage.removeItem(BOSS_RESUME_KEY); } catch (_) {}
      delete window.__bossResumeIntent;
      return;
    }

    const target = intent.boss === "pyramid" ? "更下面" : "舞台深處";
    let tries = 0;
    const timer = setInterval(() => {
      const door = findDoor(target);
      if (door && !door.disabled && !door.classList.contains("locked")) {
        clearInterval(timer);
        door.click();
      } else if (++tries > 80) {
        clearInterval(timer);
      }
    }, 75);
  }

  // Capture before the older target handlers that still call location.reload().
  document.addEventListener("click", event => {
    const mercy = event.target.closest?.(".minigame-mercy-pass");
    if (mercy) {
      event.preventDefault();
      event.stopImmediatePropagation();
      handleMercyPass(mercy);
      return;
    }

    const retry = event.target.closest?.("#checkpointRetryBtn");
    if (retry) {
      event.preventDefault();
      event.stopImmediatePropagation();
      handleCheckpointRetry(retry);
    }
  }, true);

  // The preloader is only an entrance screen. Once its first load is complete,
  // remove the panel so later ending/restart flows cannot display it again.
  const hideFinishedPreloader = () => {
    const panel = document.querySelector(".game-preloader");
    if (panel) panel.style.display = "none";
  };
  if (window.GamePreloader?.isReady?.()) hideFinishedPreloader();
  else window.GamePreloader?.ready?.then(() => setTimeout(hideFinishedPreloader, 180)).catch(() => {});
})();