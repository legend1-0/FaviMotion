import { describe, it, expect, vi } from "vitest";
import { SpriteSheetSource } from "../src/sources/SpriteSheetSource.js";

function makeFakeImage(width, height) {
  return { width, height };
}

describe("SpriteSheetSource", () => {
  it("computes columns/rows automatically from image dimensions", () => {
    const image = makeFakeImage(128, 64); // 4 cols x 2 rows at 32x32
    const source = new SpriteSheetSource({ image, frameWidth: 32, frameHeight: 32 });
    expect(source.frameCount).toBe(8);
  });

  it("respects explicit columns/rows over auto-computed values", () => {
    const image = makeFakeImage(128, 64);
    const source = new SpriteSheetSource({
      image,
      frameWidth: 32,
      frameHeight: 32,
      columns: 2,
      rows: 1,
    });
    expect(source.frameCount).toBe(2);
  });

  it("accounts for padding and margin when computing cell positions", () => {
    const image = makeFakeImage(100, 100);
    const source = new SpriteSheetSource({
      image,
      frameWidth: 20,
      frameHeight: 20,
      columns: 2,
      rows: 1,
      padding: 5,
      margin: 10,
    });
    const renderer = { drawSpriteCell: vi.fn(), clear: vi.fn() };
    source.render(renderer, 1); // second cell
    const [, cell] = renderer.drawSpriteCell.mock.calls[0];
    expect(cell).toEqual({ x: 10 + 1 * (20 + 5), y: 10, width: 20, height: 20 });
  });

  it("honors a custom frame order", () => {
    const image = makeFakeImage(64, 32);
    const source = new SpriteSheetSource({
      image,
      frameWidth: 32,
      frameHeight: 32,
      order: [1, 0, 1, 0],
    });
    expect(source.frameCount).toBe(4);
    expect(source.getSignature(0)).toBe("sprite:1");
    expect(source.getSignature(1)).toBe("sprite:0");
  });

  it("throws a clear error when required options are missing", () => {
    expect(() => new SpriteSheetSource({})).toThrow(/frameWidth/);
  });
});
