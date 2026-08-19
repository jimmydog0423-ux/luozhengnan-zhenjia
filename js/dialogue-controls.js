(() => {
  "use strict";

  document.addEventListener("keydown", (event) => {
    if (event.code !== "Space" || event.repeat) return;

    const target = event.target;
    if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement || target?.isContentEditable) return;

    const modal = document.getElementById("modalOverlay");
    const next = document.getElementById("dialogueNext");
    if (!modal?.classList.contains("show") || !next) return;

    event.preventDefault();
    event.stopPropagation();
    next.click();
  }, true);
})();
