(() => {
  "use strict";

  const MUTE_KEY = "red_school_audio_muted_v1";
  const MODE_LABEL = {
    explore: "校園探索",
    poker: "Poker",
    boss: "Boss",
    basement: "地下機房"
  };

  const state = {
    ctx: null,
    master: null,
    sfx: null,
    muted: localStorage.getItem(MUTE_KEY) === "1",
    started: false,
    mode: "explore",
    theme: null,
    themeSerial: 0,
    syncQueued: false
  };

  function makeContext() {
    if (state.ctx) return state.ctx;
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return null;

    const ctx = new Ctx();
    const master = ctx.createGain();
    const sfx = ctx.createGain();

    master.gain.value = state.muted ? 0 : 0.72;
    sfx.gain.value = 0.42;
    sfx.connect(master);
    master.connect(ctx.destination);

    state.ctx = ctx;
    state.master = master;
    state.sfx = sfx;
    return ctx;
  }

  function ramp(param, value, seconds = 0.12) {
    if (!state.ctx || !param) return;
    const now = state.ctx.currentTime;
    param.cancelScheduledValues(now);
    param.setValueAtTime(Math.max(0.0001, param.value), now);
    param.linearRampToValueAtTime(value, now + seconds);
  }

  function syncSoundButton() {
    const btn = document.getElementById("soundBtn");
    if (!btn) return;
    btn.textContent = state.muted ? "聲音：關" : "聲音：開";
    btn.setAttribute("aria-pressed", state.muted ? "false" : "true");
    btn.title = `目前 BGM：${MODE_LABEL[state.mode] || "校園探索"}`;
  }

  function setMuted(value) {
    state.muted = !!value;
    localStorage.setItem(MUTE_KEY, state.muted ? "1" : "0");
    if (state.master) ramp(state.master.gain, state.muted ? 0 : 0.72, 0.08);
    syncSoundButton();
  }

  function createThemeBus(mode) {
    const ctx = state.ctx;
    const bus = ctx.createGain();
    const filter = ctx.createBiquadFilter();
    const delay = ctx.createDelay(1.4);
    const feedback = ctx.createGain();
    const wet = ctx.createGain();

    const settings = {
      explore:  { volume: 0.17, cutoff: 1350, delay: 0.34, feedback: 0.17, wet: 0.20 },
      poker:    { volume: 0.16, cutoff: 3000, delay: 0.19, feedback: 0.10, wet: 0.10 },
      boss:     { volume: 0.215, cutoff: 2300, delay: 0.15, feedback: 0.12, wet: 0.11 },
      basement: { volume: 0.195, cutoff: 920,  delay: 0.41, feedback: 0.24, wet: 0.22 }
    }[mode] || { volume: 0.17, cutoff: 1350, delay: 0.34, feedback: 0.17, wet: 0.20 };

    bus.gain.value = 0.0001;
    filter.type = "lowpass";
    filter.frequency.value = settings.cutoff;
    filter.Q.value = mode === "basement" ? 1.8 : 0.75;
    delay.delayTime.value = settings.delay;
    feedback.gain.value = settings.feedback;
    wet.gain.value = settings.wet;

    bus.connect(filter);
    filter.connect(state.master);
    filter.connect(delay);
    delay.connect(feedback);
    feedback.connect(delay);
    delay.connect(wet);
    wet.connect(state.master);

    return {
      mode,
      bus,
      filter,
      delay,
      feedback,
      wet,
      volume: settings.volume,
      nodes: [],
      timers: [],
      stopped: false,
      serial: ++state.themeSerial
    };
  }

  function addTimer(theme, fn, ms) {
    if (!theme || theme.stopped) return null;
    const id = setTimeout(() => {
      theme.timers = theme.timers.filter(x => x !== id);
      if (!theme.stopped && state.theme === theme) fn();
    }, ms);
    theme.timers.push(id);
    return id;
  }

  function makeDrone(theme, freq, gainValue, type = "sine", lfoHz = 0.08, lfoDepth = 0.18) {
    const ctx = state.ctx;
    if (!ctx || !theme || theme.stopped) return;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const lfo = ctx.createOscillator();
    const lfoGain = ctx.createGain();

    osc.type = type;
    osc.frequency.value = freq;
    gain.gain.value = gainValue;
    lfo.type = "sine";
    lfo.frequency.value = lfoHz;
    lfoGain.gain.value = gainValue * lfoDepth;

    lfo.connect(lfoGain);
    lfoGain.connect(gain.gain);
    osc.connect(gain);
    gain.connect(theme.bus);
    osc.start();
    lfo.start();

    theme.nodes.push(osc, lfo, gain, lfoGain);
  }

  function themeNote(theme, freq, length = 0.35, volume = 0.03, type = "triangle", attack = 0.01, detune = 0) {
    if (!state.ctx || state.ctx.state !== "running" || state.muted || !theme || theme.stopped) return;
    const ctx = state.ctx;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(freq, now);
    osc.detune.value = detune;
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(Math.max(0.0002, volume), now + attack);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + length);

    osc.connect(gain);
    gain.connect(theme.bus);
    osc.start(now);
    osc.stop(now + length + 0.04);
  }

  function noiseHit(theme, length = 0.13, volume = 0.018, center = 900) {
    if (!state.ctx || state.ctx.state !== "running" || state.muted || !theme || theme.stopped) return;
    const ctx = state.ctx;
    const frames = Math.max(1, Math.floor(ctx.sampleRate * length));
    const buffer = ctx.createBuffer(1, frames, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < frames; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / frames);

    const src = ctx.createBufferSource();
    const band = ctx.createBiquadFilter();
    const gain = ctx.createGain();
    src.buffer = buffer;
    band.type = "bandpass";
    band.frequency.value = center;
    band.Q.value = 3.5;
    gain.gain.value = volume;
    src.connect(band);
    band.connect(gain);
    gain.connect(theme.bus);
    src.start();
  }

  function startExplore(theme) {
    makeDrone(theme, 55.0, 0.017, "sine", 0.065, 0.22);
    makeDrone(theme, 82.41, 0.008, "triangle", 0.09, 0.18);
    const motif = [
      [110.00, 130.81, 155.56],
      [98.00, 116.54, 146.83],
      [110.00, 123.47, 164.81],
      [92.50, 110.00, 138.59]
    ];
    let index = 0;
    const loop = () => {
      const chord = motif[index++ % motif.length];
      themeNote(theme, chord[0], 3.1, 0.032, "triangle", 0.18, (Math.random() - 0.5) * 7);
      addTimer(theme, () => themeNote(theme, chord[1], 2.3, 0.022, "triangle", 0.16), 560);
      addTimer(theme, () => themeNote(theme, chord[2], 1.8, 0.017, "sine", 0.12), 1120);
      addTimer(theme, loop, 4300);
    };
    loop();
  }

  function startPoker(theme) {
    makeDrone(theme, 65.41, 0.007, "sine", 0.14, 0.12);
    const bass = [65.41, 73.42, 77.78, 58.27];
    const chords = [
      [130.81, 155.56, 196.00],
      [146.83, 174.61, 220.00],
      [155.56, 185.00, 233.08],
      [116.54, 146.83, 174.61]
    ];
    let beat = 0;
    const tick = () => {
      const bar = Math.floor(beat / 4) % bass.length;
      const pos = beat % 4;
      themeNote(theme, pos === 0 ? bass[bar] : bass[bar] * 2, pos === 0 ? 0.34 : 0.16, pos === 0 ? 0.043 : 0.017, pos === 0 ? "triangle" : "sine", 0.008);
      if (pos === 0) {
        const chord = chords[bar];
        chord.forEach((f, i) => addTimer(theme, () => themeNote(theme, f, 0.48, 0.012, "triangle", 0.012), i * 45));
      }
      if (pos === 2 && Math.random() < 0.55) noiseHit(theme, 0.055, 0.006, 2200);
      beat++;
      addTimer(theme, tick, 620);
    };
    tick();
  }

  function startBoss(theme) {
    makeDrone(theme, 46.25, 0.014, "sawtooth", 0.22, 0.12);
    makeDrone(theme, 92.50, 0.008, "triangle", 0.31, 0.14);
    const pulse = [55.00, 55.00, 65.41, 49.00, 55.00, 73.42, 65.41, 49.00];
    let step = 0;
    const hit = () => {
      const f = pulse[step % pulse.length];
      const accent = step % 4 === 0;
      themeNote(theme, f, accent ? 0.36 : 0.23, accent ? 0.060 : 0.035, "sawtooth", 0.006);
      themeNote(theme, f * 2, 0.18, accent ? 0.024 : 0.012, "triangle", 0.004);
      noiseHit(theme, accent ? 0.11 : 0.065, accent ? 0.020 : 0.010, accent ? 150 : 280);
      if (step % 8 === 6) themeNote(theme, 311.13, 0.65, 0.022, "square", 0.015);
      step++;
      addTimer(theme, hit, 430);
    };
    hit();
  }

  function startBasement(theme) {
    makeDrone(theme, 43.65, 0.024, "sine", 0.045, 0.28);
    makeDrone(theme, 46.25, 0.009, "triangle", 0.052, 0.24);
    makeDrone(theme, 87.31, 0.005, "sine", 0.12, 0.18);

    const machinery = () => {
      const metal = 620 + Math.random() * 1250;
      noiseHit(theme, 0.08 + Math.random() * 0.13, 0.010 + Math.random() * 0.009, metal);
      if (Math.random() < 0.65) {
        themeNote(theme, 41 + Math.random() * 7, 0.28, 0.025, "square", 0.003, (Math.random() - 0.5) * 16);
      }
      addTimer(theme, machinery, 900 + Math.random() * 1700);
    };

    const warning = () => {
      themeNote(theme, 123.47, 0.9, 0.014, "sine", 0.08);
      addTimer(theme, () => themeNote(theme, 116.54, 1.15, 0.012, "sine", 0.08), 470);
      addTimer(theme, warning, 6500 + Math.random() * 3200);
    };

    machinery();
    addTimer(theme, warning, 1900);
  }

  function stopTheme(theme, fade = 0.85) {
    if (!theme || theme.stopped) return;
    theme.stopped = true;
    theme.timers.forEach(clearTimeout);
    theme.timers.length = 0;

    if (state.ctx) {
      const now = state.ctx.currentTime;
      try {
        theme.bus.gain.cancelScheduledValues(now);
        theme.bus.gain.setValueAtTime(Math.max(0.0001, theme.bus.gain.value), now);
        theme.bus.gain.linearRampToValueAtTime(0.0001, now + fade);
      } catch (_) {}
    }

    setTimeout(() => {
      theme.nodes.forEach(node => {
        try { if (typeof node.stop === "function") node.stop(); } catch (_) {}
        try { if (typeof node.disconnect === "function") node.disconnect(); } catch (_) {}
      });
      [theme.bus, theme.filter, theme.delay, theme.feedback, theme.wet].forEach(node => {
        try { node.disconnect(); } catch (_) {}
      });
    }, Math.ceil((fade + 0.15) * 1000));
  }

  function launchTheme(mode) {
    if (!state.ctx || !state.started) return;
    const old = state.theme;
    const theme = createThemeBus(mode);
    state.theme = theme;

    if (mode === "poker") startPoker(theme);
    else if (mode === "boss") startBoss(theme);
    else if (mode === "basement") startBasement(theme);
    else startExplore(theme);

    const now = state.ctx.currentTime;
    theme.bus.gain.setValueAtTime(0.0001, now);
    theme.bus.gain.linearRampToValueAtTime(theme.volume, now + 1.15);
    if (old) stopTheme(old, 0.9);
  }

  function setMode(mode, { force = false } = {}) {
    if (!MODE_LABEL[mode]) mode = "explore";
    if (!force && state.mode === mode) return;
    state.mode = mode;
    syncSoundButton();
    if (state.started && state.ctx?.state === "running") launchTheme(mode);
  }

  function detectMode() {
    const room = (document.getElementById("roomName")?.textContent || "").trim();
    const overlay = document.getElementById("modalOverlay");
    const modal = document.getElementById("modalBody");
    const modalOpen = overlay?.classList.contains("show");

    if (modalOpen && modal?.querySelector(".poker-v2")) return "poker";

    if (modalOpen && modal) {
      const text = modal.textContent || "";
      const hasBossUi = !!modal.querySelector('[class*="boss"], [id*="boss"], .combat-ui, .boss-ui, .boss-stage');
      const bossWords = /(BOSS|超負荷|紹安|金字塔|最終戰|血量|HP)/i.test(text);
      const battleWords = /(攻擊|防禦|戰鬥|回合|血量|HP|傷害|BOSS)/i.test(text);
      if (hasBossUi || (bossWords && battleWords)) return "boss";
    }

    if (/(金字塔|舞台深處|最終戰|BOSS)/i.test(room)) return "boss";
    if (/(地下機房|機房|地下室)/i.test(room)) return "basement";
    return "explore";
  }

  function syncModeFromUi() {
    state.syncQueued = false;
    setMode(detectMode());
  }

  function scheduleModeSync() {
    if (state.syncQueued) return;
    state.syncQueued = true;
    requestAnimationFrame(syncModeFromUi);
  }

  async function ensureStarted() {
    const ctx = makeContext();
    if (!ctx) return false;
    try {
      if (ctx.state === "suspended") await ctx.resume();
    } catch (_) {}
    state.started = true;
    state.mode = detectMode();
    if (!state.theme) launchTheme(state.mode);
    syncSoundButton();
    return ctx.state === "running";
  }

  function shortTone(freq, duration, volume, type = "triangle", detune = 0) {
    if (!state.ctx || state.ctx.state !== "running" || state.muted) return;
    const ctx = state.ctx;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, now);
    osc.detune.value = detune;
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(volume, now + 0.004);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    osc.connect(gain);
    gain.connect(state.sfx);
    osc.start(now);
    osc.stop(now + duration + 0.02);
  }

  function speakerPitch(name = "") {
    let hash = 0;
    for (const ch of name) hash = (hash * 31 + ch.codePointAt(0)) >>> 0;
    return 520 + (hash % 190);
  }

  function playType(name = "", char = "") {
    if (!char || /\s/.test(char)) return;
    const base = speakerPitch(name);
    shortTone(base + (Math.random() - 0.5) * 36, 0.028, 0.026, "triangle", (Math.random() - 0.5) * 14);
  }

  function playAdvance() {
    shortTone(330, 0.055, 0.032, "sine");
    setTimeout(() => shortTone(440, 0.06, 0.026, "sine"), 38);
  }

  function playConfirm() {
    shortTone(523.25, 0.07, 0.032, "triangle");
    setTimeout(() => shortTone(659.25, 0.09, 0.026, "triangle"), 62);
  }

  function bindModeDetection() {
    const room = document.getElementById("roomName");
    const modal = document.getElementById("modalBody");
    const overlay = document.getElementById("modalOverlay");

    if (room) new MutationObserver(scheduleModeSync).observe(room, { childList: true, characterData: true, subtree: true });
    if (modal) new MutationObserver(scheduleModeSync).observe(modal, { childList: true, subtree: true, attributes: true, attributeFilter: ["class"] });
    if (overlay) new MutationObserver(scheduleModeSync).observe(overlay, { attributes: true, attributeFilter: ["class"] });

    setInterval(scheduleModeSync, 900);
    scheduleModeSync();
  }

  function bindUnlock() {
    const unlock = () => ensureStarted();
    document.addEventListener("pointerdown", unlock, { once: true, capture: true });
    document.addEventListener("keydown", unlock, { once: true, capture: true });

    const btn = document.getElementById("soundBtn");
    if (btn) {
      btn.addEventListener("click", async () => {
        await ensureStarted();
        setMuted(!state.muted);
      });
    }
    syncSoundButton();
    bindModeDetection();
  }

  document.addEventListener("visibilitychange", () => {
    if (!state.ctx) return;
    if (document.hidden) state.ctx.suspend().catch(() => {});
    else if (state.started && !state.muted) {
      state.ctx.resume().then(scheduleModeSync).catch(() => {});
    }
  });

  window.GameAudio = {
    ensureStarted,
    playType,
    playAdvance,
    playConfirm,
    setMuted,
    setMode,
    refreshBgmMode: scheduleModeSync,
    isMuted: () => state.muted,
    getMode: () => state.mode
  };

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", bindUnlock, { once: true });
  else bindUnlock();
})();
