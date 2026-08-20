(() => {
  "use strict";

  const body = document.getElementById("modalBody");
  if (!body) return;

  let scheduled = false;

  function stabilizePokerModal() {
    const title = body.querySelector("h2");
    if (!title) return;

    const text = title.textContent?.trim() || "";
    if (!text.includes("統神 vs 薛喜")) return;

    /* rework.js decorates poker whenever the title contains the lowercase
       literal "統神 vs 薛喜". Its poker renderer rewrites table.innerHTML,
       which triggers the same app-wide MutationObserver again. Renaming only
       the visual separator after the first decoration breaks that feedback
       loop while keeping the original game logic and buttons untouched. */
    title.textContent = text.replace("統神 vs 薛喜", "統神 VS 薛喜");
    body.dataset.pokerStable = "1";
  }

  const observer = new MutationObserver(() => {
    if (scheduled) return;
    scheduled = true;
    queueMicrotask(() => {
      scheduled = false;
      stabilizePokerModal();
    });
  });

  observer.observe(body, {
    childList: true,
    subtree: true,
    characterData: true
  });

  stabilizePokerModal();
})();
