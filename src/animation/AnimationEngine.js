/**
 * @module animation/AnimationEngine
 * The playback state machine. Holds current frame/time/direction/loop state
 * for a single active Source and advances it on every scheduler tick. Pure
 * state + math — drawing is delegated to the Renderer, timing to the
 * Scheduler, and duplicate-frame avoidance to the FrameCache.
 */

import { DIRECTION } from "../utils/constants.js";
import { wrapIndex, clamp } from "../utils/math.js";

export class AnimationEngine {
  /**
   * @param {object} deps
   * @param {import("../scheduler/Scheduler.js").Scheduler} deps.scheduler
   * @param {import("../rendering/Renderer.js").Renderer} deps.renderer
   * @param {import("../cache/FrameCache.js").FrameCache} deps.frameCache
   * @param {import("../effects/EffectsPipeline.js").EffectsPipeline} deps.effects
   * @param {(dataUrl: string|Promise<string>) => void} deps.onCommit
   * @param {(event: string, payload?: *) => void} deps.emit
   */
  constructor({ scheduler, renderer, frameCache, effects, onCommit, emit }) {
    this._scheduler = scheduler;
    this._renderer = renderer;
    this._frameCache = frameCache;
    this._effects = effects;
    this._onCommit = onCommit;
    this._emit = emit;

    /** @type {import("../sources/Source.js").Source|null} */
    this._source = null;
    this._currentFrame = 0;
    this._elapsedTime = 0;
    this._direction = DIRECTION.FORWARD;
    this._loop = true;
    this._playing = false;
    this._secondsPerFrame = null; // null => driven by scheduler FPS, not per-source duration

    this._scheduler._onTick = this._tick.bind(this);
  }

  /**
   * @param {import("../sources/Source.js").Source} source
   */
  setSource(source) {
    this._source?.destroy?.();
    this._source = source;
    this._currentFrame = 0;
    this._elapsedTime = 0;
    this._frameCache.clear();
  }

  /** @param {boolean} shouldLoop */
  setLoop(shouldLoop) {
    this._loop = shouldLoop;
  }

  /** @returns {boolean} */
  getLoop() {
    return this._loop;
  }

  /** @param {1|-1} direction */
  setDirection(direction) {
    this._direction = direction === -1 ? DIRECTION.REVERSE : DIRECTION.FORWARD;
  }

  /** @returns {1|-1} */
  getDirection() {
    return this._direction;
  }

  reverse() {
    this.setDirection(this._direction === DIRECTION.FORWARD ? -1 : 1);
  }

  play() {
    if (!this._source) return;
    this._playing = true;
    this._scheduler.start();
    this._source.resume?.();
    this._emit("play");
  }

  pause() {
    this._playing = false;
    this._scheduler.stop();
    this._source?.pause?.();
    this._emit("pause");
  }

  resume() {
    if (!this._source) return;
    this._playing = true;
    this._scheduler.start();
    this._source.resume?.();
    this._emit("resume");
  }

  stop() {
    this._playing = false;
    this._scheduler.stop();
    this._scheduler.resetClock();
    this._currentFrame = 0;
    this._elapsedTime = 0;
    this._source?.pause?.();
    this._emit("stop");
  }

  restart() {
    this.stop();
    this.play();
  }

  /**
   * @param {number} frameIndex
   */
  seek(frameIndex) {
    if (!this._source) return;
    if (this._source.isProcedural) {
      this._elapsedTime = frameIndex;
    } else {
      this._currentFrame = wrapIndex(Math.round(frameIndex), this._source.frameCount);
    }
    this._renderCurrentFrame(true);
  }

  /** @returns {boolean} */
  isPlaying() {
    return this._playing;
  }

  /** @returns {number} */
  currentFrame() {
    return this._currentFrame;
  }

  /** @returns {number} total frames, or Infinity for procedural sources */
  duration() {
    return this._source ? this._source.frameCount : 0;
  }

  /** @returns {number} 0..1, always 0 for open-ended procedural sources */
  progress() {
    if (!this._source || !Number.isFinite(this._source.frameCount)) return 0;
    return clamp(this._currentFrame / Math.max(1, this._source.frameCount - 1), 0, 1);
  }

  /**
   * Called by the Scheduler once per scheduled tick.
   * @param {number} deltaSeconds
   * @param {number} elapsedSeconds
   */
  _tick(deltaSeconds, elapsedSeconds) {
    if (!this._source || !this._playing) return;
    this._elapsedTime = elapsedSeconds;

    if (!this._source.isProcedural) {
      const nextFrame = this._currentFrame + this._direction;
      const total = this._source.frameCount;

      if (nextFrame >= total || nextFrame < 0) {
        if (this._loop) {
          this._currentFrame = wrapIndex(nextFrame, total);
          this._emit("loop");
        } else {
          this._currentFrame = clamp(nextFrame, 0, total - 1);
          this._playing = false;
          this._scheduler.stop();
          this._emit("complete");
          this._renderCurrentFrame(false);
          return;
        }
      } else {
        this._currentFrame = nextFrame;
      }
    }

    this._renderCurrentFrame(false);
  }

  /**
   * Render (or skip, if unchanged) the current frame and commit it.
   * @param {boolean} force - bypass duplicate-frame skipping (used by seek())
   */
  _renderCurrentFrame(force) {
    const source = this._source;
    if (!source) return;

    const signature = source.getSignature(this._currentFrame, this._elapsedTime);

    if (!force && this._frameCache.isDuplicateOfLast(signature)) {
      // Identical to what's already committed — skip render + export entirely.
      return;
    }

    source.render(this._renderer, this._currentFrame, this._elapsedTime);
    if (!this._effects.isEmpty()) {
      this._effects.apply(this._renderer, this._elapsedTime);
    }

    let dataUrl = this._frameCache.get(signature);
    if (dataUrl === undefined) {
      dataUrl = this._renderer.toDataURL();
      if (typeof dataUrl === "string") {
        this._frameCache.set(signature, dataUrl);
      }
      // Promise case (OffscreenCanvas async export) is intentionally not
      // cached by this signature check to avoid caching a pending promise;
      // the resolved value is cheap enough to regenerate if repeated.
    }

    this._frameCache.markCommitted(signature);
    this._onCommit(dataUrl);
    this._emit("frame", { frame: this._currentFrame, time: this._elapsedTime });
  }

  destroy() {
    this.stop();
    this._source?.destroy?.();
    this._source = null;
  }
}
