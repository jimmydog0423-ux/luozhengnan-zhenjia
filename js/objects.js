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
    "後台紙箱": "assets/objects/wish_items.webp",
    "校牌": "assets/objects/school_sign.png",
    "公告欄": "assets/objects/notice_board.png",
    "停住的鐘": "assets/objects/clock.png",
    "老榕樹": "assets/objects/banyan_tree.png",
    "乾掉的噴水池": "assets/objects/fountain.png",
    "破掉的校慶海報": "assets/objects/poster.png",
    "置物櫃": "assets/objects/locker.png"
  };

  const layer = document.getElementById("objectLayer");
  if (!layer) return;

  const ART_ENTRIES = Object.entries(OBJECT_ART).sort((a, b) => b[0].length - a[0].length);

  function normalizeLabel(label) {
    return String(label || "")
      .replace(/^調查[:：]\s*/, "")
      .replace(/^互動[:：]\s*/, "")
      .trim();
  }

  function findObjectArt(label) {
    const normalized = normalizeLabel(label);
    const exact = OBJECT_ART[normalized];
    if (exact) return exact;

    const match = ART_ENTRIES.find(([name]) => normalized === name || normalized.startsWith(name + " ") || normalized.startsWith(name + "（") || normalized.startsWith(name + "("));
    return match ? match[1] : null;
  }

  function applyObjectArt() {
    layer.querySelectorAll("button.scene-object").forEach((button) => {
      const label = button.dataset.label || button.getAttribute("aria-label") || "";
      const src = findObjectArt(label);
      if (!src) return;

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
