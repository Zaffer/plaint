#!/usr/bin/env node
/* Rebuild the icons/ folder from the logo.

   The logo is the app's default tray — Poster red, blue, green and yellow —
   as four round daubs, one to a corner, painted in that order so each laps
   over the ones before: blue over red across the top, green over red down the
   left, yellow over green and blue around the bottom right. Same picture as
   the favicon in index.html. Installed apps need it as real PNGs — iOS
   ignores SVG icons entirely — so this draws the same circles and writes them
   out at the sizes the manifest and Apple ask for:

       node makeicons.mjs

   No dependencies: circles are rasterised by hand (16 subsamples per pixel
   for soft edges) and the PNG container is written directly, with node's
   built-in zlib doing the one part that needs a library.

   Like make404.py, this is not a build step — the PNGs are committed, and this
   only exists to regenerate them if the logo or the sizes ever change. */

import { deflateSync } from "node:zlib";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = join(HERE, "icons");

// The favicon's geometry, verbatim: a 32-unit box, four radius-8 circles.
// Order matters the way it does in the SVG — later circles paint over earlier.
const BOX = 32;
const CIRCLES = [
  { x: 11, y: 11, r: 8, rgb: [0xe0, 0x35, 0x6b] }, // red    (top left)
  { x: 21, y: 11, r: 8, rgb: [0x2b, 0x6f, 0xe5] }, // blue   (top right)
  { x: 11, y: 21, r: 8, rgb: [0x2c, 0xa2, 0x4a] }, // green  (bottom left)
  { x: 21, y: 21, r: 8, rgb: [0xf1, 0xc4, 0x0f] }, // yellow (bottom right)
];

// Centre of the artwork and how far it reaches from there, so every size can
// scale it to a chosen fraction of the icon without knowing the shapes.
const CX = BOX / 2;
const CY = BOX / 2;
const REACH = Math.max(
  ...CIRCLES.map((c) => Math.hypot(c.x - CX, c.y - CY) + c.r)
);

// The paper colour, same as the manifest's background and the light theme.
const PAPER = [0xf5, 0xf1, 0xe9];

/* One icon: `frac` is how much of the icon's half-width the artwork spans.
   Maskable icons keep everything inside the central 80% circle, because the
   launcher will crop to an arbitrary shape at least that big; the others can
   run closer to the edge. A `bg` of null leaves the surround transparent. */
function render(size, frac, bg) {
  const k = (frac * size) / 2 / REACH; // logo units → pixels
  const px = new Uint8Array(size * size * 4);
  const SUB = 4; // 4×4 subsamples per pixel
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      let R = 0,
        G = 0,
        B = 0,
        A = 0;
      for (let j = 0; j < SUB; j++) {
        for (let i = 0; i < SUB; i++) {
          const lx = (x + (i + 0.5) / SUB - size / 2) / k + CX;
          const ly = (y + (j + 0.5) / SUB - size / 2) / k + CY;
          let hit = null;
          for (let n = CIRCLES.length - 1; n >= 0; n--) {
            const c = CIRCLES[n];
            const dx = lx - c.x;
            const dy = ly - c.y;
            if (dx * dx + dy * dy <= c.r * c.r) {
              hit = c.rgb;
              break;
            }
          }
          const s = hit || bg;
          if (s) {
            R += s[0];
            G += s[1];
            B += s[2];
            A += 255;
          }
        }
      }
      const o = (y * size + x) * 4;
      const n = SUB * SUB;
      // Premultiplied average, un-premultiplied on the way out, so a half-
      // covered edge pixel keeps the circle's colour rather than darkening.
      px[o] = A ? Math.round(R / (A / 255)) : 0;
      px[o + 1] = A ? Math.round(G / (A / 255)) : 0;
      px[o + 2] = A ? Math.round(B / (A / 255)) : 0;
      px[o + 3] = Math.round(A / n);
    }
  }
  return px;
}

/* --- PNG plumbing: IHDR + IDAT + IEND, RGBA, no interlace. --- */

const CRC_TABLE = new Int32Array(256);
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  CRC_TABLE[n] = c;
}

function crc32(buf) {
  let c = ~0;
  for (const b of buf) c = CRC_TABLE[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ ~0) >>> 0;
}

function chunk(type, data) {
  const out = Buffer.alloc(12 + data.length);
  out.writeUInt32BE(data.length, 0);
  out.write(type, 4, "ascii");
  data.copy(out, 8);
  out.writeUInt32BE(crc32(out.subarray(4, 8 + data.length)), 8 + data.length);
  return out;
}

function png(size, px) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // colour type: RGBA
  // Raw scanlines, each led by a zero filter byte.
  const raw = Buffer.alloc((size * 4 + 1) * size);
  for (let y = 0; y < size; y++) {
    Buffer.from(px.buffer, y * size * 4, size * 4).copy(
      raw,
      y * (size * 4 + 1) + 1
    );
  }
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(raw, { level: 9 })),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

const ICONS = [
  // Plain launcher icons: the circles near full size on nothing at all.
  ["icon-192.png", 192, 0.94, null],
  ["icon-512.png", 512, 0.94, null],
  // Maskable: on paper, held inside the safe zone for any launcher shape.
  ["icon-mask-512.png", 512, 0.74, PAPER],
  // Apple touch icon: iOS rounds the corners itself, so also on paper.
  ["apple-touch-icon.png", 180, 0.8, PAPER],
];

mkdirSync(OUT, { recursive: true });
for (const [name, size, frac, bg] of ICONS) {
  const file = png(size, render(size, frac, bg));
  writeFileSync(join(OUT, name), file);
  console.log(`icons/${name}  ${size}×${size}  ${file.length} bytes`);
}
