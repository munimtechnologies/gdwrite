// play: play an exported browser game in headless Chromium from a JSON script of steps, and check it.
// By MV2 of Munim, Inc., made with AI agents (Anthropic Claude). Apache-2.0.
//
//   node harness/play.mjs <build dir> <steps.json> <out dir>
//
// Serves <build dir> over local http (index.html), opens it, waits boot_ms, then runs the steps:
//   {"wait": ms}                         sleep
//   {"click": [x, y]}  {"tap": [x, y]}   mouse click / touch tap (tap needs "touch": true)
//   {"drag": [x1, y1, x2, y2], "ms": 300}
//   {"down": "ArrowRight"} {"up": "ArrowRight"} {"press": "Space"}
//   {"hold": "ArrowRight", "ms": 2500}   key down, wait, key up
//   {"eval": "<js expression>", "save": "name", "expect": <value or {op: arg}>}
//   {"wait_for": "<js expression>", "timeout_ms": 10000}   poll until truthy (a check)
//   {"shot": "name"}                     screenshot to <out>/<script>-<name>.png
//   {"repeat": n, "steps": [...]}
// expect ops: eq, ne, gt, gte, lt, lte, between [a, b], truthy (true/false), includes. A plain value
// (or an object with no op keys) must equal the result exactly (compared as JSON).
// Top-level keys: viewport {width, height}, touch (bool), boot_ms (default 8000), steps.
//
// Writes <out>/<script>-play.json. Exit 0 only if ok: the page made a canvas, threw no page error,
// and every expect / wait_for passed.

import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import { chromium } from "playwright";
import { matches } from "./expect.mjs";

const [dir, stepsFile, out] = process.argv.slice(2);
if (!dir || !stepsFile || !out) {
  console.error("usage: node play.mjs <build dir> <steps.json> <out dir>");
  process.exit(64);
}
const script = JSON.parse(fs.readFileSync(stepsFile, "utf8"));
const name = path.basename(stepsFile).replace(/\.json$/i, "");
const root = path.resolve(dir);
fs.mkdirSync(out, { recursive: true });

const types = {
  ".html": "text/html", ".js": "text/javascript", ".json": "application/json", ".png": "image/png",
  ".jpg": "image/jpeg", ".wav": "audio/wav", ".ogg": "audio/ogg", ".mp3": "audio/mpeg", ".wasm": "application/wasm",
  ".ttf": "font/ttf", ".otf": "font/otf", ".css": "text/css", ".webmanifest": "application/manifest+json",
};
const report = { script: name, pageErrors: [], consoleErrors: [], consoleOther: 0, missing: [], canvas: null, results: [], saved: {} };

const server = http.createServer((req, res) => {
  const rel = decodeURIComponent(new URL(req.url, "http://x").pathname);
  let p = path.join(root, rel);
  if (!p.startsWith(root)) { res.writeHead(403); res.end(); return; }
  if (p === root || p.endsWith(path.sep)) p = path.join(p, "index.html");
  fs.readFile(p, (err, buf) => {
    if (err) { if (report.missing.length < 50) report.missing.push(rel); res.writeHead(404); res.end(); return; }
    res.writeHead(200, { "Content-Type": types[path.extname(p).toLowerCase()] || "application/octet-stream" });
    res.end(buf);
  });
});
await new Promise((r) => server.listen(0, "127.0.0.1", r));
const url = `http://127.0.0.1:${server.address().port}/index.html`;

const browser = await chromium.launch({
  args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--autoplay-policy=no-user-gesture-required"],
});
const vp = script.viewport || { width: 800, height: 600 };
const context = await browser.newContext({ viewport: vp, hasTouch: !!script.touch, isMobile: !!script.touch });
const page = await context.newPage();
page.on("console", (m) => {
  if (m.type() === "error") { if (report.consoleErrors.length < 50) report.consoleErrors.push(m.text().slice(0, 400)); }
  else report.consoleOther++;
});
page.on("pageerror", (e) => { if (report.pageErrors.length < 20) report.pageErrors.push(String((e && e.stack) || e).slice(0, 800)); });

