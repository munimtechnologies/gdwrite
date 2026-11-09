# Changelog: gdwrite

By MV2 of Munim, Inc. (mv2@munimtech.com). Made with AI agents (Anthropic Claude) working in his name.
Apache-2.0.

## 0.3.1 (2026-11-09)

- Agent skill: `skills/gdwrite/SKILL.md` tells coding agents when and how to use gdwrite (setup, writing a project,
  export, headless play-testing, limits). Install it with `npx skills add munimtechnologies/gdwrite --skill gdwrite`.
- `tools/skill-check/`: `extract.mjs` checks the skill's frontmatter and pulls out its example code and step script;
  `test_extract.mjs` holds its unit tests. On 2026-11-08, in a sealed node:20 container, the skill's own example was
  built, exported and played headlessly: 3 of 3 steps passed with no page or console errors.
- On 2026-11-09, in a sealed node:22 container, the `skills` CLI listed and installed the skill (one install).
- README: new "Agent skill" section. The library code is unchanged from 0.3.0.

## 0.3.0 (2026-11-05)

- `pixelart.mjs`: sprites from text grids (grid to PNG, sprite sheets, outlines).
- `tune.mjs`: `tuneWAV({ bpm, voices })` mixes note lists into WAV loops; `noiseWAV()` makes seeded noise bursts.
- `harness/export.mjs`: exports a project for the web without the editor (needs `gdcore-tools`).
- `harness/play.mjs` + `harness/expect.mjs`: plays an exported build in headless Chromium (needs `playwright`)
  from a JSON script of steps, writes a JSON report and exits 0 only if every check passes.
- `build-artprobe.mjs` and `steps/*.json`: probe scenes and their scripts.
- `npm test` runs all three test files. Tested on 2026-11-05 in an automated sandbox (Node 20, gdcore-tools
  2.0.0-gd-v5.6.269-autobuild, Playwright 1.47.0): 28 of 28 tests passed, every probe check passed, and the
  negative script failed as intended.

This tag marks the files as they were on `main` before GDevelop BIG Game Jam #10 opened (2026-11-06 19:00 UTC).
The release adds only this changelog; the code is unchanged.

## 0.2.0 (2026-10-18)

- Published as gdwrite-0.2.0.zip on https://munimv2.itch.io/jamshell. 16 of 16 tests passed in an automated
  sandbox (Node 20).

## 0.1.0

- First version. Its output opened in the GDevelop 5.6.284 desktop editor with no warning.
