(() => {
  "use strict";
  const $ = (s, r=document) => r.querySelector(s);
  const $$ = (s, r=document) => [...r.querySelectorAll(s)];

  function enhance(body){
    const title = $("h2", body)?.textContent || "";
    if (!/班級照片|紫外線調查|四台機器啟動順序|紙捲競速/.test(title)) return;
    body.classList.add("investigation-modal");

    const stage = $(".mini-stage", body);
    if (stage) {
      stage.classList.add("interactive-evidence");
      if (/班級照片|紫外線調查/.test(title) && stage.dataset.pointerFx !== "1") {
        stage.dataset.pointerFx = "1";
        const lens = document.createElement("div");
        lens.className = title.includes("紫外線") ? "evidence-lens uv-lens" : "evidence-lens photo-lens";
        stage.appendChild(lens);
        const move = (ev) => {
          const r = stage.getBoundingClientRect();
          lens.style.left = `${ev.clientX-r.left}px`;
          lens.style.top = `${ev.clientY-r.top}px`;
          lens.classList.add("active");
        };
        stage.addEventListener("pointermove", move);
        stage.addEventListener("pointerenter", move);
        stage.addEventListener("pointerleave", () => lens.classList.remove("active"));
      }
    }

    if (title.includes("四台機器啟動順序")) {
      const grid = $("#terminalButtons", body);
      if (grid) {
        grid.classList.add("terminal-console");
        $$("button", grid).forEach((b,i) => {
          // IMPORTANT: do not rewrite innerHTML on every MutationObserver pass.
          // Rewriting it triggers another childList mutation and can lock the page in an infinite loop.
          if (b.dataset.terminalDecorated !== "1") {
            b.dataset.terminalDecorated = "1";
            b.innerHTML = `<span class="terminal-led"></span><b>NODE ${String(i+1).padStart(2,"0")}</b><small>POWER / BOOT</small>`;
          }

          if (b.dataset.bootFx === "1") return;
          b.dataset.bootFx = "1";
          b.addEventListener("click", () => {
            b.classList.remove("boot-pulse");
            void b.offsetWidth;
            b.classList.add("boot-pulse");
          }, true);
        });
      }
    }

    if (title.includes("紙捲競速")) {
      const text = body.textContent || "";
      const quality = Number(text.match(/品質\s*(\d+)/)?.[1] || 55);
      const progress = Number(text.match(/你的進度\s*(\d+)%/)?.[1] || 0);
      const opponent = Number(text.match(/TOYZ 進度：\s*(\d+)%/)?.[1] || 0);
      let visual = $(".roll-race-visual", body);
      if (!visual) {
        visual = document.createElement("div");
        visual.className = "roll-race-visual";
        const firstMeter = $(".meter", body);
        firstMeter?.parentNode.insertBefore(visual, firstMeter);
      }

      // Only repaint when gameplay values actually changed. This prevents the
      // observer from reacting to its own innerHTML write forever.
      if (visual) {
        const renderSig = `${quality}|${progress}|${opponent}`;
        if (visual.dataset.renderSig !== renderSig) {
          visual.dataset.renderSig = renderSig;
          visual.innerHTML = `<div class="roll-track"><div class="roll-runner you" style="--p:${progress}%"><span></span><b>薛喜</b></div><div class="roll-runner foe" style="--p:${opponent}%"><span></span><b>TOYZ</b></div></div><div class="quality-dial"><i style="--q:${quality}%"></i><span>穩定區 37–73</span></div>`;
        }
      }

      const roll = $("#roll", body);
      if (roll && roll.dataset.rollFx !== "1") {
        roll.dataset.rollFx = "1";
        roll.addEventListener("click", () => visual?.classList.add("rolling"), true);
      }
    }
  }

  const body = document.getElementById("modalBody");
  if (!body) return;

  // Coalesce bursts of DOM changes into one enhancement pass. Besides reducing
  // work, this also keeps enhancement code from recursively monopolizing the UI thread.
  let scheduled = false;
  const scheduleEnhance = () => {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(() => {
      scheduled = false;
      enhance(body);
    });
  };

  new MutationObserver(scheduleEnhance).observe(body, {
    childList:true,
    subtree:true,
    characterData:true
  });

  enhance(body);
})();
