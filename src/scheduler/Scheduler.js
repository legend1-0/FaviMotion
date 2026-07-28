/**
 * @module scheduler/Scheduler
 * Owns *when* a frame should render — never *how*. The rendering engine and
 * animation engine both consume ticks from this class but it has no
 * knowledge of canvases, images, or effects. Keeping timing isolated here
 * means playback rate, FPS changes, and tab-visibility throttling are all
 * solved once instead of re-implemented at every call site.
 */

import { requestFrame, cancelFrame, isTabVisible, isBrowser } from "../utils/env.js";
import {
  DEFAULT_FPS,
  DEFAULT_PLAYBACK_RATE,
  MS_PER_SECOND,
  HIDDEN_TAB_THROTTLE_DELAY,
  HIDDEN_TAB_FPS,
} from "../utils/constants.js";

export class Scheduler {
  /**
   * @param {(deltaSeconds: number, elapsedSeconds: number) => void} onTick
   *   Called once per scheduled tick with the (rate-adjusted) delta time.
   */
  constructor(onTick) {
    this._onTick = onTick;
    this._fps = DEFAULT_FPS;
    this._playbackRate = DEFAULT_PLAYBACK_RATE;
    this._frameIntervalMs = MS_PER_SECOND / this._fps;

    this._running = false;
    this._rafHandle = null;
    this._lastTimestamp = null;
    this._accumulatorMs = 0;
    this._elapsedSeconds = 0;

    this._hiddenSince = null;
    this._boundLoop = this._loop.bind(this);
    this._boundVisibilityChange = this._handleVisibilityChange.bind(this);

    if (isBrowser) {
      document.addEventListener("visibilitychange", this._boundVisibilityChange);
    }
  }

  /** @param {number} fps */
  setFPS(fps) {
    this._fps = Math.max(1, fps);
    this._frameIntervalMs = MS_PER_SECOND / this._fps;
  }

  /** @returns {number} */
  getFPS() {
    return this._fps;
  }

  /** @param {number} rate */
  setPlaybackRate(rate) {
    this._playbackRate = Number.isFinite(rate) && rate !== 0 ? rate : 1;
  }

  /** @returns {number} */
  getPlaybackRate() {
    return this._playbackRate;
  }

  /** Start the tick loop (idempotent). */
  start() {
    if (this._running) return;
    this._running = true;
    this._lastTimestamp = null;
    this._accumulatorMs = 0;
    this._rafHandle = requestFrame(this._boundLoop);
  }

  /** Stop the tick loop (idempotent). */
  stop() {
    this._running = false;
    if (this._rafHandle !== null) {
      cancelFrame(this._rafHandle);
      this._rafHandle = null;
    }
  }

  /** @returns {boolean} */
  isRunning() {
    return this._running;
  }

  /** Reset elapsed-time bookkeeping (used by restart/seek). */
  resetClock() {
    this._elapsedSeconds = 0;
    this._accumulatorMs = 0;
    this._lastTimestamp = null;
  }

  /**
   * Effective frame interval, accounting for the hidden-tab throttle so
   * background tabs don't burn CPU animating a favicon nobody can see.
   * @returns {number} milliseconds per frame
   */
  _effectiveIntervalMs() {
    if (this._hiddenSince !== null) {
      const hiddenDuration = performance.now() - this._hiddenSince;
      if (hiddenDuration > HIDDEN_TAB_THROTTLE_DELAY) {
        return MS_PER_SECOND / HIDDEN_TAB_FPS;
      }
    }
    return this._frameIntervalMs;
  }

  /**
   * @param {number} timestamp - from requestAnimationFrame
   */
  _loop(timestamp) {
    if (!this._running) return;

    if (this._lastTimestamp === null) {
      this._lastTimestamp = timestamp;
    }
    const rawDeltaMs = timestamp - this._lastTimestamp;
    this._lastTimestamp = timestamp;

    // Guard against huge deltas (tab was frozen/backgrounded and just woke up)
    // so a single stall doesn't cause a giant jump/skip in the animation.
    const safeDeltaMs = Math.min(rawDeltaMs, this._frameIntervalMs * 8);
    this._accumulatorMs += safeDeltaMs * this._playbackRate;

    const interval = this._effectiveIntervalMs();
    // Frame-skipping: if more time has passed than one interval, only emit
    // as many ticks as necessary and drop the rest rather than catching up
    // frame-by-frame (which would visually "fast forward").
    let ticked = false;
    while (this._accumulatorMs >= interval) {
      this._accumulatorMs -= interval;
      ticked = true;
    }

    if (ticked) {
      const deltaSeconds = interval / MS_PER_SECOND;
      this._elapsedSeconds += deltaSeconds;
      this._onTick(deltaSeconds, this._elapsedSeconds);
    }

    this._rafHandle = requestFrame(this._boundLoop);
  }

  _handleVisibilityChange() {
    this._hiddenSince = isTabVisible() ? null : performance.now();
  }

  /** Release listeners. Call once, from Favicon#destroy(). */
  destroy() {
    this.stop();
    if (isBrowser) {
      document.removeEventListener("visibilitychange", this._boundVisibilityChange);
    }
  }
}
