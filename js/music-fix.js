(() => {
  "use strict";

  const MUSIC_PROPS = {
    "鋼琴":       { x: 365,  y: 490, w: 345, h: 190, type: "embedded", cls: "music-piano" },
    "節拍器":     { x: 315,  y: 365, w: 92,  h: 118, type: "prop",     cls: "music-metronome" },
    "泛黃樂譜":   { x: 465,  y: 420, w: 122, h: 104, type: "prop",     cls: "music-score" },
    "中指通":     { x: 1325, y: 635, w: 180, h: 255, type: "npc",      cls: "music-finger" }
  };

  const MUSIC_NAV = {
    "回走廊": { x: 1490, y: 760, direction: "right" }
  };

  function cleanLabel(raw) {
    return String(raw || "")
      .replace(/^已完成[:：]?\s*/, "")
      .replace(/^調查[:：]?\s*/, "")
      .replace(/^互動[:：]?\s*/, "")
      .trim();
  }

  function isMusicRoom() {
    return document.getElementById("roomName")?.textContent?.trim() === "音樂教室";
  }

  function setBox(button, item) {
    const left = `${item.x}px`;
    const top = `${item.y}px`;
    const w = `${item.w}px`;
    const h = `${item.h}px`;
    if (button.style.left !== left) button.style.left = left;
    if (button.style.top !== top) button.style.top = top;
    if (button.style.getPropertyValue("--hit-w") !== w) button.style.setProperty("--hit-w", w);
    if (button.style.getPropertyValue("--hit-h") !== h) button.style.setProperty("--hit-h", h);
  }

  function makeNav(button, label, nav) {
    button.classList.remove("embedded-hitbox", "foreground-prop", "world-door", "world-npc", "music-prop");
    button.classList.add("music-nav", `music-nav-${nav.direction}`);
    setBox(button, { x: nav.x, y: nav.y, w: 150, h: 105 });

    let arrow = button.querySelector(".music-ground-arrow");
    if (!arrow) {
      arrow = document.createElement("span");
      arrow.className = "music-ground-arrow";
      arrow.setAttribute("aria-hidden", "true");
      button.appendChild(arrow);
    }

    let text = button.querySelector(".music-nav-label");
    if (!text) {
      text = document.createElement("span");
      text.className = "music-nav-label";
      button.appendChild(text);
    }
    if (text.textContent !== label) text.textContent = label;
  }

  function decorateButton(button) {
    if (!(button instanceof HTMLElement) || !button.matches("button.scene-object")) return;
    const label = cleanLabel(button.dataset.label || button.getAttribute("aria-label"));

    const prop = MUSIC_PROPS[label];
    if (prop) {
      button.classList.remove("music-nav", "music-nav-right", "world-door");
      button.classList.add("music-prop", prop.cls);
      setBox(button, prop);

      if (prop.type === "embedded") {
        button.classList.add("embedded-hitbox");
        button.classList.remove("foreground-prop", "world-npc");
      } else if (prop.type === "prop") {
        button.classList.add("foreground-prop");
        button.classList.remove("embedded-hitbox", "world-npc");
      } else {
        button.classList.add("world-npc");
        button.classList.remove("embedded-hitbox", "foreground-prop");
      }
      return;
    }

    const nav = MUSIC_NAV[label];
    if (nav) makeNav(button, label, nav);
  }

  function syncMusicRoom() {
    const layer = document.getElementById("objectLayer");
    if (!layer) return;

    if (!isMusicRoom()) {
      if (layer.dataset.musicFix === "1") layer.removeAttribute("data-music-fix");
      return;
    }

    if (layer.dataset.musicFix !== "1") layer.dataset.musicFix = "1";
    layer.querySelectorAll("button.scene-object").forEach(decorateButton);
  }

  function boot() {
    const layer = document.getElementById("objectLayer");
    const roomName = document.getElementById("roomName");
    if (!layer || !roomName) return;

    syncMusicRoom();
    new MutationObserver(syncMusicRoom).observe(layer, { childList: true });
    new MutationObserver(syncMusicRoom).observe(roomName, { childList: true, characterData: true, subtree: true });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot, { once: true });
  else boot();
})();
