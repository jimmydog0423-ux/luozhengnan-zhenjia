(() => {
  "use strict";

  const COMPUTER_PROPS = {
    "電腦 A":   { x: 405,  y: 545, w: 245, h: 150, cls: "computer-pc-a" },
    "電腦 B":   { x: 685,  y: 455, w: 185, h: 125, cls: "computer-pc-b" },
    "電腦 C":   { x: 1160, y: 465, w: 215, h: 145, cls: "computer-pc-c" },
    "伺服器櫃": { x: 1375, y: 475, w: 150, h: 235, cls: "computer-server" }
  };

  const COMPUTER_NAV_BASE = {
    "回走廊": { x: 1390, y: 690, rot: 132, scale: 0.88, kind: "back" }
  };

  const COMPUTER_NAV_COMPACT = {
    "回走廊": { x: 1335, y: 675, rot: 132, scale: 0.78, kind: "back" }
  };

  function cleanLabel(raw) {
    return String(raw || "")
      .replace(/^已完成[:：]?\s*/, "")
      .replace(/^調查[:：]?\s*/, "")
      .replace(/^互動[:：]?\s*/, "")
      .trim();
  }

  function isComputerRoom() {
    return document.getElementById("roomName")?.textContent?.trim() === "電腦教室";
  }

  function getNavMap() {
    return (window.innerWidth <= 1500 || window.innerHeight <= 920)
      ? COMPUTER_NAV_COMPACT
      : COMPUTER_NAV_BASE;
  }

  function setBox(button, item) {
    button.style.left = `${item.x}px`;
    button.style.top = `${item.y}px`;
    button.style.setProperty("--hit-w", `${item.w}px`);
    button.style.setProperty("--hit-h", `${item.h}px`);
  }

  function makeNav(button, label, nav) {
    button.classList.remove("embedded-hitbox", "foreground-prop", "world-door");
    button.classList.add("computer-nav", `computer-nav-${nav.kind}`);
    button.dataset.computerNav = nav.kind;
    button.style.setProperty("--computer-arrow-rot", `${nav.rot}deg`);
    button.style.setProperty("--computer-arrow-scale", String(nav.scale));
    setBox(button, { x: nav.x, y: nav.y, w: 145 * nav.scale, h: 98 * nav.scale });

    let arrow = button.querySelector(".computer-ground-arrow");
    if (!arrow) {
      arrow = document.createElement("span");
      arrow.className = "computer-ground-arrow";
      arrow.setAttribute("aria-hidden", "true");
      button.appendChild(arrow);
    }

    let text = button.querySelector(".computer-nav-label");
    if (!text) {
      text = document.createElement("span");
      text.className = "computer-nav-label";
      button.appendChild(text);
    }
    text.textContent = label;
  }

  function decorateButton(button) {
    if (!(button instanceof HTMLElement) || !button.matches("button.scene-object")) return;
    const label = cleanLabel(button.dataset.label || button.getAttribute("aria-label"));

    const prop = COMPUTER_PROPS[label];
    if (prop) {
      button.classList.remove("computer-nav", "computer-nav-back", "foreground-prop", "world-door");
      button.classList.add("computer-prop", "embedded-hitbox", prop.cls);
      setBox(button, prop);
      return;
    }

    const nav = getNavMap()[label];
    if (nav) makeNav(button, label, nav);
  }

  function syncComputerRoom() {
    const layer = document.getElementById("objectLayer");
    if (!layer) return;

    if (!isComputerRoom()) {
      if (layer.dataset.computerRoom === "1") layer.removeAttribute("data-computer-room");
      return;
    }

    layer.dataset.computerRoom = "1";
    layer.querySelectorAll("button.scene-object").forEach(decorateButton);
  }

  function boot() {
    const layer = document.getElementById("objectLayer");
    const roomName = document.getElementById("roomName");
    if (!layer || !roomName) return;

    syncComputerRoom();
    new MutationObserver(syncComputerRoom).observe(layer, { childList: true });
    new MutationObserver(syncComputerRoom).observe(roomName, { childList: true, characterData: true, subtree: true });
    window.addEventListener("resize", syncComputerRoom, { passive: true });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot, { once: true });
  else boot();
})();
