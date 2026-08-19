(() => {
  "use strict";

  const COURTYARD_PROPS = {
    "停住的鐘":     { x: 675,  y: 276, w: 88,  h: 88,  type: "embedded", cls: "courtyard-clock" },
    "老榕樹":       { x: 1280, y: 430, w: 330, h: 470, type: "embedded", cls: "courtyard-tree" },
    "乾掉的噴水池": { x: 790,  y: 610, w: 450, h: 175, type: "embedded", cls: "courtyard-fountain" },
    "單隻室內鞋":   { x: 1448, y: 744, w: 72,  h: 50,  type: "shoe",     cls: "courtyard-shoe" }
  };

  const COURTYARD_NAV = {
    "回校門":   { x: 790,  y: 820, direction: "back" },
    "一樓走廊": { x: 795,  y: 535, direction: "forward" },
    "體育館":   { x: 405,  y: 680, direction: "left" },
    "紅色禮堂": { x: 1160, y: 665, direction: "right" }
  };

  function cleanLabel(raw) {
    return String(raw || "")
      .replace(/^已完成[:：]?\s*/, "")
      .replace(/^調查[:：]?\s*/, "")
      .replace(/^互動[:：]?\s*/, "")
      .trim();
  }

  function isCourtyard() {
    return document.getElementById("roomName")?.textContent?.trim() === "中庭";
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
    button.classList.remove("embedded-hitbox", "foreground-prop", "world-door");
    button.classList.add("courtyard-nav", `courtyard-nav-${nav.direction}`);
    button.dataset.courtyardNav = nav.direction;
    setBox(button, { x: nav.x, y: nav.y, w: 170, h: 108 });

    let arrow = button.querySelector(".courtyard-ground-arrow");
    if (!arrow) {
      arrow = document.createElement("span");
      arrow.className = "courtyard-ground-arrow";
      arrow.setAttribute("aria-hidden", "true");
      button.appendChild(arrow);
    }

    let text = button.querySelector(".courtyard-nav-label");
    if (!text) {
      text = document.createElement("span");
      text.className = "courtyard-nav-label";
      button.appendChild(text);
    }
    if (text.textContent !== label) text.textContent = label;
  }

  function decorateButton(button) {
    if (!(button instanceof HTMLElement) || !button.matches("button.scene-object")) return;
    const label = cleanLabel(button.dataset.label || button.getAttribute("aria-label"));

    const prop = COURTYARD_PROPS[label];
    if (prop) {
      button.classList.remove("courtyard-nav", "courtyard-nav-back", "courtyard-nav-forward", "courtyard-nav-left", "courtyard-nav-right");
      button.classList.add("courtyard-prop", prop.cls);
      setBox(button, prop);

      if (prop.type === "embedded") {
        button.classList.add("embedded-hitbox");
        button.classList.remove("foreground-prop");
      } else {
        button.classList.remove("embedded-hitbox");
        button.classList.add("foreground-prop");
      }
      return;
    }

    const nav = COURTYARD_NAV[label];
    if (nav) makeNav(button, label, nav);
  }

  function syncCourtyard() {
    const layer = document.getElementById("objectLayer");
    if (!layer) return;

    if (!isCourtyard()) {
      if (layer.dataset.courtyard === "1") layer.removeAttribute("data-courtyard");
      return;
    }

    if (layer.dataset.courtyard !== "1") layer.dataset.courtyard = "1";
    layer.querySelectorAll("button.scene-object").forEach(decorateButton);
  }

  function boot() {
    const layer = document.getElementById("objectLayer");
    const roomName = document.getElementById("roomName");
    if (!layer || !roomName) return;

    syncCourtyard();

    // Observe only direct scene-button replacement. This avoids the old subtree mutation loop.
    new MutationObserver(syncCourtyard).observe(layer, { childList: true });
    new MutationObserver(syncCourtyard).observe(roomName, { childList: true, characterData: true, subtree: true });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot, { once: true });
  else boot();
})();
