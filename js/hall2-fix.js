(() => {
  "use strict";

  const HALL2_PROPS = {
    "窗戶":         { x: 290, y: 325, w: 235, h: 250, cls: "hall2-window", type: "embedded" },
    "不存在的窗戶": { x: 555, y: 365, w: 155, h: 205, cls: "hall2-extra-window", type: "embedded" },
    "無線電":       { x: 1185, y: 520, w: 118, h: 150, cls: "hall2-radio", type: "prop" }
  };

  const HALL2_NAV = {
    "音樂教室": { x: 1045, y: 548, scale: 0.56, kind: "door" },
    "圖書館":   { x: 1215, y: 565, scale: 0.72, kind: "door" },
    "教職員室": { x: 1400, y: 590, scale: 0.90, kind: "door" },
    "回一樓":   { x: 165,  y: 805, scale: 1.00, kind: "back" },
    "舊校舍":   { x: 805,  y: 700, scale: 0.90, kind: "forward" }
  };

  function cleanLabel(raw) {
    return String(raw || "")
      .replace(/^已完成[:：]?\s*/, "")
      .replace(/^調查[:：]?\s*/, "")
      .replace(/^互動[:：]?\s*/, "")
      .trim();
  }

  function isHall2() {
    return document.getElementById("roomName")?.textContent?.trim() === "二樓走廊";
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
    button.classList.add("hall2-nav", `hall2-nav-${nav.kind}`);
    button.dataset.hall2Nav = nav.kind;
    button.style.setProperty("--hall2-scale", String(nav.scale));

    const box = nav.kind === "door"
      ? { x: nav.x, y: nav.y, w: 120 * nav.scale, h: 150 * nav.scale }
      : { x: nav.x, y: nav.y, w: 160 * nav.scale, h: 105 * nav.scale };
    setBox(button, box);

    let marker = button.querySelector(".hall2-nav-marker");
    if (!marker) {
      marker = document.createElement("span");
      marker.className = "hall2-nav-marker";
      marker.setAttribute("aria-hidden", "true");
      button.appendChild(marker);
    }

    let text = button.querySelector(".hall2-nav-label");
    if (!text) {
      text = document.createElement("span");
      text.className = "hall2-nav-label";
      button.appendChild(text);
    }
    if (text.textContent !== label) text.textContent = label;
  }

  function decorateButton(button) {
    if (!(button instanceof HTMLElement) || !button.matches("button.scene-object")) return;
    const label = cleanLabel(button.dataset.label || button.getAttribute("aria-label"));

    const prop = HALL2_PROPS[label];
    if (prop) {
      button.classList.remove("hall2-nav", "hall2-nav-door", "hall2-nav-back", "hall2-nav-forward", "world-door");
      button.classList.add("hall2-prop", prop.cls);
      setBox(button, prop);

      if (prop.type === "prop") {
        button.classList.add("foreground-prop");
        button.classList.remove("embedded-hitbox");
      } else {
        button.classList.add("embedded-hitbox");
        button.classList.remove("foreground-prop");
      }
      return;
    }

    const nav = HALL2_NAV[label];
    if (nav) makeNav(button, label, nav);
  }

  function syncHall2() {
    const layer = document.getElementById("objectLayer");
    if (!layer) return;

    if (!isHall2()) {
      if (layer.dataset.hall2 === "1") layer.removeAttribute("data-hall2");
      return;
    }

    if (layer.dataset.hall2 !== "1") layer.dataset.hall2 = "1";
    layer.querySelectorAll("button.scene-object").forEach(decorateButton);
  }

  function boot() {
    const layer = document.getElementById("objectLayer");
    const roomName = document.getElementById("roomName");
    if (!layer || !roomName) return;

    syncHall2();
    // Watch only direct scene-object replacement to avoid observer feedback loops.
    new MutationObserver(syncHall2).observe(layer, { childList: true });
    new MutationObserver(syncHall2).observe(roomName, { childList: true, characterData: true, subtree: true });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot, { once: true });
  else boot();
})();
