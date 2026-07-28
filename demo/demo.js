import { Favicon } from "../src/index.js";

/**
 * Mirrors a Favicon instance's rendered output onto a local <canvas> so the
 * demo page can show every example side-by-side. Only one instance should
 * actually own the page's real <link rel="icon">, since a page only has one
 * tab icon — everyone else's FaviconManager.update() is short-circuited.
 */
function mirrorToCanvas(favicon, canvas, { driveRealFavicon = false } = {}) {
  const ctx = canvas.getContext("2d");
  const img = new Image();
  img.onload = () => {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  };
  favicon.on("frame", () => {
    const dataUrl = favicon.capture();
    if (typeof dataUrl === "string") img.src = dataUrl;
  });
  if (!driveRealFavicon) {
    favicon._faviconManager.update = () => {};
  }
  return favicon;
}

function wireToggle(card, favicon) {
  const btn = card.querySelector('[data-action="toggle"]');
  if (!btn) return;
  btn.addEventListener("click", () => {
    if (favicon.isPlaying()) {
      favicon.pause();
      btn.textContent = "Play";
    } else {
      favicon.resume();
      btn.textContent = "Pause";
    }
  });
}

// ---------------------------------------------------------------------------
// 1. Procedural loading spinner
// ---------------------------------------------------------------------------
const spinnerCard = document.getElementById("card-spinner");
const spinner = new Favicon({ size: 32, fps: 24 });
spinner.animate((ctx, frame, time) => {
  const size = 32;
  const cx = size / 2;
  const cy = size / 2;
  const radius = 11;
  ctx.lineWidth = 4;
  ctx.strokeStyle = "#2a2f3a";
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.stroke();

  const angle = (time * 4) % (Math.PI * 2);
  ctx.strokeStyle = "#6ee7b7";
  ctx.beginPath();
  ctx.arc(cx, cy, radius, angle, angle + Math.PI * 0.6);
  ctx.stroke();
});
mirrorToCanvas(spinner, spinnerCard.querySelector("canvas"), { driveRealFavicon: true });
spinner.play();
wireToggle(spinnerCard, spinner);

// ---------------------------------------------------------------------------
// 2. Pixel art walk cycle from raw ImageData frames
// ---------------------------------------------------------------------------
function buildPixelFrame(pose) {
  const size = 16;
  const data = new Uint8ClampedArray(size * size * 4);
  const setPixel = (x, y, [r, g, b, a = 255]) => {
    if (x < 0 || y < 0 || x >= size || y >= size) return;
    const i = (y * size + x) * 4;
    data[i] = r;
    data[i + 1] = g;
    data[i + 2] = b;
    data[i + 3] = a;
  };
  // Simple 2-frame "walk": body stays put, legs alternate.
  const body = [4, 4, 5, 4, 6, 4, 4, 5, 5, 5, 6, 5, 4, 6, 5, 6, 6, 6];
  for (let i = 0; i < body.length; i += 2) setPixel(body[i], body[i + 1], [110, 231, 183, 255]);
  if (pose === 0) {
    setPixel(4, 7, [230, 230, 230, 255]);
    setPixel(6, 8, [230, 230, 230, 255]);
  } else {
    setPixel(4, 8, [230, 230, 230, 255]);
    setPixel(6, 7, [230, 230, 230, 255]);
  }
  return new ImageData(data, size, size);
}

const pixelCard = document.getElementById("card-pixel");
const pixel = new Favicon({ size: 16, fps: 4 });
pixel.fromFrames([buildPixelFrame(0), buildPixelFrame(1)]).play();
mirrorToCanvas(pixel, pixelCard.querySelector("canvas"));
wireToggle(pixelCard, pixel);
pixelCard.querySelector('[data-action="reverse"]').addEventListener("click", () => {
  pixel.reverse();
});

// ---------------------------------------------------------------------------
// 3. Sprite sheet animation (generated grid, repeated cells to show
//    duplicate-frame skipping in the perf stats card)
// ---------------------------------------------------------------------------
function buildSpriteSheet() {
  const cell = 16;
  const cols = 4;
  const canvas = document.createElement("canvas");
  canvas.width = cell * cols;
  canvas.height = cell;
  const ctx = canvas.getContext("2d");
  const colors = ["#6ee7b7", "#60a5fa", "#f472b6", "#fbbf24"];
  colors.forEach((color, i) => {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(i * cell + cell / 2, cell / 2, cell / 2 - 2, 0, Math.PI * 2);
    ctx.fill();
  });
  return canvas;
}

const spriteCard = document.getElementById("card-sprite");
const sheet = buildSpriteSheet();
const sprite = new Favicon({ size: 32, fps: 6 });
sprite
  .fromSpriteSheet({
    image: sheet,
    frameWidth: 16,
    frameHeight: 16,
    columns: 4,
    rows: 1,
    // Each cell repeats 3x consecutively — those repeats resolve to the same
    // frame signature, so the render/export step is skipped for 2 out of
    // every 3 ticks. Watch the perf stats card.
    order: [0, 0, 0, 1, 1, 1, 2, 2, 2, 3, 3, 3],
  })
  .play();
