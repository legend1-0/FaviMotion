# Which format do I actually have?

A quick decision guide for "I have a motion design / animation file, what do
I call?" — all of these are core methods, nothing extra to install for
video, one real decoder library to install for Lottie/dotLottie.

| You have | Use | Extra install |
|---|---|---|
| A folder of numbered PNGs (`frame-000.png`, `frame-001.png`, ...) | `favicon.fromFrames([...])` | None |
| One image with all frames in a grid | `favicon.fromSpriteSheet({...})` | None |
| A video file (`.mp4`, `.webm`, `.mov`) | `favicon.fromVideo(...)` | None, ever |
| A file ending in **`.json`** from a Lottie/Bodymovin export | `favicon.fromLottie(...)` | `npm install lottie-web` |
| A file ending in **`.lottie`** (most current exports default to this) | `favicon.fromDotLottie(...)` | `npm install @lottiefiles/dotlottie-web` |

`.json` vs `.lottie` trips people up the most — see
[docs/video.md](./video.md#lottie-vs-dotlottie--these-are-different-formats)
for the full explanation, options, and two real gotchas (canvas visibility
and the WASM file's default CDN load) that will otherwise leave you staring
at an animation that "loaded successfully" but never actually renders.

## Quick examples

```js
// PNG sequence — best quality at favicon size, since you control every pixel
const images = await Promise.all(urls.map(loadImage));
favicon.fromFrames(images);

// Video — zero extra installs
favicon.fromVideo("clip.mp4", { loop: true, muted: true });

// Lottie JSON
import lottie from "lottie-web";
const anim = lottie.loadAnimation({ renderer: "canvas", path: "animation.json" });
favicon.fromLottie(anim);

// dotLottie (.lottie)
import { DotLottie } from "@lottiefiles/dotlottie-web";
const canvas = document.createElement("canvas");
document.body.appendChild(canvas);
const dotAnim = new DotLottie({ canvas, src: "animation.lottie", loop: true, autoplay: true });
favicon.fromDotLottie(dotAnim);
```

Full guide for all of these: [docs/video.md](./video.md).
