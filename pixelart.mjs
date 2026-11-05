// pixelart: turn text grids into PNG sprites (no dependencies; uses png.mjs).
// By MV2 of Munim, Inc., made with AI agents (Anthropic Claude). Apache-2.0.
//
//   gridPNG(rows, palette, { scale })   one sprite; rows are equal-length strings, one char per pixel
//   gridRGBA(rows, palette, { scale })  the same, as { w, h, rgba } (for compositing)
//   sheetPNG(frames, palette, { scale, gap }) several equal-size grids side by side
//   outline(rows, ch)                   add a 1-pixel outline of char `ch` around the opaque pixels
//
// palette: { char: [r, g, b] or [r, g, b, a] }. "." and " " are transparent unless the palette
// defines them. An unknown char throws, so a typo fails when the sprite is made.

import { encodePNG } from "./png.mjs";

const CLEAR = [0, 0, 0, 0];

function colour(palette, ch, x, y) {
  if (Object.prototype.hasOwnProperty.call(palette, ch)) {
    const c = palette[ch];
    return c.length === 3 ? [c[0], c[1], c[2], 255] : c;
  }
  if (ch === "." || ch === " ") return CLEAR;
  throw new Error(`pixelart: char ${JSON.stringify(ch)} at ${x},${y} is not in the palette`);
}

function checkRows(rows) {
  if (!Array.isArray(rows) || rows.length === 0) throw new Error("pixelart: rows must be a non-empty array of strings");
  const w = rows[0].length;
  rows.forEach((r, y) => {
    if (typeof r !== "string" || r.length !== w) throw new Error(`pixelart: row ${y} has length ${r && r.length}, expected ${w}`);
  });
  return w;
}

export function gridRGBA(rows, palette, { scale = 1 } = {}) {
  const gw = checkRows(rows), gh = rows.length;
  const s = Math.max(1, Math.floor(scale));
  const w = gw * s, h = gh * s;
  const rgba = Buffer.alloc(w * h * 4);
  for (let gy = 0; gy < gh; gy++) {
    for (let gx = 0; gx < gw; gx++) {
      const c = colour(palette, rows[gy][gx], gx, gy);
      if (c[3] === 0) continue;
      for (let dy = 0; dy < s; dy++) {
        for (let dx = 0; dx < s; dx++) {
          const i = ((gy * s + dy) * w + gx * s + dx) * 4;
          rgba[i] = c[0]; rgba[i + 1] = c[1]; rgba[i + 2] = c[2]; rgba[i + 3] = c[3];
        }
      }
    }
  }
  return { w, h, rgba };
}

export function gridPNG(rows, palette, opts = {}) {
  const { w, h, rgba } = gridRGBA(rows, palette, opts);
  return encodePNG(w, h, rgba);
}

export function sheetPNG(frames, palette, { scale = 1, gap = 0 } = {}) {
  if (!frames.length) throw new Error("pixelart: no frames");
  const imgs = frames.map((f) => gridRGBA(f, palette, { scale }));
  const fw = imgs[0].w, fh = imgs[0].h;
  imgs.forEach((im, k) => { if (im.w !== fw || im.h !== fh) throw new Error(`pixelart: frame ${k} size differs`); });
  const w = imgs.length * fw + (imgs.length - 1) * gap, h = fh;
  const rgba = Buffer.alloc(w * h * 4);
  imgs.forEach((im, k) => {
    const ox = k * (fw + gap);
    for (let y = 0; y < fh; y++) im.rgba.copy(rgba, (y * w + ox) * 4, y * fw * 4, (y + 1) * fw * 4);
  });
  return encodePNG(w, h, rgba);
}

export function outline(rows, ch, transparent = ".") {
  const w = checkRows(rows), h = rows.length;
  const solid = (x, y) => x >= 0 && y >= 0 && x < w && y < h && rows[y][x] !== transparent && rows[y][x] !== " ";
  const out = [];
  for (let y = 0; y < h; y++) {
    let line = "";
    for (let x = 0; x < w; x++) {
      if (solid(x, y)) line += rows[y][x];
      else if (solid(x - 1, y) || solid(x + 1, y) || solid(x, y - 1) || solid(x, y + 1)) line += ch;
      else line += rows[y][x];
    }
    out.push(line);
  }
  return out;
}
