(() => {
  "use strict";

  const body = document.getElementById("modalBody");
  const card = document.getElementById("modalCard");
  const overlay = document.getElementById("modalOverlay");
  if (!body || !card || !overlay) return;

  let armed = false;
  let legacySeen = false;
  let bridgeKind = "";
  let cover = null;
  let watchedBanner = null;
  let bannerObserver = null;

  function ensureStyle() {
    if (document.getElementById("overloadBridgeFixStyle")) return;
    const style = document.createElement("style");
    style.id = "overloadBridgeFixStyle";
    style.textContent = `
      #modalCard.overload-legacy-bridge #modalBody{
        visibility:hidden!important;
        pointer-events:none!important;
      }
      .overload-bridge-cover{
        position:fixed;
        inset:0;
        z-index:10050;
        display:grid;
        place-items:center;
        padding:24px;
        background:
          radial-gradient(circle at 50% 44%,rgba(166,28,49,.24),transparent 32%),
          rgba(4,3,6,.94);
        backdrop-filter:blur(5px);
        pointer-events:auto;
      }
      .overload-bridge-card{
        width:min(560px,88vw);
        padding:34px 28px;
        border:1px solid rgba(255,94,111,.30);
        border-radius:22px;
        text-align:center;
        background:linear-gradient(180deg,rgba(28,14,20,.97),rgba(9,7,10,.98));
        box-shadow:0 28px 90px rgba(0,0,0,.72),0 0 45px rgba(208,42,68,.14);
      }
      .overload-bridge-card .eyebrow{
        margin-bottom:9px;
        color:#ff687a;
        font-size:11px;
        font-weight:900;
        letter-spacing:.18em;
      }
      .overload-bridge-card strong{
        display:block;
        color:#fff0d0;
        font-size:clamp(34px,6vw,62px);
        line-height:1;
        letter-spacing:.06em;
        text-shadow:0 0 26px rgba(255,91,105,.28);
      }
      .overload-bridge-card p{
        margin:16px 0 0;
        color:#bcaeb8;
        font-size:14px;
      }
      .overload-bridge-pulse{
        width:92px;
        height:4px;
        margin:22px auto 0;
        overflow:hidden;
        border-radius:999px;
        background:rgba(255,255,255,.08);
      }
      .overload-bridge-pulse::after{
        content:"";
        display:block;
        width:42%;
        height:100%;
        border-radius:inherit;
        background:#ef5b6d;
        animation:overloadBridgePulse .8s ease-in-out infinite alternate;
      }
      @keyframes overloadBridgePulse{
        from{transform:translateX(0);opacity:.55}
        to{transform:translateX(138%);opacity:1}
      }
    `;
    document.head.appendChild(style);
  }

  function makeCover(kind) {
    cover?.remove();
    cover = document.createElement("div");
    cover.className = "overload-bridge-cover";
    cover.setAttribute("aria-live", "polite");
    const won = kind === "win";
    cover.innerHTML = `
      <div class="overload-bridge-card">
        <div class="eyebrow">${won ? "BOSS CLEAR" : "BATTLE RESULT"}</div>
        <strong>${won ? "OVERLOAD BREAK" : "OVERLOAD"}</strong>
        <p>${won ? "超負荷已擊破，正在進入後續劇情……" : "戰鬥結束，正在整理最近檢查點……"}</p>
        <div class="overload-bridge-pulse" aria-hidden="true"></div>
      </div>
    `;
    overlay.appendChild(cover);
  }

  function arm(kind) {
    if (armed) return;
    armed = true;
    legacySeen = false;
    bridgeKind = kind;
    card.classList.add("overload-legacy-bridge");
    card.dataset.overloadBridge = kind;
    makeCover(kind);
  }

  function finishBridge() {
    if (!armed) return;
    armed = false;
    legacySeen = false;
    bridgeKind = "";
    card.classList.remove("overload-legacy-bridge");
    delete card.dataset.overloadBridge;
    cover?.remove();
    cover = null;
  }

  function watchCurrentBoss() {
    const root = body.querySelector(".overload-boss-v3");
    const banner = root?.querySelector("[data-phase-banner]");
    if (!banner || banner === watchedBanner) return;

    bannerObserver?.disconnect();
    watchedBanner = banner;

    const checkBanner = () => {
      const text = (banner.textContent || "").trim();
      if (text === "OVERLOAD BREAK") arm("win");
      else if (text === "OVERLOAD" && root?.dataset.playing === "1") arm("lose");
    };

    bannerObserver = new MutationObserver(checkBanner);
    bannerObserver.observe(banner, { childList:true, characterData:true, subtree:true });
    checkBanner();
  }

  function syncScreen() {
    watchCurrentBoss();
    if (!armed) return;

    const legacy = body.querySelector(".boss-panel");
    const current = body.querySelector(".overload-boss-v3");

    if (legacy) {
      legacySeen = true;
      return;
    }

    // The bridge is finished only after the legacy screen was actually mounted
    // and then replaced by dialogue / ending. This avoids revealing an empty
    // frame between the V3 arena and the old hidden bridge.
    if (legacySeen && !current) {
      requestAnimationFrame(() => requestAnimationFrame(finishBridge));
    }
  }

  ensureStyle();
  new MutationObserver(syncScreen).observe(body, { childList:true, subtree:false });

  // If the overlay closes during a loss/result path, never leave the cover behind.
  new MutationObserver(() => {
    if (!overlay.classList.contains("show") && armed) finishBridge();
  }).observe(overlay, { attributes:true, attributeFilter:["class"] });

  syncScreen();
})();
