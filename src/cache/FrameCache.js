/**
 * @module cache/FrameCache
 * Caches the expensive outputs of the render pipeline (data URLs) keyed by a
 * cheap-to-compute frame signature, and tracks the last-rendered signature so
 * identical consecutive frames never touch the canvas or the favicon <link>
 * tag at all (a huge win for looping/idle animations like spinners).
 */

const DEFAULT_MAX_ENTRIES = 128;

export class FrameCache {
  /**
   * @param {number} [maxEntries]
   */
  constructor(maxEntries = DEFAULT_MAX_ENTRIES) {
    this._maxEntries = maxEntries;
    /** @type {Map<string, string>} signature -> data URL */
    this._map = new Map();
    this._lastSignature = null;
  }

  /**
   * @param {string} signature
   * @returns {string|undefined} cached data URL, if present
   */
  get(signature) {
    const value = this._map.get(signature);
    if (value !== undefined) {
      // Re-insert to mark as most-recently-used (Map preserves insertion order).
      this._map.delete(signature);
      this._map.set(signature, value);
    }
    return value;
  }

  /**
   * @param {string} signature
   * @param {string} dataUrl
   */
  set(signature, dataUrl) {
    if (this._map.has(signature)) this._map.delete(signature);
    this._map.set(signature, dataUrl);
    while (this._map.size > this._maxEntries) {
      const oldestKey = this._map.keys().next().value;
      this._map.delete(oldestKey);
    }
  }

  /**
   * Returns true when `signature` is identical to the last frame that was
   * actually committed to the favicon, meaning rendering can be skipped
   * entirely for this tick.
   * @param {string} signature
   * @returns {boolean}
   */
  isDuplicateOfLast(signature) {
    return this._lastSignature !== null && this._lastSignature === signature;
  }

  /** @param {string} signature */
  markCommitted(signature) {
    this._lastSignature = signature;
  }

  clear() {
    this._map.clear();
    this._lastSignature = null;
  }
}

/**
 * Build a cheap signature for a frame descriptor so identical frames can be
 * detected without diffing pixel data. Procedural frames should supply their
 * own signature (e.g. a quantized time value) via the source's
 * `getFrameSignature` hook; static sources default to their frame index.
 * @param {number|string} frameKey
 * @param {number} [size]
 * @returns {string}
 */
export function buildFrameSignature(frameKey, size) {
  return size === undefined ? String(frameKey) : `${frameKey}:${size}`;
}
