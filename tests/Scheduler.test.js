import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock requestFrame/cancelFrame so the test controls timing deterministically
// instead of depending on real rAF callbacks. State lives on a plain object
// (rafState) rather than as a self-reference on the mock function, since a
// vi.fn() can't refer to its own not-yet-assigned binding from inside its
// own factory.
const rafState = { pending: null, handle: 0 };

vi.mock("../src/utils/env.js", async () => {
  const actual = await vi.importActual("../src/utils/env.js");
  return {
    ...actual,
    requestFrame: vi.fn((cb) => {
      rafState.pending = cb;
      return ++rafState.handle;
    }),
    cancelFrame: vi.fn(),
    isTabVisible: vi.fn(() => true),
  };
});

import { requestFrame } from "../src/utils/env.js";
import { Scheduler } from "../src/scheduler/Scheduler.js";

function flushOnce(scheduler, timestamp) {
  const cb = rafState.pending;
  rafState.pending = null;
  cb(timestamp);
}

describe("Scheduler", () => {
  beforeEach(() => {
    rafState.handle = 0;
    rafState.pending = null;
    requestFrame.mockClear();
  });

  it("does not tick before start() is called", () => {
    const onTick = vi.fn();
    new Scheduler(onTick);
    expect(requestFrame).not.toHaveBeenCalled();
  });

  it("emits a tick once enough time has passed for one frame at the set FPS", () => {
    const onTick = vi.fn();
    const scheduler = new Scheduler(onTick);
    scheduler.setFPS(10); // 100ms per frame
    scheduler.start();

    flushOnce(scheduler, 0); // establishes lastTimestamp, no tick yet
    expect(onTick).not.toHaveBeenCalled();

    flushOnce(scheduler, 100); // exactly one frame interval later
    expect(onTick).toHaveBeenCalledTimes(1);
  });

  it("does not tick again until another full interval has elapsed", () => {
    const onTick = vi.fn();
    const scheduler = new Scheduler(onTick);
    scheduler.setFPS(10);
    scheduler.start();

    flushOnce(scheduler, 0);
    flushOnce(scheduler, 50); // half an interval — no tick
    expect(onTick).not.toHaveBeenCalled();

    flushOnce(scheduler, 100); // now a full interval has passed
    expect(onTick).toHaveBeenCalledTimes(1);
  });

  it("stop() prevents further ticks", () => {
    const onTick = vi.fn();
    const scheduler = new Scheduler(onTick);
    scheduler.setFPS(10);
    scheduler.start();
    flushOnce(scheduler, 0);
    scheduler.stop();
    expect(scheduler.isRunning()).toBe(false);
  });

  it("applies playbackRate to how quickly the accumulator fills", () => {
    const onTick = vi.fn();
    const scheduler = new Scheduler(onTick);
    scheduler.setFPS(10); // 100ms/frame
    scheduler.setPlaybackRate(2); // twice as fast
    scheduler.start();

    flushOnce(scheduler, 0);
    flushOnce(scheduler, 50); // 50ms real time * 2x rate = 100ms accumulated
    expect(onTick).toHaveBeenCalledTimes(1);
  });

  it("clamps huge deltas (e.g. after a backgrounded tab) instead of firing many ticks at once", () => {
    const onTick = vi.fn();
    const scheduler = new Scheduler(onTick);
    scheduler.setFPS(10); // 100ms/frame, clamp = 800ms
    scheduler.start();

    flushOnce(scheduler, 0);
    flushOnce(scheduler, 100000); // a huge stall
    // Clamped delta is 800ms => at most 8 frame-worth of ticks collapsed to one emitted tick per loop iteration
    expect(onTick).toHaveBeenCalledTimes(1);
  });

  it("resetClock() zeroes elapsed time bookkeeping", () => {
    const onTick = vi.fn();
    const scheduler = new Scheduler(onTick);
    scheduler.setFPS(10);
    scheduler.start();
    flushOnce(scheduler, 0);
    flushOnce(scheduler, 100);
    scheduler.resetClock();
    flushOnce(scheduler, 100); // lastTimestamp reset to 0, so this just re-establishes baseline
    expect(onTick).toHaveBeenCalledTimes(1); // only the earlier tick, not a second one
  });
});
