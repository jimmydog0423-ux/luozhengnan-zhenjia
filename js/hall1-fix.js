(() => {
  "use strict";

  const HALL1_PROPS = {
    "破掉的校慶海報": { x: 1450, y: 340, w: 230, h: 285, cls: "hall1-poster" },
    "置物櫃":         { x: 565,  y: 575, w: 245, h: 205, cls: "hall1-locker" },
    "拖行痕跡":       { x: 945,  y: 810, w: 330, h: 105, cls: "hall1-drag" }
  };

  /* Full-size desktop positions. Keep all destinations inside the safe stage area. */
  const HALL1_NAV_BASE = {
    "回中庭":   { x: 170,  y: 812, rot: 180, scale: 0.94, kind: "back" },
    "電腦教室": { x: 1070, y: 555, rot: 53,  scale: 0.54, kind: "room" },
    "保健室":   { x: 1160, y: 620, rot: 56,  scale: 0.63, kind: "room" },
    "二年三班": { x: 1250, y: 685, rot: 59,  scale: 0.72, kind: "room" },
    /* The background has no visible stairs. Treat the far end of the corridor as the route upstairs. */
    "二樓樓梯": { x: 900,  y: 590, rot: 0,   scale: 0.58, kind: "forward", displayLabel: "往走廊盡頭" }
  };

  /* Smaller browser windows use the same vanishing-point route, so it stays clear of the toolbar. */
  const HALL1_NAV_COMPACT = {
    "回中庭":   { x: 165,  y: 800, rot: 180, scale: 0.90, kind: "back" },
    "電腦教室": { x: 1025, y: 540, rot: 53,  scale: 0.47, kind: "room" },
    "保健室":   { x: 1100, y: 590, rot: 56,  scale: 0.54, kind: "room" },
    "二年三班": { x: 1180, y: 640, rot: 59,  scale: 0.62, kind: "room" },
    "二樓樓梯": { x: 900,  y: 590, rot: 0,   scale: 0.54, kind: "forward", displayLabel: "往走廊盡頭" }
  };

  function getNavMap() {
    return (window.innerWidth <= 1500 || window.innerHeight <= 920)
      ? HALL1_NAV_COMPACT
      : HALL1_NAV_BASE;
  }

  function cleanLabel(raw) {
    return String(raw || "")
      .replace(/^已完成[:：]?\s*/, "")
      .replace(/^調查[:：]?\s*/, "")
      .replace(/^互動[:：]?\s*/, "")
      .trim();
  }

  function isHall1() {
    return document.getElementById("roomName")?.textContent?.trim() === "一樓走廊";
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

  function makeGroundNav(button, label, nav) {
    button.classList.remove(
      "embedded-hitbox", "foreground-prop", "world-door",
      "hall1-nav-back", "hall1-nav-room", "hall1-nav-stairs", "hall1-nav-forward"
    );
    button.classList.add("hall1-nav", `hall1-nav-${nav.kind}`);
    button.dataset.hall1Nav = nav.kind;
    button.style.setProperty("--hall-arrow-rot", `${nav.rot}deg`);
    button.style.setProperty("--hall-arrow-scale", String(nav.scale));
    setBox(button, { x: nav.x, y: nav.y, w: 132 * nav.scale, h: 92 * nav.scale });

    let arrow = button.querySelector(".hall1-ground-arrow");
    if (!arrow) {
      arrow = document.createElement("span");
      arrow.className = "hall1-ground-arrow";
      arrow.setAttribute("aria-hidden", "true");
      button.appendChild(arrow);
    }

    let text = button.querySelector(".hall1-nav-label");
    if (!text) {
      text = document.createElement("span");
      text.className = "hall1-nav-label";
      button.appendChild(text);
    }

    const displayLabel = nav.displayLabel || label;
    if (text.textContent !== displayLabel) text.textContent = displayLabel;
    if (nav.displayLabel) button.title = displayLabel;
  }

  function decorateButton(button) {
    if (!(button instanceof HTMLElement) || !button.matches("button.scene-object")) return;
    const label = cleanLabel(button.dataset.label || button.getAttribute("aria-label"));

    const prop = HALL1_PROPS[label];
    if (prop) {
      button.classList.remove("hall1-nav", "hall1-nav-back", "hall1-nav-room", "hall1-nav-stairs", "hall1-nav-forward", "foreground-prop", "world-door");
      button.classList.add("hall1-prop", "embedded-hitbox", prop.cls);
      setBox(button, prop);
      return;
    }

    const nav = getNavMap()[label];
    if (nav) makeGroundNav(button, label, nav);
  }

  function syncHall1() {
    const layer = document.getElementById("objectLayer");
    if (!layer) return;

    if (!isHall1()) {
      if (layer.dataset.hall1 === "1") layer.removeAttribute("data-hall1");
      return;
    }

    if (layer.dataset.hall1 !== "1") layer.dataset.hall1 = "1";
    layer.querySelectorAll("button.scene-object").forEach(decorateButton);
  }

  function boot() {
    const layer = document.getElementById("objectLayer");
    const roomName = document.getElementById("roomName");
    if (!layer || !roomName) return;

    syncHall1();
    new MutationObserver(syncHall1).observe(layer, { childList: true });
    new MutationObserver(syncHall1).observe(roomName, { childList: true, characterData: true, subtree: true });

    let resizeTimer = 0;
    window.addEventListener("resize", () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(syncHall1, 70);
    }, { passive: true });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot, { once: true });
  else boot();
})();