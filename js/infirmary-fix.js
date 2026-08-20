(() => {
  "use strict";

  const INFIRMARY_PROPS = {
    "病床":       { x: 560,  y: 610, w: 390, h: 185, cls: "infirmary-bed" },
    "藥櫃":       { x: 865,  y: 430, w: 300, h: 300, cls: "infirmary-cabinet" },
    "鏡子":       { x: 1285, y: 410, w: 320, h: 210, cls: "infirmary-mirror" },
    "紫外線燈":   { x: 665,  y: 590, w: 100, h: 88,  cls: "infirmary-uv", foreground: true }
  };

  const INFIRMARY_NAV = {
    "回走廊": { x: 1435, y: 690, rot: 132, scale: 0.88, kind: "back" }
  };

  function cleanLabel(raw) {
    return String(raw || "")
      .replace(/^已完成[:：]?\s*/, "")
      .replace(/^調查[:：]?\s*/, "")
      .replace(/^互動[:：]?\s*/, "")
      .trim();
  }

  function isInfirmary() {
    return document.getElementById("roomName")?.textContent?.trim() === "保健室";
  }

  function setBox(button, item) {
    button.style.left = `${item.x}px`;
    button.style.top = `${item.y}px`;
    button.style.setProperty("--hit-w", `${item.w}px`);
    button.style.setProperty("--hit-h", `${item.h}px`);
  }

  function makeNav(button, label, nav) {
    button.classList.remove("embedded-hitbox", "foreground-prop", "world-door");
    button.classList.add("infirmary-nav", `infirmary-nav-${nav.kind}`);
    button.dataset.infirmaryNav = nav.kind;
    button.style.setProperty("--infirmary-arrow-rot", `${nav.rot}deg`);
    button.style.setProperty("--infirmary-arrow-scale", String(nav.scale));
    setBox(button, { x: nav.x, y: nav.y, w: 145 * nav.scale, h: 98 * nav.scale });

    let arrow = button.querySelector(".infirmary-ground-arrow");
    if (!arrow) {
      arrow = document.createElement("span");
      arrow.className = "infirmary-ground-arrow";
      arrow.setAttribute("aria-hidden", "true");
      button.appendChild(arrow);
    }

    let text = button.querySelector(".infirmary-nav-label");
    if (!text) {
      text = document.createElement("span");
      text.className = "infirmary-nav-label";
      button.appendChild(text);
    }
    text.textContent = label;
  }

  function decorateButton(button) {
    if (!(button instanceof HTMLElement) || !button.matches("button.scene-object")) return;
    const label = cleanLabel(button.dataset.label || button.getAttribute("aria-label"));

    const prop = INFIRMARY_PROPS[label];
    if (prop) {
      button.classList.remove("infirmary-nav", "infirmary-nav-back", "world-door");
      button.classList.add("infirmary-prop", prop.cls);
      if (prop.foreground) {
        button.classList.remove("embedded-hitbox");
        button.classList.add("foreground-prop");
      } else {
        button.classList.remove("foreground-prop");
        button.classList.add("embedded-hitbox");
      }
      setBox(button, prop);
      return;
    }

    const nav = INFIRMARY_NAV[label];
    if (nav) makeNav(button, label, nav);
  }

  function syncInfirmary() {
    const layer = document.getElementById("objectLayer");
    if (!layer) return;

    if (!isInfirmary()) {
      if (layer.dataset.infirmary === "1") layer.removeAttribute("data-infirmary");
      return;
    }

    layer.dataset.infirmary = "1";
    layer.querySelectorAll("button.scene-object").forEach(decorateButton);
  }

  function boot() {
    const layer = document.getElementById("objectLayer");
    const roomName = document.getElementById("roomName");
    if (!layer || !roomName) return;

    syncInfirmary();
    new MutationObserver(syncInfirmary).observe(layer, { childList: true });
    new MutationObserver(syncInfirmary).observe(roomName, { childList: true, characterData: true, subtree: true });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot, { once: true });
  else boot();
})();
