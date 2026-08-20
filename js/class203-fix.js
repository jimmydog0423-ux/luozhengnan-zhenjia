(() => {
  "use strict";

  const CLASS203_PROPS = {
    "31 號桌":   { x: 430,  y: 545, w: 205, h: 145, cls: "class203-desk31" },
    "32 號桌":   { x: 675,  y: 545, w: 205, h: 145, cls: "class203-desk32" },
    "黑板":      { x: 955,  y: 300, w: 455, h: 185, cls: "class203-board" },
    "班級照片":  { x: 1265, y: 315, w: 185, h: 165, cls: "class203-photo" },
    "抽屜":      { x: 1020, y: 665, w: 235, h: 105, cls: "class203-drawer" }
  };

  const CLASS203_NAV = {
    "回走廊": { x: 1430, y: 720, rot: 132, scale: 0.92, kind: "back" }
  };

  function cleanLabel(raw) {
    return String(raw || "")
      .replace(/^已完成[:：]?\s*/, "")
      .replace(/^調查[:：]?\s*/, "")
      .replace(/^互動[:：]?\s*/, "")
      .trim();
  }

  function isClass203() {
    return document.getElementById("roomName")?.textContent?.trim() === "二年三班";
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
    button.classList.add("class203-nav", `class203-nav-${nav.kind}`);
    button.dataset.class203Nav = nav.kind;
    button.style.setProperty("--class203-arrow-rot", `${nav.rot}deg`);
    button.style.setProperty("--class203-arrow-scale", String(nav.scale));
    setBox(button, { x: nav.x, y: nav.y, w: 145 * nav.scale, h: 98 * nav.scale });

    let arrow = button.querySelector(".class203-ground-arrow");
    if (!arrow) {
      arrow = document.createElement("span");
      arrow.className = "class203-ground-arrow";
      arrow.setAttribute("aria-hidden", "true");
      button.appendChild(arrow);
    }

    let text = button.querySelector(".class203-nav-label");
    if (!text) {
      text = document.createElement("span");
      text.className = "class203-nav-label";
      button.appendChild(text);
    }
    if (text.textContent !== label) text.textContent = label;
  }

  function decorateButton(button) {
    if (!(button instanceof HTMLElement) || !button.matches("button.scene-object")) return;
    const label = cleanLabel(button.dataset.label || button.getAttribute("aria-label"));

    const prop = CLASS203_PROPS[label];
    if (prop) {
      button.classList.remove("class203-nav", "class203-nav-back", "foreground-prop", "world-door");
      button.classList.add("class203-prop", "embedded-hitbox", prop.cls);
      setBox(button, prop);
      return;
    }

    const nav = CLASS203_NAV[label];
    if (nav) makeNav(button, label, nav);
  }

  function syncClass203() {
    const layer = document.getElementById("objectLayer");
    if (!layer) return;

    if (!isClass203()) {
      if (layer.dataset.class203 === "1") layer.removeAttribute("data-class203");
      return;
    }

    if (layer.dataset.class203 !== "1") layer.dataset.class203 = "1";
    layer.querySelectorAll("button.scene-object").forEach(decorateButton);
  }

  function boot() {
    const layer = document.getElementById("objectLayer");
    const roomName = document.getElementById("roomName");
    if (!layer || !roomName) return;

    syncClass203();
    new MutationObserver(syncClass203).observe(layer, { childList: true });
    new MutationObserver(syncClass203).observe(roomName, { childList: true, characterData: true, subtree: true });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot, { once: true });
  else boot();
})();