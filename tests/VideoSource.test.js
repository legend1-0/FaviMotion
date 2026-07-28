import { describe, it, expect, vi } from "vitest";
import { VideoSource } from "../src/sources/VideoSource.js";

/**
 * A plain object standing in for an HTMLVideoElement. jsdom doesn't
 * implement real media playback, so — consistent with how the rest of the
 * suite tests engine pieces via dependency injection — we hand VideoSource
 * a fake with just the surface it actually touches.
 */
function makeFakeVideoElement(overrides = {}) {
  return {
    loop: false,
    muted: false,
    playsInline: false,
    src: "",
    currentTime: 0,
    paused: true,
    ended: false,
    readyState: 0,
    play: vi.fn(() => Promise.resolve()),
    pause: vi.fn(),
    load: vi.fn(),
    removeAttribute: vi.fn(),
    ...overrides,
  };
}

describe("VideoSource", () => {
  it("configures loop/muted/playsInline on the underlying element", () => {
    const video = makeFakeVideoElement();
    new VideoSource(video, { loop: true, muted: true, autoplay: false });
    expect(video.loop).toBe(true);
    expect(video.muted).toBe(true);
    expect(video.playsInline).toBe(true);
  });

  it("autoplays by default", () => {
    const video = makeFakeVideoElement();
    new VideoSource(video);
    expect(video.play).toHaveBeenCalled();
  });

  it("does not autoplay when autoplay: false", () => {
    const video = makeFakeVideoElement();
    new VideoSource(video, { autoplay: false });
    expect(video.play).not.toHaveBeenCalled();
  });

  it("is procedural (time-driven, not frame-index driven)", () => {
    const source = new VideoSource(makeFakeVideoElement(), { autoplay: false });
    expect(source.isProcedural).toBe(true);
    expect(source.frameCount).toBe(Infinity);
  });

  it("getSignature reflects a paused state distinctly", () => {
    const video = makeFakeVideoElement({ paused: true, currentTime: 1.23456 });
    const source = new VideoSource(video, { autoplay: false });
    expect(source.getSignature()).toBe("video:paused:1.23");
  });

  it("getSignature buckets currentTime while playing", () => {
    const video = makeFakeVideoElement({ paused: false, currentTime: 2.0 });
    const source = new VideoSource(video, { autoplay: false, signatureFps: 30 });
    expect(source.getSignature()).toBe("video:60");
  });

  it("render() skips drawing when the video has no decoded frame yet", () => {
    const video = makeFakeVideoElement({ readyState: 0 });
    const source = new VideoSource(video, { autoplay: false });
    const renderer = { drawImageSource: vi.fn() };
    source.render(renderer);
    expect(renderer.drawImageSource).not.toHaveBeenCalled();
  });

  it("render() draws the video once it has enough data", () => {
    const video = makeFakeVideoElement({ readyState: 2 });
    const source = new VideoSource(video, { autoplay: false });
    const renderer = { drawImageSource: vi.fn() };
    source.render(renderer);
    expect(renderer.drawImageSource).toHaveBeenCalledWith(video);
  });

  it("pause()/resume() delegate to the underlying element", () => {
    const video = makeFakeVideoElement();
    const source = new VideoSource(video, { autoplay: false });
    source.pause();
    expect(video.pause).toHaveBeenCalled();
    source.resume();
    expect(video.play).toHaveBeenCalled();
  });

  it("destroy() clears src and calls load() when it owns the element (string-URL construction)", () => {
    const source = new VideoSource("https://example.com/clip.mp4", { autoplay: false });
    const element = source.element;
    const removeAttributeSpy = vi.spyOn(element, "removeAttribute");
    const loadSpy = vi.spyOn(element, "load").mockImplementation(() => {});
    const pauseSpy = vi.spyOn(element, "pause").mockImplementation(() => {});

    source.destroy();

    expect(pauseSpy).toHaveBeenCalled();
    expect(removeAttributeSpy).toHaveBeenCalledWith("src");
    expect(loadSpy).toHaveBeenCalled();
  });

  it("destroy() does not touch the element's src when it does not own it", () => {
    const video = makeFakeVideoElement({ src: "https://example.com/clip.mp4" });
    const source = new VideoSource(video, { autoplay: false });
    source.destroy();
    expect(video.removeAttribute).not.toHaveBeenCalled();
    expect(video.load).not.toHaveBeenCalled();
  });
});
