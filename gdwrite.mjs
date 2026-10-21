// gdwrite: build a GDevelop project JSON in code, with no editor.
// By MV2 of Munim, Inc., made with AI agents (Anthropic Claude). Apache-2.0.
//
// Schema-sensitive pieces (project properties, a scene, its base layer, a Text object, a Sprite
// object, an instance, an image resource and, since 0.2, behaviors and their scene shared data) are
// cloned from existing GDevelop example projects, so their fields match the engine version that saved
// them. Everything placed in the new project (objects, behaviors, instances, images, sounds,
// JavaScript events) is set by the caller.

const clone = (o) => structuredClone(o);

const resourceList = (p) => (Array.isArray(p.resources) ? p.resources : (p.resources && p.resources.resources) || []);

// Scan parsed example projects for one of each template piece. Throws if any required one is missing.
// Behaviors (by type), their shared data (by type) and an audio resource are optional extras.
export function loadTemplates(projects) {
  const t = { base: null, layout: null, text: null, sprite: null, layer: null, instance: null, imageRes: null };
  const behaviors = {}, shared = {};
  let audioRes = null;
  for (const p of projects) {
    const scopes = [{ objects: p.objects || [], layout: null }, ...(p.layouts || []).map((l) => ({ objects: l.objects || [], layout: l }))];
    for (const s of scopes) {
      for (const o of s.objects) {
        if (!t.text && o.type === "TextObject::Text") t.text = o;
        if (!t.sprite && o.type === "Sprite" && o.animations && o.animations[0] && o.animations[0].directions &&
            o.animations[0].directions[0] && (o.animations[0].directions[0].sprites || [])[0]) t.sprite = o;
        for (const b of o.behaviors || []) {
          if (b && b.type && !behaviors[b.type]) behaviors[b.type] = b;
        }
      }
    }
    for (const l of p.layouts || []) {
      if (!t.layout) { t.layout = l; t.base = p; }
      if (!t.layer) t.layer = (l.layers || []).find((L) => L.name === "") || null;
      if (!t.instance && (l.instances || [])[0]) t.instance = l.instances[0];
      for (const d of l.behaviorsSharedData || []) {
        if (d && d.type && !shared[d.type]) shared[d.type] = d;
      }
    }
    if (!t.imageRes) t.imageRes = resourceList(p).find((r) => r.kind === "image") || null;
    if (!audioRes) audioRes = resourceList(p).find((r) => r.kind === "audio") || null;
  }
  const missing = Object.keys(t).filter((k) => !t[k]);
  if (missing.length) throw new Error("templates missing: " + missing.join(", "));
  return Object.assign(t, { behaviors, shared, audioRes });
}

// Behavior types found in the example projects, e.g. "PlatformBehavior::PlatformerObjectBehavior".
export function behaviorTypes(t) {
  return Object.keys(t.behaviors).sort();
}

export function textObject(t, name, { text = "", size = 32, color = [255, 255, 255] } = {}) {
  const o = clone(t.text);
  Object.assign(o, { name, behaviors: [], variables: [], effects: [] });
  if ("string" in o) o.string = text;
  if ("font" in o) o.font = "";
  if ("characterSize" in o) o.characterSize = size;
  if (o.color && typeof o.color === "object") o.color = { r: color[0], g: color[1], b: color[2] };
  if (o.content) Object.assign(o.content, { text, font: "", characterSize: size, color: color.join(";") });
  return o;
}

// A Sprite with one animation, one direction and one frame showing `image` (a resource name).
export function spriteObject(t, name, image) {
  const o = clone(t.sprite);
  Object.assign(o, { name, behaviors: [], variables: [], effects: [] });
  const a = clone(o.animations[0]);
  const d = clone(a.directions[0]);
  const s = clone(d.sprites[0]);
  Object.assign(s, { image, hasCustomCollisionMask: false, customCollisionMask: [], points: [] });
  if (s.originPoint) Object.assign(s.originPoint, { x: 0, y: 0 });
  if (s.centerPoint) s.centerPoint.automatic = true;
  d.looping = false;
  d.sprites = [s];
  a.name = "";
  a.directions = [d];
  o.animations = [a];
  return o;
}

