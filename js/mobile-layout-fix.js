(() => {
  "use strict";

  const STAGE_W = 1600;
  const STAGE_H = 900;
  const scene = document.getElementById("scene");
  const toolbar = document.querySelector(".toolbar");
  const objective = document.querySelector(".objective-panel");
  const objectLayer = document.getElementById("objectLayer");
  const roomName = document.getElementById("roomName");
  if (!scene || !objectLayer) return;

  let raf = 0;
  let rebuildRaf = 0;

  function isMobilePortrait() {
    return window.matchMedia("(max-width: 900px) and (orientation: portrait)").matches;
  }

  function cleanLabel(raw) {
    return String(raw || "")
      .replace(/^已完成[:：]?\s*/, "")
      .replace(/^調查[:：]?\s*/, "")
      .replace(/^互動[:：]?\s*/, "")
      .trim();
  }

  function ensurePanel() {
    let panel = document.getElementById("mobileRoomActions");
    if (panel) return panel;

    panel = document.createElement("section");
    panel.id = "mobileRoomActions";
    panel.className = "mobile-room-actions";
    panel.setAttribute("aria-label", "場景互動");
    panel.innerHTML = `
      <div class="mobile-room-actions-head">
        <strong>場景互動</strong>
        <span data-mobile-room-name></span>
      </div>
      <div class="mobile-room-actions-list" role="group" aria-label="目前房間可執行動作"></div>
    `;
    scene.appendChild(panel);
    return panel;
  }

  function sourceVisible(source) {
    if (!source || !source.isConnected) return false;
    if (source.hidden || source.getAttribute("aria-hidden") === "true") return false;
    if (source.style.display === "none" || source.style.visibility === "hidden") return false;
    const style = getComputedStyle(source);
    return style.display !== "none" && style.visibility !== "hidden";
  }

  function actionKind(source, label) {
    const cls = source.classList;
    if (
      cls.contains("door") || cls.contains("world-door") ||
      [...cls].some(name => /(?:^|-)nav(?:-|$)/.test(name)) ||
      /^(回|往|前往|一樓|二樓|更下面|舞台深處|離開)/.test(label)
    ) return "move";
    if (cls.contains("npc") || cls.contains("world-npc")) return "npc";
    return "inspect";
  }

  function actionPrefix(kind) {
    if (kind === "move") return "移動";
    if (kind === "npc") return "互動";
    return "調查";
  }

  function collectSources() {
    return [...objectLayer.querySelectorAll("button.scene-object")]
      .filter(sourceVisible)
      .map((source, index) => {
        const label = cleanLabel(source.dataset.label || source.getAttribute("aria-label") || source.textContent);
        const kind = actionKind(source, label);
        const done = source.classList.contains("done") || /^已完成/.test(source.dataset.label || "");
        const locked = source.disabled || source.classList.contains("locked") || source.getAttribute("aria-disabled") === "true";
        return { source, label, kind, done, locked, index };
      })
      .filter(item => item.label)
      .sort((a, b) => {
        const order = { inspect: 0, npc: 1, move: 2 };
        return (order[a.kind] - order[b.kind]) || (a.index - b.index);
      });
  }

  function rebuildActions() {
    rebuildRaf = 0;
    const panel = ensurePanel();
    if (!isMobilePortrait()) {
      panel.hidden = true;
      scene.classList.remove("mobile-button-mode");
      return;
    }

    scene.classList.add("mobile-button-mode");
    panel.hidden = false;

    const list = panel.querySelector(".mobile-room-actions-list");
    const room = panel.querySelector("[data-mobile-room-name]");
    if (room) room.textContent = roomName?.textContent?.trim() || "";

    const items = collectSources();
    list.replaceChildren();

    items.forEach(item => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = `mobile-room-action is-${item.kind}${item.done ? " is-done" : ""}${item.locked ? " is-locked" : ""}`;
      btn.disabled = item.locked;
      btn.dataset.kind = item.kind;
      btn.innerHTML = `<small>${actionPrefix(item.kind)}</small><span>${item.label}</span>${item.done ? '<b aria-label="已完成">✓</b>' : ""}`;
      btn.addEventListener("click", () => {
        if (item.locked || !item.source?.isConnected) return;
        item.source.click();
        scheduleRebuild();
      });
      list.appendChild(btn);
    });

    if (!items.length) {
      const empty = document.createElement("div");
      empty.className = "mobile-room-actions-empty";
      empty.textContent = "此處暫時沒有可互動項目";
      list.appendChild(empty);
    }

    scheduleLayout();
  }

  function syncLayout() {
    raf = 0;
    const panel = ensurePanel();
    const stage = scene.querySelector(".game-stage");
    if (!stage || !isMobilePortrait()) {
      scene.style.removeProperty("--mobile-toolbar-h");
      scene.style.removeProperty("--mobile-objective-h");
      scene.style.removeProperty("--mobile-actions-h");
      return;
    }

    const rect = scene.getBoundingClientRect();
    const scale = Math.max(0.12, Math.min(rect.width / STAGE_W, rect.height / STAGE_H));
    stage.style.setProperty("--stage-mobile-scale", scale.toFixed(5));

    const toolbarH = Math.ceil(toolbar?.getBoundingClientRect().height || 104);
    const objectiveH = Math.ceil(objective?.getBoundingClientRect().height || 78);
    const actionsH = Math.ceil(panel?.getBoundingClientRect().height || 138);
    scene.style.setProperty("--mobile-toolbar-h", `${toolbarH}px`);
    scene.style.setProperty("--mobile-objective-h", `${objectiveH}px`);
    scene.style.setProperty("--mobile-actions-h", `${actionsH}px`);
  }

  function scheduleLayout() {
    if (raf) return;
    raf = requestAnimationFrame(syncLayout);
  }

  function scheduleRebuild() {
    if (rebuildRaf) return;
    rebuildRaf = requestAnimationFrame(rebuildActions);
  }

  new ResizeObserver(scheduleLayout).observe(scene);
  if (toolbar) new ResizeObserver(scheduleLayout).observe(toolbar);
  if (objective) new ResizeObserver(scheduleLayout).observe(objective);

  window.addEventListener("resize", () => { scheduleRebuild(); scheduleLayout(); }, { passive: true });
  window.addEventListener("orientationchange", () => setTimeout(() => { scheduleRebuild(); scheduleLayout(); }, 120), { passive: true });

  if (roomName) {
    new MutationObserver(() => scheduleRebuild())
      .observe(roomName, { childList:true, subtree:true, characterData:true });
  }

  new MutationObserver(() => scheduleRebuild()).observe(objectLayer, {
    childList:true,
    subtree:true,
    attributes:true,
    attributeFilter:["class", "hidden", "aria-hidden", "aria-disabled", "data-label"]
  });

  const panel = ensurePanel();
  new ResizeObserver(scheduleLayout).observe(panel);

  scheduleRebuild();
  scheduleLayout();
  setTimeout(() => { scheduleRebuild(); scheduleLayout(); }, 100);
  setTimeout(() => { scheduleRebuild(); scheduleLayout(); }, 400);
})();
