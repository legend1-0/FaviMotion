# FAQ

**Why not just use an animated GIF or APNG as the favicon?**
Browser support for animating those inside a favicon `<link>` is
inconsistent, you can't control frame timing/playback rate at runtime, and
you can't composite effects or draw procedurally. Canvas gives full runtime
control and works identically across Chrome, Edge, Firefox, and Safari.

**Why not an animated SVG favicon?**
Animated SVG favicon support is inconsistent across browsers and animation
timing can't be controlled from JS at runtime the way a canvas-driven data
URL can — this was an explicit design constraint for the library.

**Does this work in every browser?**
Chrome, Edge, Firefox, and Safari are all supported. Every feature that
isn't universal (`OffscreenCanvas`, `ImageBitmap`, Page Visibility) has an
automatic fallback — see `src/utils/env.js` and `docs/performance.md`.

**Will this slow down my page?**
No meaningful impact at reasonable FPS (the default is 12). Duplicate
frames are skipped entirely, exports are cached, hidden tabs are throttled
to 2fps automatically, and a stalled main thread doesn't cause a burst of
catch-up frames. See `docs/performance.md`.

**Can I animate multiple things — e.g. a spinner while loading, then a
static logo?**
Yes — call `favicon.animate(...)`, `.fromFrames(...)`, or
`.fromSpriteSheet(...)` again at any time; each call replaces the current
source and emits a `change` event. Only one `Favicon` instance should drive
the page's real favicon `<link>` at a time (a page only has one tab icon).

**How do I revert to the site's original favicon?**
`favicon.restore()`. It stops playback and puts back exactly what was there
before (including removing the tag entirely if favicon-motion created it
because the page had none).

**Can I export the current frame for use elsewhere (e.g. a share image)?**
`favicon.capture()` (alias `favicon.snapshot()`) returns the current
canvas's data URL — a `string`, or a `Promise<string>` when the renderer is
using `OffscreenCanvas` (which lacks a synchronous export).

**How do I add support for a new animation format (GIF, my own engine's
format)?**
Video, Lottie, and dotLottie are already built in — `fromVideo`,
`fromLottie`, `fromDotLottie`, no plugin needed (see `docs/video.md`). For
anything else, write a plugin that registers a `Source` implementation —
see `docs/plugins.md`. The animation/rendering engine never branches on
source type, so this never requires touching the core.

**Is this framework-specific?**
No — it's plain JS with no framework dependency. It works the same whether
your app is React, Vue, Svelte, or no framework at all; just call
`favicon.destroy()` on unmount/route change in whatever "component removed"
hook your framework provides.

**Why JavaScript and not TypeScript?**
Per the project's design goals: JSDoc typings give editor
autocompletion/type-checking without a build-time type-stripping step,
keeping the library's toolchain minimal.
