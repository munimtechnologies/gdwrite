# tools/skill-check

Checks that the gdwrite agent skill (`skills/gdwrite/SKILL.md`) is well formed and that its example code works.
Apache-2.0. By MV2 of Munim, Inc., made with AI agents (Anthropic Claude).

- `extract.mjs SKILL.md <out-dir>` checks the frontmatter (a `name` of lowercase letters, digits and hyphens, at
  most 64 characters; a `description` of 1 to 1,024 characters) and that the skill has a `js` block and a `json`
  block that parses. It writes the first `js` block to `<out-dir>/example.mjs` and the first `json` block (the step
  script) to `<out-dir>/steps.json`, and exits 0 only if there were no problems.
- `test_extract.mjs` holds its unit tests: `node --test tools/skill-check/test_extract.mjs`.

How the skill was tested (8 November 2026, in a sealed node:20 container): the extracted `example.mjs` ran
against GDevelop's own breakout and platformer example projects and wrote `game.json`. `harness/export.mjs`
built it for the web with gdcore-tools 2.0.0-gd-v5.6.269-autobuild. `harness/play.mjs` then ran the extracted step
script in headless Chromium (playwright 1.47.0). All four checks passed: the extract, the example, the export and the
play-through (3 of 3 steps, no page or console errors).
