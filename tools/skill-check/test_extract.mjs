// Tests for extract.mjs. Apache-2.0. By MV2 of Munim, Inc., made with AI agents (Anthropic Claude).
import test from "node:test";
import assert from "node:assert/strict";
import { parseSkill } from "./extract.mjs";

const T = "```";
const good = `---\nname: my-skill\ndescription: Does a thing.\n---\n\n# x\n\n${T}sh\nnpm test\n${T}\n\n${T}js\nconsole.log(1);\n${T}\n\n${T}json\n{"a": [1, 2]}\n${T}\n`;

test("good skill parses with no problems", () => {
  const r = parseSkill(good);
  assert.deepEqual(r.problems, []);
  assert.equal(r.name, "my-skill");
  assert.equal(r.blocks, 3);
  assert.equal(r.js, "console.log(1);\n");
  assert.deepEqual(JSON.parse(r.json), { a: [1, 2] });
});

test("missing frontmatter is a problem", () => {
  assert.ok(parseSkill(good.replace(/^---[\s\S]*?---\n/, "")).problems.includes("no frontmatter"));
});

test("uppercase name is rejected", () => {
  assert.ok(parseSkill(good.replace("my-skill", "My_Skill")).problems.some((p) => p.startsWith("bad name")));
});

test("long description is rejected", () => {
  assert.ok(parseSkill(good.replace("Does a thing.", "x".repeat(1025))).problems.some((p) => p.startsWith("description too long")));
});

test("broken json block is a problem", () => {
  assert.ok(parseSkill(good.replace('{"a": [1, 2]}', '{"a": [1, 2]')).problems.some((p) => p.startsWith("json block does not parse")));
});

test("inline backticks in tables are not blocks", () => {
  const r = parseSkill(good + "\n| `{\"wait\": 1}` | x |\n");
  assert.equal(r.blocks, 3);
});
