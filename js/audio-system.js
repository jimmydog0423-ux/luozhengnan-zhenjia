(() => {
  "use strict";

  const MUTE_KEY = "red_school_audio_muted_v1";
  const state = {
    ctx: null,
    master: null,
    bgm: null,
    sfx: null,
    delay: null,
    feedback: null,
    filter: null,
    started: false,
    bgmStarted: false,
    muted: localStorage.getItem(MUTE_KEY) === "1",
    motifTimer: null,
    droneNodes: []
  };

  function makeContext() {
    if (state.ctx) return state.ctx;
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return null;

    const ctx = new Ctx();
    const master = ctx.createGain();
    const bgm = ctx.createGain();
    const sfx = ctx.createGain();
    const filter = ctx.createBiquadFilter();
    const delay = ctx.createDelay(1.2);
    const feedback = ctx.createGain();

    master.gain.value = state.muted ? 0 : 0.72;
    bgm.gain.value = 0.16;
    sfx.gain.value = 0.42;

    filter.type = "lowpass";
    filter.frequency.value = 1450;
    filter.Q.value = 0.7;
    delay.delayTime.value = 0.31;
    feedback.gain.value = 0.18;

    bgm.connect(filter);
    filter.connect(master);
    filter.connect(delay);
    delay.connect(feedback);
    feedback.connect(delay);
    delay.connect(master);
    sfx.connect(master);
    master.connect(ctx.destination);

    state.ctx = ctx;
    state.master = master;
    state.bgm = bgm;
    state.sfx = sfx;
    state.delay = delay;
    state.feedback = feedback;
    state.filter = filter;
    return ctx;
  }

  function ramp(param, value, seconds = 0.12) {
    if (!state.ctx || !param) return;
    const now = state.ctx.currentTime;
    param.cancelScheduledValues(now);
    param.setValueAtTime(param.value, now);
    param.linearRampToValueAtTime(value, now + seconds);
  }

  function setMuted(value) {
    state.muted = !!value;
    localStorage.setItem(MUTE_KEY, state.muted ? "1" : "0");
    if (state.master) ramp(state.master.gain, state.muted ? 0 : 0.72, 0.08);
    syncSoundButton();
  }

  function syncSoundButton() {
    const btn = document.getElementById("soundBtn");
    if (!btn) return;
    btn.textContent = state.muted ? "聲音：關" : "聲音：開";
    btn.setAttribute("aria-pressed", state.muted ? "false" : "true");
  }

  function makeDrone(freq, gainValue, type = "sine") {
    const ctx = state.ctx;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const lfo = ctx.createOscillator();
    const lfoGain = ctx.createGain();

    osc.type = type;
    osc.frequency.value = freq;
    gain.gain.value = gainValue;
    lfo.type = "sine";
    lfo.frequency.value = 0.07 + Math.random() * 0.04;
    lfoGain.gain.value = gainValue * 0.22;

    lfo.connect(lfoGain);
    lfoGain.connect(gain.gain);
    osc.connect(gain);
    gain.connect(state.bgm);
    osc.start();
    lfo.start();
    state.droneNodes.push(osc, gain, lfo, lfoGain);
  }

  function playAmbientNote(freq, length = 2.6, volume = 0.045) {
    if (!state.ctx || state.ctx.state !== "running" || state.muted) return;
    const ctx = state.ctx;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const tone = ctx.createBiquadFilter();

    osc.type = "triangle";
    osc.frequency.setValueAtTime(freq, now);
    osc.detune.setValueAtTime((Math.random() - 0.5) * 8, now);
    tone.type = "lowpass";
    tone.frequency.value = 1100;
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(volume, now + 0.18);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + length);

    osc.connect(tone);
    tone.connect(gain);
    gain.connect(state.bgm);
    osc.start(now);
    osc.stop(now + length + 0.08);
  }

  const MOTIF = [
    [110.00, 130.81, 155.56],
    [98.00, 116.54, 146.83],
    [110.00, 123.47, 164.81],
    [92.50, 110.00, 138.59]
  ];
  let motifIndex = 0;

  function scheduleMotif() {
    clearTimeout(state.motifTimer);
    if (!state.started) return;

    if (state.ctx?.state === "running" && !state.muted) {
      const chord = MOTIF[motifIndex++ % MOTIF.length];
      playAmbientNote(chord[0], 3.1, 0.035);
      setTimeout(() => playAmbientNote(chord[1], 2.4, 0.024), 540);
      setTimeout(() => playAmbientNote(chord[2], 2.0, 0.018), 1040);
    }

    state.motifTimer = setTimeout(scheduleMotif, 4300);
  }

  function startBgm() {
    if (state.bgmStarted || !state.ctx) return;
    state.bgmStarted = true;
    makeDrone(55.0, 0.018, "sine");
    makeDrone(82.41, 0.010, "triangle");
    scheduleMotif();
  }

  async function ensureStarted() {
    const ctx = makeContext();
    if (!ctx) return false;
    try {
      if (ctx.state === "suspended") await ctx.resume();
    } catch (_) {}
    state.started = true;
    startBgm();
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
  }

  document.addEventListener("visibilitychange", () => {
    if (!state.ctx) return;
    if (document.hidden) state.ctx.suspend().catch(() => {});
    else if (state.started && !state.muted) state.ctx.resume().catch(() => {});
  });

  window.GameAudio = {
    ensureStarted,
    playType,
    playAdvance,
    playConfirm,
    setMuted,
    isMuted: () => state.muted
  };

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", bindUnlock, { once: true });
  else bindUnlock();
})();
