/**
 * Generates every launcher asset from the BlinkMoney bolt.
 *
 *   node scripts/generate-icons.mjs
 *
 * The shipped template icons were Expo's own blue chevron. Rather than hand-exporting
 * PNGs from a design tool — which drift from the app the moment the mark changes — this
 * draws the *same* geometry the in-app `Bolt` component draws, straight from the path in
 * `src/components/brand/logo.tsx`, and encodes the results directly.
 *
 * Deliberately dependency-free. There is no SVG rasteriser in this project's dependency
 * set, and adding one to produce six static files would be a poor trade. A polygon fill
 * and a PNG encoder are about eighty lines between them, and zlib ships with Node.
 *
 * Re-run this after changing BOLT_PATH or the brand palette. Output is deterministic, so
 * an unchanged brand produces byte-identical files.
 */

import { deflateSync } from 'node:zlib';
import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(ROOT, 'assets', 'images');

/* ------------------------------------------------------------------ *
 * Brand
 * ------------------------------------------------------------------ */

/**
 * The bolt, in its 64x64 viewBox — the literal path from `logo.tsx`.
 *
 * Kept as coordinates rather than a path string because it is a simple closed polygon;
 * parsing SVG path syntax to rediscover six points it already has would be ceremony.
 */
const BOLT = [
  [38, 4],
  [14, 34],
  [28, 34],
  [24, 60],
  [50, 28],
  [34, 28],
];
const VIEWBOX = 64;

/** Matching the `boltFill` gradient in `logo.tsx`, top-left to bottom-right. */
const GRADIENT = [
  { at: 0.0, color: [0xb6, 0xf5, 0x8a] },
  { at: 0.55, color: [0x9f, 0xe8, 0x70] }, // Palette.brand
  { at: 1.0, color: [0x3f, 0xbf, 0x6a] },
];

/** Palette.bgPage. The launcher tile matches the app's own first frame. */
const BACKGROUND = [0x0c, 0x0c, 0x0c];

/** Subpixels per axis. 4 gives 16 samples per pixel — smooth at every size used here. */
const SAMPLES = 4;

/* ------------------------------------------------------------------ *
 * Raster
 * ------------------------------------------------------------------ */

/**
 * Even-odd ray cast.
 *
 * The bolt is a simple, non-self-intersecting polygon, so even-odd and nonzero agree and
 * the cheaper test is the right one.
 */
function inside(px, py, poly) {
  let hit = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i];
    const [xj, yj] = poly[j];
    if (yi > py !== yj > py && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi) hit = !hit;
  }
  return hit;
}

/** Samples the gradient at 0–1, interpolating between the stops either side. */
function gradientAt(t) {
  const clamped = Math.max(0, Math.min(1, t));
  for (let i = 1; i < GRADIENT.length; i += 1) {
    const a = GRADIENT[i - 1];
    const b = GRADIENT[i];
    if (clamped <= b.at) {
      const span = b.at - a.at;
      const k = span <= 0 ? 0 : (clamped - a.at) / span;
      return [0, 1, 2].map((c) => Math.round(a.color[c] + (b.color[c] - a.color[c]) * k));
    }
  }
  return GRADIENT[GRADIENT.length - 1].color;
}

/**
 * Draws the bolt into an RGBA buffer.
 *
 * @param size      square canvas edge, in pixels
 * @param coverage  fraction of the canvas edge the bolt's *height* should occupy
 * @param bg        background colour, or null for transparency
 * @param flat      solid colour instead of the gradient — used for the monochrome icon
 */
