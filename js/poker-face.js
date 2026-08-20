(() => {
  "use strict";

  const DEFAULT_FACE = "assets/characters/tongshen.webp";
  const BASE = "assets/poker/tongshen/";

  // 8 支已上傳的 Poker GIF。
  // neutral / focus 共用第一支；其餘狀態各自使用對應 GIF。
  // 注意：bluff / trickster 是「演技表情」，不代表牌局一定正在 Bluff，避免形成答案表。
  const FACE_CANDIDATES = {
    neutral: [
      BASE + "tongshen_poker_neutral_focus.gif",
      BASE + "neutral.gif",
      BASE + "neutral.png"
    ],
    focus: [
      BASE + "tongshen_poker_neutral_focus.gif",
      BASE + "focus.gif",
      BASE + "focus.png"
    ],
    pressure: [
      BASE + "tongshen_poker_pressure.gif",
      BASE + "pressure.gif",
      BASE + "pressure.png"
    ],
    aggressive: [
      BASE + "tongshen_poker_aggressive.gif",
      BASE + "aggressive.gif",
      BASE + "aggressive.png"
    ],
    shocked: [
      BASE + "tongshen_poker_shocked.gif",
      BASE + "shocked.gif",
      BASE + "shocked.png"
    ],
    win: [
      BASE + "tongshen_poker_win.gif",
      BASE + "win.gif",
      BASE + "win.png"
    ],
    angry: [
      BASE + "tongshen_poker_angry.gif",
      BASE + "angry.gif",
      BASE + "angry.png"
    ],
    bluff: [
      BASE + "tongshen_poker_bluff.gif",
      BASE + "bluff.gif",
      BASE + "bluff.png"
    ],
    trickster: [
      BASE + "tongshen_poker_trickster.gif",
      BASE + "trickster.gif",
      BASE + "trickster.png"
    ]
  };

  const resolvedAssets = new Map();
  const loadingAssets = new Map();
  let scheduled = false;
  let lastState = "";
  let lastImg = null;

  function loadCandidate(state, index = 0) {
    if (resolvedAssets.has(state)) return Promise.resolve(resolvedAssets.get(state));
    if (loadingAssets.has(state)) return loadingAssets.get(state);

    const list = FACE_CANDIDATES[state] || [];
    const task = new Promise(resolve => {
      const tryNext = i => {
        if (i >= list.length) {
          resolvedAssets.set(state, DEFAULT_FACE);
          resolve(DEFAULT_FACE);
          return;
        }

        const probe = new Image();
        probe.onload = () => {
          resolvedAssets.set(state, list[i]);
          resolve(list[i]);
        };
        probe.onerror = () => tryNext(i + 1);
        probe.src = list[i];
      };
      tryNext(index);
    }).finally(() => loadingAssets.delete(state));

    loadingAssets.set(state, task);
    return task;
  }

  function preload() {
    Object.keys(FACE_CANDIDATES).forEach(state => loadCandidate(state));
  }

  function deriveState(stage, avatar) {
    if (!stage || !avatar) return "neutral";

    const result = stage.querySelector(".poker-result-v2");
    const resultText = result?.textContent?.trim() || "";
    const actionText = stage.querySelector(".opponent-action-v2")?.textContent?.trim() || "";

    // 玩家把統神逼到棄牌：爆氣；真正攤牌輸掉：震驚。
    if (result?.classList.contains("win")) {
      if (/拿下底池|FOLD/i.test(resultText + " " + actionText)) return "angry";
      return "shocked";
    }

    // 玩家輸掉牌局時，統神進入勝利表情。
    if (result?.classList.contains("lose")) return "win";
    if (result?.classList.contains("tie")) return "focus";

    if (stage.classList.contains("is-reraise")) return "aggressive";

    // Tell 本身不是答案。遊戲核心 randomTell 已會混入假訊號，
    // 這裡只是把不同微動作映射成不同視覺演技。
    if (avatar.classList.contains("tell-freeze")) return "focus";
    if (avatar.classList.contains("tell-fidget")) return "pressure";
    if (avatar.classList.contains("tell-snap")) return "aggressive";
    if (avatar.classList.contains("tell-glance")) return "trickster";
    if (avatar.classList.contains("tell-breathe")) return "bluff";

    return "neutral";
  }

  function clearStateClasses(avatar) {
    [...avatar.classList].forEach(cls => {
      if (cls.startsWith("poker-face-state-")) avatar.classList.remove(cls);
    });
  }

  async function applyState(stage, avatar, state) {
    const img = avatar.querySelector("img");
    if (!img) return;

    if (state !== lastState || img !== lastImg) {
      clearStateClasses(avatar);
      avatar.classList.add(`poker-face-state-${state}`);
      avatar.dataset.faceState = state;
      avatar.classList.remove("poker-face-state-enter");
      void avatar.offsetWidth;
      avatar.classList.add("poker-face-state-enter");
      lastState = state;
      lastImg = img;
    }

    const src = await loadCandidate(state);
    if (!document.contains(img)) return;
    if (img.dataset.faceResolved === src) return;

    img.dataset.faceResolved = src;
    img.onerror = () => {
      img.onerror = null;
      img.src = DEFAULT_FACE;
      img.dataset.faceResolved = DEFAULT_FACE;
    };
    img.src = src;
  }

  function sync() {
    scheduled = false;

    const stage = document.querySelector("#modalBody .poker-v2-stage");
    if (!stage) {
      lastState = "";
      lastImg = null;
      return;
    }

    const avatar = stage.querySelector(".poker-opponent-v2 .poker-avatar-v2");
    if (!avatar) return;

    avatar.classList.add("poker-face-system");
    const state = deriveState(stage, avatar);
    applyState(stage, avatar, state);
  }

  function scheduleSync() {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(sync);
  }

  function boot() {
    preload();
    scheduleSync();

    const root = document.getElementById("modalBody");
    if (!root) return;

    new MutationObserver(scheduleSync).observe(root, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["class"]
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot, { once: true });
  } else {
    boot();
  }
})();
