#!/usr/bin/env node
/**
 * Builds the Short (alpha) cohort snapshot fixtures from the full-length parent
 * snapshots. Because Short explorations compress one full-study week into one
 * logged day (studyWeek === studyDay), the parent snapshots — which are keyed by
 * week — map 1:1 onto the Short day-based milestones. We copy the parent data,
 * relabel the exploration_id, and drop a marker so it is clear the file is derived.
 *
 * Usage: node scripts/build-short-cohort-fixtures.mjs
 */
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const fixturesDir = path.join(__dirname, "../src/data/fixtures");

const PARENT_TO_SHORT = {
  "morning-rules": "morning-rules-short",
  eating: "eating-short",
  "screen-sleep": "screen-sleep-short",
  relaxation: "relaxation-short",
  "upf-mood": "upf-mood-short"
};

for (const [parentId, shortId] of Object.entries(PARENT_TO_SHORT)) {
  const parentPath = path.join(fixturesDir, `cohort-snapshot-${parentId}.json`);
  const outPath = path.join(fixturesDir, `cohort-snapshot-${shortId}.json`);
  const parent = JSON.parse(readFileSync(parentPath, "utf8"));

  const shortSnapshot = {
    ...parent,
    exploration_id: shortId,
    derived_from: parentId,
    note: "Derived from the parent cohort snapshot. Short explorations map one logged day to one full-study week, so per-week cohort figures are used as per-day references.",
    generated_at: new Date().toISOString()
  };

  writeFileSync(outPath, `${JSON.stringify(shortSnapshot, null, 2)}\n`);
  console.log(`  ✓ ${path.basename(outPath)} (from ${path.basename(parentPath)})`);
}

console.log("Short cohort fixtures built.");
