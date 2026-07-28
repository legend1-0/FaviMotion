# Performance Guide

A favicon animation runs for as long as the tab is open, so favicon-motion
is built around one rule: **never do work a frame doesn't need.**

## Duplicate-frame skipping

Every render is keyed by a signature (`FrameCache` in `src/cache/`):

- Frame-list and sprite-sheet sources sign by frame/cell index — cheap,
  since it's just a number.
- Procedural sources sign by a quantized time bucket (~33ms), since their
  output is a function of time rather than a discrete index.

Before drawing anything, the `AnimationEngine` compares the new signature to
the signature of the frame that's actually committed to the favicon. If
they match, the tick is a no-op: no `render()` call, no effects pass, no
`toDataURL()`, no DOM write. A sprite sheet with repeated cells (e.g. a
pause held for several frames) benefits the most — see the sprite sheet
demo, which deliberately repeats each cell 3x and reports the skip rate live.

## Data URL caching

Even when a frame *does* need rendering, if its signature was seen
recently, the previously computed data URL is reused instead of re-running
`toDataURL()`/`convertToBlob()`. This is a small LRU (`FrameCache`, default
128 entries) — useful for looping animations that revisit the same frames.

## Frame-skipping under load

The `Scheduler` accumulates elapsed time and only emits a tick once a full
frame interval has accumulated (`src/scheduler/Scheduler.js`). If the main
thread stalls (a long GC pause, a busy tab), the scheduler does not fire a
burst of catch-up ticks — it clamps the delta and drops the backlog rather
than visually "fast-forwarding."

## Hidden-tab throttling

Using the Page Visibility API, the scheduler detects when the tab has been
hidden for more than ~500ms and drops the effective frame rate to 2fps until
the tab is visible again. The user's chosen FPS is restored automatically —
nothing needs to be re-configured on tab focus.

## OffscreenCanvas

When `OffscreenCanvas` is available, `Renderer` uses it for both the main
and scratch canvases, avoiding a DOM-attached `<canvas>` entirely. Where
it's not available (older Safari), the renderer transparently falls back to
a detached `HTMLCanvasElement` — no code outside `Renderer` needs to know
which path was taken.

## Object pooling

`src/cache/ObjectPool.js` provides a generic pool for anything the render
loop would otherwise allocate every frame. The built-in sources don't need
it (they reuse the same `Renderer`/scratch canvas across frames already),
but it's there for plugin authors writing sources that need per-frame
scratch objects (e.g. particle systems).

## Practical tips

- Prefer a lower `fps` over a high one where the animation reads fine either
  way — a slow pulse or clock face rarely needs more than 4–8fps.
- For sprite sheets, holding on a cell for multiple consecutive frames (via
  a repeated `order` array) is effectively free due to duplicate-frame
  skipping — use it instead of adding "hold" frames as separate images.
- Call `favicon.destroy()` (not just `pause()`) when an animation is truly
  done — it stops the scheduler, releases canvases, and clears the frame
  cache, so nothing keeps running or holding memory in the background.