// Add a behavior of `type` (cloned from the examples) to object `o`, named `name`. `props` may only
// set properties the template behavior already has, so a typo fails here instead of in the engine.
export function withBehavior(t, o, type, name, props = {}) {
  const tpl = t.behaviors[type];
  if (!tpl) throw new Error(`no template behavior of type ${type}; found: ${behaviorTypes(t).join(", ") || "none"}`);
  const b = clone(tpl);
  const unknown = Object.keys(props).filter((k) => !(k in b) || k === "name" || k === "type");
  if (unknown.length) throw new Error(`behavior ${type} has no propert${unknown.length > 1 ? "ies" : "y"} ${unknown.join(", ")}`);
  Object.assign(b, props, { name, type });
  o.behaviors = [...(o.behaviors || []), b];
  return o;
}

export function imageResource(t, file) {
  return Object.assign(clone(t.imageRes), { name: file, file, metadata: "", userAdded: false });
}

// A sound file (WAV, OGG, MP3...) to play with gdjs.evtTools.sound.playSound(runtimeScene, file, ...).
export function audioResource(t, file, { preload = true } = {}) {
  const base = t.audioRes ? clone(t.audioRes) : { kind: "audio" };
  return Object.assign(base, {
    name: file, file, kind: "audio", metadata: "", userAdded: false,
    preloadAsSound: preload, preloadAsMusic: false, preloadInCache: false,
  });
}

export function uuid(i) {
  return "4d2a8f9e-0000-4000-8000-" + i.toString(16).padStart(12, "0");
}

// size: optional { width, height } to stretch the instance (customSize).
export function instance(t, name, x, y, i, zOrder = 1, size = null) {
  return Object.assign(clone(t.instance), {
    name, layer: "", x, y, zOrder, angle: 0,
    customSize: !!size, width: size ? size.width : 0, height: size ? size.height : 0,
    persistentUuid: uuid(i), numberProperties: [], stringProperties: [], initialVariables: [],
  });
}

export function jsEvent(code) {
  return { type: "BuiltinCommonInstructions::JsCode", inlineCode: code, parameterObjects: "", useStrict: true, eventsSheetExpanded: false };
}

// One entry per behavior name used by the scene's objects, cloned from the examples' shared data
// when they have one for that type.
export function sharedDataFor(t, objects) {
  const out = [], seen = new Set();
  for (const o of objects) {
    for (const b of o.behaviors || []) {
      if (seen.has(b.name)) continue;
      seen.add(b.name);
      out.push(Object.assign(t.shared && t.shared[b.type] ? clone(t.shared[b.type]) : {}, { name: b.name, type: b.type }));
    }
  }
  return out;
}

// One-scene project. spec: { name, packageName, width, height, bg: [r,g,b], objects, instances, events, resources }
export function buildProject(t, spec) {
  const scene = clone(t.layout);
  Object.assign(scene, {
    name: "Main", mangledName: "Main", title: "",
    objects: spec.objects, instances: spec.instances, layers: [clone(t.layer)],
    objectsGroups: [], variables: [], behaviorsSharedData: sharedDataFor(t, spec.objects), events: spec.events,
  });
  if (spec.bg) Object.assign(scene, { r: spec.bg[0], v: spec.bg[1], b: spec.bg[2] });
  delete scene.objectsFolderStructure;

  const proj = clone(t.base);
  Object.assign(proj, {
    firstLayout: "Main",
    resources: Array.isArray(t.base.resources) ? spec.resources : { ...clone(t.base.resources), resources: spec.resources, resourceFolders: [] },
    objects: [], objectsGroups: [], variables: [], layouts: [scene],
    externalEvents: [], eventsFunctionsExtensions: [], externalLayouts: [], externalSourceFiles: [],
  });
  delete proj.objectsFolderStructure;
  Object.assign(proj.properties, {
    name: spec.name, description: "", author: "", authorIds: [], authorUsernames: [], templateSlug: "",
    packageName: spec.packageName, projectUuid: uuid(0xaa), windowWidth: spec.width, windowHeight: spec.height,
  });
  return proj;
}
