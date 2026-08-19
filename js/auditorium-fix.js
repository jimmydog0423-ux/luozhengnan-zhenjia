(() => {
  "use strict";

  const AUDITORIUM_PROPS = {
    "紅色布幕": { x: 810,  y: 315, w: 760, h: 255, type: "embedded", cls: "aud-curtain" },
    "觀眾席":   { x: 785,  y: 770, w: 1050, h: 245, type: "embedded", cls: "aud-seats" },
    "後台紙箱": { x: 1305, y: 355, w: 205, h: 175, type: "prop",     cls: "aud-wishbox" }
  };

  const AUDITORIUM_NAV = {
    "回中庭":   { x: 185, y: 815, direction: "back" },
    "舞台深處": { x: 805, y: 650, direction: "forward" }
  };

  function cleanLabel(raw) {
    return String(raw || "")
      .replace(/^已完成[:：]?\s*/, "")
      .replace(/^調查[:：]?\s*/, "")
      .replace(/^互動[:：]?\s*/, "")
      .trim();
  }

  function isAuditorium() {
    return document.getElementById("roomName")?.textContent?.trim() === "紅色禮堂";
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
    button.classList.add("aud-nav", `aud-nav-${nav.direction}`);
    button.dataset.audNav = nav.direction;
    setBox(button, { x: nav.x, y: nav.y, w: 170, h: 108 });

    let arrow = button.querySelector(".aud-ground-arrow");
    if (!arrow) {
      arrow = document.createElement("span");
      arrow.className = "aud-ground-arrow";
      arrow.setAttribute("aria-hidden", "true");
      button.appendChild(arrow);
    }

    let text = button.querySelector(".aud-nav-label");
    if (!text) {
      text = document.createElement("span");
      text.className = "aud-nav-label";
      button.appendChild(text);
    }
    if (text.textContent !== label) text.textContent = label;
  }

  function decorateButton(button) {
    if (!(button instanceof HTMLElement) || !button.matches("button.scene-object")) return;
    const label = cleanLabel(button.dataset.label || button.getAttribute("aria-label"));

    const prop = AUDITORIUM_PROPS[label];
    if (prop) {
      button.classList.remove("aud-nav", "aud-nav-back", "aud-nav-forward", "world-door");
      button.classList.add("aud-prop", prop.cls);
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

    const nav = AUDITORIUM_NAV[label];
    if (nav) makeGroundNav(button, label, nav);
  }

  function syncAuditorium() {
    const layer = document.getElementById("objectLayer");
    if (!layer) return;

    if (!isAuditorium()) {
      if (layer.dataset.auditorium === "1") layer.removeAttribute("data-auditorium");
      return;
    }

    if (layer.dataset.auditorium !== "1") layer.dataset.auditorium = "1";
    layer.querySelectorAll("button.scene-object").forEach(decorateButton);
  }

  function boot() {
    const layer = document.getElementById("objectLayer");
    const roomName = document.getElementById("roomName");
    if (!layer || !roomName) return;

    syncAuditorium();
    new MutationObserver(syncAuditorium).observe(layer, { childList: true });
    new MutationObserver(syncAuditorium).observe(roomName, { childList: true, characterData: true, subtree: true });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot, { once: true });
  else boot();
})();
