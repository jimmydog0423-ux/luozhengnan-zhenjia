(() => {
  "use strict";

  const BASEMENT_PROPS = {
    "主配電盤": { x: 325,  y: 285, w: 255, h: 220, type: "embedded", cls: "basement-panel" },
    "紅色電纜": { x: 760,  y: 570, w: 225, h: 235, type: "prop",     cls: "basement-cable" },
    "舊錄音帶": { x: 1340, y: 555, w: 150, h: 118, type: "prop",     cls: "basement-tape" }
  };

  const BASEMENT_NAV = {
    "回舊校舍": { x: 225,  y: 755, direction: "left" },
    "更下面":   { x: 1405, y: 755, direction: "down" }
  };

  function cleanLabel(raw) {
    return String(raw || "")
      .replace(/^已完成[:：]?\s*/, "")
      .replace(/^調查[:：]?\s*/, "")
      .replace(/^互動[:：]?\s*/, "")
      .trim();
  }

  function isBasement() {
    return document.getElementById("roomName")?.textContent?.trim() === "地下機房";
  }

  function setBox(button, item) {
    button.style.left = `${item.x}px`;
    button.style.top = `${item.y}px`;
    button.style.setProperty("--hit-w", `${item.w}px`);
    button.style.setProperty("--hit-h", `${item.h}px`);
  }

  function makeNav(button, label, nav) {
    button.classList.remove("embedded-hitbox", "foreground-prop", "world-door", "world-npc", "basement-prop");
    button.classList.add("basement-nav", `basement-nav-${nav.direction}`);
    setBox(button, { x: nav.x, y: nav.y, w: 180, h: 115 });

    let arrow = button.querySelector(".basement-ground-arrow");
    if (!arrow) {
      arrow = document.createElement("span");
      arrow.className = "basement-ground-arrow";
      arrow.setAttribute("aria-hidden", "true");
      button.appendChild(arrow);
    }

    let text = button.querySelector(".basement-nav-label");
    if (!text) {
      text = document.createElement("span");
      text.className = "basement-nav-label";
      button.appendChild(text);
    }
    text.textContent = label;
  }

  function decorateButton(button) {
    if (!(button instanceof HTMLElement) || !button.matches("button.scene-object")) return;
    const label = cleanLabel(button.dataset.label || button.getAttribute("aria-label"));

    const prop = BASEMENT_PROPS[label];
    if (prop) {
      button.classList.remove("basement-nav", "basement-nav-left", "basement-nav-down", "world-door");
      button.classList.add("basement-prop", prop.cls);
      setBox(button, prop);

      if (prop.type === "embedded") {
        button.classList.add("embedded-hitbox");
        button.classList.remove("foreground-prop", "world-npc");
      } else {
        button.classList.add("foreground-prop");
        button.classList.remove("embedded-hitbox", "world-npc");
      }
      return;
    }

    const nav = BASEMENT_NAV[label];
    if (nav) makeNav(button, label, nav);
  }

  function syncBasement() {
    const layer = document.getElementById("objectLayer");
    if (!layer) return;

    if (!isBasement()) {
      if (layer.dataset.basementFix === "1") layer.removeAttribute("data-basement-fix");
      return;
    }

    layer.dataset.basementFix = "1";
    layer.querySelectorAll("button.scene-object").forEach(decorateButton);
  }

  function boot() {
    const layer = document.getElementById("objectLayer");
    const roomName = document.getElementById("roomName");
    if (!layer || !roomName) return;

    syncBasement();
    new MutationObserver(syncBasement).observe(layer, { childList: true });
    new MutationObserver(syncBasement).observe(roomName, { childList: true, characterData: true, subtree: true });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot, { once: true });
  else boot();
})();
