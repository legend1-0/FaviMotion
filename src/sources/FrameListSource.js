/**
 * @module sources/FrameListSource
 * Wraps a plain array of frames — HTMLImageElement[], ImageBitmap[],
 * HTMLCanvasElement[]/OffscreenCanvas[], or ImageData[] — into the Source
 * contract. Mixed arrays are supported since each frame is dispatched by its
 * own type at draw time.
 */

export class FrameListSource {
  /**
   * @param {Array<CanvasImageSource|ImageData>} frames
   */
  constructor(frames) {
    if (!Array.isArray(frames) || frames.length === 0) {
      throw new TypeError("favicon-motion: fromFrames() requires a non-empty array");
    }
    this._frames = frames;
    this.frameCount = frames.length;
    this.isProcedural = false;
  }

  /**
   * @param {number} index
   * @returns {string}
   */
  getSignature(index) {
    return `frame:${index}`;
  }

  /**
   * @param {import("../rendering/Renderer.js").Renderer} renderer
   * @param {number} index
   */
  render(renderer, index) {
    const frame = this._frames[index];
    if (frame instanceof ImageData) {
      renderer.drawImageData(frame);
    } else {
      renderer.drawImageSource(frame);
    }
  }

  destroy() {
    this._frames = null;
  }
}
