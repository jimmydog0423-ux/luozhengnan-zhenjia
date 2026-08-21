(() => {
  "use strict";

  const FAIL_KEY = "red_school_minigame_fail_v1";
  const RUN_KEY = "red_school_roger_run_v3";
  const RESUME_KEY = "red_school_minigame_mercy_resume_v1";
  const LIMIT = 3;

  const CONFIG = {
    toyz: {
      flag: "toyzWon",
      title: "TOYZ 突然被帶走了",
      text: "（虛構搞笑事件）紅色學校突然跳出一張「吸大麻被抓走」的荒謬劇情卡，TOYZ 被劇情警察直接帶離現場。紙捲競速被迫中止，這場算你通過。",
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

  function readJson(key, fallback) {
    try { return Object.assign({}, fallback, JSON.parse(localStorage.getItem(key) || "{}")); }
    catch (_) { return { ...fallback }; }
  }

  function getFails() {
    return readJson(FAIL_KEY, { toyz: 0, god: 0, finger: 0 });
  }

  function setFails(data) {
    try { localStorage.setItem(FAIL_KEY, JSON.stringify(data)); } catch (_) {}
  }

  function resetFail(id) {
    const data = getFails();
    data[id] = 0;
    setFails(data);
  }

  function addFail(id) {
    const data = getFails();
    data[id] = Math.max(0, Number(data[id]) || 0) + 1;
    setFails(data);
    return data[id];
  }

  function resetAll() {
    setFails({ toyz: 0, god: 0, finger: 0 });
  }

  function identifyResult(node) {
    if (!(node instanceof HTMLElement)) return null;
    const text = node.textContent || "";

    if (node.matches(".pr2-result") || node.querySelector(".pr2-result-card")) {
      if (/捲紙完成/.test(text)) return { id: "toyz", won: true, root: node };
      if (/TOYZ 勝出/.test(text)) return { id: "toyz", won: false, root: node };
    }

    if (node.matches(".rv2-result") || node.querySelector(".rv2-result-card")) {
      if (/逆拍完成/.test(text)) return { id: "finger", won: true, root: node };
      if (/挑戰失敗/.test(text)) return { id: "finger", won: false, root: node };
    }

    if (node.matches(".poker-v2.poker-finish")) {
      if (/你讀贏了統神/.test(text)) return { id: "god", won: true, root: node };
      if (/統神把你讀穿了/.test(text)) return { id: "god", won: false, root: node };
    }

    return null;
  }

  function candidateRoots() {
    const body = document.getElementById("modalBody");
    if (!body) return [];
    return [...body.querySelectorAll(".pr2-result, .rv2-result, .poker-v2.poker-finish")];
  }

  function addProgress(root, id, count) {
    let box = root.querySelector(".minigame-mercy-box");
    if (!box) {
      box = document.createElement("div");
      box.className = "minigame-mercy-box";
      const card = root.querySelector(".pr2-result-card, .rv2-result-card") || root;
      const primary = card.querySelector("button");
      if (primary) primary.insertAdjacentElement("beforebegin", box);
      else card.appendChild(box);
    }

    if (count < LIMIT) {
      box.className = "minigame-mercy-box is-progress";
      box.innerHTML = `<span>失敗 ${count} / ${LIMIT}</span><small>第 ${LIMIT} 次失敗後會開啟劇情保底過關。</small>`;
      return;
    }

    box.className = "minigame-mercy-box is-ready";
    box.innerHTML = `
      <div><b>保底過關已解鎖</b><small>你已經失敗 ${count} 次，不需要再重複卡關。</small></div>
      <button type="button" class="primary minigame-mercy-pass">觸發特殊事件並過關</button>
    `;
    box.querySelector(".minigame-mercy-pass")?.addEventListener("click", () => mercyPass(id), { once: true });
  }

  function processResult(root) {
    if (!(root instanceof HTMLElement) || root.dataset.mercyProcessed === "1") return;
    const result = identifyResult(root);
    if (!result) return;
    root.dataset.mercyProcessed = "1";

    if (result.won) {
      resetFail(result.id);
      return;
    }

    const count = addFail(result.id);
    addProgress(root, result.id, count);
  }

  function scan() {
    candidateRoots().forEach(processResult);
  }

  function patchRunForPass(id) {
    const cfg = CONFIG[id];
    if (!cfg) return false;
    let run;
    try { run = JSON.parse(localStorage.getItem(RUN_KEY) || "null"); } catch (_) { run = null; }
    if (!run || typeof run !== "object") return false;

    run.flags = run.flags && typeof run.flags === "object" ? run.flags : {};
    const alreadyWon = !!run.flags[cfg.flag];
    run.flags[cfg.flag] = true;
    if (!alreadyWon) run.miniWins = Math.max(0, Number(run.miniWins) || 0) + 1;

    if (id === "finger") {
      run.clues = Array.isArray(run.clues) ? run.clues : [];
      run.notes = Array.isArray(run.notes) ? run.notes : [];
      if (!run.clues.includes("score")) run.clues.push("score");
      if (!run.notes.some(n => Array.isArray(n) && n[0] === "逆拍樂譜")) {
        run.notes.push(["逆拍樂譜", "樂譜每第四小節都故意少一拍。"]) ;
      }
    }

    localStorage.setItem(RUN_KEY, JSON.stringify(run));
    return true;
  }

  function mercyPass(id) {
    const cfg = CONFIG[id];
    if (!cfg) return;
    if (!patchRunForPass(id)) {
      const btn = document.querySelector(".minigame-mercy-pass");
      if (btn) {
        btn.disabled = true;
        btn.textContent = "目前沒有可恢復的調查存檔";
      }
      return;
    }

    resetFail(id);
    try {
      sessionStorage.setItem(RESUME_KEY, JSON.stringify({ id, at: Date.now() }));
    } catch (_) {}
    location.reload();
  }

  function ensureEventOverlay(intent) {
    const cfg = CONFIG[intent?.id];
    if (!cfg || document.getElementById("mercyEventOverlay")) return;

    const overlay = document.createElement("div");
    overlay.id = "mercyEventOverlay";
    overlay.className = "mercy-event-overlay";
    overlay.innerHTML = `
      <div class="mercy-event-card">
        <div class="eyebrow">SPECIAL CLEAR · 三敗保底</div>
        <h2>${cfg.title}</h2>
        <p>${cfg.text}</p>
        <blockquote>${cfg.quote}</blockquote>
        <button type="button" class="primary">繼續調查</button>
      </div>
    `;
    document.getElementById("app")?.appendChild(overlay);
    requestAnimationFrame(() => overlay.classList.add("show"));
    overlay.querySelector("button")?.addEventListener("click", () => {
      overlay.classList.remove("show");
      setTimeout(() => overlay.remove(), 180);
      try { sessionStorage.removeItem(RESUME_KEY); } catch (_) {}
    }, { once: true });
  }

  async function resumeAfterMercy() {
    let intent = null;
    try { intent = JSON.parse(sessionStorage.getItem(RESUME_KEY) || "null"); } catch (_) {}
    if (!intent?.id || !CONFIG[intent.id]) return;

    try { await (window.GamePreloader?.ready || Promise.resolve()); } catch (_) {}

    const continueBtn = document.getElementById("continueBtn");
    let tries = 0;
    const timer = setInterval(() => {
      tries++;
      const ready = continueBtn && !continueBtn.hidden && continueBtn.getAttribute("aria-disabled") !== "true";
      if (ready) {
        clearInterval(timer);
        continueBtn.click();
        setTimeout(() => ensureEventOverlay(intent), 320);
      } else if (tries > 120) {
        clearInterval(timer);
      }
    }, 100);
  }

  const body = document.getElementById("modalBody");
  if (body) {
    new MutationObserver(records => {
      // Boss HUD updates create child-list mutations every frame. Ignore all of
      // them; mercy only cares when an actual minigame result element is added.
      if (body.querySelector(".overload-boss-v2, .pyramid-boss-v2")) return;
      for (const record of records) {
        for (const node of record.addedNodes) {
          if (!(node instanceof HTMLElement)) continue;
          if (node.matches(".pr2-result, .rv2-result, .poker-v2.poker-finish") ||
              node.querySelector?.(".pr2-result, .rv2-result, .poker-v2.poker-finish")) {
            scan();
            return;
          }
        }
      }
    }).observe(body, { childList: true, subtree: true });
  }

  document.getElementById("startBtn")?.addEventListener("click", resetAll, true);
  document.getElementById("againBtn")?.addEventListener("click", resetAll, true);
  document.getElementById("restartBtn")?.addEventListener("click", resetAll, true);

  scan();
  resumeAfterMercy();
})();