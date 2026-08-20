(() => {
  "use strict";

  let scheduled = false;

  function normalizeLayout(layout) {
    if (!(layout instanceof HTMLElement)) return;

    if (!layout.classList.contains("dialogue-unified")) {
      layout.classList.add("dialogue-unified");
    }

    /* Old rework logic alternates speakers left/right and assigns zoom shots.
       Keep the metadata harmless, but force one presentation everywhere. */
    if (layout.classList.contains("speaker-right")) layout.classList.remove("speaker-right");
    if (!layout.classList.contains("speaker-left")) layout.classList.add("speaker-left");

    const portrait = layout.querySelector(".portrait");
    if (portrait) {
      if (portrait.dataset.shot !== "uniform") portrait.dataset.shot = "uniform";
      const who = layout.querySelector(".dialogue-who")?.textContent?.trim() || "";
      if (who && portrait.dataset.speaker !== who) portrait.dataset.speaker = who;
    }
  }

  function sync() {
    scheduled = false;
    document.querySelectorAll("#modalBody .dialogue-layout").forEach(normalizeLayout);
  }

  function schedule() {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(sync);
  }

  function boot() {
    const root = document.getElementById("modalBody");
    if (!root) return;

    schedule();
    new MutationObserver(schedule).observe(root, {
      childList: true,
      subtree: true
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot, { once: true });
  } else {
    boot();
  }
})();
