/**
 * @module sources/DotLottieSource
 * Samples a `@lottiefiles/dotlottie-web` player each tick — for the
 * **dotLottie** format (`.lottie` files: a zipped container bundling the
 * animation JSON plus its assets, distinct from a raw exported Lottie
 * `.json`). Most current export tools (LottieFiles, recent After Effects
 * plugins) default to `.lottie` now, so this is its own source class
 * rather than a variant of the classic Lottie one — the two formats need
 * different player libraries entirely. This wrapper is part of the core
 * library; `@lottiefiles/dotlottie-web` itself (a WASM-based player, the
 * actual decoder) is still yours to install — see `favicon.fromDotLottie`.
 * Unlike classic lottie-web (which renders into a container div and hides
 * its canvas inside), `DotLottie` renders directly onto a canvas you give
 * it, exposed back via its own `.canvas` getter — sampling it each tick is
 * even more direct than the video/Lottie-JSON sources.
 */

const DEFAULT_SIGNATURE_FPS = 30;

export class DotLottieSource {
  /**
   * @param {object} dotLottieInstance - a `new DotLottie({ canvas, src, ... })` instance
   * @param {object} [options]
   * @param {number} [options.signatureFps=30] - resolution used for duplicate-frame detection
   */
  constructor(dotLottieInstance, options = {}) {
    if (!dotLottieInstance || typeof dotLottieInstance.play !== "function") {
      throw new TypeError(
        "favicon-motion: DotLottieSource requires a DotLottie instance " +
          '(from `new DotLottie({ canvas, src, ... })` in @lottiefiles/dotlottie-web)'
      );
    }
    this._anim = dotLottieInstance;
    this._signatureFps = options.signatureFps ?? DEFAULT_SIGNATURE_FPS;

    this.frameCount = Infinity;
    // Driven by the WASM player's own render loop, not our frame-index
    // stepping — treat it like a procedural (time-driven) source.
    this.isProcedural = true;
  }

  /**
   * Cheap cache key, bucketed by the player's own current frame.
   * @returns {string}
   */
  getSignature() {
    const frame = this._anim.currentFrame ?? 0;
    return `dotlottie:${Math.round(frame * (this._signatureFps / 30))}`;
  }

  /**
   * @param {import("../rendering/Renderer.js").Renderer} renderer
   */
  render(renderer) {
    const canvas = this._anim.canvas;
    if (!canvas) return; // not initialized/loaded yet — skip rather than draw blank
    renderer.drawImageSource(canvas);
  }

  /** Pause the underlying player. Called automatically by the plugin. */
  pause() {
    this._anim.pause();
  }

  /** Resume the underlying player. Called automatically by the plugin. */
  resume() {
    this._anim.play();
  }

  /**
   * Release the DotLottie instance. Does not remove or resize the canvas
   * it was rendering into — the caller created it and owns its lifecycle.
   */
  destroy() {
    this._anim.destroy();
    this._anim = null;
  }
}
