/**
 * @module effects/index
 * Built-in effect functions, each a pure `(ctx, size, time, params) => void`.
 * All operate on the scratch context that already contains the rendered
 * frame; each effect either draws additional pixels or applies a global
 * composite operation / CSS filter to what's already there.
 */

import { clamp } from "../utils/math.js";

/** Fade in/out via global alpha overlay. params: { period=2, min=0, max=1 } */
export function fade(ctx, size, time, { period = 2, min = 0, max = 1 } = {}) {
  const t = (Math.sin((time / period) * Math.PI * 2) + 1) / 2;
  const alpha = min + (max - min) * t;
  ctx.globalCompositeOperation = "destination-in";
  ctx.fillStyle = `rgba(0,0,0,${alpha})`;
  ctx.fillRect(0, 0, size, size);
  ctx.globalCompositeOperation = "source-over";
}

/** Hard on/off blink. params: { intervalSeconds=0.5 } */
export function blink(ctx, size, time, { intervalSeconds = 0.5 } = {}) {
  const visible = Math.floor(time / intervalSeconds) % 2 === 0;
  if (!visible) {
    ctx.clearRect(0, 0, size, size);
  }
}

/** Rotate the whole frame. params: { degreesPerSecond=180 } */
export function rotate(ctx, size, time, { degreesPerSecond = 180 } = {}) {
  const angle = ((time * degreesPerSecond) % 360) * (Math.PI / 180);
  const snapshot = ctx.getImageData(0, 0, size, size);
  ctx.clearRect(0, 0, size, size);
  ctx.save();
  ctx.translate(size / 2, size / 2);
  ctx.rotate(angle);
  ctx.translate(-size / 2, -size / 2);
  // putImageData ignores transforms, so draw via a temporary bitmap-like path:
  // create an ImageBitmap-free approach using a detached canvas is overkill
  // here — instead re-draw through drawImage by first writing to an
  // intermediate canvas.
  const tmp = ctx.canvas.ownerDocument
    ? ctx.canvas.ownerDocument.createElement("canvas")
    : new OffscreenCanvas(size, size);
  tmp.width = size;
  tmp.height = size;
  tmp.getContext("2d").putImageData(snapshot, 0, 0);
  ctx.drawImage(tmp, 0, 0, size, size);
  ctx.restore();
}

/** Scale pulse. params: { period=1, minScale=0.85, maxScale=1 } */
export function pulse(ctx, size, time, { period = 1, minScale = 0.85, maxScale = 1 } = {}) {
  const t = (Math.sin((time / period) * Math.PI * 2) + 1) / 2;
  const scale = minScale + (maxScale - minScale) * t;
  const snapshot = ctx.getImageData(0, 0, size, size);
  ctx.clearRect(0, 0, size, size);
  ctx.save();
  ctx.translate(size / 2, size / 2);
  ctx.scale(scale, scale);
  ctx.translate(-size / 2, -size / 2);
  const tmp = ctx.canvas.ownerDocument
    ? ctx.canvas.ownerDocument.createElement("canvas")
    : new OffscreenCanvas(size, size);
  tmp.width = size;
  tmp.height = size;
  tmp.getContext("2d").putImageData(snapshot, 0, 0);
  ctx.drawImage(tmp, 0, 0, size, size);
  ctx.restore();
}

/** Positional jitter. params: { amplitude=2, speed=20 } */
export function shake(ctx, size, time, { amplitude = 2, speed = 20 } = {}) {
  const dx = Math.sin(time * speed) * amplitude;
  const dy = Math.cos(time * speed * 1.3) * amplitude;
  const snapshot = ctx.getImageData(0, 0, size, size);
  ctx.clearRect(0, 0, size, size);
  ctx.putImageData(snapshot, dx, dy);
}

/** Hue rotation over time. params: { degreesPerSecond=90 } */
export function colorShift(ctx, size, time, { degreesPerSecond = 90 } = {}) {
  const hue = (time * degreesPerSecond) % 360;
  ctx.filter = `hue-rotate(${hue}deg)`;
  const snapshot = ctx.getImageData(0, 0, size, size);
  const tmp = ctx.canvas.ownerDocument
    ? ctx.canvas.ownerDocument.createElement("canvas")
    : new OffscreenCanvas(size, size);
  tmp.width = size;
  tmp.height = size;
  tmp.getContext("2d").putImageData(snapshot, 0, 0);
  ctx.clearRect(0, 0, size, size);
  ctx.drawImage(tmp, 0, 0);
  ctx.filter = "none";
}

