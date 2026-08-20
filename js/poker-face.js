(() => {
  "use strict";

  const DEFAULT_FACE = "assets/characters/tongshen.webp";

  // 之後只要把同名 GIF / PNG 放進 assets/poker/tongshen/，
  // 不需要再修改 Poker 主程式。GIF 優先，PNG 次之，沒有素材時沿用原本 tongshen.webp。
  const FACE_CANDIDATES = {
    neutral:    ["assets/poker/tongshen/neutral.gif",    "assets/poker/tongshen/neutral.png"],
    focus:      ["assets/poker/tongshen/focus.gif",      "assets/poker/tongshen/focus.png"],
    pressure:   ["assets/poker/tongshen/pressure.gif",   "assets/poker/tongshen/pressure.png"],
    aggressive: ["assets/poker/tongshen/aggressive.gif", "assets/poker/tongshen/aggressive.png"],
    shocked:    ["assets/poker/tongshen/shocked.gif",    "assets/poker/tongshen/shocked.png"],
    win:        ["assets/poker/tongshen/win.gif",        "assets/poker/tongshen/win.png"]
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
    if (result?.classList.contains("win")) return "shocked"; // 玩家贏牌，統神被抓到
    if (result?.classList.contains("lose")) return "win";    // 玩家輸牌，統神得意
    if (result?.classList.contains("tie")) return "focus";

    if (stage.classList.contains("is-reraise")) return "aggressive";

    if (avatar.classList.contains("tell-freeze")) return "focus";
    if (avatar.classList.contains("tell-fidget")) return "pressure";
    if (avatar.classList.contains("tell-snap")) return "aggressive";
    if (avatar.classList.contains("tell-glance")) return "focus";
    if (avatar.classList.contains("tell-breathe")) return "neutral";

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
