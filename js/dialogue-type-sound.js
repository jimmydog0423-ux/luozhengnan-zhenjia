(() => {
  "use strict";

  let ctx = null;
  let out = null;
  let lastAt = 0;

  function ensureContext() {
    if (ctx) return ctx;
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return null;
    ctx = new Ctx();
    out = ctx.createGain();
    out.gain.value = 0.95;
    out.connect(ctx.destination);
    return ctx;
  }

  function unlock() {
    const c = ensureContext();
    if (c?.state === "suspended") c.resume().catch(() => {});
  }

  function speakerPitch(name = "") {
    let hash = 0;
    for (const ch of name) hash = (hash * 33 + ch.codePointAt(0)) >>> 0;
    return 430 + (hash % 170);
  }

  function blip(freq, volume = 0.105) {
    const c = ensureContext();
    if (!c || c.state !== "running" || window.GameAudio?.isMuted?.()) return;

    const now = c.currentTime;
    const osc = c.createOscillator();
    const gain = c.createGain();
    const filter = c.createBiquadFilter();

    osc.type = "square";
    osc.frequency.setValueAtTime(freq, now);
    osc.frequency.exponentialRampToValueAtTime(Math.max(120, freq * 0.88), now + 0.036);

    filter.type = "lowpass";
    filter.frequency.value = 1650;
    filter.Q.value = 0.7;

    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(volume, now + 0.003);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.045);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(out);
    osc.start(now);
    osc.stop(now + 0.055);
  }

  function installOverride() {
    if (!window.GameAudio || window.GameAudio.__dialogueTypeBoosted) return false;

    const originalPlayType = window.GameAudio.playType?.bind(window.GameAudio);
    window.GameAudio.playType = (speaker = "", char = "") => {
      if (!char || /\s/.test(char) || /[，、。！？!?；：,.…]/.test(char)) return;
      unlock();

      const now = performance.now();
      if (now - lastAt < 28) return;
      lastAt = now;

      const base = speakerPitch(speaker);
      const jitter = (Math.random() - 0.5) * 26;
      blip(base + jitter, 0.105);

      // A tiny lower layer makes the blip audible over MP3 BGM without becoming harsh.
      setTimeout(() => blip(base * 0.74 + jitter * 0.25, 0.026), 11);
    };

    window.GameAudio.__originalPlayType = originalPlayType;
    window.GameAudio.__dialogueTypeBoosted = true;
    return true;
  }

  document.addEventListener("pointerdown", unlock, { once: true, capture: true });
  document.addEventListener("keydown", unlock, { once: true, capture: true });

  function boot() {
    if (installOverride()) return;
    const timer = setInterval(() => {
      if (installOverride()) clearInterval(timer);
    }, 50);
    setTimeout(() => clearInterval(timer), 3000);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot, { once: true });
  else boot();
})();
