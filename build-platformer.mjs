// build-platformer: write a small GDevelop platformer test scene with gdwrite, png and wav (an example, not a game).
// By MV2 of Munim, Inc., made with AI agents (Anthropic Claude). Apache-2.0.
//
//   node build-platformer.mjs <out dir> <example project.json> [more example .json ...]
//
// The examples must include one with GDevelop's built-in platformer behaviors (for example the official
// "platformer" example). Scene: a 32x32 Player with the Platformer character behavior (GDevelop's own
// default controls: arrows to walk, Space or Shift to jump), a Ground stretched to 640x32 with the
// Platform behavior, a Text HUD and a blip sound made in code. One JavaScript event only watches: it
// plays the blip on the first landing and writes its state to window.__gdprobe so a test can read it.

import fs from "node:fs";
import path from "node:path";
import { loadTemplates, behaviorTypes, textObject, spriteObject, withBehavior, imageResource, audioResource, instance, jsEvent, buildProject } from "./gdwrite.mjs";
import { shapePNG } from "./png.mjs";
import { blipWAV } from "./wav.mjs";

const PLAYER = "PlatformBehavior::PlatformerObjectBehavior";
const PLATFORM = "PlatformBehavior::PlatformBehavior";

const [outDir, ...examples] = process.argv.slice(2);
const log = (...a) => console.log("[build]", ...a);
const t = loadTemplates(examples.map((f) => JSON.parse(fs.readFileSync(f, "utf8"))));
log("templates from:", examples.map((f) => path.basename(f)).join(", "));
log("behavior types found:", behaviorTypes(t).join(", "));

fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(path.join(outDir, "player.png"), shapePNG(32, 32, [80, 170, 255], "box"));
fs.writeFileSync(path.join(outDir, "ground.png"), shapePNG(32, 32, [90, 200, 120], "box"));
fs.writeFileSync(path.join(outDir, "blip.wav"), blipWAV({ f0: 520, f1: 880, ms: 120 }));

const code = `
const g = window.__gdprobe || (window.__gdprobe = { frames: 0, errors: [], landedAt: -1, landY: null, maxRise: 0, jumps: 0, soundCalls: 0, soundErr: null });
g.frames++;
try {
  const p = runtimeScene.getObjects('Player')[0];
  if (p) {
    const b = p.getBehavior('PlatformerObject');
    g.hasBehavior = !!b;
    g.px = p.getX(); g.py = p.getY(); g.pw = p.getWidth(); g.ph = p.getHeight();
    if (b) {
      g.onFloor = b.isOnFloor();
      g.jumping = b.isJumping();
      if (g.onFloor && g.landedAt < 0) {
        g.landedAt = g.frames;
        g.landY = p.getY();
        try { gdjs.evtTools.sound.playSound(runtimeScene, 'blip.wav', false, 60, 1); g.soundCalls++; }
        catch (e) { g.soundErr = String(e && e.message || e); }
      }
      if (g.landY !== null) g.maxRise = Math.max(g.maxRise, g.landY - p.getY());
      if (g.jumping && !g.wasJumping) g.jumps++;
      g.wasJumping = g.jumping;
    }
  }
  const gr = runtimeScene.getObjects('Ground')[0];
  if (gr) { g.gx = gr.getX(); g.gy = gr.getY(); g.gw = gr.getWidth(); g.gh = gr.getHeight(); }
  const hud = runtimeScene.getObjects('Hud');
  if (hud.length) hud[0].setText('Jumps: ' + g.jumps + '   (scene written by a script)');
} catch (e) {
  if (g.errors.length < 5) g.errors.push(String(e && e.message || e));
}
`.trim();

const playerProps = {};
if (t.behaviors[PLAYER] && "ignoreDefaultControls" in t.behaviors[PLAYER]) playerProps.ignoreDefaultControls = false;

const proj = buildProject(t, {
  name: "gdwrite platformer probe", packageName: "com.munimtechnologies.gdwriteplatformer", width: 800, height: 600, bg: [24, 40, 72],
  resources: [imageResource(t, "player.png"), imageResource(t, "ground.png"), audioResource(t, "blip.wav")],
  objects: [
    withBehavior(t, spriteObject(t, "Player", "player.png"), PLAYER, "PlatformerObject", playerProps),
    withBehavior(t, spriteObject(t, "Ground", "ground.png"), PLATFORM, "Platform"),
    textObject(t, "Hud", { text: "Jumps: 0", size: 28, color: [239, 241, 243] }),
  ],
  instances: [
    instance(t, "Player", 100, 100, 1, 2),
    instance(t, "Ground", 80, 400, 2, 1, { width: 640, height: 32 }),
    instance(t, "Hud", 24, 24, 3, 3),
  ],
  events: [jsEvent(code)],
});
fs.writeFileSync(path.join(outDir, "game.json"), JSON.stringify(proj, null, 2));
const sc = proj.layouts[0];
log("wrote", path.join(outDir, "game.json"), "| objects:", sc.objects.map((o) => `${o.name}(${o.type}; ${o.behaviors.map((b) => b.type).join("+") || "-"})`).join(", "),
  "| shared data:", sc.behaviorsSharedData.map((d) => d.name).join(", "),
  "| resources:", (proj.resources.resources || proj.resources).map((r) => `${r.name}:${r.kind}`).join(", "));