function render({ size, coverage, bg, flat }) {
  const pixels = Buffer.alloc(size * size * 4);

  if (bg) {
    for (let i = 0; i < size * size; i += 1) {
      pixels[i * 4] = bg[0];
      pixels[i * 4 + 1] = bg[1];
      pixels[i * 4 + 2] = bg[2];
      pixels[i * 4 + 3] = 255;
    }
  }

  // Bounds of the mark itself, not of the viewBox — the bolt does not fill its box, and
  // scaling by the box would leave the icon looking small inside its tile.
  const xs = BOLT.map((p) => p[0]);
  const ys = BOLT.map((p) => p[1]);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);

  // Fitted on height: the bolt is far taller than it is wide, so height is the binding
  // dimension and fitting on width would overflow the tile vertically.
  const scale = (size * coverage) / (maxY - minY);
  const offsetX = (size - (maxX - minX) * scale) / 2 - minX * scale;
  const offsetY = (size - (maxY - minY) * scale) / 2 - minY * scale;

  // The polygon in device pixels, so the inner loop does no per-sample transform.
  const poly = BOLT.map(([x, y]) => [x * scale + offsetX, y * scale + offsetY]);

  const gx0 = minX * scale + offsetX;
  const gy0 = minY * scale + offsetY;
  const gSpan = (maxX - minX) * scale + (maxY - minY) * scale;

  const step = 1 / SAMPLES;
  const total = SAMPLES * SAMPLES;

  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      let hits = 0;
      for (let sy = 0; sy < SAMPLES; sy += 1) {
        for (let sx = 0; sx < SAMPLES; sx += 1) {
          if (inside(x + (sx + 0.5) * step, y + (sy + 0.5) * step, poly)) hits += 1;
        }
      }
      if (hits === 0) continue;

      // Coverage is the alpha of the mark over whatever is already there. Anti-aliasing
      // the edge is what stops the diagonal reading as a staircase at launcher sizes.
      const alpha = hits / total;
      // Projection onto the gradient's own diagonal, matching SVG's x1,y1 -> x2,y2 in
      // object bounding box units.
      const colour = flat ?? gradientAt(gSpan <= 0 ? 0 : (x - gx0 + (y - gy0)) / gSpan);
      const i = (y * size + x) * 4;

      const under = pixels[i + 3] / 255;
      const out = alpha + under * (1 - alpha);
      for (let c = 0; c < 3; c += 1) {
        pixels[i + c] = Math.round(
          (colour[c] * alpha + pixels[i + c] * under * (1 - alpha)) / (out || 1),
        );
      }
      pixels[i + 3] = Math.round(out * 255);
    }
  }

  return pixels;
}

/* ------------------------------------------------------------------ *
 * PNG
 * ------------------------------------------------------------------ */

function crc32(buf) {
  let c = ~0;
  for (const byte of buf) {
    c ^= byte;
    for (let k = 0; k < 8; k += 1) c = (c >>> 1) ^ (0xedb88320 & -(c & 1));
  }
  return ~c >>> 0;
}

function chunk(type, data) {
  const head = Buffer.alloc(8);
  head.writeUInt32BE(data.length, 0);
  head.write(type, 4, 'ascii');
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([head.subarray(4), data])), 0);
  return Buffer.concat([head, data, crc]);
}

/** 8-bit RGBA, filter type 0 on every row. Small files, and trivially verifiable. */
function encodePng(pixels, size) {
  const stride = size * 4;
  const raw = Buffer.alloc((stride + 1) * size);
  for (let y = 0; y < size; y += 1) {
    raw[y * (stride + 1)] = 0;
    pixels.copy(raw, y * (stride + 1) + 1, y * stride, (y + 1) * stride);
  }

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // colour type: RGBA
  // 10-12 default to 0: deflate, adaptive filtering, no interlace.

  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

/* ------------------------------------------------------------------ *
 * Outputs
 * ------------------------------------------------------------------ */

/**
 * Android crops adaptive icons to an arbitrary mask and the outer ~18% per side can be
 * lost entirely, so the foreground and monochrome layers sit well inside that safe zone.
 * The iOS tile is full-bleed because the OS applies its own rounded mask.
 */
const TARGETS = [
  { file: 'icon.png', size: 1024, coverage: 0.56, bg: BACKGROUND },
  { file: 'android-icon-foreground.png', size: 1024, coverage: 0.38, bg: null },
  { file: 'android-icon-background.png', size: 1024, coverage: 0, bg: BACKGROUND },
  {
    file: 'android-icon-monochrome.png',
    size: 1024,
    coverage: 0.38,
    bg: null,
    flat: [0xff, 0xff, 0xff],
  },
  { file: 'splash-icon.png', size: 512, coverage: 0.72, bg: null },
  { file: 'favicon.png', size: 48, coverage: 0.62, bg: BACKGROUND },
];

for (const target of TARGETS) {
  const pixels =
    target.coverage > 0
      ? render(target)
      : render({ ...target, coverage: 0, bg: target.bg, flat: undefined });
  writeFileSync(join(OUT, target.file), encodePng(pixels, target.size));
  console.log(`${target.file.padEnd(32)} ${target.size}x${target.size}`);
}

console.log('\nDone. Rebuild the native app to see the new launcher icon.');
