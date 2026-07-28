/**
 * @module core/Favicon
 * The single public entry point. Deliberately thin: every real capability
 * lives in a focused module (Renderer, Scheduler, AnimationEngine, sources,
 * effects, plugins, FaviconManager); this class just wires them together
 * behind a small, GSAP-flavored API and re-exposes their methods.
 */

import { EventEmitter } from "../utils/EventEmitter.js";
import { Renderer } from "../rendering/Renderer.js";
import { Scheduler } from "../scheduler/Scheduler.js";
import { AnimationEngine } from "../animation/AnimationEngine.js";
import { FrameCache } from "../cache/FrameCache.js";
import { EffectsPipeline } from "../effects/EffectsPipeline.js";
import { FaviconManager } from "../exports/FaviconManager.js";
import { PluginManager } from "../plugins/PluginManager.js";
import { FrameListSource } from "../sources/FrameListSource.js";
import { SpriteSheetSource } from "../sources/SpriteSheetSource.js";
import { ProceduralSource } from "../sources/ProceduralSource.js";
import { VideoSource } from "../sources/VideoSource.js";
import { LottieSource } from "../sources/LottieSource.js";
import { DotLottieSource } from "../sources/DotLottieSource.js";
import { assertValidSource } from "../sources/Source.js";
import { builtinEffects } from "../effects/index.js";
import { DEFAULT_CANVAS_SIZE, DEFAULT_FPS } from "../utils/constants.js";

export class Favicon extends EventEmitter {
  /**
   * @param {object} [options]
   * @param {number} [options.size] - internal render resolution in pixels
   * @param {number} [options.fps] - initial playback FPS
   */
  constructor({ size = DEFAULT_CANVAS_SIZE, fps = DEFAULT_FPS } = {}) {
    super();

    this._renderer = new Renderer({ size });
    this._frameCache = new FrameCache();
    this._effects = new EffectsPipeline();
    this._faviconManager = new FaviconManager();
    this._pluginManager = new PluginManager(this);
    this._customEffectDefs = new Map();

    this._scheduler = new Scheduler(null); // onTick wired up inside AnimationEngine
    this._scheduler.setFPS(fps);

    this._engine = new AnimationEngine({
      scheduler: this._scheduler,
      renderer: this._renderer,
      frameCache: this._frameCache,
      effects: this._effects,
      onCommit: (dataUrl) => this._commit(dataUrl),
      emit: (event, payload) => this.emit(event, payload),
    });

    this._destroyed = false;
    this.emit("ready");
  }

  // ---- Source constructors -------------------------------------------------

  /**
   * Play an arbitrary pre-built Source (mainly for plugin-provided sources).
   * @param {import("../sources/Source.js").Source} source
   * @returns {this}
   */
  play(source) {
    if (source) {
      this._engine.setSource(assertValidSource(source));
      this.emit("change");
    }
    this._engine.play();
    return this;
  }

  /**
   * @param {Array<CanvasImageSource|ImageData>} frames
   * @returns {this}
   */
  fromFrames(frames) {
    this._engine.setSource(new FrameListSource(frames));
    this.emit("change");
    return this;
  }

  /**
   * @param {import("../sources/SpriteSheetSource.js").SpriteSheetOptions} options
   * @returns {this}
   */
  fromSpriteSheet(options) {
    this._engine.setSource(new SpriteSheetSource(options));
    this.emit("change");
    return this;
  }

  /**
   * @param {(ctx: CanvasRenderingContext2D, frame: number, time: number) => void} callback
   * @returns {this}
   */
  animate(callback) {
    this._engine.setSource(new ProceduralSource(callback));
    this.emit("change");
    return this;
  }

  /**
   * Sample a video as the favicon. Needs nothing beyond the browser itself
   * — no separate install, this is core. Pass a URL (a hidden `<video>` is
   * created for you) or an existing `HTMLVideoElement` you already control.
   * `favicon.pause()`/`resume()`/`play()` automatically pause/resume the
   * underlying video; `favicon.destroy()` releases it.
   * @param {HTMLVideoElement|string} videoOrUrl
   * @param {object} [options]
   * @param {boolean} [options.loop=true]
   * @param {boolean} [options.muted=true] - most browsers require this for autoplay
   * @param {boolean} [options.autoplay=true]
   * @param {number} [options.signatureFps=30]
   * @returns {this}
   */
  fromVideo(videoOrUrl, options) {
    this._engine.setSource(new VideoSource(videoOrUrl, options));
    this.emit("change");
    return this;
  }

  /**
   * Sample a classic lottie-web animation (`renderer: "canvas"`) as the
   * favicon. You still need `npm install lottie-web` yourself — that's the
   * actual decoder for the format — but nothing on the favicon-motion side
   * beyond this one call.
   * @param {object} lottieAnimation - result of `lottie.loadAnimation({ renderer: "canvas", ... })`
   * @param {object} [options]
   * @param {number} [options.signatureFps=30]
   * @returns {this}
   */
  fromLottie(lottieAnimation, options) {
    this._engine.setSource(new LottieSource(lottieAnimation, options));
    this.emit("change");
    return this;
  }

