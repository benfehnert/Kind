import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { listSnapshotIds, buildSnapshot } from "./helpers/snapshotOutputs.js";

const outputsDir = path.join(path.dirname(fileURLToPath(import.meta.url)), "outputs");

const REGEN_HINT =
  "If this change is intentional, run `npm run test:update-snapshots` in apps/api and review the git diff of tests/outputs/.";

for (const explorationId of listSnapshotIds()) {
  test(`analysis output matches snapshot: ${explorationId}`, () => {
    const filePath = path.join(outputsDir, `${explorationId}.json`);
    let expected;
    try {
      expected = JSON.parse(readFileSync(filePath, "utf8"));
    } catch {
      assert.fail(`Missing or unreadable snapshot ${filePath}. ${REGEN_HINT}`);
    }

    try {
      assert.deepEqual(buildSnapshot(explorationId), expected);
    } catch (err) {
      err.message = `Analysis output changed for ${explorationId}. ${REGEN_HINT}\n${err.message}`;
      throw err;
    }
  });
}
