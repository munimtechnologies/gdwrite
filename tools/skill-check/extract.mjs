// extract.mjs: check a SKILL.md's frontmatter and pull out its first ```js and ```json blocks, so a job can run
// the skill's own example exactly as written. By MV2 of Munim, Inc., made with AI agents (Anthropic Claude). Apache-2.0.
//
//   node extract.mjs <SKILL.md> <out dir>     -> <out dir>/example.mjs, <out dir>/steps.json, prints a JSON report
//
// Exit 0 only if: frontmatter has name (lowercase letters, digits, hyphens; <= 64 chars) and description
// (1..1024 chars), and one js block and one json block exist and the json block parses.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export function parseSkill(text) {
  const problems = [];
  const fm = /^---\r?\n([\s\S]*?)\r?\n---\r?\n/.exec(text);
  let name = null, description = null;
  if (!fm) problems.push("no frontmatter");
  else {
    for (const line of fm[1].split(/\r?\n/)) {
      const m = /^(name|description):\s*(.*)$/.exec(line);
      if (m && m[1] === "name") name = m[2].trim();
      if (m && m[1] === "description") description = m[2].trim();
    }
    if (!name) problems.push("no name");
    else if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(name) || name.length > 64) problems.push("bad name: " + name);
    if (!description) problems.push("no description");
    else if (description.length > 1024) problems.push("description too long: " + description.length);
  }
  const blocks = [];
  const re = /^```(\w*)\r?\n([\s\S]*?)^```\s*$/gm;
  let b;
  while ((b = re.exec(text))) blocks.push({ lang: b[1], body: b[2] });
  const js = blocks.find((x) => x.lang === "js");
  const json = blocks.find((x) => x.lang === "json");
  if (!js) problems.push("no js block");
  if (!json) problems.push("no json block");
  else { try { JSON.parse(json.body); } catch (e) { problems.push("json block does not parse: " + e.message); } }
  return { name, description, descriptionLength: description ? description.length : 0, blocks: blocks.length,
    js: js ? js.body : null, json: json ? json.body : null, problems };
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  const [skill, outDir] = process.argv.slice(2);
  if (!skill || !outDir) { console.error("usage: node extract.mjs <SKILL.md> <out dir>"); process.exit(64); }
  const r = parseSkill(fs.readFileSync(skill, "utf8"));
  fs.mkdirSync(outDir, { recursive: true });
  if (r.js) fs.writeFileSync(path.join(outDir, "example.mjs"), r.js);
  if (r.json) fs.writeFileSync(path.join(outDir, "steps.json"), r.json);
  console.log(JSON.stringify({ name: r.name, descriptionLength: r.descriptionLength, blocks: r.blocks, problems: r.problems }));
  process.exit(r.problems.length ? 1 : 0);
}
