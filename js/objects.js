(() => {
  "use strict";
  const OBJECT_ART = {
    "單隻室內鞋": "assets/objects/shoe.webp",
    "32 號桌": "assets/objects/desk32.webp",
    "班級照片": "assets/objects/classphoto.webp",
    "紫外線燈": "assets/objects/uvlight.webp",
    "鏡子": "assets/objects/mirror.webp",
    "不存在的窗戶": "assets/objects/window8.webp",
    "電腦 A": "assets/objects/computer.webp",
    "電腦 B": "assets/objects/computer.webp",
    "電腦 C": "assets/objects/computer.webp",
    "伺服器櫃": "assets/objects/server.webp",
    "無線電": "assets/objects/radio.webp",
    "節拍器": "assets/objects/metronome.webp",
    "泛黃樂譜": "assets/objects/score.webp",
    "點名簿": "assets/objects/roll.webp",
    "老式保險箱": "assets/objects/safe.webp",
    "紅色電纜": "assets/objects/cable.webp",
    "舊錄音帶": "assets/objects/tape.webp",
    "後台紙箱": "assets/objects/wish_items.webp"
  };

  const layer = document.getElementById("objectLayer");
  if (!layer) return;

  function applyObjectArt() {
    layer.querySelectorAll("button.scene-object").forEach((button) => {
      const label = button.dataset.label || button.getAttribute("aria-label") || "";
      const match = Object.entries(OBJECT_ART).find(([name]) => label.includes(name));
      if (!match) return;
      const [, src] = match;
      let img = button.querySelector("img.object-sprite-img");
      if (!img) {
        const svg = button.querySelector("svg");
        img = document.createElement("img");
        img.className = "object-sprite-img";
        img.alt = "";
        img.setAttribute("aria-hidden", "true");
        img.style.width = "100%";
        img.style.height = "100%";
        img.style.objectFit = "contain";
        img.style.pointerEvents = "none";
        if (svg) svg.replaceWith(img); else button.prepend(img);
      }
      if (img.getAttribute("src") !== src) img.src = src;
    });
  }

  new MutationObserver(applyObjectArt).observe(layer, {childList:true, subtree:true});
  applyObjectArt();
})();
