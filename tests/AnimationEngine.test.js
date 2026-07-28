import { describe, it, expect, vi, beforeEach } from "vitest";
import { AnimationEngine } from "../src/animation/AnimationEngine.js";
import { FrameCache } from "../src/cache/FrameCache.js";
import { EffectsPipeline } from "../src/effects/EffectsPipeline.js";

function makeFakeScheduler() {
  return {
    _onTick: null,
    start: vi.fn(),
    stop: vi.fn(),
    resetClock: vi.fn(),
  };
}

function makeFakeRenderer() {
  return {
    size: 64,
    toDataURL: vi.fn(() => "data:image/png;base64,frame"),
    getContext: vi.fn(),
    getScratchContext: vi.fn(),
    commitScratch: vi.fn(),
  };
}

function makeFakeSource(frameCount = 4) {
  return {
    frameCount,
    isProcedural: false,
    getSignature: vi.fn((index) => `frame:${index}`),
    render: vi.fn(),
  };
}

describe("AnimationEngine", () => {
  let scheduler;
  let renderer;
  let frameCache;
  let effects;
  let onCommit;
  let emit;
  let engine;

  beforeEach(() => {
    scheduler = makeFakeScheduler();
    renderer = makeFakeRenderer();
    frameCache = new FrameCache();
    effects = new EffectsPipeline();
    onCommit = vi.fn();
    emit = vi.fn();
    engine = new AnimationEngine({ scheduler, renderer, frameCache, effects, onCommit, emit });
  });

  it("play() starts the scheduler and emits play", () => {
    engine.setSource(makeFakeSource());
    engine.play();
    expect(scheduler.start).toHaveBeenCalled();
    expect(emit).toHaveBeenCalledWith("play");
    expect(engine.isPlaying()).toBe(true);
  });

  it("advances to the next frame forward on tick", () => {
    engine.setSource(makeFakeSource(4));
    engine.play();
    engine._tick(0.1, 0.1);
    expect(engine.currentFrame()).toBe(1);
  });

  it("wraps around and emits loop when looping is enabled", () => {
    engine.setSource(makeFakeSource(2));
    engine.setLoop(true);
    engine.play();
    engine._tick(0.1, 0.1); // frame 0 -> 1
    engine._tick(0.1, 0.2); // frame 1 -> wraps to 0
    expect(engine.currentFrame()).toBe(0);
    expect(emit).toHaveBeenCalledWith("loop");
  });

  it("stops and emits complete when looping is disabled and the end is reached", () => {
    engine.setSource(makeFakeSource(2));
    engine.setLoop(false);
    engine.play();
    engine._tick(0.1, 0.1); // frame 0 -> 1 (last frame)
    engine._tick(0.1, 0.2); // would go past the end
    expect(engine.isPlaying()).toBe(false);
    expect(emit).toHaveBeenCalledWith("complete");
    expect(scheduler.stop).toHaveBeenCalled();
  });

  it("reverse() flips direction so frames decrement", () => {
    engine.setSource(makeFakeSource(4));
    engine.seek(2);
    engine.reverse();
    engine.play();
    engine._tick(0.1, 0.1);
    expect(engine.currentFrame()).toBe(1);
  });

  it("skips rendering and committing an unchanged (duplicate) frame", () => {
    const source = makeFakeSource(4);
    // Every frame reports the *same* signature, simulating an identical-looking frame.
    source.getSignature = vi.fn(() => "same-signature");
    engine.setSource(source);
    engine.play();

    engine._tick(0.1, 0.1); // first render commits "same-signature"
    const callsAfterFirst = onCommit.mock.calls.length;
    engine._tick(0.1, 0.2); // duplicate signature -> should be skipped entirely
    expect(onCommit.mock.calls.length).toBe(callsAfterFirst);
  });

  it("seek() jumps directly to the requested frame and forces a render", () => {
    engine.setSource(makeFakeSource(10));
    engine.seek(5);
    expect(engine.currentFrame()).toBe(5);
    expect(onCommit).toHaveBeenCalled();
  });

  it("stop() resets frame and time to zero", () => {
    engine.setSource(makeFakeSource(4));
    engine.play();
    engine._tick(0.1, 0.1);
    engine.stop();
    expect(engine.currentFrame()).toBe(0);
    expect(engine.isPlaying()).toBe(false);
  });

  it("progress() reflects position between 0 and 1 for finite sources", () => {
    engine.setSource(makeFakeSource(5)); // frames 0..4
    engine.seek(2);
    expect(engine.progress()).toBeCloseTo(0.5);
  });

  it("progress() is 0 for procedural (infinite) sources", () => {
    engine.setSource({
      frameCount: Infinity,
      isProcedural: true,
      getSignature: () => "proc",
      render: vi.fn(),
    });
    expect(engine.progress()).toBe(0);
  });

  it("calls the source's optional pause() hook when the engine pauses", () => {
    const source = { ...makeFakeSource(4), pause: vi.fn(), resume: vi.fn() };
    engine.setSource(source);
    engine.play();
    engine.pause();
    expect(source.pause).toHaveBeenCalled();
  });

  it("calls the source's optional resume() hook on play()/resume()", () => {
    const source = { ...makeFakeSource(4), pause: vi.fn(), resume: vi.fn() };
    engine.setSource(source);
    engine.play();
    expect(source.resume).toHaveBeenCalledTimes(1);
    engine.pause();
    engine.resume();
    expect(source.resume).toHaveBeenCalledTimes(2);
  });

  it("calls the source's optional pause() hook on stop()", () => {
    const source = { ...makeFakeSource(4), pause: vi.fn(), resume: vi.fn() };
    engine.setSource(source);
    engine.play();
    engine.stop();
    expect(source.pause).toHaveBeenCalled();
  });

  it("calls the outgoing source's destroy() hook when replaced via setSource()", () => {
    const oldSource = { ...makeFakeSource(4), destroy: vi.fn() };
    engine.setSource(oldSource);
    const newSource = makeFakeSource(2);
    engine.setSource(newSource);
    expect(oldSource.destroy).toHaveBeenCalled();
  });

  it("calls the current source's destroy() hook on engine.destroy()", () => {
    const source = { ...makeFakeSource(4), destroy: vi.fn() };
    engine.setSource(source);
    engine.destroy();
    expect(source.destroy).toHaveBeenCalled();
  });

  it("never throws for a source that omits pause/resume/destroy entirely", () => {
    engine.setSource(makeFakeSource(4)); // plain fake, no lifecycle hooks
    expect(() => {
      engine.play();
      engine.pause();
      engine.resume();
      engine.stop();
      engine.setSource(makeFakeSource(2));
      engine.destroy();
    }).not.toThrow();
  });
});
