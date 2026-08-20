(() => {
  "use strict";

  const body = document.getElementById("modalBody");
  if (!body) return;

  // Coordinates are the visual centers of the three UV handprints in mini_uv_mirror.webp.
  const UV_SPOTS = [
    { x: 53.0, y: 49.0, name: "左側手印" },
    { x: 63.2, y: 35.8, name: "上方手印" },
    { x: 61.2, y: 64.0, name: "下方手印" }
  ];

  function isUvMini() {
    const title = body.querySelector("h2")?.textContent?.trim() || "";
    return title.includes("紫外線調查");
  }

  function syncUvMini() {
    if (!isUvMini()) return;

    const title = body.querySelector("h2");
    const correctTitle = "紫外線調查：找出 3 個異常手印";
    if (title && title.textContent !== correctTitle) title.textContent = correctTitle;

    const stage = body.querySelector(".mini-stage");
    if (!stage) return;
    stage.dataset.uvCorrected = "1";

    const hotspots = [...stage.querySelectorAll("button.hotspot")].slice(0, 3);
    hotspots.forEach((spot, i) => {
      const pos = UV_SPOTS[i];
      if (!pos) return;
      spot.style.left = `${pos.x}%`;
      spot.style.top = `${pos.y}%`;
      spot.style.transform = "translate(-50%, -50%)";
      spot.dataset.uvName = pos.name;
      spot.setAttribute("aria-label", pos.name);
      spot.title = pos.name;
    });

    const status = body.querySelector("#miniStatus");
    if (status) {
      const m = status.textContent.match(/(?:已找到|找到)\s*(\d+)\s*\/\s*3(?:\s*個手印)?/);
      if (m) {
        const next = `已找到 ${m[1]} / 3 個手印`;
        if (status.textContent !== next) status.textContent = next;
      }
    }
  }

  const observer = new MutationObserver(syncUvMini);
  observer.observe(body, { childList: true, subtree: true, characterData: true });

  // Re-apply after layout/art replacement scripts have had a frame to run.
  const syncSoon = () => requestAnimationFrame(() => requestAnimationFrame(syncUvMini));
  document.getElementById("modalOverlay")?.addEventListener("transitionend", syncSoon);
  syncUvMini();
})();
