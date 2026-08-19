(() => {
  "use strict";

  const DIALOGUE_ASSET = {
    "羅正男": "assets/characters/luozhengnan.webp",
    "薛喜": "assets/characters/xuexi.webp",
    "中指通": "assets/characters/zhongzhitong.webp",
    "TOYZ": "assets/characters/toyz.webp",
    "統神": "assets/characters/tongshen.webp",
    "薛喜？": "assets/characters/fake_xuexi.webp"
  };

  const SCENE_ASSET = {
    "中指通": DIALOGUE_ASSET["中指通"],
    "TOYZ": DIALOGUE_ASSET["TOYZ"],
    "統神": DIALOGUE_ASSET["統神"],
    "薛喜？": DIALOGUE_ASSET["薛喜？"]
  };

  const style = document.createElement("style");
  style.textContent = `
    .portrait .character-sprite {
      width: 100%;
      height: 100%;
      object-fit: contain;
      object-position: center bottom;
      display: block;
    }
    .scene-object .scene-character-sprite {
      width: 100%;
      height: 100%;
      object-fit: contain;
      object-position: center bottom;
      display: block;
      pointer-events: none;
      filter: drop-shadow(0 12px 12px rgba(0,0,0,.58));
    }
    .scene-object.npc {
      overflow: visible;
    }
  `;
  document.head.appendChild(style);

  function swapDialoguePortrait() {
    const portrait = document.querySelector(".portrait");
    const who = document.querySelector(".dialogue-who")?.textContent?.trim();
    const src = DIALOGUE_ASSET[who];
    if (!portrait || !src) return;
    if (portrait.querySelector(`img[data-character="${who}"]`)) return;
    portrait.innerHTML = "";
    const img = document.createElement("img");
    img.className = "character-sprite";
    img.dataset.character = who;
    img.src = src;
    img.alt = "";
    img.setAttribute("aria-hidden", "true");
    portrait.appendChild(img);
  }

  function swapSceneCharacters() {
    document.querySelectorAll(".scene-object").forEach((button) => {
      const raw = `${button.getAttribute("aria-label") || ""} ${button.dataset.label || ""}`;
      const who = ["薛喜？", "中指通", "TOYZ", "統神"].find((name) => raw.includes(name));
      if (!who) return;
      const src = SCENE_ASSET[who];
      if (!src || button.querySelector(`img[data-character="${who}"]`)) return;

      button.querySelector("svg")?.remove();
      const img = document.createElement("img");
      img.className = "scene-character-sprite";
      img.dataset.character = who;
      img.src = src;
      img.alt = "";
      img.setAttribute("aria-hidden", "true");
      button.prepend(img);
    });
  }

  function syncCharacters() {
    swapDialoguePortrait();
    swapSceneCharacters();
  }

  new MutationObserver(syncCharacters).observe(document.body, {
    childList: true,
    subtree: true
  });

  syncCharacters();
})();
