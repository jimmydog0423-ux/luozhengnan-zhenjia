(() => {
  "use strict";

  const SCENE_W = 1600;
  const SCENE_H = 900;
  const MOBILE_BREAKPOINT = 900;
  const SAFE_Y = 540;
  const CORNER_Y = 590;
  const LEFT_EDGE = 390;
  const RIGHT_EDGE = 1210;

  const layer = document.getElementById("objectLayer");
  const roomName = document.getElementById("roomName");
  if (!layer) return;

  let queued = false;
  let settleTimer = 0;

  function toScenePx(value, total) {
    const raw = String(value || "").trim();
    if (!raw) return NaN;
    if (raw.endsWith("%")) return parseFloat(raw) / 100 * total;
    if (raw.endsWith("px")) return parseFloat(raw);
    const n = parseFloat(raw);
    return Number.isFinite(n) ? n : NaN;
  }

  function isNavigation(button) {
    if (!(button instanceof HTMLElement) || !button.matches("button.scene-object")) return false;
    if (button.classList.contains("door")) return true;
    return [...button.classList].some(cls => /(?:^|-)nav(?:-|$)/.test(cls));
  }

  function clearSafeMark(button) {
    button.classList.remove("nav-safe-relocated", "nav-safe-left", "nav-safe-right");
    delete button.dataset.navSafe;
  }

  function relocate(button) {
    if (!isNavigation(button)) return;
    if (window.innerWidth <= MOBILE_BREAKPOINT) {
      clearSafeMark(button);
      return;
    }

    const x = toScenePx(button.style.left, SCENE_W);
    const y = toScenePx(button.style.top, SCENE_H);
    if (!Number.isFinite(x) || !Number.isFinite(y)) return;

    const leftCorner = x <= LEFT_EDGE && y >= CORNER_Y;
    const rightCorner = x >= RIGHT_EDGE && y >= CORNER_Y;
    if (!leftCorner && !rightCorner) {
      clearSafeMark(button);
      return;
    }

    const targetX = leftCorner
      ? Math.max(170, Math.min(x, 260))
      : Math.min(1430, Math.max(x, 1340));

    button.style.left = `${targetX}px`;
    button.style.top = `${SAFE_Y}px`;
    button.classList.add("nav-safe-relocated", leftCorner ? "nav-safe-left" : "nav-safe-right");
    button.classList.remove(leftCorner ? "nav-safe-right" : "nav-safe-left");
    button.dataset.navSafe = leftCorner ? "left" : "right";
  }

  function sync() {
    queued = false;
    layer.querySelectorAll("button.scene-object").forEach(relocate);
  }

  function schedule() {
    if (queued) return;
    queued = true;
    requestAnimationFrame(sync);

    // Some room-specific fix scripts apply their coordinates immediately after
    // render/resize. Run once more after they settle so the global safe zone wins.
    clearTimeout(settleTimer);
    settleTimer = setTimeout(sync, 90);
  }

  new MutationObserver(schedule).observe(layer, { childList: true });
  if (roomName) new MutationObserver(schedule).observe(roomName, { childList: true, characterData: true, subtree: true });
  window.addEventListener("resize", schedule, { passive: true });
  window.addEventListener("orientationchange", schedule, { passive: true });

  schedule();
})();
