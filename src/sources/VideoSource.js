/**
 * @module sources/VideoSource
 * Samples a hidden <video> element as a canvas drawable each tick. Video
 * playback itself was never something favicon-motion could do directly —
 * favicons can't *be* a video, a `<link rel="icon">` only ever accepts an
 * image — but a `<video>` element is native to every browser, so this adds
 * zero bytes of external dependency: no separate install, no plugin
 * registration, it's just part of the library. A `<video>` is decoded
 * off-screen (never attached to the DOM, never shown), and each tick draws
 * whatever frame is currently under its playhead onto the canvas, exactly
 * like drawing a still image.
 */

const DEFAULT_SIGNATURE_FPS = 30;

export class VideoSource {
  /**
   * @param {HTMLVideoElement|string} videoOrUrl - an existing (typically
   *   hidden, un-attached) <video> element, or a URL to load into one
   *   created internally
   * @param {object} [options]
   * @param {boolean} [options.loop=true]
   * @param {boolean} [options.muted=true] - most browsers require this for autoplay
   * @param {boolean} [options.autoplay=true]
   * @param {number} [options.signatureFps=30] - resolution used for duplicate-frame detection
   */
  constructor(videoOrUrl, options = {}) {
    const {
      loop = true,
      muted = true,
      autoplay = true,
      signatureFps = DEFAULT_SIGNATURE_FPS,
    } = options;

    if (typeof videoOrUrl === "string") {
      this._video = document.createElement("video");
      this._video.src = videoOrUrl;
      this._ownsElement = true;
    } else {
      this._video = videoOrUrl;
      this._ownsElement = false;
    }

    this._video.loop = loop;
    this._video.muted = muted;
    this._video.playsInline = true; // avoid iOS forcing fullscreen playback

    this._signatureFps = signatureFps;
    this.frameCount = Infinity;
    // The video advances on its own internal clock rather than our
    // frame-index stepping, so the engine should treat this like a
    // procedural source (time-driven, not index-driven).
    this.isProcedural = true;

    if (autoplay) {
      // play() returns a promise that rejects if autoplay is blocked by the
      // browser; callers can invoke resume() again after a user gesture.
      this._video.play().catch(() => {});
    }
  }

  /** @returns {HTMLVideoElement} the underlying (hidden) video element */
  get element() {
    return this._video;
  }

  /**
   * Cheap cache key. Bucketed by currentTime so duplicate-looking frames
   * (e.g. the video is paused, or between its own internal frame steps)
   * still benefit from the engine's duplicate-frame skip.
   * @returns {string}
   */
  getSignature() {
    if (this._video.paused || this._video.ended) {
      return `video:paused:${this._video.currentTime.toFixed(2)}`;
    }
    const bucket = Math.floor(this._video.currentTime * this._signatureFps);
    return `video:${bucket}`;
  }

  /**
   * @param {import("../rendering/Renderer.js").Renderer} renderer
   */
  render(renderer) {
    // readyState < 2 means there's no decoded frame available yet (e.g.
    // still loading metadata) — skip drawing rather than drawing a blank
    // frame over whatever the favicon last showed.
    if (this._video.readyState < 2) return;
    renderer.drawImageSource(this._video);
  }

  /** Pause the underlying video. Called automatically by the video plugin. */
  pause() {
    this._video.pause();
  }

  /** Resume the underlying video. Called automatically by the video plugin. */
  resume() {
    this._video.play().catch(() => {});
  }

  /** Release the video element (and any object URL it owns). */
  destroy() {
    this._video.pause();
    if (this._ownsElement) {
      if (typeof this._video.src === "string" && this._video.src.startsWith("blob:")) {
        URL.revokeObjectURL(this._video.src);
      }
      this._video.removeAttribute("src");
      this._video.load();
    }
    this._video = null;
  }
}
