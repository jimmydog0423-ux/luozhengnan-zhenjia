(() => {
  "use strict";

  const body = document.getElementById("modalBody");
  const overlay = document.getElementById("modalOverlay");
  const closeBtn = document.getElementById("modalClose");
  if (!body) return;

  /* Capture the HTMLAudioElements created by audio-system.js. That system
     constructs its BGM tracks on DOMContentLoaded, so installing this wrapper
     now lets the rhythm game pause/resume the room BGM without changing the
     user's global mute preference. */
  const audioRegistry = window.__redSchoolAudioRegistry || (window.__redSchoolAudioRegistry = []);
  if (!window.__redSchoolAudioWrapped && window.Audio) {
    const NativeAudio = window.Audio;
    function TrackedAudio(src) {
      const audio = new NativeAudio(src);
      audioRegistry.push(audio);
      return audio;
    }
    TrackedAudio.prototype = NativeAudio.prototype;
    try { Object.setPrototypeOf(TrackedAudio, NativeAudio); } catch (_) {}
    window.Audio = TrackedAudio;
    window.__redSchoolAudioWrapped = true;
  }

  const BPM = 149;
  const BEAT = 60 / BPM;
  const CHART_OFFSET = 0.12;
  const CHALLENGE_SECONDS = 48;
  const LEAD_TIME = 1.85;
  const PERFECT = 0.070;
  const GREAT = 0.125;
  const GOOD = 0.190;
  const MISS = 0.235;
  const KEYS = ["A", "S", "D", "J", "K", "L"];
  const KEY_TO_LANE = {a:0,s:1,d:2,j:3,k:4,l:5};
  const BRIDGE_SEQUENCE = [0,2,1,4,3,5,0,5,2,4,1,3];

  let session = null;
  let bridgeMode = false;
  let scanQueued = false;

  const clamp = (v,a,b) => Math.max(a, Math.min(b,v));

  function isLegacyRhythm() {
    const title = body.querySelector("h2")?.textContent || "";
    return /六指逆拍/.test(title) && !!body.querySelector("#rhythmButtons") && !body.querySelector(".rhythm-v2");
  }

  function pauseRoomBgm() {
    audioRegistry.forEach(audio => {
      if (!audio?.dataset?.bgmMode) return;
      try { audio.pause(); } catch (_) {}
      try { audio.volume = 0; } catch (_) {}
    });
  }

  function restoreRoomBgm() {
    const ga = window.GameAudio;
    if (!ga) return;
    const mode = ga.getMode?.() || "explore";
    ga.setMode?.(mode, { force:true, restart:false });
    setTimeout(() => ga.refreshBgmMode?.(), 60);
  }

  function stopSession({restore=true}={}) {
    const s = session;
    if (!s) return;
    s.dead = true;
    if (s.raf) cancelAnimationFrame(s.raf);
    s.timers.forEach(clearTimeout);
    s.timers.length = 0;
    if (s.audio) {
      try { s.audio.pause(); s.audio.currentTime = 0; } catch (_) {}
    }
    if (s.keyDown) document.removeEventListener("keydown", s.keyDown, true);
    if (s.visibility) document.removeEventListener("visibilitychange", s.visibility);
    session = null;
    if (restore) restoreRoomBgm();
  }

  function addNote(notes, time, lane, kind="tap") {
    if (time < 1.1 || time > CHALLENGE_SECONDS - .25) return;
    const duplicate = notes.some(n => Math.abs(n.time-time) < .012 && n.lane === lane);
    if (!duplicate) notes.push({id:notes.length,time,lane,kind,hit:false,missed:false,el:null});
  }

  function buildChart() {
    const notes = [];
    const mainPattern = [0,2,1,4,3,5,1,3,0,4,2,5,0,3,1,5];
    const totalBeats = Math.floor((CHALLENGE_SECONDS - CHART_OFFSET) / BEAT);

    for (let beat=3; beat<totalBeats; beat++) {
      const t = CHART_OFFSET + beat * BEAT;
      const lane = mainPattern[beat % mainPattern.length];
      addNote(notes,t,lane);

      // Strong downbeats occasionally become two-note chords.
      if (beat % 16 === 0) addNote(notes,t,5-lane,"chord");

      // Chorus-like sections use eighth-note answers so the chart follows the
      // high-energy 149 BPM pulse instead of feeling like a metronome exercise.
      const sec = t;
      const dense = (sec >= 10 && sec < 20) || (sec >= 28 && sec < 41);
      if (dense && beat % 2 === 1) {
        addNote(notes,t + BEAT/2,(lane + 2 + (beat%3)) % 6,"eighth");
      }
      if (dense && beat % 8 === 6) {
        addNote(notes,t + BEAT*.75,(lane + 4) % 6,"eighth");
      }
    }
    return notes.sort((a,b)=>a.time-b.time);
  }

  function takeover() {
    if (bridgeMode || !isLegacyRhythm()) return;
    stopSession();

    const legacyButtons = [...body.querySelectorAll("#rhythmButtons button")];
    body.innerHTML = `
      <div class="rhythm-v2" data-playing="0">
        <div class="rv2-head">
          <div>
            <div class="eyebrow">RHYTHM · 149 BPM</div>
            <h2>中指通：六指逆拍</h2>
          </div>
          <div class="rv2-song"><b>APT.</b><span>前 48 秒挑戰</span></div>
        </div>

        <div class="rv2-hud">
          <div><span>SCORE</span><b data-score>000000</b></div>
          <div><span>COMBO</span><b data-combo>0</b></div>
          <div><span>ACCURACY</span><b data-accuracy>100.0%</b></div>
          <div class="rv2-life"><span>GROOVE</span><div><i data-life></i></div></div>
        </div>

        <div class="rv2-stage">
          <div class="rv2-lanes">
            ${KEYS.map((key,i)=>`<div class="rv2-lane" data-lane="${i}"><div class="rv2-key">${key}</div></div>`).join("")}
          </div>
          <div class="rv2-judge-line"></div>
          <div class="rv2-judge" data-judge></div>
          <div class="rv2-countdown" data-countdown>
            <div class="rv2-ready-card">
              <b>READY?</b>
              <span>A S D　J K L</span>
              <button type="button" class="primary" data-ready>準備開始</button>
            </div>
          </div>
        </div>

        <div class="rv2-controls">
          ${KEYS.map((key,i)=>`<button type="button" data-hit="${i}"><b>${key}</b><span>${["左一","左二","左三","右一","右二","右三"][i]}</span></button>`).join("")}
        </div>
      </div>`;

    const root = body.querySelector(".rhythm-v2");
    const audio = new Audio("assets/audio/bgm/apt.mp3");
    audio.preload = "auto";
    audio.loop = false;
    audio.volume = 0;

    const s = {
      root,audio,legacyButtons,dead:false,started:false,finished:false,raf:0,
      timers:[],notes:buildChart(),score:0,combo:0,maxCombo:0,life:100,
      perfect:0,great:0,good:0,miss:0,judged:0,accuracyPoints:0,
      endAt:CHALLENGE_SECONDS,keyDown:null,visibility:null
    };
    session = s;

    createNoteElements(s);
    bindControls(s);
    updateHud(s);
    root.querySelector("[data-ready]")?.addEventListener("click", () => beginCountdown(s), {once:true});
  }

  function createNoteElements(s) {
    s.notes.forEach(note => {
      const lane = s.root.querySelector(`.rv2-lane[data-lane="${note.lane}"]`);
      if (!lane) return;
      const el = document.createElement("i");
      el.className = `rv2-note ${note.kind}`;
      el.dataset.noteId = String(note.id);
      el.style.opacity = "0";
      lane.appendChild(el);
      note.el = el;
    });
  }

  function bindControls(s) {
    s.root.querySelectorAll("[data-hit]").forEach(btn => {
      const lane = Number(btn.dataset.hit);
      btn.addEventListener("pointerdown", ev => {
        ev.preventDefault();
        pressLane(s,lane);
        flashLane(s,lane);
      });
    });

    s.keyDown = ev => {
      if (!session || session !== s || !s.started || s.finished || ev.repeat) return;
      const lane = KEY_TO_LANE[ev.key.toLowerCase()];
      if (lane == null) return;
      ev.preventDefault();
      pressLane(s,lane);
      flashLane(s,lane);
    };
    document.addEventListener("keydown", s.keyDown, true);

    s.visibility = () => {
      if (!session || session !== s || !s.started || s.finished) return;
      if (document.hidden) {
        try { s.audio.pause(); } catch (_) {}
      } else {
        try { if (!window.GameAudio?.isMuted?.()) s.audio.volume = .58; s.audio.play().catch(()=>{}); } catch (_) {}
      }
    };
    document.addEventListener("visibilitychange", s.visibility);
  }

  async function primeAudio(s) {
    try {
      s.audio.volume = 0;
      await s.audio.play();
      s.audio.pause();
      s.audio.currentTime = 0;
      return true;
    } catch (_) {
      return false;
    }
  }

  async function beginCountdown(s) {
    if (!s || s.dead || s.started) return;
    pauseRoomBgm();
    await primeAudio(s);

    const box = s.root.querySelector("[data-countdown]");
    if (!box) return;
    const steps = ["3","2","1","START"];
    box.classList.add("counting");

    steps.forEach((text,index) => {
      const timer = setTimeout(() => {
        if (s.dead || session !== s) return;
        box.innerHTML = `<strong>${text}</strong>`;
        box.classList.remove("pulse");
        void box.offsetWidth;
        box.classList.add("pulse");
        if (index < 3) window.GameAudio?.playConfirm?.();
        if (text === "START") {
          const startTimer = setTimeout(() => startSong(s), 330);
          s.timers.push(startTimer);
        }
      }, index * 760);
      s.timers.push(timer);
    });
  }

  async function startSong(s) {
    if (!s || s.dead || session !== s) return;
    const box = s.root.querySelector("[data-countdown]");
    box?.classList.add("hide");
    s.started = true;
    s.root.dataset.playing = "1";
    try { s.audio.currentTime = 0; } catch (_) {}
    s.audio.volume = window.GameAudio?.isMuted?.() ? 0 : .58;
    try {
      await s.audio.play();
    } catch (err) {
      s.started = false;
      s.root.dataset.playing = "0";
      if (box) {
        box.classList.remove("hide");
        box.innerHTML = `<div class="rv2-ready-card"><b>需要啟用音訊</b><span>點擊後重新倒數</span><button type="button" class="primary" data-retry-audio>重新開始</button></div>`;
        box.querySelector("[data-retry-audio]")?.addEventListener("click",()=>beginCountdown(s),{once:true});
      }
      return;
    }
    if (Number.isFinite(s.audio.duration) && s.audio.duration > 2) s.endAt = Math.min(CHALLENGE_SECONDS, s.audio.duration - .35);
    s.raf = requestAnimationFrame(() => frame(s));
  }

  function currentTime(s) {
    return Number.isFinite(s.audio?.currentTime) ? s.audio.currentTime : 0;
  }

  function frame(s) {
    if (!s || s.dead || session !== s || !document.contains(s.root)) { stopSession(); return; }
    if (!s.started || s.finished) return;

    const t = currentTime(s);
    if (window.GameAudio?.isMuted?.()) s.audio.volume = 0;
    else if (s.audio.volume < .55) s.audio.volume = .58;

    for (const note of s.notes) {
      if (note.hit || note.missed || !note.el) continue;
      const delta = note.time - t;
      if (delta > LEAD_TIME + .15) continue;
      if (delta < -MISS) {
        markMiss(s,note);
        continue;
      }
      const progress = 1 - delta / LEAD_TIME;
      const y = -8 + progress * 94;
      note.el.style.top = `${clamp(y,-12,104)}%`;
      note.el.style.opacity = delta <= LEAD_TIME ? "1" : "0";
    }

    if (s.life <= 0) { finish(s,false,"節奏槽歸零"); return; }
    if (t >= s.endAt) { finishByScore(s); return; }
    s.raf = requestAnimationFrame(() => frame(s));
  }

  function nearestNote(s,lane,t) {
    let best = null, bestDelta = Infinity;
    for (const note of s.notes) {
      if (note.lane !== lane || note.hit || note.missed) continue;
      const d = Math.abs(note.time - t);
      if (d < bestDelta) { bestDelta=d; best=note; }
      if (note.time > t + GOOD) break;
    }
    return best && bestDelta <= GOOD ? {note:best,delta:bestDelta} : null;
  }

  function pressLane(s,lane) {
    if (!s.started || s.finished) return;
    const t = currentTime(s);
    const hit = nearestNote(s,lane,t);
    if (!hit) {
      s.combo = 0;
      s.life = clamp(s.life - 1.5,0,100);
      showJudge(s,"EMPTY","empty");
      updateHud(s);
      return;
    }

    const {note,delta} = hit;
    note.hit = true;
    note.el?.classList.add("hit");
    const removeTimer = setTimeout(()=>note.el?.remove(),150);
    s.timers.push(removeTimer);

    s.judged++;
    s.combo++;
    s.maxCombo = Math.max(s.maxCombo,s.combo);

    if (delta <= PERFECT) {
      s.perfect++; s.score += 1000 + s.combo*8; s.accuracyPoints += 1; s.life = clamp(s.life+1.7,0,100); showJudge(s,"PERFECT","perfect");
    } else if (delta <= GREAT) {
      s.great++; s.score += 720 + s.combo*5; s.accuracyPoints += .82; s.life = clamp(s.life+1.0,0,100); showJudge(s,"GREAT","great");
    } else {
      s.good++; s.score += 380 + s.combo*2; s.accuracyPoints += .52; s.life = clamp(s.life+.35,0,100); showJudge(s,"GOOD","good");
    }
    updateHud(s);
  }

  function markMiss(s,note) {
    note.missed = true;
    note.el?.classList.add("miss");
    const timer = setTimeout(()=>note.el?.remove(),170);
    s.timers.push(timer);
    s.miss++;
    s.judged++;
    s.combo = 0;
    s.life = clamp(s.life - 8.5,0,100);
    showJudge(s,"MISS","miss");
    updateHud(s);
  }

  function flashLane(s,lane) {
    const el=s.root.querySelector(`.rv2-lane[data-lane="${lane}"]`);
    if (!el) return;
    el.classList.remove("pressed"); void el.offsetWidth; el.classList.add("pressed");
  }

  function showJudge(s,text,kind) {
    const el=s.root.querySelector("[data-judge]");
    if (!el) return;
    el.textContent=text;
    el.className=`rv2-judge ${kind}`;
    void el.offsetWidth;
    el.classList.add("show");
  }

  function accuracy(s) {
    return s.judged ? (s.accuracyPoints / s.judged) * 100 : 100;
  }

  function updateHud(s) {
    const score=s.root.querySelector("[data-score]");
    const combo=s.root.querySelector("[data-combo]");
    const acc=s.root.querySelector("[data-accuracy]");
    const life=s.root.querySelector("[data-life]");
    if(score)score.textContent=String(Math.round(s.score)).padStart(6,"0");
    if(combo)combo.textContent=String(s.combo);
    if(acc)acc.textContent=`${accuracy(s).toFixed(1)}%`;
    if(life)life.style.width=`${s.life}%`;
  }

  function finishByScore(s) {
    const acc=accuracy(s);
    const won = acc >= 72 && s.miss <= 12 && s.life > 0;
    finish(s,won,won?"節奏通過":"節奏未達標");
  }

  function finish(s,won,reason) {
    if (s.finished || s.dead) return;
    s.finished=true;
    s.started=false;
    s.root.dataset.playing="0";
    if(s.raf)cancelAnimationFrame(s.raf);
    try { s.audio.pause(); } catch (_) {}
    restoreRoomBgm();

    const acc=accuracy(s);
    const grade = acc>=95?"S":acc>=88?"A":acc>=80?"B":acc>=72?"C":"D";
    const result=document.createElement("div");
    result.className="rv2-result";
    result.innerHTML=`<div class="rv2-result-card">
      <div class="rv2-grade ${won?"win":"lose"}">${grade}</div>
      <h3>${won?"逆拍完成":"挑戰失敗"}</h3>
      <p>${reason}</p>
      <div class="rv2-result-grid">
        <span>分數<b>${Math.round(s.score)}</b></span>
        <span>準確率<b>${acc.toFixed(1)}%</b></span>
        <span>MAX COMBO<b>${s.maxCombo}</b></span>
        <span>MISS<b>${s.miss}</b></span>
      </div>
      <button type="button" class="primary" data-result>${won?"完成挑戰":"重新挑戰"}</button>
    </div>`;
    s.root.appendChild(result);
    result.querySelector("[data-result]")?.addEventListener("click",()=>won?bridgeWin(s):restart(s),{once:true});
  }

  function restart(s) {
    if (session !== s || s.dead) return;
    s.root.querySelector(".rv2-result")?.remove();
    s.notes.forEach(n=>n.el?.remove());
    s.notes=buildChart();
    s.score=0;s.combo=0;s.maxCombo=0;s.life=100;s.perfect=0;s.great=0;s.good=0;s.miss=0;s.judged=0;s.accuracyPoints=0;s.finished=false;s.started=false;
    try{s.audio.pause();s.audio.currentTime=0;}catch(_){}
    createNoteElements(s);
    updateHud(s);
    const box=s.root.querySelector("[data-countdown]");
    if(box){
      box.className="rv2-countdown";
      box.innerHTML=`<div class="rv2-ready-card"><b>READY?</b><span>A S D　J K L</span><button type="button" class="primary" data-ready>準備開始</button></div>`;
      box.querySelector("[data-ready]")?.addEventListener("click",()=>beginCountdown(s),{once:true});
    }
  }

  function bridgeWin(s) {
    const firstButtons=s.legacyButtons;
    bridgeMode=true;
    stopSession({restore:false});
    let step=0;

    const advance=()=>{
      const buttons = step===0 ? firstButtons : [...body.querySelectorAll("#rhythmButtons button")];
      const btn=buttons[BRIDGE_SEQUENCE[step]];
      if (!btn || typeof btn.onclick !== "function") {
        bridgeMode=false; restoreRoomBgm(); scheduleScan(); return;
      }
      try { btn.onclick(); } catch(e) { console.error(e); bridgeMode=false; restoreRoomBgm(); return; }
      step++;
      if(step<BRIDGE_SEQUENCE.length) setTimeout(advance,18);
      else setTimeout(()=>{bridgeMode=false;restoreRoomBgm();scheduleScan();},100);
    };
    advance();
  }

  function scan() {
    scanQueued=false;
    if(session && !document.contains(session.root)) stopSession();
    if(!bridgeMode && isLegacyRhythm()) takeover();
  }
  function scheduleScan(){if(scanQueued)return;scanQueued=true;requestAnimationFrame(scan);}

  new MutationObserver(scheduleScan).observe(body,{childList:true,subtree:true});
  if(overlay) new MutationObserver(()=>{
    if(session && !overlay.classList.contains("show")) stopSession();
  }).observe(overlay,{attributes:true,attributeFilter:["class"]});
  closeBtn?.addEventListener("click",()=>{if(session)stopSession();},true);
  scheduleScan();
})();