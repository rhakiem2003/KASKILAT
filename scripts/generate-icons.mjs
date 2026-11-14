/**
 * @file generate-icons.mjs
 * @description Membuat ikon PWA KasKilat (192/512/maskable/apple-touch + favicon.svg)
 * tanpa dependensi native — PNG ditulis langsung dengan encoder minimal.
 */

import { deflateSync } from 'node:zlib';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  BOLT_POINTS,
  BOLT_STROKE,
  TILE_FROM,
  TILE_RADIUS,
  TILE_TO,
  VIEW_BOX,
} from '../src/components/brand/logo-geometry.ts';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT_DIR = join(ROOT, 'public', 'icons');
const PUBLIC_DIR = join(ROOT, 'public');

const WHITE = [255, 255, 255];

function hexToRgb(hex) {
  return [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
}

const TILE_FROM_RGB = hexToRgb(TILE_FROM);
const TILE_TO_RGB = hexToRgb(TILE_TO);

/* ---------------------------- PNG encoder ---------------------------- */

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n += 1) {
    let c = n;
    for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c >>> 0;
  }
  return table;
})();

function crc32(buffer) {
  let c = 0xffffffff;
  for (const byte of buffer) c = CRC_TABLE[(c ^ byte) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const typeBuf = Buffer.from(type, 'ascii');
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length, 0);
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
  return Buffer.concat([length, typeBuf, data, crcBuf]);
}

function encodePng(width, height, rgba) {
  const signature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // RGBA
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  const stride = width * 4;
  const raw = Buffer.alloc((stride + 1) * height);
  for (let y = 0; y < height; y += 1) {
    raw[y * (stride + 1)] = 0; // filter: none
    rgba.copy(raw, y * (stride + 1) + 1, y * stride, (y + 1) * stride);
  }

  return Buffer.concat([
    signature,
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

/* ---------------------------- Shape drawing ---------------------------- */

function insideRoundedRect(x, y, size, radius) {
  const r = radius;
  const nearLeft = x < r;
  const nearRight = x > size - r;
  const nearTop = y < r;
  const nearBottom = y > size - r;

  if ((nearLeft || nearRight) && (nearTop || nearBottom)) {
    const cx = nearLeft ? r : size - r;
    const cy = nearTop ? r : size - r;
    return (x - cx) ** 2 + (y - cy) ** 2 <= r * r;
  }
  return true;
}

function distanceToSegment(px, py, ax, ay, bx, by) {
  const dx = bx - ax;
  const dy = by - ay;
  const lengthSquared = dx * dx + dy * dy;
  const t = lengthSquared === 0
    ? 0
    : Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / lengthSquared));
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
}

function insidePolygon(x, y, points) {
  let inside = false;
  for (let i = 0, j = points.length - 1; i < points.length; j = i, i += 1) {
    const [xi, yi] = points[i];
    const [xj, yj] = points[j];
    const crossesRow = yi > y !== yj > y;
    if (crossesRow && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

function distanceToPolygon(x, y, points) {
  let min = Infinity;
  for (let i = 0; i < points.length; i += 1) {
    const [ax, ay] = points[i];
    const [bx, by] = points[(i + 1) % points.length];
    min = Math.min(min, distanceToSegment(x, y, ax, ay, bx, by));
  }
  return min;
}

/** Gradasi diagonal tile, sama dengan linearGradient di komponen SVG. */
function tileColor(nx, ny) {
  const t = Math.max(0, Math.min(1, (nx + ny) / 2));
  return TILE_FROM_RGB.map((from, i) => Math.round(from + (TILE_TO_RGB[i] - from) * t));
}

function renderIcon(size, { maskable = false } = {}) {
  const supersample = 2;
  const hi = size * supersample;
  const pixels = Buffer.alloc(hi * hi * 4);
  const radius = maskable ? 0 : (size * TILE_RADIUS) / VIEW_BOX;
  const boltStroke = BOLT_STROKE / 2;

  for (let y = 0; y < hi; y += 1) {
    for (let x = 0; x < hi; x += 1) {
      const nx = x / hi;
      const ny = y / hi;
      const px = x / supersample;
      const py = y / supersample;
      const index = (y * hi + x) * 4;

      let color = null;
      let alpha = 0;

      if (insideRoundedRect(px, py, size, radius)) {
        color = tileColor(nx, ny);
        alpha = 255;
      }

      if (color) {
        const scale = maskable ? 0.82 : 1;
        const offset = (1 - scale) / 2;
        const bx = ((nx - offset) / scale) * VIEW_BOX;
        const by = ((ny - offset) / scale) * VIEW_BOX;
        if (insidePolygon(bx, by, BOLT_POINTS) || distanceToPolygon(bx, by, BOLT_POINTS) <= boltStroke) {
          color = WHITE;
        }
      }

      if (color) {
        pixels[index] = color[0];
        pixels[index + 1] = color[1];
        pixels[index + 2] = color[2];
        pixels[index + 3] = alpha;
      }
    }
  }

  // Downsample supersample → ukuran akhir (antialias sederhana)
  const out = Buffer.alloc(size * size * 4);
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      let r = 0;
      let g = 0;
      let b = 0;
      let a = 0;
      for (let sy = 0; sy < supersample; sy += 1) {
        for (let sx = 0; sx < supersample; sx += 1) {
          const i = ((y * supersample + sy) * hi + (x * supersample + sx)) * 4;
          r += pixels[i];
          g += pixels[i + 1];
          b += pixels[i + 2];
          a += pixels[i + 3];
        }
      }
      const count = supersample * supersample;
      const index = (y * size + x) * 4;
      out[index] = Math.round(r / count);
      out[index + 1] = Math.round(g / count);
      out[index + 2] = Math.round(b / count);
      out[index + 3] = Math.round(a / count);
    }
  }

  return encodePng(size, size, out);
}

/* ---------------------------- Output ---------------------------- */

mkdirSync(OUT_DIR, { recursive: true });
mkdirSync(PUBLIC_DIR, { recursive: true });

const outputs = [
  ['icon-192.png', 192, {}],
  ['icon-512.png', 512, {}],
  ['icon-512-maskable.png', 512, { maskable: true }],
];

for (const [name, size, options] of outputs) {
  writeFileSync(join(OUT_DIR, name), renderIcon(size, options));
}

writeFileSync(join(OUT_DIR, 'apple-touch-icon.png'), renderIcon(180));

const boltPoints = BOLT_POINTS.map(([x, y]) => `${x},${y}`).join(' ');

const favicon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${VIEW_BOX} ${VIEW_BOX}">
  <defs>
    <linearGradient id="tile" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="${TILE_FROM}"/>
      <stop offset="1" stop-color="${TILE_TO}"/>
    </linearGradient>
  </defs>
  <rect width="${VIEW_BOX}" height="${VIEW_BOX}" rx="${TILE_RADIUS}" fill="url(#tile)"/>
  <polygon points="${boltPoints}" fill="#ffffff" stroke="#ffffff" stroke-width="${BOLT_STROKE}" stroke-linejoin="round"/>
</svg>
`;
writeFileSync(join(PUBLIC_DIR, 'favicon.svg'), favicon);

console.log('Ikon KasKilat dibuat di public/icons dan public/favicon.svg');
