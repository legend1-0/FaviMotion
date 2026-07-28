import { describe, it, expect, vi } from "vitest";
import { LottieSource } from "../src/sources/LottieSource.js";

/**
 * A plain object standing in for a lottie-web AnimationItem (the value
 * returned by lottie.loadAnimation({ renderer: "canvas", ... })). We don't
 * pull in the real lottie-web package for unit tests — it's a peer
 * dependency the plugin never imports directly — so a fake exercising just
 * the surface LottieSource touches is enough, consistent with how the
 * video plugin's tests use a fake <video> element.
 */
function makeFakeLottieAnimation({ withCanvas = true } = {}) {
  const canvas = { tagName: "CANVAS" };
  const wrapper = {
    querySelector: vi.fn((selector) => (selector === "canvas" && withCanvas ? canvas : null)),
  };
  return {
    wrapper,
    currentFrame: 0,
    frameRate: 30,
    play: vi.fn(),
    pause: vi.fn(),
    destroy: vi.fn(),
    _canvas: canvas,
  };
}

describe("LottieSource", () => {
  it("throws a clear error when not given a lottie-web-shaped instance", () => {
    expect(() => new LottieSource(null)).toThrow(/lottie-web animation instance/);
    expect(() => new LottieSource({})).toThrow(/lottie-web animation instance/);
  });

  it("is procedural (time-driven by the Lottie player's own clock)", () => {
    const source = new LottieSource(makeFakeLottieAnimation());
    expect(source.isProcedural).toBe(true);
    expect(source.frameCount).toBe(Infinity);
  });

  it("render() draws the player's own canvas once it exists", () => {
    const anim = makeFakeLottieAnimation({ withCanvas: true });
    const source = new LottieSource(anim);
    const renderer = { drawImageSource: vi.fn() };
    source.render(renderer);
    expect(renderer.drawImageSource).toHaveBeenCalledWith(anim._canvas);
  });

  it("render() skips drawing when the player hasn't produced a canvas yet", () => {
    const anim = makeFakeLottieAnimation({ withCanvas: false });
    const source = new LottieSource(anim);
    const renderer = { drawImageSource: vi.fn() };
    source.render(renderer);
    expect(renderer.drawImageSource).not.toHaveBeenCalled();
  });

  it("getSignature changes as currentFrame advances", () => {
    const anim = makeFakeLottieAnimation();
    const source = new LottieSource(anim);
    anim.currentFrame = 0;
    const first = source.getSignature();
    anim.currentFrame = 10;
    const second = source.getSignature();
    expect(first).not.toBe(second);
  });

  it("pause()/resume() delegate to the underlying animation", () => {
    const anim = makeFakeLottieAnimation();
    const source = new LottieSource(anim);
    source.pause();
    expect(anim.pause).toHaveBeenCalled();
    source.resume();
    expect(anim.play).toHaveBeenCalled();
  });

  it("destroy() calls the animation's own destroy()", () => {
    const anim = makeFakeLottieAnimation();
    const source = new LottieSource(anim);
    source.destroy();
    expect(anim.destroy).toHaveBeenCalled();
  });
});
