// build-artprobe: a GDevelop test scene whose sprite comes from a pixelart grid and whose music and
// hit sound come from tune.mjs, to check that both load and play in the engine (a probe, not a game).
// By MV2 of Munim, Inc., made with AI agents (Anthropic Claude). Apache-2.0.
//
//   node build-artprobe.mjs <out dir> <example project.json> [more example .json ...]

import fs from "node:fs";
import path from "node:path";
import { loadTemplates, textObject, spriteObject, imageResource, audioResource, instance, jsEvent, buildProject } from "./gdwrite.mjs";
import { gridPNG, outline } from "./pixelart.mjs";
import { tuneWAV, noiseWAV } from "./tune.mjs";

const [outDir, ...examples] = process.argv.slice(2);
const t = loadTemplates(examples.map((f) => JSON.parse(fs.readFileSync(f, "utf8"))));
fs.mkdirSync(outDir, { recursive: true });

// A 14x14 test pattern (a ringed square with a cross), outlined to 16x16, drawn at 4x = 64x64.
const core = [
  "..............",
  ".gggggggggggg.",
  ".g..........g.",
  ".g.y......y.g.",
  ".g..y....y..g.",
  ".g...y..y...g.",
  ".g....yy....g.",
  ".g....yy....g.",
  ".g...y..y...g.",
  ".g..y....y..g.",
  ".g.y......y.g.",
  ".g..........g.",
  ".gggggggggggg.",
  "..............",
].map((r) => "." + r + ".");
const rows = outline([".".repeat(16), ...core, ".".repeat(16)], "k"); // 16 rows of 16
fs.writeFileSync(path.join(outDir, "probe.png"), gridPNG(rows, { g: [90, 200, 120], y: [255, 205, 60], k: [20, 24, 32] }, { scale: 4 }));
fs.writeFileSync(path.join(outDir, "loop.wav"), tuneWAV({ bpm: 120, voices: [
  { notes: [[72, 0.5], [76, 0.5], [79, 0.5], [76, 0.5], [74, 1], [null, 1]], wave: "triangle", volume: 0.25 },
  { notes: [[48, 2], [43, 2]], wave: "sine", volume: 0.25 },
] }));
fs.writeFileSync(path.join(outDir, "hit.wav"), noiseWAV({ ms: 90, volume: 0.4, smooth: 0.5 }));

const code = `
const g = window.__gdprobe || (window.__gdprobe = { frames: 0, errors: [], music: 0, hits: 0 });
g.frames++;
try {
  const p = runtimeScene.getObjects('Probe')[0];
  if (p) { g.pw = p.getWidth(); g.ph = p.getHeight(); }
  if (g.frames === 20) { gdjs.evtTools.sound.playMusic(runtimeScene, 'loop.wav', true, 40, 1); g.music++; }
  if (g.frames % 60 === 0 && g.hits < 3) { gdjs.evtTools.sound.playSound(runtimeScene, 'hit.wav', false, 60, 1); g.hits++; }
  const hud = runtimeScene.getObjects('Hud');
  if (hud.length) hud[0].setText('art probe: ' + g.pw + 'x' + g.ph + '  hits ' + g.hits);
} catch (e) {
  if (g.errors.length < 5) g.errors.push(String(e && e.message || e));
}
`.trim();

const proj = buildProject(t, {
  name: "gdwrite art probe", packageName: "com.munimtechnologies.gdwriteartprobe", width: 800, height: 600, bg: [24, 40, 72],
  resources: [imageResource(t, "probe.png"), audioResource(t, "loop.wav"), audioResource(t, "hit.wav")],
  objects: [spriteObject(t, "Probe", "probe.png"), textObject(t, "Hud", { text: "art probe", size: 24, color: [239, 241, 243] })],
  instances: [instance(t, "Probe", 368, 268, 1, 2), instance(t, "Hud", 24, 24, 2, 3)],
  events: [jsEvent(code)],
});
fs.writeFileSync(path.join(outDir, "game.json"), JSON.stringify(proj, null, 2));
console.log("[build-artprobe] wrote", path.join(outDir, "game.json"), "| sprite rows:", rows.length, "x", rows[0].length);
