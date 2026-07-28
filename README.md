# favicon-motion

A lightweight, canvas-powered animated favicon library for the web.

No animated SVG. Every frame is drawn to a tiny `<canvas>` and pushed into
your page's `<link rel="icon">` as a data URL — draw procedurally, or
animate from frames, a sprite sheet, a video, or a Lottie/dotLottie
animation. Fast, framework-agnostic, and around 20KB minified for the
whole thing (video included, since it costs nothing extra; Lottie/dotLottie
need their own decoder library, same as anywhere else you'd use them).

```js
import { Favicon } from "favicon-motion";

const favicon = new Favicon();
favicon.animate((ctx, frame, time) => {
  ctx.fillStyle = "hotpink";
  ctx.beginPath();
  ctx.arc(16, 16, 10 + Math.sin(time * 4) * 4, 0, Math.PI * 2);
  ctx.fill();
});
favicon.play();
```

---

## Installation

```bash
npm install favicon-motion
```

Or via a `<script>` tag from a CDN (UMD build, exposes `window.FaviconMotion`):

```html
<script src="https://unpkg.com/favicon-motion/dist/favicon-motion.umd.min.js"></script>
<script>
  const favicon = new FaviconMotion.Favicon();
</script>
```

## Quick Start

```js
import { Favicon } from "favicon-motion";

const favicon = new Favicon({ size: 32, fps: 12 });

// From an array of frames (Image, Canvas, ImageBitmap, or ImageData)
favicon.fromFrames([frame1, frame2, frame3]).play();

// From a sprite sheet
favicon.fromSpriteSheet({
  image: sheetImage,
  frameWidth: 16,
  frameHeight: 16,
  columns: 8,
}).play();

// Procedural — draw with a callback, no images required
favicon.animate((ctx, frame, time) => {
  // draw anything
}).play();
```

Run `npm run dev` to launch the demo site (spinner, pixel art, sprite sheet,
clock, notification badge, and effects, all side by side).

---

## API

### Constructor

```js
new Favicon({ size = 64, fps = 12 })
```

- `size` — internal render resolution in pixels. Favicons are tiny on
  screen, but a higher internal resolution keeps edges crisp on high-DPI
  displays; the browser downsamples on display.
- `fps` — initial playback frame rate.

### Sources

| Method | Description |
|---|---|
| `favicon.fromFrames(frames)` | Array of `HTMLImageElement`, `ImageBitmap`, `HTMLCanvasElement`/`OffscreenCanvas`, or `ImageData` |
| `favicon.fromSpriteSheet(options)` | Slice a single sheet image into cells — see below |
| `favicon.animate(callback)` | Procedural drawing: `(ctx, frame, time) => void`, called every tick |
| `favicon.fromVideo(videoOrUrl, options?)` | Sample a `<video>` — core, no extra install ever (see [Video, PNG sequences, Lottie](#video-png-sequences-and-lottie)) |
| `favicon.fromLottie(lottieAnimation, options?)` | Sample a classic lottie-web animation — you install `lottie-web` yourself |
| `favicon.fromDotLottie(dotLottieInstance, options?)` | Sample a `@lottiefiles/dotlottie-web` player (`.lottie` files) — you install that package yourself |
| `favicon.fromCustomSource(name, ...args)` | Instantiate a source registered by a *third-party* plugin |
| `favicon.play(source?)` | Start/resume playback; optionally set a new `Source` object directly |

**Sprite sheet options:**

```js
favicon.fromSpriteSheet({
  image,          // CanvasImageSource
  frameWidth,     // px, required
  frameHeight,    // px, required
  columns,        // optional, auto-computed from image width if omitted
  rows,           // optional, auto-computed from image height if omitted
  padding,        // gap between cells, default 0
  margin,         // border gap around the whole sheet, default 0
  order,          // explicit playback order, e.g. [0, 1, 2, 1] for a ping-pong
});
```

### Playback control

```js
favicon.play();
favicon.pause();
favicon.resume();
favicon.stop();          // stop and reset to frame 0
favicon.restart();       // stop() + play()
favicon.seek(frameIndex);
favicon.reverse();       // flip playback direction
favicon.loop(true);      // default true
favicon.setFPS(24);
favicon.setPlaybackRate(2);   // 2x speed, independent of FPS
favicon.setDirection(1 | -1);

favicon.isPlaying();     // boolean
favicon.currentFrame();  // number
favicon.duration();      // total frames, Infinity for procedural sources
favicon.progress();      // 0..1, always 0 for procedural sources
```

### Effects

Composable, applied in the order they're added:

```js
favicon.applyEffect("pulse", { period: 1, minScale: 0.85 });
favicon.applyEffect("glow", { color: "#fff", blur: 8 });
favicon.removeEffect("pulse");
favicon.clearEffects();
```

Built in: `fade`, `blink`, `rotate`, `pulse`, `shake`, `colorShift`,
`pixelDissolve`, `noise`, `glow`, `brightness`, `contrast`, `hue`, `invert`.
See [docs/effects.md](./docs/effects.md) for each effect's parameters.

### Favicon tag / export

```js
favicon.restore();   // put the page's original favicon back, stop playback
favicon.capture();   // current canvas contents as a data URL (or Promise<string>)
favicon.snapshot();  // alias of capture()
```

### Events

```js
favicon.on("ready", () => {});
favicon.on("play", () => {});
favicon.on("pause", () => {});
favicon.on("resume", () => {});
favicon.on("stop", () => {});
favicon.on("frame", ({ frame, time }) => {});
favicon.on("complete", () => {});   // non-looping source reached its end
favicon.on("loop", () => {});
favicon.on("change", () => {});     // a new source was set
favicon.on("error", (err) => {});
favicon.on("destroy", () => {});

const unsubscribe = favicon.on("frame", handler);
unsubscribe();
```

### Plugins

```js
favicon.use({
  name: "my-plugin",
  install(favicon, api) {
    api.registerSource("myFormat", (data) => ({
      frameCount: data.length,
      isProcedural: false,
      getSignature: (i) => `myFormat:${i}`,
      render: (renderer, i) => renderer.drawImageSource(data[i]),
    }));
    api.registerEffect("myEffect", (ctx, size, time, params) => { /* ... */ });
    api.on("frame", () => { /* ... */ });
  },
  destroy(favicon) { /* optional cleanup */ },
});

favicon.fromCustomSource("myFormat", myData);
```

See [docs/plugins.md](./docs/plugins.md) for the full plugin guide and the
`Source` contract new source types must implement.

### Video, PNG sequences, and Lottie

PNG sequences, sprite sheets, video, Lottie, and dotLottie are **all core** —
none of them need a separate install or a `favicon.use(plugin)` call:

```js
// Video — nothing else to install, ever. Native <video>, zero dependencies.
favicon.fromVideo("clip.mp4", { loop: true, muted: true });

// Classic Lottie JSON — install the decoder yourself, favicon-motion's
// side of it is just this one call:
//   npm install lottie-web
import lottie from "lottie-web";
const anim = lottie.loadAnimation({ renderer: "canvas", path: "animation.json" });
favicon.fromLottie(anim);

// dotLottie (.lottie files) — install the decoder yourself:
//   npm install @lottiefiles/dotlottie-web
import { DotLottie } from "@lottiefiles/dotlottie-web";
const canvas = document.createElement("canvas");
document.body.appendChild(canvas); // must be attached — see docs/video-png-lottie.md
const dotAnim = new DotLottie({ canvas, src: "animation.lottie", loop: true, autoplay: true });
favicon.fromDotLottie(dotAnim);
```

`favicon.pause()` / `resume()` / `play()` automatically pause and resume the
underlying video or Lottie player — no manual wiring needed. `.destroy()`
(or switching to a different source) releases it.

`.lottie` and `.json` are **different formats** that need different
libraries — see [docs/video-png-lottie.md](./docs/video-png-lottie.md) if
you're not sure which one your export tool actually produced. Full guide,
options, and troubleshooting (including a real gotcha around canvas
visibility with dotLottie) in [docs/video.md](./docs/video.md).

### Cleanup

```js
favicon.destroy(); // stops playback, restores the original favicon, releases all resources
```

Always call `destroy()` when a favicon animation is no longer needed (e.g.
on route change in an SPA) — it removes event listeners, releases canvases,
and clears internal caches.

---

## Performance

favicon-motion is built so a continuously looping favicon animation costs as
little CPU/battery as possible:

- **Duplicate-frame skipping** — every frame is keyed by a cheap signature;
  if a tick produces the same signature as the last *committed* frame,
  rendering and `toDataURL()` are skipped entirely.
- **Data URL caching** — previously rendered signatures reuse their cached
  data URL (bounded LRU) instead of re-encoding.
- **Frame-skipping under load** — the scheduler accumulates time and drops
  ticks rather than firing a burst of catch-up frames after a stall.
- **Hidden-tab throttling** — after ~500ms in a background tab, playback
  drops to 2fps automatically and restores full speed on return.
- **OffscreenCanvas** is used when available, with an automatic fallback to
  a normal `<canvas>`.

See [docs/performance.md](./docs/performance.md) for the full guide.

## Browser support

Chrome, Edge, Firefox, and Safari (current and recent versions). Feature
detection (`OffscreenCanvas`, `ImageBitmap`, the Page Visibility API) is
centralized in `src/utils/env.js`, and every check has a fallback path — the
library never throws due to a missing browser feature.

## Architecture

```
src/
  core/       Favicon — the public API, composes everything below
  rendering/  Renderer — canvas/context/scaling/export only
  scheduler/  Scheduler — FPS/rAF/looping/playback-rate, no drawing knowledge
  animation/  AnimationEngine — playback state machine over a Source
  sources/    Source contract + FrameList/SpriteSheet/Procedural implementations
  effects/    Composable effect functions + pipeline runner
  cache/      FrameCache (dedupe/LRU) and ObjectPool (GC pressure reduction)
  plugins/    PluginManager — registration hooks for sources/effects/exporters
  exports/    FaviconManager — the only module that touches <link rel="icon">
  utils/      constants, EventEmitter, env detection, math helpers
```

Every module has one job. The rendering engine doesn't know about timing;
the scheduler doesn't know about canvases; the favicon tag manager doesn't
know how frames are produced. New source types (GIF, Lottie, APNG, video
frame extraction, or an app-specific animation format) only need to
implement the `Source` contract in `src/sources/Source.js` — nothing else in
the engine has to change.

See [docs/architecture.md](./docs/architecture.md) for more detail.

## Contributing

See [docs/contributing.md](./docs/contributing.md).

## FAQ

See [docs/faq.md](./docs/faq.md).

## License

MIT
