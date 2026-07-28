# Plugin Guide

A plugin is a plain object with an `install` function and an optional
`destroy` function:

```js
const myPlugin = {
  name: "my-plugin",           // used for idempotency — installing twice is a no-op
  install(favicon, api) {
    // called once, immediately, when favicon.use(myPlugin) runs
  },
  destroy(favicon) {
    // optional — called when favicon.destroy() runs
  },
};

favicon.use(myPlugin);
```

## The `api` object

`install` receives the `Favicon` instance and an `api` object scoped to
registration:

| Method | Purpose |
|---|---|
| `api.registerSource(name, factory)` | Makes `favicon.fromCustomSource(name, ...args)` available, where `factory(...args)` returns a `Source` |
| `api.registerEffect(name, fn)` | Makes `favicon.applyEffect(name, params)` accept this name |
| `api.registerExporter(name, fn)` | Reserved for custom export formats (e.g. ICO multi-resolution bundling) |
| `api.on(event, handler)` | Shorthand for `favicon.on(event, handler)` |

## Implementing a custom source

Every source must satisfy this contract (`src/sources/Source.js`):

```js
{
  frameCount: number,           // Infinity for open-ended/procedural sources
  isProcedural: boolean,
  getSignature(index, time): string,   // cheap cache key for duplicate-frame skipping
  render(renderer, index, time): void, // draw using the Renderer's public drawing methods
  pause?(): void,                // optional — called automatically on favicon.pause()/stop()
  resume?(): void,               // optional — called automatically on favicon.play()/resume()
  destroy?(): void,              // optional — called automatically on cleanup or source replacement
}
```

The optional `pause`/`resume`/`destroy` hooks are how `fromVideo`,
`fromLottie`, and `fromDotLottie` keep their underlying `<video>`/Lottie
player in sync with the Favicon instance's own play state, with no extra
wiring — `AnimationEngine` calls them automatically whenever they exist. A
custom source wrapping something with its own play state (a Web Audio
node, another canvas-based player) should implement them too, for the same
automatic behavior.

`renderer` exposes: `drawImageSource(drawable)`, `drawImageData(imageData)`,
`drawSpriteCell(sheet, cell)`, and `drawProcedural(callback, frame, time)` —
plus `clear()` if you need to draw more than one primitive per frame.

### Example: a plugin adding GIF support

```js
function gifSourceFactory(gifFrames) {
  return {
    frameCount: gifFrames.length,
    isProcedural: false,
    getSignature(index) {
      return `gif:${index}`;
    },
    render(renderer, index) {
      renderer.drawImageSource(gifFrames[index].bitmap);
    },
    destroy() {
      gifFrames.forEach((f) => f.bitmap.close?.());
    },
  };
}

favicon.use({
  name: "gif-support",
  install(favicon, api) {
    api.registerSource("gif", (parsedGif) => gifSourceFactory(parsedGif.frames));
  },
});

const parsed = await parseGif(file);
favicon.fromCustomSource("gif", parsed);
```

This is the same extension point `fromVideo`, `fromLottie`, and
`fromDotLottie` would use if they weren't already core — and it's exactly
what a future format (GIF, APNG, a Pixel Go–native format) would still use
today. No changes to `AnimationEngine`, `Renderer`, or `Scheduler` required.

## Implementing a custom effect

See [effects.md](./effects.md#writing-a-custom-effect).

## Lifecycle and cleanup

- `install()` runs synchronously, once, the first time `favicon.use(plugin)`
  is called for a given `name`. A second `use()` call with the same name is
  a no-op.
- `destroy()` runs when `favicon.destroy()` is called, in the order plugins
  were installed. A plugin whose `destroy()` throws does not prevent the
  rest of the library's teardown (including other plugins) from completing.
- Plugins should release anything they allocate (event listeners, timers,
  `ImageBitmap`s) in their own `destroy()` — the core library only tracks
  its own resources.
