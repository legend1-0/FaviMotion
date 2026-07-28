/**
 * @module rendering/Renderer
 * Owns the canvas, its 2D context, and everything about turning a "frame"
 * (whatever shape it comes in) into a favicon-ready data URL. No timing, no
 * animation state, no favicon-tag DOM manipulation — those live elsewhere.
 */

import { supportsOffscreenCanvas, isBrowser } from "../utils/env.js";
import { DEFAULT_CANVAS_SIZE, FAVICON_MIME } from "../utils/constants.js";

export class Renderer {
  /**
   * @param {object} [options]
   * @param {number} [options.size] - internal canvas size in pixels
   */
  constructor({ size = DEFAULT_CANVAS_SIZE } = {}) {
    this._size = size;
    this._canvas = this._createCanvas(size);
    this._ctx = this._canvas.getContext("2d", { willReadFrequently: true });
    // A second offscreen scratch canvas is used for compositing effects so
    // the main canvas is never left in a half-drawn state if an effect
    // callback throws.
    this._scratch = this._createCanvas(size);
    this._scratchCtx = this._scratch.getContext("2d", { willReadFrequently: true });
  }

  /**
   * @param {number} size
   * @returns {HTMLCanvasElement|OffscreenCanvas}
   */
  _createCanvas(size) {
    if (supportsOffscreenCanvas) {
      return new OffscreenCanvas(size, size);
    }
    if (isBrowser) {
      const canvas = document.createElement("canvas");
      canvas.width = size;
      canvas.height = size;
      return canvas;
    }
    throw new Error(
      "favicon-motion: no canvas implementation available in this environment"
    );
  }

  /** @returns {number} */
  get size() {
    return this._size;
  }

  /** Clear the main drawing surface. */
  clear() {
    this._ctx.clearRect(0, 0, this._size, this._size);
  }

  /** @returns {CanvasRenderingContext2D} the main drawing context */
  getContext() {
    return this._ctx;
  }

  /** @returns {CanvasRenderingContext2D} a scratch context for effect compositing */
  getScratchContext() {
    this._scratchCtx.clearRect(0, 0, this._size, this._size);
    return this._scratchCtx;
  }

  /** Copy the scratch canvas over the main canvas (used after effects run). */
  commitScratch() {
    this.clear();
    this._ctx.drawImage(this._scratch, 0, 0);
  }

  /**
   * Draw a drawable image-like source (HTMLImageElement, ImageBitmap,
   * HTMLCanvasElement, OffscreenCanvas) scaled to fill the canvas.
   * @param {CanvasImageSource} drawable
   */
  drawImageSource(drawable) {
    this.clear();
    this._ctx.drawImage(drawable, 0, 0, this._size, this._size);
  }

  /**
   * Draw ImageData onto the canvas at native resolution (top-left aligned,
   * then let the browser scale on export since favicons are tiny anyway).
   * @param {ImageData} imageData
   */
  drawImageData(imageData) {
    this.clear();
    if (imageData.width === this._size && imageData.height === this._size) {
      this._ctx.putImageData(imageData, 0, 0);
      return;
    }
    // Different dimensions: draw through an intermediate bitmap so it gets
    // scaled instead of clipped.
    this._scratchCtx.canvas.width = imageData.width;
    this._scratchCtx.canvas.height = imageData.height;
    this._scratchCtx.putImageData(imageData, 0, 0);
    this._ctx.drawImage(
      this._scratchCtx.canvas,
      0,
      0,
      imageData.width,
      imageData.height,
      0,
      0,
      this._size,
      this._size
    );
    // Restore scratch canvas dimensions for future effect use.
    this._scratchCtx.canvas.width = this._size;
    this._scratchCtx.canvas.height = this._size;
  }

  /**
   * Draw a sprite-sheet cell onto the canvas.
   * @param {CanvasImageSource} sheet
   * @param {{x:number,y:number,width:number,height:number}} cell
   */
  drawSpriteCell(sheet, cell) {
    this.clear();
    this._ctx.drawImage(
      sheet,
      cell.x,
      cell.y,
      cell.width,
      cell.height,
      0,
      0,
      this._size,
      this._size
    );
  }

  /**
   * Invoke a procedural drawing callback with the main context.
   * @param {(ctx: CanvasRenderingContext2D, frame: number, time: number) => void} callback
   * @param {number} frame
   * @param {number} time
   */
  drawProcedural(callback, frame, time) {
    this.clear();
    callback(this._ctx, frame, time);
  }

  /**
   * Export the current canvas contents as a data URL. Falls back to
   * `convertToBlob` + FileReader for OffscreenCanvas, which has no
   * synchronous `toDataURL`.
   * @param {string} [mime]
   * @returns {string|Promise<string>}
   */
  toDataURL(mime = FAVICON_MIME.PNG) {
    if (typeof this._canvas.toDataURL === "function") {
      return this._canvas.toDataURL(mime);
    }
    // OffscreenCanvas path: async, callers should handle the Promise.
    return this._canvas.convertToBlob({ type: mime }).then(
      (blob) =>
        new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result);
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        })
    );
  }

  /** Release canvas references. */
  destroy() {
    this._canvas = null;
    this._scratch = null;
    this._ctx = null;
    this._scratchCtx = null;
  }
}
