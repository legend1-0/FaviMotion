/**
 * @module utils/env
 * Centralized environment/feature detection. Every "does this browser support
 * X" check lives here so the rest of the codebase never touches `typeof
 * window` directly, and so fallbacks are consistent everywhere.
 */

export const isBrowser =
  typeof window !== "undefined" && typeof document !== "undefined";

export const supportsOffscreenCanvas =
  typeof OffscreenCanvas !== "undefined";

export const supportsImageBitmap = typeof createImageBitmap === "function";

export const supportsVisibilityAPI =
  isBrowser && typeof document.visibilityState !== "undefined";

export const supportsRequestAnimationFrame =
  typeof requestAnimationFrame === "function";

/**
 * requestAnimationFrame with a setTimeout fallback for non-browser or
 * unusual environments (e.g. some headless/test runners).
 * @param {FrameRequestCallback} callback
 * @returns {number} handle usable with `cancelFrame`
 */
export function requestFrame(callback) {
  if (supportsRequestAnimationFrame) {
    return requestAnimationFrame(callback);
  }
  return setTimeout(() => callback(Date.now()), 16);
}

/**
 * Cancel a handle returned by `requestFrame`.
 * @param {number} handle
 */
export function cancelFrame(handle) {
  if (supportsRequestAnimationFrame) {
    cancelAnimationFrame(handle);
  } else {
    clearTimeout(handle);
  }
}

/**
 * Detect current tab visibility. Returns true when we can't tell (assume
 * visible so we never silently under-render in an unsupported environment).
 * @returns {boolean}
 */
export function isTabVisible() {
  if (!supportsVisibilityAPI) return true;
  return document.visibilityState === "visible";
}
