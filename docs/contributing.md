# Contributing

## Setup

```bash
git clone <repo>
cd favicon-motion
npm install
npm run test     # vitest, jsdom environment
npm run lint      # eslint
npm run dev       # demo site at localhost, via Vite
npm run build     # rollup -> dist/ (ESM, CJS, UMD, UMD min)
```

## Code style

- Plain JavaScript (ES modules), documented with JSDoc — no TypeScript, no
  build-time type stripping.
- One responsibility per file. If a change means a file starts doing two
  unrelated things, split it instead of growing it.
- Prefer composition over inheritance — most classes in this codebase take
  their dependencies in the constructor rather than extending a base class
  (the one exception, `Favicon extends EventEmitter`, is a small, stable
  mixin-style base with no logic of its own to override).
- No magic numbers — name them as constants in `src/utils/constants.js`
  even if they're only used once, and explain *why* that value in a
  comment if it's not obvious (see `HIDDEN_TAB_THROTTLE_DELAY` for an
  example).

## Adding a new source type

Implement the `Source` contract (`src/sources/Source.js`) in a new file
under `src/sources/`, following the pattern in `FrameListSource.js` or
`SpriteSheetSource.js`. Add a corresponding `Favicon.fromX()` convenience
method in `src/core/Favicon.js` only if it's a built-in source; third-party
formats should ship as a plugin instead (see `docs/plugins.md`).

## Adding a new effect

Add a pure `(ctx, size, time, params) => void` function to
`src/effects/index.js` and register it in `builtinEffects`. Keep it
side-effect-free beyond mutating the passed context — effects run inside
`EffectsPipeline.apply`, which owns snapshotting/committing the canvas.

## Tests

Every module has a corresponding file in `tests/`. jsdom doesn't implement
the Canvas 2D API, so `tests/setup.js` installs a minimal mock context and
an `ImageData` polyfill — extend that mock if a new test needs a context
method it doesn't yet provide, rather than reaching for the native `canvas`
package (keeps the test suite dependency-free and fast).

For anything timing-related, mock `src/utils/env.js`'s `requestFrame` (see
`tests/Scheduler.test.js`) rather than using real timers — it keeps tests
deterministic and instant.

## Commit checklist

- [ ] `npm run lint` passes
- [ ] `npm run test` passes
- [ ] `npm run build` produces `dist/` without warnings
- [ ] New public API surface is documented in `README.md`
- [ ] New source/effect/plugin hook is documented in `docs/`
