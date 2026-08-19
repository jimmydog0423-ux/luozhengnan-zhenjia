(() => {
  "use strict";

  const body = document.getElementById("modalBody");
  if (!body) return;

  const MINIGAMES = [
    { key:"classphoto", match:"班級照片：找出 3 個異常點", src:"assets/minigames/mini_classphoto.webp", stage:true, hotspots:[[31,33],[74,28],[59,60]] },
    { key:"uv", match:"紫外線調查", src:"assets/minigames/mini_uv_mirror.webp", stage:true, hotspots:[[45,40],[57,35],[49,58]] },
    { key:"computer", match:"四台機器啟動順序", src:"assets/minigames/mini_computer_order.webp" },
    { key:"rhythm", match:"中指通：六指逆拍", src:"assets/minigames/mini_rhythm.webp" },
    { key:"roll", match:"紙捲競速", src:"assets/minigames/mini_roll_race.webp" },
    { key:"poker", match:"統神 vs 薛喜：讀人", src:"assets/minigames/mini_poker_duel.webp" }
  ];

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

  function syncMinigameArt() {
    const text = body.textContent || "";
    const item = MINIGAMES.find(entry => text.includes(entry.match));

    body.querySelectorAll("img.minigame-art-banner").forEach(img => {
      if (!item || img.dataset.minigameKey !== item.key) img.remove();
    });

    if (!item) return;

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

  new MutationObserver(syncMinigameArt).observe(body, { childList:true, subtree:true, characterData:true });
  syncMinigameArt();
})();