/** Randomly drop pixels to "dissolve". params: { amount=0.3, seedStep=1 } */
export function pixelDissolve(ctx, size, time, { amount = 0.3, seedStep = 1 } = {}) {
  const frameSeed = Math.floor(time * 30 * seedStep);
  const imageData = ctx.getImageData(0, 0, size, size);
  const data = imageData.data;
  let rng = frameSeed || 1;
  const next = () => {
    // xorshift32 — deterministic per-frame, no allocations, good enough for a visual effect.
    rng ^= rng << 13;
    rng ^= rng >>> 17;
    rng ^= rng << 5;
    return ((rng >>> 0) % 1000) / 1000;
  };
  for (let i = 0; i < data.length; i += 4) {
    if (next() < amount) data[i + 3] = 0;
  }
  ctx.putImageData(imageData, 0, 0);
}

/** Additive noise. params: { amount=20 } */
export function noise(ctx, size, time, { amount = 20 } = {}) {
  const imageData = ctx.getImageData(0, 0, size, size);
  const data = imageData.data;
  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] === 0) continue;
    const n = (Math.random() - 0.5) * amount;
    data[i] = clamp(data[i] + n, 0, 255);
    data[i + 1] = clamp(data[i + 1] + n, 0, 255);
    data[i + 2] = clamp(data[i + 2] + n, 0, 255);
  }
  ctx.putImageData(imageData, 0, 0);
}

/** Soft glow via layered blur-ish shadow. params: { color='#fff', blur=6 } */
export function glow(ctx, size, time, { color = "#ffffff", blur = 6 } = {}) {
  const snapshot = ctx.getImageData(0, 0, size, size);
  const tmp = ctx.canvas.ownerDocument
    ? ctx.canvas.ownerDocument.createElement("canvas")
    : new OffscreenCanvas(size, size);
  tmp.width = size;
  tmp.height = size;
  const tmpCtx = tmp.getContext("2d");
  tmpCtx.putImageData(snapshot, 0, 0);
  ctx.save();
  ctx.shadowColor = color;
  ctx.shadowBlur = blur;
  ctx.drawImage(tmp, 0, 0);
  ctx.restore();
}

/** Brightness adjustment. params: { amount=1.2 } (1 = unchanged) */
export function brightness(ctx, size, time, { amount = 1.2 } = {}) {
  applyCssFilter(ctx, size, `brightness(${amount})`);
}

/** Contrast adjustment. params: { amount=1.2 } (1 = unchanged) */
export function contrast(ctx, size, time, { amount = 1.2 } = {}) {
  applyCssFilter(ctx, size, `contrast(${amount})`);
}

/** Hue rotation (static, not time-based). params: { degrees=90 } */
export function hue(ctx, size, time, { degrees = 90 } = {}) {
  applyCssFilter(ctx, size, `hue-rotate(${degrees}deg)`);
}

/** Full color inversion. params: {} */
export function invert(ctx, size) {
  applyCssFilter(ctx, size, "invert(1)");
}

/**
 * Shared helper: apply a CSS `filter` string to the current canvas contents.
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} size
 * @param {string} filterString
 */
function applyCssFilter(ctx, size, filterString) {
  const snapshot = ctx.getImageData(0, 0, size, size);
  const tmp = ctx.canvas.ownerDocument
    ? ctx.canvas.ownerDocument.createElement("canvas")
    : new OffscreenCanvas(size, size);
  tmp.width = size;
  tmp.height = size;
  tmp.getContext("2d").putImageData(snapshot, 0, 0);
  ctx.clearRect(0, 0, size, size);
  ctx.filter = filterString;
  ctx.drawImage(tmp, 0, 0);
  ctx.filter = "none";
}

/** Registry mapping effect names to functions, used by `Favicon#applyEffect`. */
export const builtinEffects = {
  fade,
  blink,
  rotate,
  pulse,
  shake,
  colorShift,
  pixelDissolve,
  noise,
  glow,
  brightness,
  contrast,
  hue,
  invert,
};
