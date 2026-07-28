/**
 * jsdom does not implement the Canvas 2D rendering API (that normally comes
 * from the native `canvas` npm package, which requires system build tools we
 * don't want as a hard test dependency). This installs a minimal in-memory
 * mock of the subset of CanvasRenderingContext2D that favicon-motion uses, so
 * the full test suite runs anywhere Node + jsdom run, with zero native deps.
 */
import { vi } from "vitest";

function createMockContext(canvas) {
  const size = () => canvas.width * canvas.height * 4;
  return {
    canvas,
    globalCompositeOperation: "source-over",
    fillStyle: "#000000",
    shadowColor: "transparent",
    shadowBlur: 0,
    filter: "none",
    clearRect: vi.fn(),
    fillRect: vi.fn(),
    drawImage: vi.fn(),
    save: vi.fn(),
    restore: vi.fn(),
    translate: vi.fn(),
    scale: vi.fn(),
    rotate: vi.fn(),
    putImageData: vi.fn(),
    getImageData: vi.fn(() => ({
      width: canvas.width,
      height: canvas.height,
      data: new Uint8ClampedArray(size()),
    })),
  };
}

if (typeof globalThis.ImageData === "undefined") {
  globalThis.ImageData = class ImageData {
    constructor(dataOrWidth, widthOrHeight, height) {
      if (dataOrWidth instanceof Uint8ClampedArray) {
        this.data = dataOrWidth;
        this.width = widthOrHeight;
        this.height = height;
      } else {
        this.width = dataOrWidth;
        this.height = widthOrHeight;
        this.data = new Uint8ClampedArray(this.width * this.height * 4);
      }
    }
  };
}

if (typeof HTMLCanvasElement !== "undefined") {
  HTMLCanvasElement.prototype.getContext = function (type) {
    if (type !== "2d") return null;
    if (!this._mockContext) this._mockContext = createMockContext(this);
    return this._mockContext;
  };

  HTMLCanvasElement.prototype.toDataURL = function (mime = "image/png") {
    return `data:${mime};base64,mock-${this.width}x${this.height}`;
  };
}
