// tune: short music loops and noise effects made in code, as WAV (no dependencies; uses wav.mjs).
// By MV2 of Munim, Inc., made with AI agents (Anthropic Claude). Apache-2.0.
//
//   tuneWAV({ bpm, voices: [{ notes: [[midi or null, beats], ...], wave, volume }], rate })
//     Mixes the voices; a null note is a rest. Waves: sine, square, triangle, saw. Each note has a
//     short attack and release so loops do not click. Returns a WAV buffer whose length is the
//     longest voice, so a loop of whole bars repeats cleanly.
//   noiseWAV({ ms, volume, smooth, rate })  a decaying noise burst (hits, steps, wind); smooth in [0, 1)
//     low-passes it. Seeded, so the same call gives the same bytes.
//   midiHz(m)  MIDI note number to Hz (69 = A4 = 440 Hz).

import { encodeWAV } from "./wav.mjs";

export const midiHz = (m) => 440 * Math.pow(2, (m - 69) / 12);

function osc(wave, phase) {
  const p = phase / (2 * Math.PI);
  const f = p - Math.floor(p);
  switch (wave) {
    case "square": return f < 0.5 ? 1 : -1;
    case "triangle": return 1 - 4 * Math.abs(f - 0.5);
    case "saw": return 2 * f - 1;
    case "sine": return Math.sin(phase);
    default: throw new Error(`tune: unknown wave ${wave}`);
  }
}

export function voiceSamples({ notes, wave = "sine", volume = 0.3 }, { bpm = 120, rate = 22050 } = {}) {
  const beat = (60 / bpm) * rate;
  const total = Math.round(notes.reduce((s, n) => s + n[1], 0) * beat);
  const out = new Float64Array(total);
  let t = 0;
  for (const [m, beats] of notes) {
    const len = Math.round(beats * beat);
    if (m !== null && m !== undefined) {
      const hz = midiHz(m);
      const atk = Math.min(len, Math.round(rate * 0.006));
      const rel = Math.min(len - atk, Math.round(rate * 0.04));
      let phase = 0;
      for (let i = 0; i < len && t + i < total; i++) {
        phase += (2 * Math.PI * hz) / rate;
        const env = i < atk ? i / atk : i > len - rel ? Math.max(0, (len - i) / rel) : 1;
        out[t + i] += volume * env * osc(wave, phase);
      }
    }
    t += len;
  }
  return out;
}

export function tuneWAV({ bpm = 120, voices = [], rate = 22050 } = {}) {
  if (!voices.length) throw new Error("tune: no voices");
  const parts = voices.map((v) => voiceSamples(v, { bpm, rate }));
  const n = Math.max(...parts.map((p) => p.length));
  const mix = new Float64Array(n);
  for (const p of parts) for (let i = 0; i < p.length; i++) mix[i] += p[i];
  return encodeWAV(mix, rate);
}

export function noiseWAV({ ms = 120, volume = 0.4, smooth = 0.6, rate = 22050, seed = 1 } = {}) {
  const n = Math.max(1, Math.round((rate * ms) / 1000));
  const out = new Float64Array(n);
  let s = seed >>> 0 || 1, last = 0;
  const a = Math.min(0.99, Math.max(0, smooth));
  for (let i = 0; i < n; i++) {
    s ^= s << 13; s >>>= 0; s ^= s >>> 17; s ^= s << 5; s >>>= 0;
    const white = (s / 0xffffffff) * 2 - 1;
    last = a * last + (1 - a) * white;
    const v = a > 0 ? Math.max(-1, Math.min(1, last * 2)) : white; // low-passing lowers the level; *2 restores some
    out[i] = volume * (1 - i / n) * v;
  }
  return encodeWAV(out, rate);
}
