import { describe, it, expect, vi } from "vitest";
import { EventEmitter } from "../src/utils/EventEmitter.js";

describe("EventEmitter", () => {
  it("calls subscribed handlers on emit", () => {
    const emitter = new EventEmitter();
    const handler = vi.fn();
    emitter.on("frame", handler);
    emitter.emit("frame", { frame: 1 });
    expect(handler).toHaveBeenCalledWith({ frame: 1 });
  });

  it("supports unsubscribing via the returned function", () => {
    const emitter = new EventEmitter();
    const handler = vi.fn();
    const unsubscribe = emitter.on("play", handler);
    unsubscribe();
    emitter.emit("play");
    expect(handler).not.toHaveBeenCalled();
  });

  it("off() removes a specific handler only", () => {
    const emitter = new EventEmitter();
    const a = vi.fn();
    const b = vi.fn();
    emitter.on("x", a);
    emitter.on("x", b);
    emitter.off("x", a);
    emitter.emit("x");
    expect(a).not.toHaveBeenCalled();
    expect(b).toHaveBeenCalled();
  });

  it("once() fires exactly once", () => {
    const emitter = new EventEmitter();
    const handler = vi.fn();
    emitter.once("complete", handler);
    emitter.emit("complete");
    emitter.emit("complete");
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it("catches handler errors and re-emits as error instead of throwing", () => {
    const emitter = new EventEmitter();
    const errorHandler = vi.fn();
    emitter.on("frame", () => {
      throw new Error("boom");
    });
    emitter.on("error", errorHandler);
    expect(() => emitter.emit("frame")).not.toThrow();
    expect(errorHandler).toHaveBeenCalled();
  });

  it("removeAllListeners clears every event", () => {
    const emitter = new EventEmitter();
    const handler = vi.fn();
    emitter.on("a", handler);
    emitter.on("b", handler);
    emitter.removeAllListeners();
    emitter.emit("a");
    emitter.emit("b");
    expect(handler).not.toHaveBeenCalled();
  });
});
