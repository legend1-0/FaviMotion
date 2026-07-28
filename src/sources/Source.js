/**
 * @module sources/Source
 * Defines the contract every animation source must implement. New source
 * types (GIF, an app-specific animation format, ...) only need to
 * implement this shape — the animation/rendering engine never branches on
 * source type directly.
 *
 * A Source is:
 *   - frameCount: number             total number of frames (Infinity for
 *                                     open-ended procedural sources)
 *   - isProcedural: boolean          true if frames are computed on the fly
 *   - getSignature(index): string    cheap cache key for a frame
 *   - render(renderer, index, time)  draw the frame using the given Renderer
 *
 * Optional lifecycle hooks — implement these if the source wraps something
 * with its own play state (a <video> element, a Lottie/dotLottie player).
 * AnimationEngine calls them automatically: `pause()`/`resume()` on
 * Favicon#pause()/resume()/play(), `destroy()` when the source is replaced
 * or the Favicon instance is destroyed. A source that doesn't need this
 * (frame lists, sprite sheets, plain procedural callbacks) simply omits
 * them — the `?.()` calls are no-ops when the method is absent.
 *   - pause()    optional — pause the underlying player
 *   - resume()   optional — resume the underlying player
 *   - destroy()  optional — release the underlying player/resources
 *
 * @typedef {object} Source
 * @property {number} frameCount
 * @property {boolean} isProcedural
 * @property {(index: number) => string} getSignature
 * @property {(renderer: import("../rendering/Renderer.js").Renderer, index: number, time: number) => void} render
 * @property {() => void} [pause]
 * @property {() => void} [resume]
 * @property {() => void} [destroy]
 */

/**
 * Validate that an object satisfies the Source contract, throwing a
 * descriptive error otherwise. Used defensively at the public API boundary
 * so plugin-provided sources fail fast with a clear message.
 * @param {*} source
 * @returns {Source}
 */
export function assertValidSource(source) {
  if (!source || typeof source !== "object") {
    throw new TypeError("favicon-motion: source must be an object");
  }
  if (typeof source.render !== "function") {
    throw new TypeError("favicon-motion: source.render must be a function");
  }
  if (typeof source.getSignature !== "function") {
    throw new TypeError("favicon-motion: source.getSignature must be a function");
  }
  if (typeof source.frameCount !== "number") {
    throw new TypeError("favicon-motion: source.frameCount must be a number");
  }
  return source;
}
