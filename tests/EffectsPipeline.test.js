import { describe, it, expect, vi } from "vitest";
import { EffectsPipeline } from "../src/effects/EffectsPipeline.js";

function makeFakeRenderer() {
  const scratchCtx = { drawImage: vi.fn() };
  return {
    size: 64,
    getContext: vi.fn(() => ({ canvas: {} })),
    getScratchContext: vi.fn(() => scratchCtx),
    commitScratch: vi.fn(),
    _scratchCtx: scratchCtx,
  };
}

describe("EffectsPipeline", () => {
  it("isEmpty() is true with no effects added", () => {
    const pipeline = new EffectsPipeline();
    expect(pipeline.isEmpty()).toBe(true);
  });

  it("apply() does nothing when the chain is empty", () => {
    const pipeline = new EffectsPipeline();
    const renderer = makeFakeRenderer();
    pipeline.apply(renderer, 0);
    expect(renderer.getScratchContext).not.toHaveBeenCalled();
  });

  it("apply() runs each registered effect in order with its own params", () => {
    const pipeline = new EffectsPipeline();
    const calls = [];
    pipeline.add("first", (ctx, size, time, params) => calls.push(["first", params]));
    pipeline.add("second", (ctx, size, time, params) => calls.push(["second", params]));
    const renderer = makeFakeRenderer();
    pipeline.apply(renderer, 1.5);
    expect(calls).toEqual([
      ["first", {}],
      ["second", {}],
    ]);
    expect(renderer.commitScratch).toHaveBeenCalled();
  });

  it("remove() drops a specific effect by name", () => {
    const pipeline = new EffectsPipeline();
    pipeline.add("a", vi.fn());
    pipeline.add("b", vi.fn());
    pipeline.remove("a");
    expect(pipeline.isEmpty()).toBe(false);
    const renderer = makeFakeRenderer();
    pipeline.apply(renderer, 0);
    expect(renderer.commitScratch).toHaveBeenCalledTimes(1);
  });

  it("clearAll() empties the chain", () => {
    const pipeline = new EffectsPipeline();
    pipeline.add("a", vi.fn());
    pipeline.clearAll();
    expect(pipeline.isEmpty()).toBe(true);
  });
});
