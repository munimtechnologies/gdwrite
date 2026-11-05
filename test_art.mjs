// Tests for pixelart.mjs and tune.mjs (node --test test_art.mjs). Apache-2.0. MV2 of Munim, Inc.
import test from "node:test";
import assert from "node:assert/strict";
import zlib from "node:zlib";
import { gridRGBA, gridPNG, sheetPNG, outline } from "./pixelart.mjs";
import { tuneWAV, noiseWAV, midiHz, voiceSamples } from "./tune.mjs";

const PAL = { a: [255, 0, 0], b: [0, 0, 255, 128] };

function pngSize(buf) {
  assert.deepEqual([...buf.subarray(0, 8)], [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  return [buf.readUInt32BE(16), buf.readUInt32BE(20)];
}

test("gridRGBA scales and maps colours; dot is clear", () => {
  const { w, h, rgba } = gridRGBA(["a.", ".b"], PAL, { scale: 2 });
  assert.equal(w, 4); assert.equal(h, 4);
  assert.deepEqual([...rgba.subarray(0, 4)], [255, 0, 0, 255]);
  assert.deepEqual([...rgba.subarray(4, 8)], [255, 0, 0, 255]);
  assert.deepEqual([...rgba.subarray(8, 12)], [0, 0, 0, 0]);
  const last = (3 * 4 + 3) * 4;
  assert.deepEqual([...rgba.subarray(last, last + 4)], [0, 0, 255, 128]);
});

test("gridPNG gives a valid PNG of the right size", () => {
  const png = gridPNG(["aaa", "a.a"], PAL, { scale: 3 });
  assert.deepEqual(pngSize(png), [9, 6]);
  const idat = png.indexOf(Buffer.from("IDAT"));
  const len = png.readUInt32BE(idat - 4);
  const raw = zlib.inflateSync(png.subarray(idat + 4, idat + 4 + len));
  assert.equal(raw.length, (9 * 4 + 1) * 6);
});

test("unknown chars and ragged rows throw", () => {
  assert.throws(() => gridPNG(["ax"], PAL), /not in the palette/);
  assert.throws(() => gridPNG(["aa", "a"], PAL), /row 1/);
  assert.throws(() => gridPNG([], PAL), /non-empty/);
});

test("sheetPNG lays frames side by side", () => {
  const png = sheetPNG([["a"], ["b"], ["a"]], PAL, { scale: 4, gap: 2 });
  assert.deepEqual(pngSize(png), [3 * 4 + 2 * 2, 4]);
  assert.throws(() => sheetPNG([["a"], ["aa"]], PAL), /size differs/);
});

test("outline rings opaque pixels", () => {
  assert.deepEqual(outline(["...", ".a.", "..."], "o"), [".o.", "oao", ".o."]);
});

test("midiHz", () => {
  assert.equal(midiHz(69), 440);
  assert.ok(Math.abs(midiHz(60) - 261.6256) < 1e-3);
});

test("tuneWAV length is the longest voice and stays in range", () => {
  const rate = 8000, bpm = 120; // one beat = 0.5 s = 4000 samples
  const wav = tuneWAV({ bpm, rate, voices: [
    { notes: [[60, 1], [null, 1], [64, 2]], wave: "square", volume: 0.5 },
    { notes: [[48, 2]], wave: "triangle", volume: 0.5 },
  ] });
  assert.equal(wav.toString("latin1", 0, 4), "RIFF");
  assert.equal(wav.readUInt32LE(40), 4 * 4000 * 2);
  const rest = voiceSamples({ notes: [[60, 1], [null, 1]], wave: "sine" }, { bpm, rate });
  assert.equal(rest.length, 8000);
  assert.ok(rest.subarray(4000).every((v) => v === 0));
  assert.throws(() => tuneWAV({ voices: [] }), /no voices/);
  assert.throws(() => voiceSamples({ notes: [[60, 1]], wave: "kazoo" }), /unknown wave/);
});

test("noiseWAV is seeded and decays", () => {
  const a = noiseWAV({ ms: 50, rate: 8000, seed: 7 });
  const b = noiseWAV({ ms: 50, rate: 8000, seed: 7 });
  assert.ok(a.equals(b));
  assert.equal(a.readUInt32LE(40), 400 * 2);
  assert.notEqual(a.readInt16LE(44 + 10 * 2), 0);
});
