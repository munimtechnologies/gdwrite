// export: export a GDevelop project to a browser build without the editor (gdcore-tools 2.x).
// By MV2 of Munim, Inc., made with AI agents (Anthropic Claude). Apache-2.0.
//
//   node harness/export.mjs <project.json> <out dir>
//
// Exit 0 when <out dir>/index.html exists after the export.

import fs from "node:fs";
import path from "node:path";

const [project, outDir] = process.argv.slice(2);
if (!project || !outDir) {
  console.error("usage: node export.mjs <project.json> <out dir>");
  process.exit(64);
}
const log = (...a) => console.log("[export]", ...a);
process.on("unhandledRejection", (e) => { log("unhandled:", (e && e.stack) || e); process.exit(3); });

let mod;
const t0 = Date.now();
try {
  mod = await import("gdcore-tools");
} catch (e) {
  log("import failed:", e.message);
  process.exit(2);
}
log("loaded in", ((Date.now() - t0) / 1000).toFixed(1), "s");

const proj = await mod.loadProject(path.resolve(project));
log("project:", proj.getName(), "| scenes:", proj.getLayoutsCount());
fs.mkdirSync(outDir, { recursive: true });
const t1 = Date.now();
await mod.exportProject(proj, path.resolve(outDir));
const files = fs.readdirSync(outDir);
log("export took", ((Date.now() - t1) / 1000).toFixed(1), "s;", files.length, "entries:", files.slice(0, 40).join(", "));
const ok = files.includes("index.html");
log(ok ? "index.html present" : "NO index.html");
if (typeof mod.gd_internal_logs === "string" && mod.gd_internal_logs) {
  log("gd logs (last 1500 chars):", mod.gd_internal_logs.slice(-1500));
}
process.exit(ok ? 0 : 1);
