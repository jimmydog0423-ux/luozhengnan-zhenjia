(() => {
  "use strict";

  const LIBRARY_PROPS = {
    "校刊書架":   { x: 795,  y: 365, w: 300, h: 190, type: "embedded", cls: "library-shelf" },
    "閱覽桌":     { x: 800,  y: 565, w: 460, h: 205, type: "embedded", cls: "library-table" },
    "歷屆照片":   { x: 1110, y: 350, w: 255, h: 180, type: "embedded", cls: "library-photo" },
    "TOYZ":       { x: 1285, y: 610, w: 185, h: 250, type: "npc",      cls: "library-toyz" }
  };

  const LIBRARY_NAV = {
    "回走廊": { x: 1450, y: 760, direction: "right" }
  };

  function cleanLabel(raw) {
    return String(raw || "")
      .replace(/^已完成[:：]?\s*/, "")
      .replace(/^調查[:：]?\s*/, "")
      .replace(/^互動[:：]?\s*/, "")
      .trim();
  }

  function isLibrary() {
    return document.getElementById("roomName")?.textContent?.trim() === "圖書館";
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
    button.classList.add("library-nav", `library-nav-${nav.direction}`);
    setBox(button, { x: nav.x, y: nav.y, w: 170, h: 110 });

    let arrow = button.querySelector(".library-ground-arrow");
    if (!arrow) {
      arrow = document.createElement("span");
      arrow.className = "library-ground-arrow";
      arrow.setAttribute("aria-hidden", "true");
      button.appendChild(arrow);
    }

    let text = button.querySelector(".library-nav-label");
    if (!text) {
      text = document.createElement("span");
      text.className = "library-nav-label";
      button.appendChild(text);
    }
    if (text.textContent !== label) text.textContent = label;
  }

  function decorateButton(button) {
    if (!(button instanceof HTMLElement) || !button.matches("button.scene-object")) return;
    const label = cleanLabel(button.dataset.label || button.getAttribute("aria-label"));

    const prop = LIBRARY_PROPS[label];
    if (prop) {
      button.classList.remove("library-nav", "library-nav-right", "world-door");
      button.classList.add("library-prop", prop.cls);
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

    const nav = LIBRARY_NAV[label];
    if (nav) makeNav(button, label, nav);
  }

  function syncLibrary() {
    const layer = document.getElementById("objectLayer");
    if (!layer) return;

    if (!isLibrary()) {
      if (layer.dataset.library === "1") layer.removeAttribute("data-library");
      return;
    }

    if (layer.dataset.library !== "1") layer.dataset.library = "1";
    layer.querySelectorAll("button.scene-object").forEach(decorateButton);
  }

  function boot() {
    const layer = document.getElementById("objectLayer");
    const roomName = document.getElementById("roomName");
    if (!layer || !roomName) return;

    syncLibrary();
    new MutationObserver(syncLibrary).observe(layer, { childList: true });
    new MutationObserver(syncLibrary).observe(roomName, { childList: true, characterData: true, subtree: true });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot, { once: true });
  else boot();
})();
