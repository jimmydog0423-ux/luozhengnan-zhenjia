(() => {
  "use strict";

  const MUTE_KEY = "red_school_audio_muted_v1";
  const CROSSFADE_MS = 1200;
  const MODE_LABEL = {
    explore: "校園探索",
    roll: "紙捲競速",
    poker: "Poker",
    boss: "Boss",
    basement: "地下機房"
  };
  const BGM_FILES = {
    explore: "assets/audio/bgm/explore.mp3",
    // Paper-roll challenge gets its own mode immediately. It currently reuses
    // the tense poker track; replacing this path with roll.mp3 later requires
    // no gameplay changes.
    roll: "assets/audio/bgm/poker.mp3",
    poker: "assets/audio/bgm/poker.mp3",
    boss: "assets/audio/bgm/boss.mp3",
    basement: "assets/audio/bgm/basement.mp3"
  };
  const BGM_VOLUME = {
    explore: 0.30,
    roll: 0.31,
    poker: 0.28,
    boss: 0.34,
    basement: 0.30
  };

  const state = {
    ctx: null,
    master: null,
    sfx: null,
    muted: localStorage.getItem(MUTE_KEY) === "1",
    started: false,
    mode: "explore",
    tracks: new Map(),
    currentTrack: null,
    currentMode: null,
    fadeToken: 0,
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

  function getTrack(mode) {
    if (!MODE_LABEL[mode]) mode = "explore";
    if (state.tracks.has(mode)) return state.tracks.get(mode);

    const audio = new Audio(BGM_FILES[mode]);
    audio.loop = true;
    audio.preload = mode === "explore" ? "auto" : "metadata";
    audio.volume = 0;
    audio.dataset.bgmMode = mode;

    audio.addEventListener("error", () => {
      console.warn(`[BGM] 無法載入 ${mode}: ${BGM_FILES[mode]}`);
    });

    state.tracks.set(mode, audio);
    return audio;
  }

  function preloadTracks() {
    Object.keys(BGM_FILES).forEach(mode => getTrack(mode));
  }

  function desiredVolume(mode) {
    if (state.muted || document.hidden) return 0;
    return BGM_VOLUME[mode] ?? 0.30;
  }

  function syncSoundButton() {
    const btn = document.getElementById("soundBtn");
    if (!btn) return;
    btn.textContent = state.muted ? "聲音：關" : "聲音：開";
    btn.setAttribute("aria-pressed", state.muted ? "false" : "true");
    btn.title = `目前 BGM：${MODE_LABEL[state.mode] || "校園探索"}（MP3）`;
  }

  function fadeElement(audio, from, to, duration, token, onDone) {
    if (!audio) return;
    const start = performance.now();
    audio.volume = Math.max(0, Math.min(1, from));

    const step = now => {
      if (token !== state.fadeToken) return;
      const p = Math.min(1, (now - start) / Math.max(1, duration));
      const eased = p * p * (3 - 2 * p);
      audio.volume = Math.max(0, Math.min(1, from + (to - from) * eased));
      if (p < 1) requestAnimationFrame(step);
      else if (onDone) onDone();
    };
    requestAnimationFrame(step);
  }

  async function safePlay(audio) {
    if (!audio) return false;
    try {
      await audio.play();
      return true;
    } catch (err) {
      console.warn("[BGM] 播放被瀏覽器暫停，等待下一次使用者互動。", err);
      return false;
    }
  }

  function stopOtherTracks(except) {
    state.tracks.forEach(track => {
      if (track === except) return;
      track.pause();
      track.volume = 0;
      try { track.currentTime = 0; } catch (_) {}
    });
  }

  async function launchTrack(mode, { restart = true } = {}) {
    if (!state.started) return;
    if (!MODE_LABEL[mode]) mode = "explore";

    const next = getTrack(mode);
    const old = state.currentTrack;

    if (old === next) {
      state.currentMode = mode;
      if (!state.muted && !document.hidden && next.paused) await safePlay(next);
      next.volume = desiredVolume(mode);
      return;
    }

    const token = ++state.fadeToken;
    const target = desiredVolume(mode);

    if (restart) {
      try { next.currentTime = 0; } catch (_) {}
    }
    next.volume = 0;
    state.currentTrack = next;
    state.currentMode = mode;

    if (!state.muted && !document.hidden) await safePlay(next);

    if (old) {
      const oldStart = old.volume;
      fadeElement(old, oldStart, 0, CROSSFADE_MS, token, () => {
        if (token !== state.fadeToken) return;
        old.pause();
        old.volume = 0;
        try { old.currentTime = 0; } catch (_) {}
      });
    }

    fadeElement(next, next.volume, target, CROSSFADE_MS, token, () => {
      if (token !== state.fadeToken) return;
      stopOtherTracks(next);
    });
  }

  async function setMuted(value) {
    state.muted = !!value;
    localStorage.setItem(MUTE_KEY, state.muted ? "1" : "0");

    if (state.master) ramp(state.master.gain, state.muted ? 0 : 0.72, 0.08);
    syncSoundButton();

    const track = state.currentTrack || getTrack(state.mode);
    if (state.muted) {
      ++state.fadeToken;
      state.tracks.forEach(audio => {
        audio.pause();
        audio.volume = 0;
      });
    } else if (state.started && !document.hidden) {
      state.currentTrack = track;
      state.currentMode = state.mode;
      await safePlay(track);
      const token = ++state.fadeToken;
      fadeElement(track, 0, desiredVolume(state.mode), 420, token);
    }
  }

  function setMode(mode, { force = false, restart = true } = {}) {
    if (!MODE_LABEL[mode]) mode = "explore";
    if (!force && state.mode === mode && state.currentMode === mode) return;
    state.mode = mode;
    syncSoundButton();
    if (state.started) launchTrack(mode, { restart });
  }

  function detectMode() {
    const room = (document.getElementById("roomName")?.textContent || "").trim();
    const overlay = document.getElementById("modalOverlay");
    const modal = document.getElementById("modalBody");
    const modalOpen = overlay?.classList.contains("show");

    // Paper Roll V2 must win over the generic modal/explore mode so the race
    // gets its own music as soon as the takeover UI appears.
    if (modalOpen && modal?.querySelector(".paper-roll-v2")) {
      return "roll";
    }
    // Also catch the brief legacy frame before V2 takes over.
    if (modalOpen && modal && /紙捲競速/.test(modal.querySelector("h2")?.textContent || "")) {
      return "roll";
    }

    if (modalOpen && modal?.querySelector(".poker-v2, .poker-v2-stage, .poker-table-v2, .poker-opponent-v2, #pokerButtons")) {
      return "poker";
    }

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
    const detected = detectMode();
    if (detected !== state.mode || detected !== state.currentMode) setMode(detected);
  }

  function scheduleModeSync() {
    if (state.syncQueued) return;
    state.syncQueued = true;
    requestAnimationFrame(syncModeFromUi);
  }

  async function ensureStarted() {
    const ctx = makeContext();
    if (ctx) {
      try {
        if (ctx.state === "suspended") await ctx.resume();
      } catch (_) {}
    }

    if (!state.started) {
      state.started = true;
      state.mode = detectMode();
      await launchTrack(state.mode, { restart: true });
    } else if (!state.muted && !document.hidden && state.currentTrack?.paused) {
      await safePlay(state.currentTrack);
      state.currentTrack.volume = desiredVolume(state.mode);
    }

    syncSoundButton();
    return true;
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
    preloadTracks();

    const unlock = () => ensureStarted();
    document.addEventListener("pointerdown", unlock, { once: true, capture: true });
    document.addEventListener("keydown", unlock, { once: true, capture: true });

    const btn = document.getElementById("soundBtn");
    if (btn) {
      btn.addEventListener("click", async () => {
        await ensureStarted();
        await setMuted(!state.muted);
      });
    }

    syncSoundButton();
    bindModeDetection();
  }

  document.addEventListener("visibilitychange", async () => {
    if (document.hidden) {
      ++state.fadeToken;
      state.tracks.forEach(audio => {
        audio.pause();
        audio.volume = 0;
      });
      if (state.ctx?.state === "running") state.ctx.suspend().catch(() => {});
      return;
    }

    if (state.ctx && state.started && !state.muted) {
      state.ctx.resume().catch(() => {});
    }
    if (state.started && !state.muted) {
      state.mode = detectMode();
      const track = getTrack(state.mode);
      state.currentTrack = track;
      state.currentMode = state.mode;
      await safePlay(track);
      const token = ++state.fadeToken;
      fadeElement(track, 0, desiredVolume(state.mode), 500, token);
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
    getMode: () => state.mode,
    bgmFiles: { ...BGM_FILES }
  };

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", bindUnlock, { once: true });
  else bindUnlock();
})();
