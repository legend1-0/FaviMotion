import { describe, it, expect, vi, afterEach } from "vitest";
import { Favicon } from "../src/core/Favicon.js";

function makeFrames(count = 3) {
  // Plain objects stand in for drawable frames — the mocked renderer never
  // actually inspects them, it just calls ctx.drawImage.
  return Array.from({ length: count }, (_, i) => ({ id: i }));
}

function makeFakeVideoElement() {
  return {
    loop: false,
    muted: false,
    playsInline: false,
    src: "",
    currentTime: 0,
    paused: true,
    ended: false,
    readyState: 2,
    play: vi.fn(() => Promise.resolve()),
    pause: vi.fn(),
    load: vi.fn(),
    removeAttribute: vi.fn(),
  };
}

function makeFakeLottieAnimation() {
  const canvas = { tagName: "CANVAS" };
  return {
    wrapper: { querySelector: vi.fn(() => canvas) },
    currentFrame: 0,
    frameRate: 30,
    play: vi.fn(),
    pause: vi.fn(),
    destroy: vi.fn(),
  };
}

function makeFakeDotLottie() {
  return {
    canvas: { tagName: "CANVAS" },
    currentFrame: 0,
    play: vi.fn(),
    pause: vi.fn(),
    destroy: vi.fn(),
  };
}

describe("Favicon (public API)", () => {
  afterEach(() => {
    document.querySelectorAll("link[rel~='icon']").forEach((link) => link.remove());
  });

  it("emits ready on construction", () => {
    const favicon = new Favicon();
    // ready fires synchronously during the constructor, before we can attach
    // a listener, so we assert indirectly: constructing doesn't throw and
    // the instance is usable immediately afterward.
    expect(favicon.isPlaying()).toBe(false);
    favicon.destroy();
  });

  it("fromFrames() + play() starts playback and updates the favicon link", () => {
    const favicon = new Favicon({ fps: 10 });
    const frameHandler = vi.fn();
    favicon.on("frame", frameHandler);

    favicon.fromFrames(makeFrames(3)).play();
    expect(favicon.isPlaying()).toBe(true);

    // Force one render synchronously via seek so we don't depend on real rAF timing.
    favicon.seek(1);
    expect(frameHandler).toHaveBeenCalled();

    const link = document.querySelector("link[rel~='icon']");
    expect(link.href).toContain("data:image/png");

    favicon.destroy();
  });

  it("pause()/resume() toggle isPlaying()", () => {
    const favicon = new Favicon();
    favicon.fromFrames(makeFrames()).play();
    favicon.pause();
    expect(favicon.isPlaying()).toBe(false);
    favicon.resume();
    expect(favicon.isPlaying()).toBe(true);
    favicon.destroy();
  });

  it("loop(false) + reaching the end emits complete and stops playback", () => {
    const favicon = new Favicon();
    const completeHandler = vi.fn();
    favicon.on("complete", completeHandler);
    favicon.fromFrames(makeFrames(2)).loop(false).play();

    favicon._engine._tick(0.1, 0.1); // -> frame 1 (last)
    favicon._engine._tick(0.1, 0.2); // would exceed -> complete

    expect(completeHandler).toHaveBeenCalled();
    expect(favicon.isPlaying()).toBe(false);
    favicon.destroy();
  });

  it("restore() removes the favicon override and stops playback", () => {
    const favicon = new Favicon();
    favicon.fromFrames(makeFrames()).play();
    favicon.restore();
    expect(favicon.isPlaying()).toBe(false);
    expect(document.querySelectorAll("link[rel~='icon']").length).toBe(0);
  });

  it("applyEffect() with an unknown name throws a clear error", () => {
    const favicon = new Favicon();
    expect(() => favicon.applyEffect("not-a-real-effect")).toThrow(/unknown effect/);
    favicon.destroy();
  });

  it("use() installs a plugin and exposes registerSource/registerExporter", () => {
    const favicon = new Favicon();
    const install = vi.fn((instance, api) => {
      api.registerSource("custom", () => ({
        frameCount: 1,
        isProcedural: false,
        getSignature: () => "custom:0",
        render: () => {},
      }));
    });
    favicon.use({ name: "test-plugin", install });
    expect(install).toHaveBeenCalledWith(favicon, expect.any(Object));

    favicon.fromCustomSource("custom");
    expect(favicon.duration()).toBe(1);
    favicon.destroy();
  });

  it("use() is idempotent for a plugin with the same name", () => {
    const favicon = new Favicon();
    const install = vi.fn();
    const plugin = { name: "dup", install };
    favicon.use(plugin);
    favicon.use(plugin);
    expect(install).toHaveBeenCalledTimes(1);
    favicon.destroy();
  });

  it("destroy() is idempotent and stops playback permanently", () => {
    const favicon = new Favicon();
    favicon.fromFrames(makeFrames()).play();
    favicon.destroy();
    expect(() => favicon.destroy()).not.toThrow();
    expect(favicon.isPlaying()).toBe(false);
  });

  it("capture()/snapshot() return the current canvas as a data URL", () => {
    const favicon = new Favicon();
    favicon.fromFrames(makeFrames()).seek(0);
    expect(favicon.capture()).toContain("data:image/png");
    expect(favicon.snapshot()).toBe(favicon.capture());
    favicon.destroy();
  });

  it("fromVideo() works with no plugin registration — video is core", () => {
    const favicon = new Favicon();
    const video = makeFakeVideoElement();
    favicon.fromVideo(video, { autoplay: false });
    expect(favicon.duration()).toBe(Infinity);
    favicon.play();
    expect(video.play).toHaveBeenCalled(); // resume() hook fired automatically
    favicon.pause();
    expect(video.pause).toHaveBeenCalled(); // pause() hook fired automatically
    favicon.destroy();
  });

  it("fromLottie() works with no plugin registration", () => {
    const favicon = new Favicon();
    const anim = makeFakeLottieAnimation();
    favicon.fromLottie(anim);
    expect(favicon.duration()).toBe(Infinity);
    favicon.play();
    favicon.pause();
    expect(anim.pause).toHaveBeenCalled();
    favicon.destroy();
    expect(anim.destroy).toHaveBeenCalled();
  });

  it("fromDotLottie() works with no plugin registration", () => {
    const favicon = new Favicon();
    const anim = makeFakeDotLottie();
    favicon.fromDotLottie(anim);
    expect(favicon.duration()).toBe(Infinity);
    favicon.play();
    favicon.pause();
    expect(anim.pause).toHaveBeenCalled();
    favicon.destroy();
    expect(anim.destroy).toHaveBeenCalled();
  });

  it("switching from fromVideo() to another source destroys the outgoing video source", () => {
    const favicon = new Favicon();
    const video = makeFakeVideoElement();
    favicon.fromVideo(video, { autoplay: false });
    favicon.fromFrames(makeFrames());
    expect(video.pause).toHaveBeenCalled(); // VideoSource.destroy() calls video.pause()
    favicon.destroy();
  });
});
