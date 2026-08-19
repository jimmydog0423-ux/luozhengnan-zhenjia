(() => {
  "use strict";

  const GYM_PROPS = {
    "看台":   { x: 820,  y: 395, w: 430, h: 320, cls: "gym-bleacher" },
    "籃球":   { x: 955,  y: 720, w: 104, h: 104, cls: "gym-ball" },
    "器材櫃": { x: 1490, y: 710, w: 190, h: 210, cls: "gym-locker" }
  };

  const GYM_NAV = {
    "回中庭": { x: 235, y: 790, direction: "back" }
  };

  function cleanLabel(raw) {
    return String(raw || "")
      .replace(/^已完成[:：]?\s*/, "")
      .replace(/^調查[:：]?\s*/, "")
      .replace(/^互動[:：]?\s*/, "")
      .trim();
  }

  function isGym() {
    return document.getElementById("roomName")?.textContent?.trim() === "體育館";
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
    button.classList.remove("embedded-hitbox", "foreground-prop", "world-door");
    button.classList.add("gym-nav", `gym-nav-${nav.direction}`);
    button.dataset.gymNav = nav.direction;
    setBox(button, { x: nav.x, y: nav.y, w: 170, h: 108 });

    let arrow = button.querySelector(".gym-ground-arrow");
    if (!arrow) {
      arrow = document.createElement("span");
      arrow.className = "gym-ground-arrow";
      arrow.setAttribute("aria-hidden", "true");
      button.appendChild(arrow);
    }

    let text = button.querySelector(".gym-nav-label");
    if (!text) {
      text = document.createElement("span");
      text.className = "gym-nav-label";
      button.appendChild(text);
    }
    if (text.textContent !== label) text.textContent = label;
  }

  function decorateButton(button) {
    if (!(button instanceof HTMLElement) || !button.matches("button.scene-object")) return;
    const label = cleanLabel(button.dataset.label || button.getAttribute("aria-label"));

    const prop = GYM_PROPS[label];
    if (prop) {
      button.classList.remove("gym-nav", "gym-nav-back", "foreground-prop", "world-door");
      button.classList.add("embedded-hitbox", "gym-prop", prop.cls);
      setBox(button, prop);
      return;
    }

    const nav = GYM_NAV[label];
    if (nav) makeGroundNav(button, label, nav);
  }

  function syncGym() {
    const layer = document.getElementById("objectLayer");
    if (!layer) return;

    if (!isGym()) {
      if (layer.dataset.gym === "1") layer.removeAttribute("data-gym");
      return;
    }

    if (layer.dataset.gym !== "1") layer.dataset.gym = "1";
    layer.querySelectorAll("button.scene-object").forEach(decorateButton);
  }

  function boot() {
    const layer = document.getElementById("objectLayer");
    const roomName = document.getElementById("roomName");
    if (!layer || !roomName) return;

    syncGym();

    // Only watch scene-button replacement and room-name changes; no subtree loop.
    new MutationObserver(syncGym).observe(layer, { childList: true });
    new MutationObserver(syncGym).observe(roomName, { childList: true, characterData: true, subtree: true });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot, { once: true });
  else boot();
})();
