// build-demo: write a small GDevelop test scene with gdwrite + png (an example, not a game).
// By MV2 of Munim, Inc., made with AI agents (Anthropic Claude). Apache-2.0.
//
//   node build-demo.mjs <out dir> <example project.json> [more example .json ...]
//
// Scene: a 32x32 Player sprite moved with the arrow keys, Coin sprites (16x16) spawned at runtime
// by the event, and a Text HUD. One JavaScript event does it all and writes its state to
// window.__gdprobe so a test can read it: frames, sprite sizes (the images loaded), spawns, score,
// and whether GDevelop's own collision test agreed with the box overlap.

import fs from "node:fs";
import path from "node:path";
import { loadTemplates, textObject, spriteObject, imageResource, instance, jsEvent, buildProject } from "./gdwrite.mjs";
import { shapePNG } from "./png.mjs";

const [outDir, ...examples] = process.argv.slice(2);
const log = (...a) => console.log("[build]", ...a);
const t = loadTemplates(examples.map((f) => JSON.parse(fs.readFileSync(f, "utf8"))));
log("templates from:", examples.map((f) => path.basename(f)).join(", "), "| sprite template:", t.sprite.name, "| text template:", t.text.name);

fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(path.join(outDir, "player.png"), shapePNG(32, 32, [80, 170, 255], "box"));
fs.writeFileSync(path.join(outDir, "coin.png"), shapePNG(16, 16, [255, 205, 60], "disc"));

const code = `
const g = window.__gdprobe || (window.__gdprobe = { frames: 0, score: 0, spawned: 0, keysR: 0, engineAgreed: 0, errors: [] });
g.frames++;
try {
  const input = runtimeScene.getGame().getInputManager();
  const players = runtimeScene.getObjects('Player');
  let coins = runtimeScene.getObjects('Coin');
  if (coins.length === 0) {
    const c = runtimeScene.createObject('Coin');
    if (c) {
      c.setPosition(g.spawned === 0 ? 220 : 120 + (g.spawned * 97) % 560, g.spawned === 0 ? 208 : 100 + (g.spawned * 61) % 400);
      g.spawned++;
    }
    coins = runtimeScene.getObjects('Coin');
  }
  g.players = players.length;
  if (players.length) {
    const p = players[0];
    if (input.isKeyPressed(39)) { p.setX(p.getX() + 5); g.keysR++; }
    if (input.isKeyPressed(37)) p.setX(p.getX() - 5);
    if (input.isKeyPressed(40)) p.setY(p.getY() + 5);
    if (input.isKeyPressed(38)) p.setY(p.getY() - 5);
    g.pw = p.getWidth(); g.ph = p.getHeight(); g.px = p.getX(); g.py = p.getY();
    for (const c of coins) {
      if (c.__taken) continue;
      g.cw = c.getWidth(); g.ch = c.getHeight();
      const hit = p.getX() < c.getX() + c.getWidth() && c.getX() < p.getX() + p.getWidth() &&
        p.getY() < c.getY() + c.getHeight() && c.getY() < p.getY() + p.getHeight();
      if (hit) {
        let engine = null;
        try { engine = gdjs.RuntimeObject.collisionTest(p, c, false); } catch (e) { engine = 'n/a'; }
        if (engine === true) g.engineAgreed++;
        g.score++;
        c.__taken = true;
        c.deleteFromScene(runtimeScene);
      }
    }
  }
  const hud = runtimeScene.getObjects('Hud');
  if (hud.length) hud[0].setText('Score: ' + g.score + '   (scene written by a script)');
  g.coins = runtimeScene.getObjects('Coin').length;
} catch (e) {
  if (g.errors.length < 5) g.errors.push(String(e && e.message || e));
}
`.trim();

const proj = buildProject(t, {
  name: "gdwrite probe", packageName: "com.munimtechnologies.gdwriteprobe", width: 800, height: 600, bg: [24, 40, 72],
  resources: [imageResource(t, "player.png"), imageResource(t, "coin.png")],
  objects: [
    spriteObject(t, "Player", "player.png"),
    spriteObject(t, "Coin", "coin.png"),
    textObject(t, "Hud", { text: "Score: 0", size: 28, color: [239, 241, 243] }),
  ],
  instances: [instance(t, "Player", 40, 200, 1, 2), instance(t, "Hud", 24, 24, 2, 3)],
  events: [jsEvent(code)],
});
fs.writeFileSync(path.join(outDir, "game.json"), JSON.stringify(proj, null, 2));
log("wrote", path.join(outDir, "game.json"), "| objects:", proj.layouts[0].objects.map((o) => `${o.name}(${o.type})`).join(", "),
  "| resources:", proj.resources.resources ? proj.resources.resources.length : proj.resources.length);
