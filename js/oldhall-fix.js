(() => {
  "use strict";

  const OLDHALL_PROPS = {
    "鏽蝕置物櫃": { x: 1005, y: 330, w: 330, h: 280, type: "embedded", cls: "oldhall-locker" },
    "封死的教室": { x: 615,  y: 315, w: 185, h: 245, type: "embedded", cls: "oldhall-sealed" },
    "地下樓梯":   { x: 1260, y: 485, w: 255, h: 225, type: "embedded", cls: "oldhall-stairs" },
    "薛喜？":     { x: 1110, y: 600, w: 190, h: 270, type: "npc",      cls: "oldhall-shaxy" }
  };

  const OLDHALL_NAV = {
    "回二樓": { x: 235,  y: 755, direction: "left" },
    "往地下": { x: 1400, y: 755, direction: "down" }
  };

  function cleanLabel(raw) {
    return String(raw || "")
      .replace(/^已完成[:：]?\s*/, "")
      .replace(/^調查[:：]?\s*/, "")
      .replace(/^互動[:：]?\s*/, "")
      .trim();
  }

  function isOldHall() {
    return document.getElementById("roomName")?.textContent?.trim() === "舊校舍";
  }

  function setBox(button, item) {
    button.style.left = `${item.x}px`;
    button.style.top = `${item.y}px`;
    button.style.setProperty("--hit-w", `${item.w}px`);
    button.style.setProperty("--hit-h", `${item.h}px`);
  }

  function makeNav(button, label, nav) {
    button.classList.remove("embedded-hitbox", "foreground-prop", "world-door", "world-npc");
    button.classList.add("oldhall-nav", `oldhall-nav-${nav.direction}`);
    setBox(button, { x: nav.x, y: nav.y, w: 180, h: 115 });

    let arrow = button.querySelector(".oldhall-ground-arrow");
    if (!arrow) {
      arrow = document.createElement("span");
      arrow.className = "oldhall-ground-arrow";
      arrow.setAttribute("aria-hidden", "true");
      button.appendChild(arrow);
    }

    let text = button.querySelector(".oldhall-nav-label");
    if (!text) {
      text = document.createElement("span");
      text.className = "oldhall-nav-label";
      button.appendChild(text);
    }
    text.textContent = label;
  }

  function decorateButton(button) {
    if (!(button instanceof HTMLElement) || !button.matches("button.scene-object")) return;
    const label = cleanLabel(button.dataset.label || button.getAttribute("aria-label"));

    const prop = OLDHALL_PROPS[label];
    if (prop) {
      button.classList.remove("oldhall-nav", "oldhall-nav-left", "oldhall-nav-down", "world-door");
      button.classList.add("oldhall-prop", prop.cls);
      setBox(button, prop);

      if (prop.type === "embedded") {
        button.classList.add("embedded-hitbox");
        button.classList.remove("foreground-prop", "world-npc");
      } else {
        button.classList.add("world-npc");
        button.classList.remove("embedded-hitbox", "foreground-prop");
      }
      return;
    }

    const nav = OLDHALL_NAV[label];
    if (nav) makeNav(button, label, nav);
  }

  function syncOldHall() {
    const layer = document.getElementById("objectLayer");
    if (!layer) return;

    if (!isOldHall()) {
      if (layer.dataset.oldhall === "1") layer.removeAttribute("data-oldhall");
      return;
    }

    layer.dataset.oldhall = "1";
    layer.querySelectorAll("button.scene-object").forEach(decorateButton);
  }

  function boot() {
    const layer = document.getElementById("objectLayer");
    const roomName = document.getElementById("roomName");
    if (!layer || !roomName) return;

    syncOldHall();
    new MutationObserver(syncOldHall).observe(layer, { childList: true });
    new MutationObserver(syncOldHall).observe(roomName, { childList: true, characterData: true, subtree: true });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot, { once: true });
  else boot();
})();