mirrorToCanvas(sprite, spriteCard.querySelector("canvas"));
wireToggle(spriteCard, sprite);
spriteCard.querySelector('[data-action="fps-up"]').addEventListener("click", () => {
  sprite.setFPS(Math.min(30, sprite._scheduler.getFPS() + 2));
});
spriteCard.querySelector('[data-action="fps-down"]').addEventListener("click", () => {
  sprite.setFPS(Math.max(1, sprite._scheduler.getFPS() - 2));
});

// ---------------------------------------------------------------------------
// 4. Live clock face
// ---------------------------------------------------------------------------
const clockCard = document.getElementById("card-clock");
const clock = new Favicon({ size: 32, fps: 1 });
clock.animate((ctx) => {
  const now = new Date();
  const size = 32;
  const cx = size / 2;
  const cy = size / 2;
  ctx.fillStyle = "#14171f";
  ctx.beginPath();
  ctx.arc(cx, cy, 14, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#8b93a3";
  ctx.lineWidth = 1.5;
  ctx.stroke();

  const drawHand = (angleDeg, length, color, width) => {
    const rad = ((angleDeg - 90) * Math.PI) / 180;
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + Math.cos(rad) * length, cy + Math.sin(rad) * length);
    ctx.stroke();
  };
  drawHand((now.getHours() % 12) * 30 + now.getMinutes() * 0.5, 7, "#e7e9ee", 2);
  drawHand(now.getMinutes() * 6, 10, "#e7e9ee", 1.5);
  drawHand(now.getSeconds() * 6, 11, "#6ee7b7", 1);
});
clock.play();
mirrorToCanvas(clock, clockCard.querySelector("canvas"));

// ---------------------------------------------------------------------------
// 5. Notification badge
// ---------------------------------------------------------------------------
const badgeCard = document.getElementById("card-game");
const badge = new Favicon({ size: 32, fps: 1 });
let notificationCount = 0;
badge.animate((ctx) => {
  const size = 32;
  ctx.fillStyle = "#1c2230";
  ctx.beginPath();
  ctx.roundRect(4, 4, 24, 24, 6);
  ctx.fill();
  ctx.fillStyle = "#8b93a3";
  ctx.fillRect(10, 22, 12, 3);

  if (notificationCount > 0) {
    ctx.fillStyle = "#f472b6";
    ctx.beginPath();
    ctx.arc(size - 8, 8, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#0b0d12";
    ctx.font = "bold 10px sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(String(Math.min(9, notificationCount)), size - 8, 9);
  }
});
badge.play();
mirrorToCanvas(badge, badgeCard.querySelector("canvas"));
badgeCard.querySelector('[data-action="increment"]').addEventListener("click", () => {
  notificationCount += 1;
});

// ---------------------------------------------------------------------------
// 6. Effects pipeline
// ---------------------------------------------------------------------------
const effectsCard = document.getElementById("card-effects");
const effectsFavicon = new Favicon({ size: 32, fps: 20 });
effectsFavicon
  .animate((ctx) => {
    const size = 32;
    ctx.fillStyle = "#6ee7b7";
    ctx.beginPath();
    ctx.moveTo(size / 2, 6);
    ctx.lineTo(26, 24);
    ctx.lineTo(6, 24);
    ctx.closePath();
    ctx.fill();
  })
  .play();
mirrorToCanvas(effectsFavicon, effectsCard.querySelector("canvas"));
effectsCard.querySelector('[data-action="pulse"]').addEventListener("click", () => {
  effectsFavicon.applyEffect("pulse", { period: 0.8, minScale: 0.8 });
});
effectsCard.querySelector('[data-action="glow"]').addEventListener("click", () => {
  effectsFavicon.applyEffect("glow", { color: "#6ee7b7", blur: 8 });
});
effectsCard.querySelector('[data-action="clear"]').addEventListener("click", () => {
  effectsFavicon.clearEffects();
});

// ---------------------------------------------------------------------------
// 7. Performance stats — instruments the sprite sheet demo above, which
//    deliberately repeats cells so duplicate-frame skipping is visible.
// ---------------------------------------------------------------------------
const perfOutput = document.getElementById("perf-output");
let ticks = 0;
let commits = 0;
const originalTick = sprite._scheduler._onTick;
sprite._scheduler._onTick = (...args) => {
  ticks += 1;
  originalTick(...args);
};
sprite.on("frame", () => {
  commits += 1;
});
setInterval(() => {
  const skipped = Math.max(0, ticks - commits);
  const skipRate = ticks > 0 ? ((skipped / ticks) * 100).toFixed(0) : "0";
  perfOutput.textContent =
    `scheduler ticks:     ${ticks}\n` +
    `frames committed:    ${commits}\n` +
    `duplicates skipped:  ${skipped} (${skipRate}%)`;
}, 250);
