/**
 * @module effects/EffectsPipeline
 * Runs a chain of effect functions over the rendered frame before it's
 * exported. Effects are pure `(ctx, size, time, params) => void` functions
 * that mutate the scratch context in place — this keeps each effect tiny,
 * testable in isolation, and trivially composable in any order.
 */

export class EffectsPipeline {
  constructor() {
    /** @type {Array<{ name: string, fn: Function, params: object }>} */
    this._chain = [];
  }

  /**
   * @param {string} name - registered effect name (see effects/index.js)
   * @param {Function} fn
   * @param {object} [params]
   */
  add(name, fn, params = {}) {
    this._chain.push({ name, fn, params });
    return this;
  }

  /**
   * @param {string} name
   */
  remove(name) {
    this._chain = this._chain.filter((effect) => effect.name !== name);
    return this;
  }

  clearAll() {
    this._chain.length = 0;
    return this;
  }

  /** @returns {boolean} */
  isEmpty() {
    return this._chain.length === 0;
  }

  /**
   * Apply every registered effect, in order, to the given renderer's
   * scratch canvas after copying the current main canvas into it.
   * @param {import("../rendering/Renderer.js").Renderer} renderer
   * @param {number} time
   */
  apply(renderer, time) {
    if (this.isEmpty()) return;
    const scratchCtx = renderer.getScratchContext();
    scratchCtx.drawImage(renderer.getContext().canvas, 0, 0);
    for (const { fn, params } of this._chain) {
      fn(scratchCtx, renderer.size, time, params);
    }
    renderer.commitScratch();
  }
}
