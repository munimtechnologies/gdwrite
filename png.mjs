// png: a minimal RGBA PNG encoder (no dependencies), for images made in code.
// By MV2 of Munim, Inc., made with AI agents (Anthropic Claude). Apache-2.0.

import zlib from "node:zlib";

const TABLE = new Uint32Array(256);
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  TABLE[n] = c >>> 0;
}

export function crc32(buf) {
  let c = 0xffffffff;
  for (const b of buf) c = TABLE[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type, "latin1"), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
}

// rgba: Buffer or Uint8Array of w*h*4 bytes, row by row.
export function encodePNG(w, h, rgba) {
  if (rgba.length !== w * h * 4) throw new Error(`expected ${w * h * 4} bytes, got ${rgba.length}`);
  const raw = Buffer.alloc((w * 4 + 1) * h);
  for (let y = 0; y < h; y++) {
    raw[y * (w * 4 + 1)] = 0; // filter: none
    Buffer.from(rgba.buffer, rgba.byteOffset + y * w * 4, w * 4).copy(raw, y * (w * 4 + 1) + 1);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0);
  ihdr.writeUInt32BE(h, 4);
  ihdr.set([8, 6, 0, 0, 0], 8); // 8-bit, RGBA, deflate, no filter set, no interlace
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("IDAT", zlib.deflateSync(raw)),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

// A filled shape with a 2-pixel darker edge: "box" fills the square, "disc" leaves the corners clear.
export function shapePNG(w, h, [r, g, b], shape = "box") {
  const px = Buffer.alloc(w * h * 4);
  const cx = (w - 1) / 2, cy = (h - 1) / 2, rad = Math.min(w, h) / 2;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const d = shape === "disc" ? Math.hypot(x - cx, y - cy) : Math.max(Math.abs(x - cx) / (w / 2), Math.abs(y - cy) / (h / 2)) * rad;
      if (d > rad) continue;
      const edge = d > rad - 2;
      const i = (y * w + x) * 4;
      px[i] = edge ? r >> 1 : r;
      px[i + 1] = edge ? g >> 1 : g;
      px[i + 2] = edge ? b >> 1 : b;
      px[i + 3] = 255;
    }
  }
  return encodePNG(w, h, px);
}
