/**
 * @module utils/math
 */

/**
 * Clamp a number between min and max.
 * @param {number} value
 * @param {number} min
 * @param {number} max
 * @returns {number}
 */
export function clamp(value, min, max) {
  return value < min ? min : value > max ? max : value;
}

/**
 * Linear interpolation between a and b.
 * @param {number} a
 * @param {number} b
 * @param {number} t 0..1
 * @returns {number}
 */
export function lerp(a, b, t) {
  return a + (b - a) * t;
}

/**
 * Wrap an integer index into the [0, length) range, supporting negative
 * indices (used for reverse playback / seeking past the start).
 * @param {number} index
 * @param {number} length
 * @returns {number}
 */
export function wrapIndex(index, length) {
  if (length <= 0) return 0;
  const m = index % length;
  return m < 0 ? m + length : m;
}
