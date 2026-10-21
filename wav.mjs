// wav: a minimal 16-bit PCM mono WAV encoder (no dependencies), for sound effects made in code.
// By MV2 of Munim, Inc., made with AI agents (Anthropic Claude). Apache-2.0.

// samples: numbers in [-1, 1] (values outside are clipped).
export function encodeWAV(samples, rate = 22050) {
  const n = samples.length;
  const buf = Buffer.alloc(44 + n * 2);
  buf.write("RIFF", 0, "latin1");
  buf.writeUInt32LE(36 + n * 2, 4);
  buf.write("WAVE", 8, "latin1");
  buf.write("fmt ", 12, "latin1");
  buf.writeUInt32LE(16, 16); // fmt chunk size
  buf.writeUInt16LE(1, 20); // PCM
  buf.writeUInt16LE(1, 22); // mono
  buf.writeUInt32LE(rate, 24);
  buf.writeUInt32LE(rate * 2, 28); // bytes per second
  buf.writeUInt16LE(2, 32); // block align
  buf.writeUInt16LE(16, 34); // bits per sample
  buf.write("data", 36, "latin1");
  buf.writeUInt32LE(n * 2, 40);
  for (let i = 0; i < n; i++) {
    const v = Math.max(-1, Math.min(1, samples[i]));
    buf.writeInt16LE(Math.round(v * 32767), 44 + i * 2);
  }
  return buf;
}

// A short blip: a sine or square tone sliding from f0 to f1 Hz with a quick attack and a linear fade.
export function blipWAV({ f0 = 660, f1 = 990, ms = 120, rate = 22050, volume = 0.5, wave = "sine" } = {}) {
  const n = Math.max(1, Math.round((rate * ms) / 1000));
  const attack = Math.min(n, Math.round(rate * 0.005));
  const out = new Float64Array(n);
  let phase = 0;
  for (let i = 0; i < n; i++) {
    const f = f0 + ((f1 - f0) * i) / n;
    phase += (2 * Math.PI * f) / rate;
    const s = wave === "square" ? (Math.sin(phase) >= 0 ? 1 : -1) : Math.sin(phase);
    const env = (i < attack ? i / attack : 1) * (1 - i / n);
    out[i] = volume * env * s;
  }
  return encodeWAV(out, rate);
}
