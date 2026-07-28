/**
 * @module sources/LottieSource
 * Samples a classic lottie-web (`renderer: "canvas"`) animation instance
 * each tick. This wrapper is part of the core library — no separate
 * install, no plugin registration. What you still need to install
 * yourself is `lottie-web` itself: that's the actual decoder for the
 * Lottie JSON format, a real ~260KB library with no way around shipping
 * it somewhere. This class only wraps whatever player instance you hand
 * it; favicon-motion never imports lottie-web directly, so nobody pays
 * for it unless they actually call `favicon.fromLottie(...)`.
 */

const DEFAULT_SIGNATURE_FPS = 30;

export class LottieSource {
  /**
   * @param {object} lottieAnimation - the object returned by
   *   `lottie.loadAnimation({ renderer: "canvas", ... })`
   * @param {object} [options]
   * @param {number} [options.signatureFps=30] - resolution used for duplicate-frame detection
   */
  constructor(lottieAnimation, options = {}) {
    if (!lottieAnimation || typeof lottieAnimation.play !== "function") {
      throw new TypeError(
        "favicon-motion: LottieSource requires a lottie-web animation instance " +
          '(the object returned by lottie.loadAnimation({ renderer: "canvas", ... }))'
      );
    }
    this._anim = lottieAnimation;
    this._signatureFps = options.signatureFps ?? DEFAULT_SIGNATURE_FPS;

    this.frameCount = Infinity;
    // Driven by the Lottie player's own internal clock rather than our
    // frame-index stepping — treat it like a procedural (time-driven) source.
    this.isProcedural = true;
  }

  /**
   * @returns {HTMLCanvasElement|null} the canvas lottie-web is rendering
   *   into, found via its own container element
   */
  _findCanvas() {
    const container = this._anim.wrapper ?? this._anim.container;
    return container ? container.querySelector("canvas") : null;
  }

  /**
   * Cheap cache key, bucketed by the animation's own current frame so a
   * paused/held frame still benefits from duplicate-frame skipping.
   * @returns {string}
   */
  getSignature() {
    const frame = this._anim.currentFrame ?? 0;
    const bucket = Math.round(frame * (this._signatureFps / (this._anim.frameRate || 30)));
    return `lottie:${bucket}`;
  }

  /**
   * @param {import("../rendering/Renderer.js").Renderer} renderer
   */
  render(renderer) {
    const canvas = this._findCanvas();
    if (!canvas) return; // not mounted/rendered yet — skip rather than draw blank
    renderer.drawImageSource(canvas);
  }

  /** Pause the underlying Lottie animation. Called automatically by the plugin. */
  pause() {
    this._anim.pause();
  }

  /** Resume the underlying Lottie animation. Called automatically by the plugin. */
  resume() {
    this._anim.play();
  }

  /**
   * Release the Lottie animation instance. Does NOT remove the container
   * element from the DOM — the caller created it and owns its lifecycle,
   * since it may be a real (visible) element rather than one this plugin
   * created for itself.
   */
  destroy() {
    this._anim.destroy();
    this._anim = null;
  }
}
