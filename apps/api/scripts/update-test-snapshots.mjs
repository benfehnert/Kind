#!/usr/bin/env node
/**
 * Regenerates the algorithm snapshot files in tests/outputs/.
 *
 * Run this after an intentional change to the cent/centShort analysis code,
 * then review the git diff of tests/outputs/ before committing — the diff is
 * the human check that the numbers moved the way you expected.
 *
 * Usage:
 *   npm run test:update-snapshots   (from apps/api)
 */
import { writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { listSnapshotIds, buildSnapshot } from "../tests/helpers/snapshotOutputs.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outputsDir = path.join(__dirname, "../tests/outputs");

for (const explorationId of listSnapshotIds()) {
  const snapshot = buildSnapshot(explorationId);
  const filePath = path.join(outputsDir, `${explorationId}.json`);
  writeFileSync(filePath, `${JSON.stringify(snapshot, null, 2)}\n`);
  console.log(`wrote ${path.relative(process.cwd(), filePath)}`);
}
