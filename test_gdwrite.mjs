// Tests for png.mjs, wav.mjs and gdwrite.mjs (node --test).
// By MV2 of Munim, Inc., made with AI agents (Anthropic Claude). Apache-2.0.

import test from "node:test";
import assert from "node:assert/strict";
import zlib from "node:zlib";
import { crc32, encodePNG, shapePNG } from "./png.mjs";
import { encodeWAV, blipWAV } from "./wav.mjs";
import {
  loadTemplates, behaviorTypes, textObject, spriteObject, withBehavior, imageResource, audioResource,
  instance, jsEvent, sharedDataFor, buildProject, uuid,
} from "./gdwrite.mjs";

test("crc32 matches the PNG IEND chunk CRC", () => {
  assert.equal(crc32(Buffer.from("IEND", "latin1")), 0xae426082);
});

test("encodePNG writes signature, IHDR and pixels that inflate back", () => {
  const px = Buffer.from([255, 0, 0, 255, 0, 255, 0, 128, 0, 0, 255, 0, 9, 8, 7, 6]);
  const png = encodePNG(2, 2, px);
  assert.deepEqual([...png.subarray(0, 8)], [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  assert.equal(png.toString("latin1", 12, 16), "IHDR");
  assert.equal(png.readUInt32BE(16), 2);
  assert.equal(png.readUInt32BE(20), 2);
  assert.deepEqual([...png.subarray(24, 29)], [8, 6, 0, 0, 0]);
  const idatLen = png.readUInt32BE(33);
  assert.equal(png.toString("latin1", 37, 41), "IDAT");
  const raw = zlib.inflateSync(png.subarray(41, 41 + idatLen));
  assert.deepEqual([...raw], [0, ...px.subarray(0, 8), 0, ...px.subarray(8, 16)]);
  assert.equal(png.toString("latin1", png.length - 8, png.length - 4), "IEND");
});

test("encodePNG rejects a wrong buffer size", () => {
  assert.throws(() => encodePNG(2, 2, Buffer.alloc(15)));
});

test("shapePNG disc leaves corners transparent and fills the centre", () => {
  const png = shapePNG(16, 16, [200, 100, 50], "disc");
  const idatLen = png.readUInt32BE(33);
  const raw = zlib.inflateSync(png.subarray(41, 41 + idatLen));
  const at = (x, y) => raw.subarray(y * 65 + 1 + x * 4, y * 65 + 1 + x * 4 + 4);
  assert.equal(at(0, 0)[3], 0);
  assert.deepEqual([...at(8, 8)], [200, 100, 50, 255]);
  assert.deepEqual([...at(0, 8)], [100, 50, 25, 255]);
});

test("encodeWAV writes a PCM mono header and clipped 16-bit samples", () => {
  const w = encodeWAV([0, 1, -1, 2, 0.5], 8000);
  assert.equal(w.length, 44 + 10);
  assert.equal(w.toString("latin1", 0, 4), "RIFF");
  assert.equal(w.readUInt32LE(4), 36 + 10);
  assert.equal(w.toString("latin1", 8, 16), "WAVEfmt ");
  assert.equal(w.readUInt16LE(20), 1);
  assert.equal(w.readUInt16LE(22), 1);
  assert.equal(w.readUInt32LE(24), 8000);
  assert.equal(w.readUInt32LE(28), 16000);
  assert.equal(w.readUInt16LE(34), 16);
  assert.equal(w.toString("latin1", 36, 40), "data");
  assert.equal(w.readUInt32LE(40), 10);
  assert.deepEqual([0, 1, 2, 3, 4].map((i) => w.readInt16LE(44 + i * 2)), [0, 32767, -32767, 32767, 16384]);
});

test("blipWAV has the requested length, starts silent and stays within volume", () => {
  const w = blipWAV({ ms: 100, rate: 10000, volume: 0.5 });
  const n = (w.length - 44) / 2;
  assert.equal(n, 1000);
  assert.equal(w.readInt16LE(44), 0);
  let peak = 0;
  for (let i = 0; i < n; i++) peak = Math.max(peak, Math.abs(w.readInt16LE(44 + i * 2)));
  assert.ok(peak > 8000 && peak <= 16384, `peak ${peak}`);
});

function fakeExample() {
  return {
    firstLayout: "Menu",
    properties: { name: "x", packageName: "x", windowWidth: 1, windowHeight: 1 },
    resources: { resources: [{ name: "a.png", file: "a.png", kind: "image", metadata: "m", smoothed: true, userAdded: true }], resourceFolders: [] },
    objects: [{
      name: "Logo", type: "Sprite", updateIfNotVisible: false, variables: [1], effects: [],
      behaviors: [{ name: "Hero", type: "PlatformBehavior::PlatformerObjectBehavior", gravity: 1000, jumpSpeed: 600, ignoreDefaultControls: true }],
      animations: [{ name: "idle", useMultipleDirections: false, directions: [{ looping: true, timeBetweenFrames: 0.08, sprites: [
        { image: "a.png", hasCustomCollisionMask: true, customCollisionMask: [[1]], points: [{ name: "p" }],
          originPoint: { name: "origine", x: 5, y: 5 }, centerPoint: { automatic: false, name: "centre", x: 1, y: 1 } },
        { image: "b.png" }] }] }, { name: "run", directions: [] }],
    }],
    layouts: [{
      name: "Menu", mangledName: "Menu", r: 1, v: 2, b: 3, objectsFolderStructure: {},
      layers: [{ name: "UI" }, { name: "", visibility: true }],
      instances: [{ name: "Logo", x: 9, y: 9, persistentUuid: "u", initialVariables: [1] }],
      behaviorsSharedData: [{ name: "Hero", type: "PlatformBehavior::PlatformerObjectBehavior", extra: 7 }],
      objects: [{ name: "Title", type: "TextObject::Text", string: "Hi", font: "f.ttf", characterSize: 20, color: { r: 0, g: 0, b: 0 },
        content: { text: "Hi", font: "f.ttf", characterSize: 20, color: "0;0;0" }, variables: [], effects: [],
        behaviors: [{ name: "Ground", type: "PlatformBehavior::PlatformBehavior", platformType: "NormalPlatform" }] }],
      events: [{ type: "x" }],
    }],
    externalEvents: [1], externalLayouts: [1],
  };
}

test("loadTemplates finds every piece and throws when one is missing", () => {
  const t = loadTemplates([fakeExample()]);
  assert.equal(t.sprite.name, "Logo");
  assert.equal(t.text.name, "Title");
  assert.equal(t.layer.name, "");
  assert.equal(t.imageRes.name, "a.png");
  const bare = fakeExample();
  bare.objects = [];
  assert.throws(() => loadTemplates([bare]), /sprite/);
});

test("loadTemplates collects behaviors and shared data by type", () => {
  const t = loadTemplates([fakeExample()]);
  assert.deepEqual(behaviorTypes(t), ["PlatformBehavior::PlatformBehavior", "PlatformBehavior::PlatformerObjectBehavior"]);
  assert.equal(t.shared["PlatformBehavior::PlatformerObjectBehavior"].extra, 7);
  assert.equal(t.audioRes, null);
});

test("spriteObject keeps one frame showing the given image and does not touch the template", () => {
  const t = loadTemplates([fakeExample()]);
  const o = spriteObject(t, "Player", "player.png");
  assert.equal(o.name, "Player");
  assert.deepEqual(o.behaviors, []);
  assert.equal(o.animations.length, 1);
  assert.equal(o.animations[0].directions.length, 1);
  const s = o.animations[0].directions[0].sprites;
  assert.equal(s.length, 1);
  assert.equal(s[0].image, "player.png");
  assert.equal(s[0].hasCustomCollisionMask, false);
  assert.deepEqual(s[0].originPoint, { name: "origine", x: 0, y: 0 });
  assert.equal(s[0].centerPoint.automatic, true);
  assert.equal(t.sprite.animations[0].directions[0].sprites[0].image, "a.png");
});

test("withBehavior clones the template, renames it and sets only known properties", () => {
  const t = loadTemplates([fakeExample()]);
  const o = withBehavior(t, spriteObject(t, "Player", "p.png"), "PlatformBehavior::PlatformerObjectBehavior", "Mover", { ignoreDefaultControls: false, jumpSpeed: 800 });
  assert.equal(o.behaviors.length, 1);
  assert.deepEqual(o.behaviors[0], { name: "Mover", type: "PlatformBehavior::PlatformerObjectBehavior", gravity: 1000, jumpSpeed: 800, ignoreDefaultControls: false });
  assert.equal(t.behaviors["PlatformBehavior::PlatformerObjectBehavior"].jumpSpeed, 600);
  assert.throws(() => withBehavior(t, o, "PlatformBehavior::PlatformerObjectBehavior", "X", { jumpSped: 1 }), /jumpSped/);
  assert.throws(() => withBehavior(t, o, "Physics2::Physics2Behavior", "P"), /no template behavior/);
});

test("sharedDataFor lists each behavior name once, cloned from the template when there is one", () => {
  const t = loadTemplates([fakeExample()]);
  const a = withBehavior(t, spriteObject(t, "A", "a.png"), "PlatformBehavior::PlatformerObjectBehavior", "Mover");
  const b = withBehavior(t, spriteObject(t, "B", "b.png"), "PlatformBehavior::PlatformBehavior", "Platform");
  const c = withBehavior(t, spriteObject(t, "C", "c.png"), "PlatformBehavior::PlatformBehavior", "Platform");
  assert.deepEqual(sharedDataFor(t, [a, b, c, textObject(t, "Hud")]), [
    { name: "Mover", type: "PlatformBehavior::PlatformerObjectBehavior", extra: 7 },
    { name: "Platform", type: "PlatformBehavior::PlatformBehavior" },
  ]);
});

test("audioResource builds a preloaded sound resource with or without a template", () => {
  const t = loadTemplates([fakeExample()]);
  assert.deepEqual(audioResource(t, "blip.wav"), {
    kind: "audio", name: "blip.wav", file: "blip.wav", metadata: "", userAdded: false,
    preloadAsSound: true, preloadAsMusic: false, preloadInCache: false,
  });
  const ex = fakeExample();
  ex.resources.resources.push({ name: "s.ogg", file: "s.ogg", kind: "audio", metadata: "m", userAdded: true, preloadAsSound: false, preloadAsMusic: true, preloadInCache: false });
  const r = audioResource(loadTemplates([ex]), "jump.wav", { preload: false });
  assert.equal(r.name, "jump.wav");
  assert.equal(r.preloadAsSound, false);
  assert.equal(r.preloadAsMusic, false);
});

test("textObject sets the text in both the old and new fields and drops the font", () => {
  const t = loadTemplates([fakeExample()]);
  const o = textObject(t, "Hud", { text: "Score", size: 28, color: [1, 2, 3] });
  assert.equal(o.string, "Score");
  assert.equal(o.content.text, "Score");
  assert.equal(o.font, "");
  assert.equal(o.content.font, "");
  assert.deepEqual(o.color, { r: 1, g: 2, b: 3 });
  assert.equal(o.content.color, "1;2;3");
  assert.equal(o.content.characterSize, 28);
  assert.deepEqual(o.behaviors, []);
});

test("instance takes an optional custom size", () => {
  const t = loadTemplates([fakeExample()]);
  const a = instance(t, "Ground", 80, 400, 3, 1, { width: 640, height: 32 });
  assert.deepEqual([a.customSize, a.width, a.height], [true, 640, 32]);
  const b = instance(t, "Player", 1, 2, 4);
  assert.deepEqual([b.customSize, b.width, b.height], [false, 0, 0]);
});

test("buildProject makes a one-scene project with only the given pieces", () => {
  const t = loadTemplates([fakeExample()]);
  const p = buildProject(t, {
    name: "probe", packageName: "com.example.probe", width: 800, height: 600, bg: [4, 5, 6],
    resources: [imageResource(t, "player.png"), audioResource(t, "blip.wav")],
    objects: [withBehavior(t, spriteObject(t, "Player", "player.png"), "PlatformBehavior::PlatformerObjectBehavior", "Mover")],
    instances: [instance(t, "Player", 10, 20, 7)],
    events: [jsEvent("g = 1;")],
  });
  assert.equal(p.firstLayout, "Main");
  assert.equal(p.layouts.length, 1);
  const s = p.layouts[0];
  assert.equal(s.name, "Main");
  assert.deepEqual([s.r, s.v, s.b], [4, 5, 6]);
  assert.equal(s.layers.length, 1);
  assert.equal(s.layers[0].name, "");
  assert.equal("objectsFolderStructure" in s, false);
  assert.deepEqual(s.behaviorsSharedData.map((d) => d.name), ["Mover"]);
  assert.deepEqual(p.objects, []);
  assert.deepEqual(p.externalEvents, []);
  assert.deepEqual(p.resources.resources.map((r) => [r.name, r.kind, r.userAdded, r.metadata]), [["player.png", "image", false, ""], ["blip.wav", "audio", false, ""]]);
  assert.equal(s.instances[0].persistentUuid, uuid(7));
  assert.deepEqual(s.instances[0].initialVariables, []);
  assert.equal(s.events[0].type, "BuiltinCommonInstructions::JsCode");
  assert.equal(s.events[0].inlineCode, "g = 1;");
  assert.equal(p.properties.windowWidth, 800);
  assert.equal(p.properties.packageName, "com.example.probe");
});

test("uuid is a valid fixed-width UUID", () => {
  assert.match(uuid(255), /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-8[0-9a-f]{3}-[0-9a-f]{12}$/);
});
