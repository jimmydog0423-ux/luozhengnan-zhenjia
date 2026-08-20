(() => {
  "use strict";

  if (window.__redSchoolMutationGuardInstalled) return;
  const NativeMutationObserver = window.MutationObserver;
  if (typeof NativeMutationObserver !== "function") return;

  window.__redSchoolMutationGuardInstalled = true;

  const MAX_CALLBACKS_PER_BURST = 48;
  const BURST_WINDOW_MS = 16;
  const COOLDOWN_MS = 64;
  let observerSerial = 0;

  class GuardedMutationObserver {
    constructor(callback) {
      if (typeof callback !== "function") {
        throw new TypeError("MutationObserver callback must be a function");
      }

      this.__guardId = ++observerSerial;
      this.__callback = callback;
      this.__burstStartedAt = 0;
      this.__burstCount = 0;
      this.__cooldownUntil = 0;
      this.__warned = false;

      this.__native = new NativeMutationObserver((records) => {
        const now = performance.now();

        if (now < this.__cooldownUntil) return;

        if (!this.__burstStartedAt || now - this.__burstStartedAt > BURST_WINDOW_MS) {
          this.__burstStartedAt = now;
          this.__burstCount = 0;
          this.__warned = false;
        }

        this.__burstCount += 1;

        if (this.__burstCount > MAX_CALLBACKS_PER_BURST) {
          this.__cooldownUntil = now + COOLDOWN_MS;
          this.__burstCount = 0;
          this.__burstStartedAt = now;

          if (!this.__warned) {
            this.__warned = true;
            console.warn(
              `[RedSchool] MutationObserver #${this.__guardId} was throttled to prevent a DOM feedback loop.`
            );
          }
          return;
        }

        callback(records, this);
      });
    }

    observe(target, options) {
      return this.__native.observe(target, options);
    }

    disconnect() {
      return this.__native.disconnect();
    }

    takeRecords() {
      return this.__native.takeRecords();
    }
  }

  Object.defineProperty(GuardedMutationObserver.prototype, Symbol.toStringTag, {
    configurable: true,
    value: "MutationObserver"
  });

  window.MutationObserver = GuardedMutationObserver;
})();
