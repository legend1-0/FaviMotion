import { describe, it, expect, vi } from "vitest";
import { ObjectPool } from "../src/cache/ObjectPool.js";

describe("ObjectPool", () => {
  it("creates a new instance via the factory when empty", () => {
    const factory = vi.fn(() => ({ id: 1 }));
    const pool = new ObjectPool(factory);
    const item = pool.acquire();
    expect(factory).toHaveBeenCalledTimes(1);
    expect(item).toEqual({ id: 1 });
  });

  it("reuses a released item instead of creating a new one", () => {
    const factory = vi.fn(() => ({ used: 0 }));
    const pool = new ObjectPool(factory);
    const item = pool.acquire();
    pool.release(item);
    const reused = pool.acquire();
    expect(reused).toBe(item);
    expect(factory).toHaveBeenCalledTimes(1);
  });

  it("calls reset() on reuse", () => {
    const reset = vi.fn((item) => (item.used += 1));
    const pool = new ObjectPool(() => ({ used: 0 }), reset);
    const item = pool.acquire();
    pool.release(item);
    pool.acquire();
    expect(reset).toHaveBeenCalledWith(item);
  });

  it("never grows past maxSize", () => {
    const pool = new ObjectPool(() => ({}), () => {}, 2);
    pool.release({});
    pool.release({});
    pool.release({});
    expect(pool.size).toBe(2);
  });

  it("clear() drops all pooled items", () => {
    const pool = new ObjectPool(() => ({}));
    pool.release({});
    pool.release({});
    pool.clear();
    expect(pool.size).toBe(0);
  });
});
