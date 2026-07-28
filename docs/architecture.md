# Architecture

favicon-motion is split into single-responsibility modules so that any one
concern — timing, drawing, favicon-tag DOM manipulation, playback state,
input format — can change without touching the others.

## Data flow for one animation tick

```
Scheduler                     AnimationEngine                 Renderer            FaviconManager
   |  (rAF tick, FPS/rate-adjusted)  |                            |                     |
   |------------- onTick() --------->|                            |                     |
   |                                 | advance frame/time          |                     |
   |                                 | source.getSignature(...)    |                     |
   |                                 |--- duplicate? skip ------->  (nothing happens)     |
   |                                 |--- else: source.render() -->|                     |
   |                                 |    effects.apply() -------->|                     |
   |                                 |    renderer.toDataURL() --->|                     |
   |                                 |<--------- dataUrl ----------|                     |
   |                                 |------------------------------------------------->update()
```

## Why timing and rendering are separate classes

The `Scheduler` knows nothing about canvases. It only answers "has enough
time passed to justify a tick, given the current FPS, playback rate, and tab
visibility?" This means:

- Playback rate and FPS changes are solved once, not re-implemented per
  source type.
- The hidden-tab throttle (drop to 2fps in a background tab) works
  identically for every source without the animation engine or renderer
  needing to know about `document.visibilityState`.
- The scheduler is fully unit-testable without a DOM or canvas at all — see
  `tests/Scheduler.test.js`, which drives it with a mocked `requestFrame`.

## Why sources are pluggable objects, not a big switch statement

Every source — `FrameListSource`, `SpriteSheetSource`, `ProceduralSource`, or
anything a plugin registers — implements the same four-member contract
(`src/sources/Source.js`):

```js
{
  frameCount: number,          // Infinity for open-ended procedural sources
  isProcedural: boolean,
  getSignature(index, time): string,
  render(renderer, index, time): void,
}
```

`AnimationEngine` and `Renderer` never branch on "is this a sprite sheet or
a frame list?" — they just call `source.render(...)`. Adding GIF, Lottie,
APNG, or a Pixel Go–native animation format later means writing one new
class that implements this contract; nothing in the engine changes.

## Why effects operate on a scratch canvas

`Renderer` keeps two canvases: the main one and a scratch one. Effects
always run against the scratch canvas (`EffectsPipeline.apply`), and the
main canvas is only overwritten once the whole effect chain has finished
(`renderer.commitScratch()`). If an effect function throws partway through,
the favicon the user sees is never left half-drawn.

## Why the favicon tag manager is the only DOM-touching module

`FaviconManager` is the sole place that queries or mutates
`<link rel="icon">`. It remembers the original `href`/`type` of any tag it
finds so `restore()` can put things back exactly as they were, and it
creates a tag (and remembers to remove it, not just blank it) if the page
had none. No other module reaches into `document` for icon-related work,
which keeps `restore()` correct.

## Why the plugin API only exposes registration hooks

`PluginManager` doesn't hand plugins the whole internal state — it hands
them `registerSource`, `registerEffect`, `registerExporter`, and `on`. That
keeps a plugin's blast radius limited to "things it explicitly registered,"
and keeps `Favicon#destroy()` able to reliably tear down every plugin (a
misbehaving plugin's `destroy()` throwing doesn't stop the rest of cleanup —
see `PluginManager.destroyAll`).
