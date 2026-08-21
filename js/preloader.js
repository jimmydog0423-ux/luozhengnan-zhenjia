(() => {
  "use strict";

  const title = document.getElementById("titleOverlay");
  const card = title?.querySelector(".title-card");
  const actions = card?.querySelector(".title-actions");
  const startBtn = document.getElementById("startBtn");
  const continueBtn = document.getElementById("continueBtn");
  if (!title || !card || !actions || !startBtn || !continueBtn) return;

  const groups = {
    "場景背景": [
      "assets/backgrounds/gate.webp",
      "assets/backgrounds/courtyard.webp",
      "assets/backgrounds/hall1.webp",
      "assets/backgrounds/auditorium.webp",
      "assets/backgrounds/class203.webp",
      "assets/backgrounds/infirmary.webp",
      "assets/backgrounds/computer.webp",
      "assets/backgrounds/hall2.webp",
      "assets/backgrounds/music.webp",
      "assets/backgrounds/library.webp",
      "assets/backgrounds/staff.webp",
      "assets/backgrounds/gym.webp",
      "assets/backgrounds/oldhall.webp",
      "assets/backgrounds/basement.webp"
    ],
    "角色": [
      "assets/characters/luozhengnan.webp",
      "assets/characters/xuexi.webp",
      "assets/characters/zhongzhitong.webp",
      "assets/characters/toyz.webp",
      "assets/characters/tongshen.webp",
      "assets/characters/fake_xuexi.webp"
    ],
    "互動物件": [
      "assets/objects/shoe.webp",
      "assets/objects/desk32.webp",
      "assets/objects/classphoto.webp",
      "assets/objects/uvlight.webp",
      "assets/objects/mirror.webp",
      "assets/objects/window8.webp",
      "assets/objects/computer.webp",
      "assets/objects/server.webp",
      "assets/objects/radio.webp",
      "assets/objects/metronome.webp",
      "assets/objects/score.webp",
      "assets/objects/roll.webp",
      "assets/objects/safe.webp",
      "assets/objects/cable.webp",
      "assets/objects/tape.webp",
      "assets/objects/wish_items.webp",
      "assets/objects/school_sign.png",
      "assets/objects/notice_board.png",
      "assets/objects/clock.png",
      "assets/objects/banyan_tree.png",
      "assets/objects/fountain.png",
      "assets/objects/poster.png",
      "assets/objects/locker.png",
      "assets/objects/後台紙箱.png"
    ],
    "小遊戲": [
      "assets/minigames/mini_classphoto.webp",
      "assets/minigames/mini_uv_mirror.webp",
      "assets/minigames/mini_computer_order.webp",
      "assets/minigames/mini_rhythm.webp",
      "assets/minigames/mini_roll_race.webp",
      "assets/minigames/mini_poker_duel.webp"
    ],
    "Poker 表情": [
      "assets/poker/tongshen/tongshen_poker_neutral_focus.gif",
      "assets/poker/tongshen/tongshen_poker_pressure.gif",
      "assets/poker/tongshen/tongshen_poker_aggressive.gif",
      "assets/poker/tongshen/tongshen_poker_shocked.gif",
      "assets/poker/tongshen/tongshen_poker_win.gif",
      "assets/poker/tongshen/tongshen_poker_angry.gif",
      "assets/poker/tongshen/tongshen_poker_bluff.gif",
      "assets/poker/tongshen/tongshen_poker_trickster.gif"
    ]
  };

  const assets = [{ group: "核心素材", url: "assets/art.svg", type: "fetch" }];
  Object.entries(groups).forEach(([group, urls]) => {
    urls.forEach(url => assets.push({ group, url, type: "image" }));
  });

  let ready = false;
  let failed = [];
  let completed = 0;
  let pendingButton = null;
  let resolveReady;
  const readyPromise = new Promise(resolve => { resolveReady = resolve; });

  window.GamePreloader = {
    ready: readyPromise,
    isReady: () => ready,
    total: assets.length,
    getFailed: () => failed.map(x => x.url)
  };

  const panel = document.createElement("div");
  panel.className = "game-preloader";
  panel.innerHTML = `
    <div class="game-preloader-top">
      <div>
        <b data-preload-title>遊戲素材預載中</b>
        <span data-preload-detail>正在準備圖片資源…</span>
      </div>
      <strong data-preload-percent>0%</strong>
    </div>
    <div class="game-preloader-track"><i data-preload-bar></i></div>
    <div class="game-preloader-bottom">
      <span data-preload-count>0 / ${assets.length}</span>
      <span data-preload-file>初始化…</span>
    </div>
    <button type="button" class="game-preloader-retry" data-preload-retry hidden>重新載入失敗項目</button>
  `;
  actions.insertAdjacentElement("beforebegin", panel);

  const ui = {
    title: panel.querySelector("[data-preload-title]"),
    detail: panel.querySelector("[data-preload-detail]"),
    percent: panel.querySelector("[data-preload-percent]"),
    bar: panel.querySelector("[data-preload-bar]"),
    count: panel.querySelector("[data-preload-count]"),
    file: panel.querySelector("[data-preload-file]"),
    retry: panel.querySelector("[data-preload-retry]")
  };

  function setLocked(locked) {
    [startBtn, continueBtn].forEach(btn => {
      btn.classList.toggle("preload-locked", locked);
      btn.setAttribute("aria-disabled", locked ? "true" : "false");
    });
    title.classList.toggle("preload-pending", locked);
  }

  setLocked(true);

  title.addEventListener("click", ev => {
    const btn = ev.target.closest?.("#startBtn, #continueBtn");
    if (!btn || ready) return;
    ev.preventDefault();
    ev.stopImmediatePropagation();
    pendingButton = btn;
    panel.classList.add("preload-attention");
    setTimeout(() => panel.classList.remove("preload-attention"), 420);
    ui.detail.textContent = "素材尚未完成，載入完會自動進入。";
  }, true);

  function updateProgress(currentAsset) {
    const percent = Math.round(completed / assets.length * 100);
    ui.percent.textContent = `${percent}%`;
    ui.bar.style.width = `${percent}%`;
    ui.count.textContent = `${completed} / ${assets.length}`;
    if (currentAsset) {
      const name = decodeURIComponent(currentAsset.url.split("/").pop());
      ui.file.textContent = `${currentAsset.group} · ${name}`;
    }
  }

  function timeout(ms, label) {
    return new Promise((_, reject) => setTimeout(() => reject(new Error(`${label} timeout`)), ms));
  }

  function loadImage(asset) {
    return Promise.race([
      new Promise((resolve, reject) => {
        const img = new Image();
        img.decoding = "async";
        img.onload = async () => {
          try { if (img.decode) await img.decode(); } catch (_) {}
          resolve();
        };
        img.onerror = () => reject(new Error(`image failed: ${asset.url}`));
        img.src = asset.url;
      }),
      timeout(30000, asset.url)
    ]);
  }

  function loadFetch(asset) {
    return Promise.race([
      fetch(asset.url, { cache: "force-cache" }).then(response => {
        if (!response.ok) throw new Error(`${response.status} ${asset.url}`);
        return response.blob();
      }),
      timeout(30000, asset.url)
    ]);
  }

  async function loadOnce(asset) {
    if (asset.type === "fetch") return loadFetch(asset);
    return loadImage(asset);
  }

  async function loadWithRetry(asset, retries = 2) {
    let lastError;
    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        await loadOnce(asset);
        return;
      } catch (err) {
        lastError = err;
        if (attempt < retries) await new Promise(r => setTimeout(r, 260 + attempt * 440));
      }
    }
    throw lastError;
  }

  async function runBatch(list, resetProgress = false) {
    failed = [];
    if (resetProgress) completed = assets.length - list.length;
    updateProgress();

    let cursor = 0;
    const worker = async () => {
      while (true) {
        const index = cursor++;
        if (index >= list.length) return;
        const asset = list[index];
        ui.detail.textContent = `正在載入：${asset.group}`;
        ui.file.textContent = decodeURIComponent(asset.url.split("/").pop());
        try {
          await loadWithRetry(asset, 2);
        } catch (error) {
          failed.push(asset);
          console.warn("[Preloader] failed", asset.url, error);
        } finally {
          completed++;
          updateProgress(asset);
        }
      }
    };

    const concurrency = Math.min(6, list.length || 1);
    await Promise.all(Array.from({ length: concurrency }, worker));

    if (failed.length) {
      panel.classList.add("has-error");
      ui.title.textContent = "部分素材載入失敗";
      ui.detail.textContent = `還有 ${failed.length} 個圖片沒有準備完成，請重新載入。`;
      ui.file.textContent = failed.map(x => decodeURIComponent(x.url.split("/").pop())).slice(0, 2).join("、");
      ui.retry.hidden = false;
      return;
    }

    finish();
  }

  function finish() {
    if (ready) return;
    ready = true;
    failed = [];
    completed = assets.length;
    updateProgress();
    panel.classList.remove("has-error");
    panel.classList.add("is-ready");
    ui.title.textContent = "素材預載完成";
    ui.detail.textContent = "場景、角色、物件與小遊戲圖片已準備完成。";
    ui.file.textContent = "可以開始調查";
    ui.retry.hidden = true;
    setLocked(false);
    resolveReady?.();
    window.dispatchEvent(new CustomEvent("gamepreloadready", { detail: { total: assets.length } }));

    if (pendingButton && document.contains(pendingButton) && !pendingButton.hidden) {
      const target = pendingButton;
      pendingButton = null;
      setTimeout(() => target.click(), 120);
    }
  }

  ui.retry.addEventListener("click", () => {
    if (!failed.length || ready) return;
    const retryList = failed.slice();
    panel.classList.remove("has-error");
    ui.retry.hidden = true;
    ui.title.textContent = "重新載入素材";
    ui.detail.textContent = `重新處理 ${retryList.length} 個失敗項目…`;
    runBatch(retryList, true);
  });

  updateProgress();
  requestAnimationFrame(() => runBatch(assets));
})();
