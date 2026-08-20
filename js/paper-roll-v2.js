(() => {
  "use strict";

  const body = document.getElementById("modalBody");
  if (!body) return;

  let session = null;
  let scheduled = false;
  let bridgeMode = false;

  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const pct = v => `${clamp(v,0,100).toFixed(0)}%`;

  function isLegacyRoll() {
    const title = body.querySelector("h2")?.textContent || "";
    return /紙捲競速/.test(title) && !!body.querySelector("#loose") && !!body.querySelector("#roll") && !!body.querySelector("#tight") && !body.querySelector(".paper-roll-v2");
  }

  function stopSession() {
    if (!session) return;
    session.dead = true;
    if (session.raf) cancelAnimationFrame(session.raf);
    if (session.keyDown) document.removeEventListener("keydown", session.keyDown, true);
    if (session.keyUp) document.removeEventListener("keyup", session.keyUp, true);
    session = null;
  }

  function machineHtml(kind, label) {
    return `<div class="pr2-machine ${kind}" data-machine="${kind}">
      <div class="pr2-machine-head"><b>${label}</b><strong data-progress-label>0%</strong></div>
      <div class="pr2-rig">
        <div class="pr2-reel pr2-source"></div>
        <svg class="pr2-paper-svg" viewBox="0 0 1000 180" preserveAspectRatio="none" aria-hidden="true">
          <path class="pr2-paper-shadow" d="M80,88 C340,88 660,88 920,88"></path>
          <path class="pr2-paper" d="M80,88 C340,88 660,88 920,88"></path>
          <path class="pr2-paper-fiber" d="M80,88 C340,88 660,88 920,88"></path>
        </svg>
        <div class="pr2-reel pr2-dest"></div><div class="pr2-floor"></div>
      </div>
      <div class="pr2-progress ${kind === "foe" ? "foe" : ""}"><i style="width:0%"></i></div>
    </div>`;
  }

  function takeover() {
    if (bridgeMode || !isLegacyRoll()) return;
    stopSession();

    const original = {
      loose: body.querySelector("#loose"),
      roll: body.querySelector("#roll"),
      tight: body.querySelector("#tight")
    };

    body.innerHTML = `<div class="paper-roll-v2">
      <div class="pr2-head"><div><div class="eyebrow">TOYZ CHALLENGE · PAPER ROLL V2</div><h2>紙捲競速：張力決鬥</h2></div></div>
      <div class="pr2-race">${machineHtml("player","你 / 薛喜")}${machineHtml("foe","TOYZ")}</div>
      <div class="pr2-stats">
        <div class="pr2-stat pr2-tension"><div class="pr2-stat-top"><span>紙張張力</span><b data-tension-label>55</b></div><div class="pr2-gauge"><span class="pr2-safe"></span><span class="pr2-needle"></span></div></div>
        <div class="pr2-stat pr2-speed"><div class="pr2-stat-top"><span>捲動速度</span><b data-speed-label>0.0</b></div><div class="pr2-gauge"><i></i></div></div>
        <div class="pr2-stat pr2-quality"><div class="pr2-stat-top"><span>成品質量</span><b data-quality-label>94</b></div><div class="pr2-gauge"><i style="width:94%"></i></div></div>
      </div>
      <div class="pr2-message">準備完成。</div>
      <div class="pr2-controls">
        <button type="button" data-act="loose">放鬆<span class="pr2-key">A / ←</span></button>
        <button type="button" class="primary" data-act="roll">捲動<span class="pr2-key">SPACE / 按住</span></button>
        <button type="button" data-act="tight">拉緊<span class="pr2-key">D / →</span></button>
      </div>
    </div>`;

    const root = body.querySelector(".paper-roll-v2");
    const s = {
      root, original, dead:false, raf:0, last:performance.now(), elapsed:0,
      progress:0, rival:0, tension:55, speed:0, quality:94, wobble:0, skew:0, strain:0,
      spin:0, rivalSpin:0, jamCooldown:0, messageUntil:0,
      input:{loose:false,roll:false,tight:false}
    };
    session = s;

    bindControls(s);
    updateUi(s, true);
    s.raf = requestAnimationFrame(now => frame(s, now));
  }

  function setInput(s, act, on, btn) {
    if (!s || s.dead || !s.input.hasOwnProperty(act)) return;
    s.input[act] = on;
    if (btn) btn.classList.toggle("is-held", on);
    if (on) {
      if (act === "roll") s.speed = clamp(s.speed + .62, 0, 8);
      if (act === "tight") s.tension = clamp(s.tension + 3.1, 0, 100);
      if (act === "loose") s.tension = clamp(s.tension - 3.1, 0, 100);
    }
  }

  function bindControls(s) {
    s.root.querySelectorAll("[data-act]").forEach(btn => {
      const act = btn.dataset.act;
      btn.addEventListener("pointerdown", ev => { ev.preventDefault(); btn.setPointerCapture?.(ev.pointerId); setInput(s,act,true,btn); });
      const end = ev => { try{btn.releasePointerCapture?.(ev.pointerId)}catch(_){} setInput(s,act,false,btn); };
      btn.addEventListener("pointerup", end); btn.addEventListener("pointercancel", end); btn.addEventListener("pointerleave", ev => { if(ev.buttons===0)setInput(s,act,false,btn); });
      btn.addEventListener("click", () => { if(act==="roll") s.speed=clamp(s.speed+.42,0,8); });
    });

    const keyAct = key => {
      if (key === " " || key === "Spacebar") return "roll";
      if (key.toLowerCase() === "a" || key === "ArrowLeft") return "loose";
      if (key.toLowerCase() === "d" || key === "ArrowRight") return "tight";
      return null;
    };
    s.keyDown = ev => { const act=keyAct(ev.key); if(!act || !session || session!==s)return; ev.preventDefault(); setInput(s,act,true,s.root.querySelector(`[data-act="${act}"]`)); };
    s.keyUp = ev => { const act=keyAct(ev.key); if(!act || !session || session!==s)return; ev.preventDefault(); setInput(s,act,false,s.root.querySelector(`[data-act="${act}"]`)); };
    document.addEventListener("keydown", s.keyDown, true); document.addEventListener("keyup", s.keyUp, true);
  }

  function frame(s, now) {
    if (s.dead || session !== s || !document.contains(s.root)) { stopSession(); return; }
    const dt = clamp((now - s.last) / 1000, 0, .05); s.last = now; s.elapsed += dt;

    // V2 hard mode: narrower, faster moving safe window with a small irregular wobble.
    const center = 50 + Math.sin(s.elapsed * .86) * 8 + Math.sin(s.elapsed * .31 + 1.2) * 5 + Math.sin(s.elapsed * 1.73) * 2.2;
    const safeHalf = 9;
    const safeLow = center - safeHalf, safeHigh = center + safeHalf;

    if (s.input.roll) s.speed += 6.5 * dt; else s.speed -= 2.8 * dt;
    s.speed = clamp(s.speed, 0, 8);

    if (s.input.tight) s.tension += 30 * dt;
    if (s.input.loose) s.tension -= 32 * dt;
    if (s.input.roll) s.tension += (s.speed * .62 + s.strain * .035) * dt;
    s.tension += (50 - s.tension) * .012 * dt;
    s.tension = clamp(s.tension, 0, 100);

    // Sustained fast rolling heats/loads the paper. It takes time to recover.
    const strainTarget = Math.max(0, s.speed - 4.15) * 12 + (s.input.roll ? 3 : 0);
    s.strain += (strainTarget - s.strain) * clamp(dt * (strainTarget > s.strain ? 2.3 : .72), 0, 1);
    s.strain = clamp(s.strain, 0, 46);

    const lowErr = Math.max(0, safeLow - s.tension);
    const highErr = Math.max(0, s.tension - safeHigh);
    const overSpeed = Math.max(0, s.speed - 5.05);
    const targetWobble = lowErr * .11 + overSpeed * .78 + s.strain * .035;
    s.wobble += (targetWobble - s.wobble) * clamp(dt * 4.8, 0, 1);
    const targetSkew = (s.tension - center) * .16 + Math.sin(s.elapsed * 7.6) * s.wobble + Math.sin(s.elapsed * 2.1) * s.strain * .025;
    s.skew += (targetSkew - s.skew) * clamp(dt * 4.1,0,1);

    if (lowErr > 0 || highErr > 0) s.quality -= (lowErr + highErr) * .22 * dt;
    if (overSpeed > 0) s.quality -= overSpeed * 2.65 * dt;
    if (s.strain > 18) s.quality -= (s.strain - 18) * .045 * dt;
    if (!lowErr && !highErr && s.speed >= 2.35 && s.speed <= 4.85 && s.strain < 19) s.quality += .42 * dt;
    if (s.speed < .55 && s.input.loose) s.quality -= .25 * dt;
    s.quality = clamp(s.quality, 0, 100);

    if (s.jamCooldown > 0) s.jamCooldown -= dt;
    if (s.jamCooldown <= 0 && s.tension > 84 && s.speed > 4.9) {
      s.jamCooldown = 2.9; s.quality = clamp(s.quality - 9,0,100); s.speed *= .27; s.tension -= 16; s.strain *= .56;
      flash(s,"紙張打滑！","warn",520); navigator.vibrate?.(45);
    }
    if (s.jamCooldown <= 0 && s.tension < 18 && s.speed > 2.7) {
      s.jamCooldown = 2.5; s.quality = clamp(s.quality - 6,0,100); s.speed *= .48; s.tension += 9;
      flash(s,"捲軸空轉！","warn",440);
    }

    const qualityFactor = .40 + s.quality / 205;
    const strainPenalty = 1 - Math.min(.28, s.strain / 165);
    s.progress = clamp(s.progress + s.speed * qualityFactor * strainPenalty * dt, 0, 100);
    s.spin += s.speed * 98 * dt;

    // TOYZ is intentionally competitive and has short acceleration bursts.
    const burst = Math.sin(s.elapsed * .47 + .9) > .70 ? 1.02 : 0;
    const chase = s.progress > s.rival + 7 ? .38 : 0;
    const late = s.rival > 62 ? .24 : 0;
    const rivalBase = 2.92 + Math.sin(s.elapsed*.83)*.26 + burst + chase + late;
    s.rival = clamp(s.rival + rivalBase * dt, 0, 100);
    s.rivalSpin += rivalBase * 84 * dt;

    updateUi(s, false, safeLow, safeHigh, center);

    if (s.progress >= 100) {
      if (s.quality >= 68) finish(s, true, `你先捲完，品質 ${Math.round(s.quality)}。紙面夠平，TOYZ 認輸。`);
      else finish(s, false, `雖然先捲完，但品質只有 ${Math.round(s.quality)}。TOYZ：這種成品不算。`);
      return;
    }
    if (s.rival >= 100) { finish(s, false, `TOYZ 先完成了。你的進度 ${Math.round(s.progress)}%，品質 ${Math.round(s.quality)}。`); return; }

    if (now > s.messageUntil) {
      if (s.tension < safeLow) setMessage(s,"太鬆 · 紙帶起皺","warn");
      else if (s.tension > safeHigh) setMessage(s,"太緊 · 紙面拉扯","warn");
      else if (s.strain > 27) setMessage(s,"紙張負荷過高 · 降速","warn");
      else if (s.speed > 5.05) setMessage(s,"速度過快 · 品質下降","warn");
      else if (s.speed >= 2.35) setMessage(s,"穩定","good");
      else setMessage(s,"待加速","");
    }
    s.raf = requestAnimationFrame(n => frame(s,n));
  }

  function setMessage(s, text, cls="") {
    const el=s.root.querySelector(".pr2-message"); if(!el)return;
    if(el.textContent!==text) el.textContent=text;
    el.className=`pr2-message ${cls}`.trim();
  }
  function flash(s,text,cls,ms){setMessage(s,text,cls);s.messageUntil=performance.now()+ms;s.root.classList.remove("shake");void s.root.offsetWidth;s.root.classList.add("shake");}

  function updateMachine(s, kind, progress, spin, sag=0, skew=0) {
    const m=s.root.querySelector(`[data-machine="${kind}"]`); if(!m)return;
    const p=clamp(progress,0,100)/100;
    const source=84-50*p, dest=34+50*p;
    const src=m.querySelector(".pr2-source"), dst=m.querySelector(".pr2-dest");
    src.style.width=src.style.height=`${source}px`; dst.style.width=dst.style.height=`${dest}px`;
    src.style.transform=`translate(-50%,-50%) rotate(${-spin}deg)`; dst.style.transform=`translate(50%,-50%) rotate(${spin}deg)`;
    m.querySelector("[data-progress-label]").textContent=pct(progress);
    m.querySelector(".pr2-progress i").style.width=pct(progress);
    const y=88, s1=clamp(sag*4.2,-45,45), sk=clamp(skew*2.0,-34,34);
    const d=`M80,${y} C330,${y+s1} 670,${y-s1*.35+sk} 920,${y+sk}`;
    m.querySelectorAll(".pr2-paper-shadow,.pr2-paper,.pr2-paper-fiber").forEach(path=>path.setAttribute("d",d));
    m.querySelector(".pr2-paper-fiber").style.strokeDashoffset=`${-spin*.13}px`;
  }

  function updateUi(s, initial=false, safeLow=41, safeHigh=59, center=50) {
    updateMachine(s,"player",s.progress,s.spin,s.wobble,s.skew);
    updateMachine(s,"foe",s.rival,s.rivalSpin,Math.sin(s.elapsed*2.4)*.45,Math.sin(s.elapsed*.8)*.7);
    const player=s.root.querySelector('[data-machine="player"]');
    player.classList.toggle("is-rolling",s.speed>1);
    player.classList.toggle("danger",s.tension<safeLow||s.tension>safeHigh||s.speed>5.05||s.strain>27);
    player.classList.toggle("good",s.tension>=safeLow&&s.tension<=safeHigh&&s.speed>=2.35&&s.speed<=4.85&&s.strain<19);
    s.root.querySelector("[data-tension-label]").textContent=Math.round(s.tension);
    s.root.querySelector("[data-speed-label]").textContent=s.speed.toFixed(1);
    s.root.querySelector("[data-quality-label]").textContent=Math.round(s.quality);
    s.root.querySelector(".pr2-tension .pr2-safe").style.cssText=`left:${safeLow}%;width:${safeHigh-safeLow}%`;
    s.root.querySelector(".pr2-tension .pr2-needle").style.left=`${s.tension}%`;
    s.root.querySelector(".pr2-speed i").style.width=`${s.speed/8*100}%`;
    s.root.querySelector(".pr2-quality i").style.width=`${s.quality}%`;
  }

  function finish(s, won, text) {
    if (s.dead) return;
    s.dead=true; if(s.raf)cancelAnimationFrame(s.raf);
    s.input.loose=s.input.roll=s.input.tight=false;
    const layer=document.createElement("div"); layer.className="pr2-result";
    layer.innerHTML=`<div class="pr2-result-card"><h3>${won?"捲紙完成":"TOYZ 勝出"}</h3><p>${text}</p><button type="button" class="primary" data-result>${won?"完成挑戰":"重新挑戰"}</button></div>`;
    s.root.appendChild(layer);
    layer.querySelector("[data-result]").onclick=()=> won ? bridgeWin(s) : bridgeLose(s);
  }

  function bridgeWin(s) {
    bridgeMode=true; stopSession();
    try { for(let i=0;i<7;i++) s.original.roll?.click(); } catch(e){ console.error(e); }
    setTimeout(()=>{bridgeMode=false;scheduleScan();},120);
  }
  function bridgeLose(s) {
    bridgeMode=true; stopSession();
    try { for(let i=0;i<20;i++) s.original.loose?.click(); } catch(e){ console.error(e); }
    setTimeout(()=>{bridgeMode=false;scheduleScan();},120);
  }

  function scan() {
    scheduled=false;
    if (session && !document.contains(session.root)) stopSession();
    if (!bridgeMode && isLegacyRoll()) takeover();
  }
  function scheduleScan(){if(scheduled)return;scheduled=true;requestAnimationFrame(scan);}
  new MutationObserver(scheduleScan).observe(body,{childList:true,subtree:true});
  scheduleScan();
})();