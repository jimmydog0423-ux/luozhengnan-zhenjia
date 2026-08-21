(() => {
  "use strict";

  const body = document.getElementById("modalBody");
  if (!body) return;

  const MINIGAMES = [
    { key:"classphoto", match:"班級照片：找出 3 個異常點", src:"assets/minigames/mini_classphoto.webp", stage:true, hotspots:[[31.5,32.7],[73.8,25.5],[59,62.4]] },
    { key:"uv", match:"紫外線調查", src:"assets/minigames/mini_uv_mirror.webp", stage:true, hotspots:[[45,40],[57,35],[49,58]] },
    { key:"computer", match:"四台機器啟動順序", src:"assets/minigames/mini_computer_order.webp" },
    { key:"rhythm", match:"中指通：六指逆拍", src:"assets/minigames/mini_rhythm.webp" },
    { key:"roll", match:"紙捲競速", src:"assets/minigames/mini_roll_race.webp" },
    { key:"poker", match:"統神 vs 薛喜：讀人", src:"assets/minigames/mini_poker_duel.webp" }
  ];

  let scheduled = false;

  function createImage(item, className) {
    const img = document.createElement("img");
    img.className = className;
    img.dataset.minigameKey = item.key;
    img.src = item.src;
    img.alt = "";
    img.setAttribute("aria-hidden", "true");
    img.style.display = "block";
    img.style.width = "100%";
    img.style.objectFit = "cover";
    img.style.pointerEvents = "none";
    img.style.borderRadius = "14px";
    return img;
  }

  function clearBanners() {
    body.querySelectorAll("img.minigame-art-banner").forEach(img => img.remove());
  }

  function syncRhythmArt(item) {
    body.querySelectorAll('img.minigame-art-banner[data-minigame-key="rhythm"]').forEach(img => img.remove());
    const stage = body.querySelector(".rhythm-v2 .rv2-stage");
    if (!stage) return;
    stage.classList.add("rhythm-art-bg");
    stage.style.setProperty("--rv2-stage-image", `url("${item.src}")`);
  }

  function syncMinigameArt() {
    scheduled = false;

    // Realtime bosses update HUD text dozens of times per second. They never use
    // minigame banners, so do not scan their full text content at all.
    if (body.querySelector(".overload-boss-v2, .pyramid-boss-v2")) {
      clearBanners();
      return;
    }

    /* Dialogue may mention a minigame by name. Never treat dialogue text as the
       minigame screen itself, otherwise a huge gameplay banner appears above it. */
    if (body.querySelector(".dialogue-layout")) {
      clearBanners();
      return;
    }

    const text = body.textContent || "";
    const item = MINIGAMES.find(entry => text.includes(entry.match));

    body.querySelectorAll("img.minigame-art-banner").forEach(img => {
      if (!item || img.dataset.minigameKey !== item.key || item.key === "rhythm") img.remove();
    });

    if (!item) return;

    if (item.key === "rhythm") {
      syncRhythmArt(item);
      return;
    }

    /* V2 Paper Roll and Poker already have their own game presentation. Adding a
       separate 16:9 banner makes the controls fall below the viewport. */
    if ((item.key === "roll" && body.querySelector(".paper-roll-v2")) ||
        (item.key === "poker" && body.querySelector(".poker-v2"))) {
      clearBanners();
      return;
    }

    if (item.stage) {
      const stage = body.querySelector(".mini-stage");
      if (!stage) return;

      const oldSvg = stage.querySelector("svg");
      if (oldSvg && !stage.querySelector("img.minigame-art-stage")) {
        const img = createImage(item, "minigame-art-stage");
        img.style.height = "100%";
        img.style.borderRadius = "0";
        oldSvg.replaceWith(img);
      }

      const hotspots = stage.querySelectorAll("button.hotspot");
      if (item.hotspots) {
        hotspots.forEach((spot, i) => {
          const pos = item.hotspots[i];
          if (!pos) return;
          spot.style.left = `${pos[0]}%`;
          spot.style.top = `${pos[1]}%`;
        });
      }
      return;
    }

    if (body.querySelector(`img.minigame-art-banner[data-minigame-key="${item.key}"]`)) return;
    const img = createImage(item, "minigame-art-banner");
    img.style.aspectRatio = "16 / 9";
    img.style.maxHeight = "360px";
    img.style.margin = "12px 0 16px";
    const title = body.querySelector("h2");
    if (title) title.insertAdjacentElement("afterend", img);
    else body.prepend(img);
  }

  function scheduleSync() {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(syncMinigameArt);
  }

  new MutationObserver(scheduleSync).observe(body, { childList:true, subtree:true, characterData:true });
  syncMinigameArt();
})();
