# Effects Reference

Apply any number of these with `favicon.applyEffect(name, params)`. They run
in the order added and compose — e.g. `pulse` + `glow` together.

| Name | Params (defaults) | What it does |
|---|---|---|
| `fade` | `{ period: 2, min: 0, max: 1 }` | Sine-wave alpha fade in/out |
| `blink` | `{ intervalSeconds: 0.5 }` | Hard on/off visibility toggle |
| `rotate` | `{ degreesPerSecond: 180 }` | Continuous rotation |
| `pulse` | `{ period: 1, minScale: 0.85, maxScale: 1 }` | Sine-wave scale pulse |
| `shake` | `{ amplitude: 2, speed: 20 }` | Positional jitter |
| `colorShift` | `{ degreesPerSecond: 90 }` | Continuous hue rotation |
| `pixelDissolve` | `{ amount: 0.3, seedStep: 1 }` | Randomly drop pixels (deterministic per-frame) |
| `noise` | `{ amount: 20 }` | Additive per-pixel RGB noise |
| `glow` | `{ color: '#fff', blur: 6 }` | Soft shadow-based glow |
| `brightness` | `{ amount: 1.2 }` | CSS `brightness()` filter (1 = unchanged) |
| `contrast` | `{ amount: 1.2 }` | CSS `contrast()` filter (1 = unchanged) |
| `hue` | `{ degrees: 90 }` | Static hue rotation |
| `invert` | `{}` | Full color inversion |

## Writing a custom effect

An effect is a pure function: `(ctx, size, time, params) => void`. It
receives the scratch canvas's 2D context with the current frame already
drawn onto it, and should mutate it in place.

```js
function vignette(ctx, size, time, { strength = 0.4 } = {}) {
  const gradient = ctx.createRadialGradient(
    size / 2, size / 2, size * 0.3,
    size / 2, size / 2, size * 0.5
  );
  gradient.addColorStop(0, "rgba(0,0,0,0)");
  gradient.addColorStop(1, `rgba(0,0,0,${strength})`);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);
}
```

Register it via a plugin so it's usable through the same `applyEffect` API
as the built-ins:

```js
favicon.use({
  name: "vignette-plugin",
  install(favicon, api) {
    api.registerEffect("vignette", vignette);
  },
});

favicon.applyEffect("vignette", { strength: 0.5 });
```
