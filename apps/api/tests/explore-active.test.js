import test from "node:test";
import assert from "node:assert/strict";
import { isExplorationStarted } from "../src/lib/exploreData.js";

test("isExplorationStarted is false when not consented", () => {
  assert.equal(isExplorationStarted(false, { status: "active" }), false);
});

test("isExplorationStarted is false when there is no run", () => {
  assert.equal(isExplorationStarted(true, null), false);
});

test("isExplorationStarted is true for a started, non-complete run", () => {
  assert.equal(isExplorationStarted(true, { status: "active" }), true);
});

test("isExplorationStarted is false once the run is complete", () => {
  assert.equal(isExplorationStarted(true, { status: "complete" }), false);
});

test("isExplorationStarted supports multiple simultaneously started explorations", () => {
  const runA = { status: "active" };
  const runB = { status: "active" };
  assert.equal(isExplorationStarted(true, runA), true);
  assert.equal(isExplorationStarted(true, runB), true);
});
