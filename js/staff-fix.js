(() => {
  "use strict";

  const STAFF_PROPS = {
    "教師桌":       { x: 835,  y: 560, w: 420, h: 215, type: "embedded", cls: "staff-desk" },
    "點名簿":       { x: 845,  y: 485, w: 108, h: 88,  type: "prop",     cls: "staff-roll" },
    "老式保險箱":   { x: 585,  y: 535, w: 175, h: 225, type: "embedded", cls: "staff-safe" },
    "統神":         { x: 1270, y: 610, w: 205, h: 280, type: "npc",      cls: "staff-god" }
  };

  const STAFF_NAV = {
    "回走廊": { x: 1450, y: 790, direction: "right" }
  };

  function cleanLabel(raw) {
    return String(raw || "")
      .replace(/^已完成[:：]?\s*/, "")
      .replace(/^調查[:：]?\s*/, "")
      .replace(/^互動[:：]?\s*/, "")
      .trim();
  }

  function isStaff() {
    return document.getElementById("roomName")?.textContent?.trim() === "教職員室";
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
    button.classList.remove("embedded-hitbox", "foreground-prop", "world-door", "world-npc");
    button.classList.add("staff-nav", `staff-nav-${nav.direction}`);
    setBox(button, { x: nav.x, y: nav.y, w: 165, h: 105 });

    let arrow = button.querySelector(".staff-ground-arrow");
    if (!arrow) {
      arrow = document.createElement("span");
      arrow.className = "staff-ground-arrow";
      arrow.setAttribute("aria-hidden", "true");
      button.appendChild(arrow);
    }

    let text = button.querySelector(".staff-nav-label");
    if (!text) {
      text = document.createElement("span");
      text.className = "staff-nav-label";
      button.appendChild(text);
    }
    if (text.textContent !== label) text.textContent = label;
  }

  function decorateButton(button) {
    if (!(button instanceof HTMLElement) || !button.matches("button.scene-object")) return;
    const label = cleanLabel(button.dataset.label || button.getAttribute("aria-label"));

    const prop = STAFF_PROPS[label];
    if (prop) {
      button.classList.remove("staff-nav", "staff-nav-right", "world-door");
      button.classList.add("staff-prop", prop.cls);
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

    const nav = STAFF_NAV[label];
    if (nav) makeNav(button, label, nav);
  }

  function syncStaff() {
    const layer = document.getElementById("objectLayer");
    if (!layer) return;

    if (!isStaff()) {
      if (layer.dataset.staff === "1") layer.removeAttribute("data-staff");
      return;
    }

    if (layer.dataset.staff !== "1") layer.dataset.staff = "1";
    layer.querySelectorAll("button.scene-object").forEach(decorateButton);
  }

  function boot() {
    const layer = document.getElementById("objectLayer");
    const roomName = document.getElementById("roomName");
    if (!layer || !roomName) return;

    syncStaff();
    new MutationObserver(syncStaff).observe(layer, { childList: true });
    new MutationObserver(syncStaff).observe(roomName, { childList: true, characterData: true, subtree: true });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot, { once: true });
  else boot();
})();
