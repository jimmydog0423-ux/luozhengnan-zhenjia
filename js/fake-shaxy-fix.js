(() => {
  "use strict";

  const RUN_KEY = "red_school_roger_run_v3";
  const layer = document.getElementById("objectLayer");
  const roomName = document.getElementById("roomName");
  const modal = document.getElementById("modalOverlay");
  const modalBody = document.getElementById("modalBody");
  if (!layer || !roomName || !modal || !modalBody) return;

  let sawFakeDialogue = false;
  let vanishTimer = 0;
  let queued = false;

  function cleanLabel(raw) {
    return String(raw || "")
      .replace(/^已完成[:：]?\s*/, "")
      .replace(/^調查[:：]?\s*/, "")
      .replace(/^互動[:：]?\s*/, "")
      .trim();
  }

  function fakeSeen() {
    try {
      const run = JSON.parse(localStorage.getItem(RUN_KEY) || "null");
      return !!run?.flags?.fakeSeen;
    } catch (_) {
      return false;
    }
  }

  function isOldHall() {
    return roomName.textContent?.trim() === "舊校舍";
  }

  function findFake() {
    return [...layer.querySelectorAll("button.scene-object")].find(button => {
      const label = cleanLabel(button.dataset.label || button.getAttribute("aria-label"));
      return label === "薛喜？";
    }) || null;
  }

  function fakeDialogueOpen() {
    if (!modal.classList.contains("show")) return false;
    const who = modalBody.querySelector(".dialogue-who")?.textContent?.trim() || "";
    return who === "薛喜？";
  }

  function hideImmediately(button) {
    if (!button) return;
    button.classList.remove("fake-shaxy-vanish");
    button.hidden = true;
    button.style.display = "none";
    button.setAttribute("aria-hidden", "true");
    button.tabIndex = -1;
  }

  function restoreIfNewRun(button) {
    if (!button) return;
    clearTimeout(vanishTimer);
    vanishTimer = 0;
    button.classList.remove("fake-shaxy-vanish");
    button.hidden = false;
    if (button.style.display === "none") button.style.removeProperty("display");
    button.removeAttribute("aria-hidden");
    button.removeAttribute("tabindex");
  }

  function vanish(button) {
    if (!button || button.hidden || button.classList.contains("fake-shaxy-vanish")) return;
    button.classList.add("fake-shaxy-vanish");
    button.setAttribute("aria-hidden", "true");
    button.tabIndex = -1;
    clearTimeout(vanishTimer);
    vanishTimer = window.setTimeout(() => {
      if (button.isConnected) hideImmediately(button);
    }, 520);
  }

  function sync() {
    queued = false;

    if (fakeDialogueOpen()) sawFakeDialogue = true;

    if (!isOldHall()) {
      sawFakeDialogue = false;
      return;
    }

    const button = findFake();
    if (!button) return;

    if (!fakeSeen()) {
      sawFakeDialogue = false;
      restoreIfNewRun(button);
      return;
    }

    // While the one-line fake dialogue is visible, keep the scene sprite alive
    // behind the modal. When the player presses "結束對話", the modal closes
    // and the fake NPC visibly dissolves from the hallway.
    if (sawFakeDialogue) {
      if (modal.classList.contains("show")) return;
      sawFakeDialogue = false;
      vanish(button);
      return;
    }

    // Returning to the room or restoring a save after the encounter should
    // never respawn the fake NPC.
    hideImmediately(button);
  }

  function scheduleSync() {
    if (queued) return;
    queued = true;
    requestAnimationFrame(sync);
  }

  new MutationObserver(scheduleSync).observe(layer, { childList: true, subtree: true });
  new MutationObserver(scheduleSync).observe(roomName, { childList: true, characterData: true, subtree: true });
  new MutationObserver(scheduleSync).observe(modal, { attributes: true, attributeFilter: ["class", "aria-hidden"] });
  new MutationObserver(scheduleSync).observe(modalBody, { childList: true, subtree: true, characterData: true });

  window.addEventListener("storage", ev => {
    if (ev.key === RUN_KEY) scheduleSync();
  });

  scheduleSync();
})();
