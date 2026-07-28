/**
 * @module cache/ObjectPool
 * A generic object pool. The animation loop runs every frame for the
 * lifetime of a page, so anything allocated per-frame is a GC pressure
 * source. Canvases, small state objects, and typed arrays are all good
 * pooling candidates — acquire, use, release.
 */

export class ObjectPool {
  /**
   * @param {() => *} factory - creates a new instance when the pool is empty
   * @param {(item: *) => void} [reset] - called before an item is reused
   * @param {number} [maxSize] - upper bound to avoid unbounded growth
   */
  constructor(factory, reset = () => {}, maxSize = 64) {
    this._factory = factory;
    this._reset = reset;
    this._maxSize = maxSize;
    /** @type {Array<*>} */
    this._free = [];
  }

  /** @returns {*} a pooled or freshly created instance */
  acquire() {
    const item = this._free.pop();
    if (item !== undefined) {
      this._reset(item);
      return item;
    }
    return this._factory();
  }

  /** @param {*} item - return an item to the pool for reuse */
  release(item) {
    if (this._free.length < this._maxSize) {
      this._free.push(item);
    }
  }

  /** Drop every pooled item (e.g. on destroy()). */
  clear() {
    this._free.length = 0;
  }

  /** @returns {number} number of currently pooled (idle) items */
  get size() {
    return this._free.length;
  }
}
