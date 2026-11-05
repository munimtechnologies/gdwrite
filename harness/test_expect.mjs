// Tests for expect.mjs (node --test harness/test_expect.mjs). Apache-2.0. MV2 of Munim, Inc.
import test from "node:test";
import assert from "node:assert/strict";
import { matches } from "./expect.mjs";

test("plain values compare exactly", () => {
  assert.equal(matches(3, 3), true);
  assert.equal(matches(3, 4), false);
  assert.equal(matches("play fly 7", "play fly 7"), true);
  assert.equal(matches(true, true), true);
  assert.equal(matches(null, null), true);
  assert.equal(matches([1, 2], [1, 2]), true);
  assert.equal(matches([1, 2], [2, 1]), false);
  assert.equal(matches({ a: 1 }, { a: 1 }), true);
});

test("number ops", () => {
  assert.equal(matches(5, { gt: 4 }), true);
  assert.equal(matches(4, { gt: 4 }), false);
  assert.equal(matches(4, { gte: 4 }), true);
  assert.equal(matches(1, { lt: 2, gte: 1 }), true);
  assert.equal(matches(2, { lte: 1 }), false);
  assert.equal(matches(7, { between: [5, 9] }), true);
  assert.equal(matches(10, { between: [5, 9] }), false);
});

test("number ops reject non-numbers", () => {
  assert.equal(matches("5", { gt: 4 }), false);
  assert.equal(matches(null, { gte: 0 }), false);
  assert.equal(matches(NaN, { lt: 1 }), false);
});

test("truthy, ne, eq, includes", () => {
  assert.equal(matches(0, { truthy: false }), true);
  assert.equal(matches("x", { truthy: true }), true);
  assert.equal(matches(1, { ne: 2 }), true);
  assert.equal(matches([1], { eq: [1] }), true);
  assert.equal(matches("Score: 3", { includes: "Score" }), true);
  assert.equal(matches(["a", "b"], { includes: "b" }), true);
  assert.equal(matches(5, { includes: "5" }), false);
});