  /**
   * Sample a `@lottiefiles/dotlottie-web` player as the favicon — for
   * `.lottie` files (the zipped dotLottie format, distinct from raw Lottie
   * `.json`; see the docs for which one your export tool actually produced).
   * You still need `npm install @lottiefiles/dotlottie-web` yourself.
   * @param {object} dotLottieInstance - a `new DotLottie({ canvas, src, ... })` instance
   * @param {object} [options]
   * @param {number} [options.signatureFps=30]
   * @returns {this}
   */
  fromDotLottie(dotLottieInstance, options) {
    this._engine.setSource(new DotLottieSource(dotLottieInstance, options));
    this.emit("change");
    return this;
  }

  /**
   * Instantiate and play a source registered by a plugin via
   * `api.registerSource(name, factory)`.
   * @param {string} name
   * @param {...*} args
   * @returns {this}
   */
  fromCustomSource(name, ...args) {
    const factory = this._pluginManager.getCustomSource(name);
    if (!factory) {
      throw new Error(`favicon-motion: no custom source registered under "${name}"`);
    }
    this._engine.setSource(assertValidSource(factory(...args)));
    this.emit("change");
    return this;
  }

  // ---- Playback control -----------------------------------------------------

  pause() {
    this._engine.pause();
    return this;
  }

  resume() {
    this._engine.resume();
    return this;
  }

  stop() {
    this._engine.stop();
    return this;
  }

  restart() {
    this._engine.restart();
    return this;
  }

  /** @param {number} frameIndex */
  seek(frameIndex) {
    this._engine.seek(frameIndex);
    return this;
  }

  reverse() {
    this._engine.reverse();
    return this;
  }

  /** @param {boolean} [shouldLoop] */
  loop(shouldLoop = true) {
    this._engine.setLoop(shouldLoop);
    return this;
  }

  /** @param {number} fps */
  setFPS(fps) {
    this._scheduler.setFPS(fps);
    return this;
  }

  /** @param {number} rate */
  setPlaybackRate(rate) {
    this._scheduler.setPlaybackRate(rate);
    return this;
  }

  /** @param {1|-1} direction */
  setDirection(direction) {
    this._engine.setDirection(direction);
    return this;
  }

  isPlaying() {
    return this._engine.isPlaying();
  }

  currentFrame() {
    return this._engine.currentFrame();
  }

  duration() {
    return this._engine.duration();
  }

  progress() {
    return this._engine.progress();
  }

  // ---- Effects ---------------------------------------------------------------

  /**
   * @param {string} name - one of the built-in effect names, or a name
   *   registered by a plugin via `api.registerEffect`
   * @param {object} [params]
   * @returns {this}
   */
  applyEffect(name, params = {}) {
    const fn = builtinEffects[name] ?? this._customEffectDefs.get(name);
    if (!fn) {
      throw new Error(`favicon-motion: unknown effect "${name}"`);
    }
    this._effects.add(name, fn, params);
    return this;
  }

  /** @param {string} name */
  removeEffect(name) {
    this._effects.remove(name);
    return this;
  }

  clearEffects() {
    this._effects.clearAll();
    return this;
  }

  /** Used internally by PluginManager's `api.registerEffect`. */
  _registerEffectDefinition(name, fn) {
    this._customEffectDefs.set(name, fn);
  }

  // ---- Favicon tag management -------------------------------------------------

  /** Restore the page's original favicon and stop overriding it. */
  restore() {
    this._engine.stop();
    this._faviconManager.restore();
    return this;
  }

  /** @returns {string|Promise<string>} the current canvas contents as a data URL */
  capture() {
    return this._renderer.toDataURL();
  }

  /** Alias of capture(), kept for discoverability. @returns {string|Promise<string>} */
  snapshot() {
    return this.capture();
  }

  // ---- Plugins -----------------------------------------------------------------

  /**
   * @param {object} plugin
   * @returns {this}
   */
  use(plugin) {
    this._pluginManager.use(plugin);
    return this;
  }

  // ---- Internal ------------------------------------------------------------------

  /**
   * @param {string|Promise<string>} dataUrl
   */
  _commit(dataUrl) {
    if (typeof dataUrl === "string") {
      this._faviconManager.update(dataUrl);
    } else if (dataUrl && typeof dataUrl.then === "function") {
      dataUrl.then((resolved) => this._faviconManager.update(resolved));
    }
  }

  /** Fully tear down: stop playback, restore favicon, release all resources. */
  destroy() {
    if (this._destroyed) return;
    this._destroyed = true;
    this.emit("destroy");
    this._pluginManager.destroyAll();
    this._engine.destroy();
    this._scheduler.destroy();
    this._faviconManager.destroy();
    this._frameCache.clear();
    this._effects.clearAll();
    this._renderer.destroy();
    this.removeAllListeners();
  }
}
