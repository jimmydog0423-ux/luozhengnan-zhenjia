(() => {
  "use strict";

  const RATE = 0.965;
  const registry = window.__redSchoolAudioRegistry || (window.__redSchoolAudioRegistry = []);

  function tune() {
    for (const audio of registry) {
      const src = String(audio?.currentSrc || audio?.src || "");
      if (!/\/apt\.mp3(?:$|\?)/i.test(src)) continue;
      try {
        audio.preservesPitch = true;
        audio.defaultPlaybackRate = RATE;
        if (Math.abs(audio.playbackRate - RATE) > .001) audio.playbackRate = RATE;
      } catch (_) {}
    }
  }

  const body = document.getElementById("modalBody");
  if (body) new MutationObserver(tune).observe(body, { childList:true, subtree:true, attributes:true, attributeFilter:["data-playing"] });
  document.addEventListener("visibilitychange", () => { if (!document.hidden) setTimeout(tune, 30); });
  setInterval(tune, 350);
  tune();
})();
