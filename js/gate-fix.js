(() => {
  "use strict";

  const GATE_HITBOXES = {
    "校牌":   { x: 184,  y: 548, w: 92,  h: 190, shape: "plaque" },
    "警衛室": { x: 310,  y: 535, w: 300, h: 285, shape: "booth" },
    "公告欄": { x: 1392, y: 548, w: 300, h: 270, shape: "board" }
  };

  const GATE_NAV = {
    "往中庭":   { x: 805, y: 712, direction: "forward" },
    "離開學校": { x: 430, y: 805, direction: "back" }
  };

  function cleanLabel(raw) {
    return String(raw || "")
      .replace(/^已完成[:：]?\s*/, "")
      .replace(/^調查[:：]?\s*/, "")
      .replace(/^互動[:：]?\s*/, "")
      .trim();
  }

  function roomName() {
    return document.getElementById("roomName")?.textContent?.trim() || "";
  }

  function setPosition(button, item) {
    button.style.left = `${item.x}px`;
    button.style.top = `${item.y}px`;
    if (item.w) button.style.setProperty("--hit-w", `${item.w}px`);
    if (item.h) button.style.setProperty("--hit-h", `${item.h}px`);
  }

  function makeGroundArrow(button, label, nav) {
    button.classList.remove("embedded-hitbox", "foreground-prop");
    button.classList.add("ground-nav", `ground-nav-${nav.direction}`);
    button.dataset.navDirection = nav.direction;
    button.dataset.cleanLabel = label;
    button.dataset.label = label;
    button.setAttribute("aria-label", label);
    setPosition(button, { x: nav.x, y: nav.y, w: 190, h: 120 });

    if (!button.querySelector(".ground-arrow")) {
      const arrow = document.createElement("span");
      arrow.className = "ground-arrow";
      arrow.setAttribute("aria-hidden", "true");
      const text = document.createElement("span");
      text.className = "ground-nav-label";
      button.append(arrow, text);
    }
    const text = button.querySelector(".ground-nav-label");
    if (text && text.textContent !== label) {
      text.textContent = label;
    }
  }

  function decorateGateObjects() {
    const layer = document.getElementById("objectLayer");
    if (!layer) return;

    const isGate = roomName() === "校門";
    layer.dataset.room = isGate ? "gate" : "";
    if (!isGate) return;

    layer.querySelectorAll("button.scene-object").forEach(button => {
      const label = cleanLabel(button.dataset.label || button.getAttribute("aria-label"));

      const hit = GATE_HITBOXES[label];
      if (hit) {
        button.classList.remove("ground-nav", "ground-nav-forward", "ground-nav-back", "foreground-prop");
        button.classList.add("embedded-hitbox", "gate-hotspot", `gate-${hit.shape}`);
        setPosition(button, hit);
        return;
      }

      const nav = GATE_NAV[label];
      if (nav) {
        makeGroundArrow(button, label, nav);
      }
    });
  }

  function decorateGateDialogue() {
    const body = document.getElementById("modalBody");
    if (!body) return;
    const layout = body.querySelector(".dialogue-layout");
    const active = roomName() === "校門" && !!layout;
    body.classList.toggle("gate-dialogue", active);
    if (!active) return;

    const who = layout.querySelector(".dialogue-who")?.textContent?.trim() || "";
    const text = layout.querySelector(".dialogue-text")?.textContent?.trim() || "";
    const portrait = layout.querySelector(".portrait");
    if (!portrait) return;

    layout.dataset.gateSpeaker = who;
    portrait.dataset.gateSpeaker = who;

    let shot = "half";
    if (/我偏要|啊不就|外牆七扇|三個不同/.test(text)) shot = "bust";
    if (/不存在的窗戶/.test(text)) shot = "close";
    portrait.dataset.gateShot = shot;
  }

  function sync() {
    decorateGateObjects();
    decorateGateDialogue();
  }

  function boot() {
    sync();
    const app = document.getElementById("app");
    if (!app) return;
    new MutationObserver(sync).observe(app, {
      childList: true,
      subtree: true,
      characterData: true
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot, { once: true });
  } else {
    boot();
  }
})();