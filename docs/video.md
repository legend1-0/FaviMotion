# Video, Lottie, and dotLottie

All three are **core** — `fromVideo`, `fromLottie`, and `fromDotLottie` are
regular methods on `Favicon`, same as `fromFrames` or `animate`. No
`favicon.use(plugin)` call, no separate subpath import, nothing to register.

## Video

```js
import { Favicon } from "favicon-motion";

const favicon = new Favicon();
favicon.fromVideo("clip.mp4", { loop: true, muted: true });
favicon.play();
```

Needs nothing beyond the browser itself — video sampling uses a native
`<video>` element, which every browser already has. There is no separate
package to install for this, ever.

`fromVideo(videoOrUrl, options)` accepts either a URL string (a hidden
`<video>` element is created for you) or an existing `HTMLVideoElement` you
already control:

```js
const video = document.getElementById("my-hidden-video");
favicon.fromVideo(video, { loop: true, muted: true });
```

### Options

| Option | Default | Meaning |
|---|---|---|
| `loop` | `true` | Loop the video |
| `muted` | `true` | Required by most browsers for autoplay to be allowed |
| `autoplay` | `true` | Start playing immediately on construction |
| `signatureFps` | `30` | Time resolution used for duplicate-frame detection — lower it for a slow-moving video to skip more redundant renders |

### Lifecycle

- `favicon.pause()` / `favicon.resume()` / `favicon.play()` automatically
  pause/resume the underlying video — you never call `video.pause()`
  yourself.
- `favicon.destroy()`, or switching to a different source
  (`favicon.fromFrames(...)` etc. while a video is active), releases it —
  including revoking a `URL.createObjectURL` blob if you passed one as the
  video's `src`, and removing the element it created for a string-URL call.
- The video element is **never attached to the DOM** — it decodes
  off-screen purely as a frame source. Don't append it to the page yourself.

### A note on quality

A favicon renders at roughly 16–32px. Fine detail — thin lines, small text,
subtle gradients — will mostly disappear at that size. Bold shapes, strong
color changes, and simple silhouettes read best. If your video needs a lot
of detail to look right, consider exporting a hand-tuned PNG sequence
instead (`fromFrames`) — you get full control over what a tiny frame looks
like, rather than whatever a downscaled video frame happens to produce.

### Autoplay may be blocked

Browsers block autoplay-with-sound and sometimes autoplay entirely without a
user gesture. `muted: true` (the default) covers most cases, but if
`autoplay` fails silently, call `favicon.play()` (or `.resume()`) again from
inside a click/tap handler.

---

## Lottie vs. dotLottie — these are different formats

**This trips people up, so it's worth stating plainly:** a `.json` Lottie
export and a `.lottie` file are not the same thing, and need different
libraries to decode.

- **`.json`** — the original Lottie format: one JSON file. Decoded by
  `lottie-web`. Use `favicon.fromLottie(...)`.
- **`.lottie`** — "dotLottie": a *zipped container* bundling the animation
  JSON plus its assets. This is what most current export tools (LottieFiles,
  recent After Effects plugins) produce **by default** now. Decoded by
  `@lottiefiles/dotlottie-web` (a WASM-based player). Use
  `favicon.fromDotLottie(...)`.

If you're not sure which one you have: check the file extension. If your
export tool gave you `.lottie` and you try to feed it to `lottie-web`
expecting raw JSON, it'll fail (or worse, silently do nothing) — `lottie-web`
tries to `fetch(...).then(res => res.json())`, and a zipped binary file
isn't valid JSON.

### Classic Lottie JSON

```js
// npm install lottie-web
import lottie from "lottie-web";

const anim = lottie.loadAnimation({
  container: document.getElementById("lottie-container"), // needs real layout size
  renderer: "canvas",
  loop: true,
  autoplay: true,
  path: "animation.json",
});

favicon.fromLottie(anim);
favicon.play();
```

`lottie-web` renders into a container **div** (not the canvas directly —
the canvas lives inside it). That container needs genuine layout
dimensions; `display: none` gives it a 0×0 box. If you don't want it
visible, position it off-screen instead:

```css
#lottie-container {
  width: 128px;
  height: 128px;
  position: absolute;
  left: -9999px;
  top: -9999px;
}
```

#### Options

| Option | Default | Meaning |
|---|---|---|
| `signatureFps` | `30` | Time resolution used for duplicate-frame detection |

### dotLottie (`.lottie` files)

```js
// npm install @lottiefiles/dotlottie-web
import { DotLottie } from "@lottiefiles/dotlottie-web";

const canvas = document.createElement("canvas");
canvas.width = 128;
canvas.height = 128;
document.body.appendChild(canvas); // see the gotcha below — this matters

const anim = new DotLottie({
  canvas,
  src: "animation.lottie",
  loop: true,
  autoplay: true,
  renderConfig: { freezeOnOffscreen: false }, // see the gotcha below
});

favicon.fromDotLottie(anim);
favicon.play();
```

Unlike `lottie-web`, `DotLottie` renders **directly onto the canvas you
give it** — no container div, no indirection.

#### Two real gotchas (found the hard way, not theoretical)

1. **The canvas must be attached to the DOM.** `DotLottie` defaults
   `renderConfig.freezeOnOffscreen` to `true`, which pauses rendering once
   it decides a canvas isn't visible — and an unattached canvas (created
   with `document.createElement("canvas")` but never appended anywhere) is
   always considered offscreen. Symptom: the animation "loads" fine
   (`totalFrames` reports correctly, `isPlaying` is `true`) but visibly
   freezes on frame 0 forever. Fix: append the canvas somewhere in the
   document — off-screen positioning (`position: absolute; left: -9999px`)
   works fine, `display: none` does not (same layout-size issue as the
   Lottie container above) — **and/or** pass
   `renderConfig: { freezeOnOffscreen: false }` explicitly.
2. **The WASM file loads from a CDN by default**, even if you're
   self-hosting the JS module. If you need a fully offline setup, call
   `DotLottie.setWasmUrl("./path/to/dotlottie-player.wasm")` before
   constructing any instance, pointing at a copy of the `.wasm` file from
   `node_modules/@lottiefiles/dotlottie-web/dist/`.

#### Options

| Option | Default | Meaning |
|---|---|---|
| `signatureFps` | `30` | Time resolution used for duplicate-frame detection |

### Lifecycle (both Lottie and dotLottie)

- `favicon.pause()` / `favicon.resume()` / `favicon.play()` automatically
  pause/resume the underlying player.
- `favicon.destroy()`, or switching sources, calls the player's own
  `destroy()`.