const sleep = (ms) => page.waitForTimeout(ms);
const evaluate = (expr) => page.evaluate(
  `(() => { const v = (${expr}); return v === undefined ? null : JSON.parse(JSON.stringify(v)); })()`);

let counter = 0;
async function run(steps, depth) {
  for (const s of steps) {
    const i = counter++;
    if ("wait" in s) await sleep(s.wait);
    else if ("click" in s) await page.mouse.click(s.click[0], s.click[1]);
    else if ("tap" in s) await page.touchscreen.tap(s.tap[0], s.tap[1]);
    else if ("drag" in s) {
      const [x1, y1, x2, y2] = s.drag, n = 10, ms = s.ms || 300;
      await page.mouse.move(x1, y1);
      await page.mouse.down();
      for (let k = 1; k <= n; k++) { await page.mouse.move(x1 + ((x2 - x1) * k) / n, y1 + ((y2 - y1) * k) / n); await sleep(ms / n); }
      await page.mouse.up();
    } else if ("down" in s) await page.keyboard.down(s.down);
    else if ("up" in s) await page.keyboard.up(s.up);
    else if ("press" in s) await page.keyboard.press(s.press, { delay: s.ms || 120 });
    else if ("hold" in s) { await page.keyboard.down(s.hold); await sleep(s.ms || 1000); await page.keyboard.up(s.hold); }
    else if ("eval" in s) {
      let value = null, error = null;
      try { value = await evaluate(s.eval); } catch (e) { error = String((e && e.message) || e).slice(0, 300); }
      if (s.save) report.saved[s.save] = value;
      if ("expect" in s) {
        const pass = !error && matches(value, s.expect);
        report.results.push({ step: i, eval: s.eval, value, expect: s.expect, pass, error });
      } else if (error) report.results.push({ step: i, eval: s.eval, value: null, pass: false, error });
    } else if ("wait_for" in s) {
      const t0 = Date.now(), limit = s.timeout_ms || 10000;
      let pass = false, value = null, error = null;
      while (Date.now() - t0 < limit) {
        try { value = await evaluate(s.wait_for); error = null; } catch (e) { error = String((e && e.message) || e).slice(0, 300); }
        if (!error && value) { pass = true; break; }
        await sleep(100);
      }
      report.results.push({ step: i, wait_for: s.wait_for, value, pass, ms: Date.now() - t0, error });
    } else if ("shot" in s) await page.screenshot({ path: path.join(out, `${name}-${s.shot}.png`) });
    else if ("repeat" in s) { for (let r = 0; r < s.repeat; r++) await run(s.steps || [], depth + 1); }
    else report.results.push({ step: i, pass: false, error: "unknown step: " + JSON.stringify(s).slice(0, 200) });
  }
}

try {
  await page.goto(url, { waitUntil: "load", timeout: 60000 });
  await sleep(script.boot_ms ?? 8000);
  report.canvas = await page.evaluate(() => {
    const c = document.querySelector("canvas");
    return c ? [c.width, c.height] : null;
  });
  await run(script.steps || [], 0);
} catch (e) {
  report.pageErrors.push("harness: " + String((e && e.message) || e).slice(0, 400));
}

report.passed = report.results.filter((r) => r.pass).length;
report.failed = report.results.filter((r) => !r.pass).length;
report.ok = report.pageErrors.length === 0 && !!report.canvas && report.failed === 0;
fs.writeFileSync(path.join(out, `${name}-play.json`), JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2).slice(0, 6000));
console.log(`[play] ${name}: ${report.ok ? "OK" : "FAIL"} (${report.passed} passed, ${report.failed} failed, ${report.pageErrors.length} page errors)`);
await browser.close();
server.close();
process.exit(report.ok ? 0 : 1);
