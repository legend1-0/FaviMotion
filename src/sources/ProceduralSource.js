/**
 * @module sources/ProceduralSource
 * Wraps a user-supplied `(ctx, frame, time) => void` drawing callback.
 * Procedural sources are open-ended (no fixed frameCount) and are, by
 * definition, never frame-cached by index — instead they're keyed by a
 * quantized time bucket so a still/paused procedural animation still
 * benefits from duplicate-frame skipping.
 */

const TIME_QUANTUM_MS = 33; // roughly one frame at 30fps; good enough for a cache key

export class ProceduralSource {
  /**
   * @param {(ctx: CanvasRenderingContext2D, frame: number, time: number) => void} callback
   */
  constructor(callback) {
    if (typeof callback !== "function") {
      throw new TypeError("favicon-motion: animate() requires a callback function");
    }
    this._callback = callback;
    this.frameCount = Infinity;
    this.isProcedural = true;
  }

  /**
   * @param {number} index
   * @param {number} [time]
   * @returns {string}
   */
  getSignature(index, time = 0) {
    const bucket = Math.floor((time * 1000) / TIME_QUANTUM_MS);
    return `proc:${bucket}`;
  }

  /**
   * @param {import("../rendering/Renderer.js").Renderer} renderer
   * @param {number} index
   * @param {number} time
   */
  render(renderer, index, time) {
    renderer.drawProcedural(this._callback, index, time);
  }

  destroy() {
    this._callback = null;
  }
}
