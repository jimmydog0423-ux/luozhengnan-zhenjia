(() => {
  "use strict";

  const STAGE_W = 1600;
  const STAGE_H = 900;
  const scene = document.getElementById("scene");
  const toolbar = document.querySelector(".toolbar");
  const objective = document.querySelector(".objective-panel");
  if (!scene) return;

  let raf = 0;

  function isMobilePortrait() {
    return window.matchMedia("(max-width: 900px) and (orientation: portrait)").matches;
  }

  function px(n) {
    return `${Math.max(0, n).toFixed(2)}px`;
  }

  function sync() {
    raf = 0;
    const stage = scene.querySelector(".game-stage");
    if (!stage || !isMobilePortrait()) {
      scene.style.removeProperty("--mobile-toolbar-h");
      scene.style.removeProperty("--mobile-objective-h");
      return;
    }

    const rect = scene.getBoundingClientRect();
    const scale = Math.max(0.12, Math.min(rect.width / STAGE_W, rect.height / STAGE_H));
    const inv = 1 / scale;

    // Keep a minimum 52x52 physical-pixel tap target after the whole stage is scaled.
    stage.style.setProperty("--mobile-hit-min", px(52 * inv));

    // Keep labels approximately 14px physical size, independent of phone width.
    stage.style.setProperty("--mobile-label-font", px(14 * inv));
    stage.style.setProperty("--mobile-label-pad-y", px(5.5 * inv));
    stage.style.setProperty("--mobile-label-pad-x", px(8.5 * inv));
    stage.style.setProperty("--mobile-label-radius", px(7 * inv));
    stage.style.setProperty("--mobile-label-gap", px(6 * inv));
    stage.style.setProperty("--mobile-line", px(1.8 * inv));
    stage.style.setProperty("--mobile-shadow-y", px(5 * inv));
    stage.style.setProperty("--mobile-shadow-blur", px(14 * inv));

    // Navigation arrows remain visibly large enough to notice and tap around.
    stage.style.setProperty("--mobile-arrow-w", px(48 * inv));
    stage.style.setProperty("--mobile-arrow-h", px(52 * inv));
    stage.style.setProperty("--mobile-done-size", px(28 * inv));
    stage.style.setProperty("--mobile-done-font", px(13 * inv));

    // The bottom panel's true height changes with browser font scaling and device width.
    // Measure it instead of relying on a guessed constant so the objective never overlaps it.
    const toolbarH = Math.ceil(toolbar?.getBoundingClientRect().height || 108);
    const objectiveH = Math.ceil(objective?.getBoundingClientRect().height || 68);
    scene.style.setProperty("--mobile-toolbar-h", `${toolbarH}px`);
    scene.style.setProperty("--mobile-objective-h", `${objectiveH}px`);
  }

  function schedule() {
    if (raf) return;
    raf = requestAnimationFrame(sync);
  }

  new ResizeObserver(schedule).observe(scene);
  if (toolbar) new ResizeObserver(schedule).observe(toolbar);
  if (objective) new ResizeObserver(schedule).observe(objective);

  window.addEventListener("resize", schedule, { passive: true });
  window.addEventListener("orientationchange", () => setTimeout(schedule, 120), { passive: true });

  const roomName = document.getElementById("roomName");
  const objectLayer = document.getElementById("objectLayer");
  if (roomName) new MutationObserver(schedule).observe(roomName, { childList:true, subtree:true, characterData:true });
  if (objectLayer) new MutationObserver(schedule).observe(objectLayer, { childList:true });

  schedule();
  setTimeout(schedule, 100);
  setTimeout(schedule, 350);
})();
