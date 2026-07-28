/**
 * @module utils/constants
 * Central place for magic numbers / enums so nothing is hard-coded inline.
 */

/** Default favicon canvas size in pixels. Browsers render favicons at 16/32/48,
 * but we render at a higher internal resolution and let the browser downscale
 * for crisper output on high-DPI displays. */
export const DEFAULT_CANVAS_SIZE = 64;

/** Default playback frames-per-second when none is supplied. */
export const DEFAULT_FPS = 12;

/** Default playback rate multiplier (1 = normal speed). */
export const DEFAULT_PLAYBACK_RATE = 1;

/** Direction constants for playback. */
export const DIRECTION = Object.freeze({
  FORWARD: 1,
  REVERSE: -1,
});

/** Lifecycle / playback event names emitted by Favicon instances. */
export const EVENTS = Object.freeze({
  READY: "ready",
  PLAY: "play",
  PAUSE: "pause",
  RESUME: "resume",
  STOP: "stop",
  FRAME: "frame",
  COMPLETE: "complete",
  LOOP: "loop",
  DESTROY: "destroy",
  ERROR: "error",
  CHANGE: "change",
});

/** Supported favicon MIME/link types, in order of preference for generation. */
export const FAVICON_MIME = Object.freeze({
  PNG: "image/png",
  ICO: "image/x-icon",
  SVG: "image/svg+xml",
});

/** Milliseconds in one second, named to avoid a bare "1000" in timing math. */
export const MS_PER_SECOND = 1000;

/** Number of milliseconds a tab must stay hidden before we throttle the
 * scheduler down to a battery/CPU-friendly idle rate. */
export const HIDDEN_TAB_THROTTLE_DELAY = 500;

/** Frame rate used while a tab is hidden and idle-throttling is active. */
export const HIDDEN_TAB_FPS = 2;
