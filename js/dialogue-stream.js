(() => {
  "use strict";

  let active = null;
  let scanScheduled = false;
  let serial = 0;

  const NORMAL_DELAY = 32;
  const FAST_DELAY = 23;
  const PUNCTUATION_DELAY = 115;
  const LONG_PUNCTUATION_DELAY = 180;

  function getDelay(ch, index) {
    if (/[。！？!?]/.test(ch)) return LONG_PUNCTUATION_DELAY;
    if (/[，、；：,.…]/.test(ch)) return PUNCTUATION_DELAY;
    return index % 5 === 0 ? NORMAL_DELAY : FAST_DELAY;
  }

  function stopActive() {
    if (!active) return;
    clearTimeout(active.timer);
    active.cancelled = true;
    active.el?.classList.remove("is-streaming");
    active = null;
  }

  function finishActive(playSound = false) {
    if (!active) return false;
    const current = active;
    clearTimeout(current.timer);
    current.cancelled = true;
    current.node.data = current.full;
    current.el.classList.remove("is-streaming");
    current.el.classList.add("stream-complete");
    active = null;
    if (playSound) window.GameAudio?.playAdvance?.();
    return true;
  }

  function beginStream(el) {
    if (!el || el.dataset.streamReady === "1") return;
    const full = (el.textContent || "").trim();
    if (!full) return;

    stopActive();
    const id = ++serial;
    const chars = Array.from(full);
    const speaker = el.closest(".dialogue-layout")?.querySelector(".dialogue-who")?.textContent?.trim() || "";
    const node = document.createTextNode("");

    el.dataset.streamReady = "1";
    el.dataset.streamFull = full;
    el.setAttribute("aria-label", full);
    el.replaceChildren(node);
    el.classList.remove("stream-complete");
    el.classList.add("is-streaming");

    const current = {
      id,
      el,
      node,
      full,
      chars,
      speaker,
      index: 0,
      timer: null,
      cancelled: false
    };
    active = current;

    window.GameAudio?.ensureStarted?.();

    const step = () => {
      if (current.cancelled || active !== current || !document.contains(el)) return;
      if (current.index >= chars.length) {
        el.classList.remove("is-streaming");
        el.classList.add("stream-complete");
        active = null;
        return;
      }

      const ch = chars[current.index++];
      current.node.data += ch;

      if (!/[\s，、。！？!?；：,.…]/.test(ch) && current.index % 2 === 0) {
        window.GameAudio?.playType?.(speaker, ch);
      }

      current.timer = setTimeout(step, getDelay(ch, current.index));
    };

    current.timer = setTimeout(step, 90);
  }

  function scan() {
    scanScheduled = false;
    if (active && !document.contains(active.el)) stopActive();
    const text = document.querySelector("#modalBody .dialogue-text:not([data-stream-ready='1'])");
    if (text) beginStream(text);
  }

  function scheduleScan() {
    if (scanScheduled) return;
    scanScheduled = true;
    requestAnimationFrame(scan);
  }

  // Capture before game.js onclick. First press completes the current sentence;
  // the next press advances to the next dialogue line.
  document.addEventListener("click", event => {
    const next = event.target?.closest?.("#dialogueNext");
    if (!next) return;

    if (active && document.contains(active.el)) {
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
      finishActive(true);
      return;
    }

    window.GameAudio?.playAdvance?.();
  }, true);

  function boot() {
    const root = document.getElementById("modalBody");
    if (!root) return;

    scheduleScan();
    new MutationObserver(scheduleScan).observe(root, {
      childList: true,
      subtree: true
    });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot, { once: true });
  else boot();
})();
