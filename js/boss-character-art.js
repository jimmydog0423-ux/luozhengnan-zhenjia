(() => {
  "use strict";

  const body = document.getElementById("modalBody");
  if (!body) return;

  function syncOverload() {
    const root = body.querySelector(".overload-boss-v3");
    const visual = root?.querySelector(".ob2-boss-visual");
    if (!visual || visual.dataset.characterArt === "1") return;
    visual.dataset.characterArt = "1";
    visual.innerHTML = '<img class="boss-character-image overload-character-image" src="assets/characters/overload.png" alt="" aria-hidden="true">';
  }

  function syncPharaoh() {
    const root = body.querySelector(".pyramid-boss-v3");
    const stage = root?.querySelector(".pyr2-stage-wrap");
    if (!stage || stage.querySelector(".pharaoh-character-visual")) return;
    const visual = document.createElement("div");
    visual.className = "pharaoh-character-visual";
    visual.setAttribute("aria-hidden", "true");
    visual.innerHTML = '<img class="boss-character-image pharaoh-character-image" src="assets/characters/pharaoh.png" alt="">';
    stage.appendChild(visual);
  }

  function sync() {
    syncOverload();
    syncPharaoh();
  }

  new MutationObserver(sync).observe(body, { childList: true, subtree: true });
  sync();
})();
