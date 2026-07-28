import { describe, it, expect, vi } from "vitest";
import { DotLottieSource } from "../src/sources/DotLottieSource.js";

/**
 * A plain object standing in for a `DotLottie` instance from
 * @lottiefiles/dotlottie-web. That package is a peer dependency this plugin
 * never imports directly, so a fake exercising just the surface
 * DotLottieSource touches (play/pause/destroy/canvas/currentFrame) is
 * enough — consistent with how the video and classic-Lottie plugins are
 * tested.
 */
function makeFakeDotLottie({ withCanvas = true } = {}) {
  return {
    canvas: withCanvas ? { tagName: "CANVAS" } : null,
    currentFrame: 0,
    play: vi.fn(),
    pause: vi.fn(),
    destroy: vi.fn(),
  };
}

describe("DotLottieSource", () => {
  it("throws a clear error when not given a DotLottie-shaped instance", () => {
    expect(() => new DotLottieSource(null)).toThrow(/DotLottie instance/);
    expect(() => new DotLottieSource({})).toThrow(/DotLottie instance/);
  });

  it("is procedural (time-driven by the WASM player's own render loop)", () => {
    const source = new DotLottieSource(makeFakeDotLottie());
    expect(source.isProcedural).toBe(true);
    expect(source.frameCount).toBe(Infinity);
  });

  it("render() draws the player's own canvas directly", () => {
    const anim = makeFakeDotLottie();
    const source = new DotLottieSource(anim);
    const renderer = { drawImageSource: vi.fn() };
    source.render(renderer);
    expect(renderer.drawImageSource).toHaveBeenCalledWith(anim.canvas);
  });

  it("render() skips drawing when the player has no canvas yet", () => {
    const anim = makeFakeDotLottie({ withCanvas: false });
    const source = new DotLottieSource(anim);
    const renderer = { drawImageSource: vi.fn() };
    source.render(renderer);
    expect(renderer.drawImageSource).not.toHaveBeenCalled();
  });

  it("getSignature changes as currentFrame advances", () => {
    const anim = makeFakeDotLottie();
    const source = new DotLottieSource(anim);
    anim.currentFrame = 0;
    const first = source.getSignature();
    anim.currentFrame = 12;
    const second = source.getSignature();
    expect(first).not.toBe(second);
  });

  it("pause()/resume() delegate to the underlying player", () => {
    const anim = makeFakeDotLottie();
    const source = new DotLottieSource(anim);
    source.pause();
    expect(anim.pause).toHaveBeenCalled();
    source.resume();
    expect(anim.play).toHaveBeenCalled();
  });

  it("destroy() calls the player's own destroy()", () => {
    const anim = makeFakeDotLottie();
    const source = new DotLottieSource(anim);
    source.destroy();
    expect(anim.destroy).toHaveBeenCalled();
  });
});
