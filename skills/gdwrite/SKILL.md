---
name: gdwrite
description: Write a GDevelop 5 game project (one scene, sprites, text, built-in behaviors, sounds, JavaScript events) from Node.js code with no editor, draw its pixel art and music in code, export it for the web and play-test the build headlessly with a JSON step script. Use when asked to make, script, generate or test a GDevelop game or game-jam entry from a terminal or CI.
---

# gdwrite: GDevelop games from code, tested headlessly

gdwrite (https://github.com/munimtechnologies/gdwrite, Apache-2.0) is MV2 of Munim, Inc.'s open-source toolkit.
It was made with AI agents (Anthropic Claude). It is not affiliated with the GDevelop team.
It was used to build complete games such as Little Ember (GDevelop BIG Game Jam #10,
https://github.com/munimtechnologies/little-ember).

## When to use it

- The user wants a GDevelop 5 project (`game.json`) written by code, for example a jam entry, a prototype or a test scene,
  and there is no GDevelop editor to click through (CI, a container, a terminal-only agent).
- The user wants to check that a GDevelop web build boots, has no page errors and behaves as expected, with screenshots.
- The user wants placeholder or final pixel-art sprites, sound effects or a music loop generated without asset packs.

Do not use it for multi-scene games, regular (non-code) GDevelop events, tilemaps, physics, custom fonts or extensions:
gdwrite 0.3.0 does not support them (see Limits). Say so instead of hand-editing GDevelop JSON you cannot test.

## Setup

```sh
git clone https://github.com/munimtechnologies/gdwrite && cd gdwrite
npm test                      # node --test: library and harness unit tests, no network
# only for export + play-testing (needs network once):
npm install gdcore-tools@2.0.0-gd-v5.6.269-autobuild playwright@1.47.0
npx playwright install --with-deps chromium
```

Node 18 or later. gdwrite has no runtime dependencies; gdcore-tools and playwright are only for the harness.
Pin the versions above: they are the ones the harness was tested with.

gdwrite clones GDevelop's own JSON structures from example projects instead of hard-coding them, because field
layouts change between GDevelop versions. Get example projects from https://github.com/GDevelopApp/GDevelop-examples
(a sparse clone of `examples/breakout` and `examples/platformer` is what Little Ember used; the platformer example
supplies the platformer behaviors). Pass their `.json` files to `loadTemplates`.

## Write a project

```js
import fs from "node:fs";
import { loadTemplates, spriteObject, textObject, withBehavior, imageResource, audioResource,
         instance, jsEvent, buildProject } from "./gdwrite.mjs";
import { gridPNG } from "./pixelart.mjs";
import { blipWAV } from "./wav.mjs";

const t = loadTemplates(["breakout.json", "platformer.json"].map((f) => JSON.parse(fs.readFileSync(f, "utf8"))));
// throws "templates missing: ..." if the examples lack a scene, sprite, text, instance or image resource

fs.mkdirSync("out", { recursive: true });
fs.writeFileSync("out/hero.png", gridPNG(["..aa..", ".aaaa.", "aaaaaa", ".a..a."], { a: [255, 200, 80] }, { scale: 4 }));
fs.writeFileSync("out/blip.wav", blipWAV({ f0: 880, f1: 440, ms: 90 }));

const code = `
const g = window.__game || (window.__game = { frames: 0, errors: [] });
g.frames++;
try {
  const hero = runtimeScene.getObjects('Hero')[0];
  const input = runtimeScene.getGame().getInputManager();
  if (hero && input.isKeyPressed(39)) hero.setX(hero.getX() + 4);
  g.x = hero ? hero.getX() : null;
} catch (e) { if (g.errors.length < 5) g.errors.push(String(e && e.message || e)); }
`;

const project = buildProject(t, {
  name: "My Game", packageName: "com.example.mygame", width: 800, height: 600, bg: [20, 24, 40],
  resources: [imageResource(t, "hero.png"), audioResource(t, "blip.wav")],
  objects: [spriteObject(t, "Hero", "hero.png"), textObject(t, "Hud", { text: "Score 0", size: 28, color: [240, 240, 240] })],
  instances: [instance(t, "Hero", 40, 300, 1, 2), instance(t, "Hud", 16, 16, 2, 3)],
  events: [jsEvent(code)],
});
fs.writeFileSync("out/game.json", JSON.stringify(project, null, 2));
```

API notes (gdwrite 0.3.0):

- `instance(t, name, x, y, i, zOrder = 1, size = null)`: `i` is a unique integer per instance (it becomes the
  persistent UUID); `size` is an optional `{ width, height }` that turns on a custom size.
- `textObject(t, name, { text, size, color })`, `spriteObject(t, name, imageResourceName)` (one frame).
- `withBehavior(t, object, type, name, props)` adds a built-in behavior cloned from the examples. It throws on a
  behavior type the examples do not contain or on a property name the behavior does not have, so typos fail at
  build time. `behaviorTypes(t)` lists what is available.
- `audioResource(t, file, { preload = true })` adds a sound file; play it from code with
  `gdjs.evtTools.sound.playSound(runtimeScene, "blip.wav", false, 60, 1)`.
- `buildProject` writes one scene named `Main`. Edit `project.properties` afterwards for things like
  `orientation` or `version`, only for keys that already exist.
- Generators: `shapePNG(w, h, [r,g,b], "box"|"disc")` (png.mjs); `blipWAV({ f0, f1, ms, volume, wave })` (wav.mjs,
  a pitch sweep, `wave` "sine" or "square"); `gridPNG(rows, palette, { scale })`, `sheetPNG(frames, palette,
  { scale, gap })`, `outline(rows, ch)` (pixelart.mjs: one character per pixel, palette `{ char: [r,g,b(,a)] }`,
  `.` is transparent, a character missing from the palette throws); `tuneWAV({ bpm, voices: [{ notes: [[midi,
  beats], ...], wave, volume }] })` (null as a rest) and `noiseWAV({ ms, volume, smooth, seed })` (tune.mjs).

Put the game's rules in the JavaScript event and keep them testable:

- Expose state on a global (`window.__game` above) so a step script can read it, and catch errors into an array.
- Make the simulation step on elapsed time in small substeps (for example at most 0.05 s each). Software-rendered
  Chromium in CI runs at a few frames per second, and GDevelop caps each frame's elapsed time at 50 ms.
- Add test hooks (a speed multiplier, a fixed random seed, a scripted "bot" player) so a full play-through
  finishes in CI time. Little Ember's `game-code.js` is a complete worked example.

## Export and play-test

```sh
node harness/export.mjs out/game.json build      # exit 0 only if build/index.html was written
node harness/play.mjs build steps.json report    # exit 0 only if every check passed
```

`export.mjs` exits 1 (no index.html), 2 (gdcore-tools not installed), 3 (export crashed) or 64 (usage).

A step script is JSON: `{"viewport": {"width": 800, "height": 600}, "touch": false, "boot_ms": 8000, "steps": [...]}`.
Step kinds:

| Step | Meaning |
|---|---|
| `{"wait": 500}` | wait milliseconds |
| `{"click": [x, y]}` / `{"tap": [x, y]}` | mouse click / touch tap (`tap` needs `"touch": true`) |
| `{"drag": [x1, y1, x2, y2], "ms": 300}` | drag |
| `{"down": "ArrowRight"}`, `{"up": ...}`, `{"press": "Space"}`, `{"hold": "ArrowRight", "ms": 2500}` | keyboard |
| `{"eval": "<js>", "save": "name", "expect": <value or {op: arg}>}` | evaluate in the page; check and/or save the result |
| `{"wait_for": "<js>", "timeout_ms": 10000}` | poll until truthy (a failed timeout is a failed check) |
| `{"shot": "name"}` | screenshot to `<out>/<script>-<name>.png` |
| `{"repeat": n, "steps": [...]}` | repeat nested steps |

`expect` operators: `eq, ne, gt, gte, lt, lte, between [a, b], truthy, includes`; a plain value must equal the result
as JSON. Example:

```json
{"viewport": {"width": 800, "height": 600}, "boot_ms": 8000, "steps": [
  {"wait_for": "window.__game && window.__game.frames > 30", "timeout_ms": 20000},
  {"hold": "ArrowRight", "ms": 2000},
  {"eval": "window.__game.x", "expect": {"gt": 40}, "save": "x_after"},
  {"eval": "window.__game.errors", "expect": []},
  {"shot": "after"}
]}
```

The report `<out>/<script>-play.json` has `ok`, `passed`, `failed`, `results`, `saved`, `pageErrors`,
`consoleErrors` and `canvas`. Read it and the screenshots before claiming the game works; report failures as they are.
Wait on game time (`wait_for` on a state value), not wall-clock time, because frame rates differ between machines.

## Opening and publishing

The written `game.json` (with its PNG and WAV files beside it) opens in the GDevelop 5 desktop editor, which can then
publish to gd.games. The `build/` folder from `export.mjs` is a static HTML5 game: zip its contents for itch.io
("This file will be played in the browser").

## Limits

One scene; no regular events, tilemaps, physics, custom fonts or extensions; only built-in behaviors present in the
example projects you load; text uses the default font. Check a jam's rules on AI-made work before entering a game
made this way, and disclose AI use wherever the rules or the platform ask (itch.io has an AI-disclosure field).
