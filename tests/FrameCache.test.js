import { describe, it, expect } from "vitest";
import { FrameCache, buildFrameSignature } from "../src/cache/FrameCache.js";

describe("FrameCache", () => {
  it("returns undefined for a signature it has never seen", () => {
    const cache = new FrameCache();
    expect(cache.get("missing")).toBeUndefined();
  });

  it("stores and retrieves a data URL by signature", () => {
    const cache = new FrameCache();
    cache.set("frame:0", "data:image/png;base64,abc");
    expect(cache.get("frame:0")).toBe("data:image/png;base64,abc");
  });

  it("evicts the least-recently-used entry once maxEntries is exceeded", () => {
    const cache = new FrameCache(2);
    cache.set("a", "1");
    cache.set("b", "2");
    cache.get("a"); // touch "a" so "b" becomes the LRU entry
    cache.set("c", "3"); // should evict "b", not "a"
    expect(cache.get("a")).toBe("1");
    expect(cache.get("b")).toBeUndefined();
    expect(cache.get("c")).toBe("3");
  });

  it("detects a duplicate of the last committed signature", () => {
    const cache = new FrameCache();
    expect(cache.isDuplicateOfLast("frame:0")).toBe(false);
    cache.markCommitted("frame:0");
    expect(cache.isDuplicateOfLast("frame:0")).toBe(true);
    expect(cache.isDuplicateOfLast("frame:1")).toBe(false);
  });

  it("clear() resets both the map and the last-committed signature", () => {
    const cache = new FrameCache();
    cache.set("frame:0", "x");
    cache.markCommitted("frame:0");
    cache.clear();
    expect(cache.get("frame:0")).toBeUndefined();
    expect(cache.isDuplicateOfLast("frame:0")).toBe(false);
  });
});

describe("buildFrameSignature", () => {
  it("builds a signature from just a key when size is omitted", () => {
    expect(buildFrameSignature(3)).toBe("3");
  });

  it("includes size in the signature when provided", () => {
    expect(buildFrameSignature(3, 64)).toBe("3:64");
  });
});
