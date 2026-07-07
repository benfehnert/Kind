import test from "node:test";
import assert from "node:assert/strict";
import { binaryHabitAnalysis } from "../src/lib/centShort/shared/binaryAnalysis.js";
import { phaseStats, effectSize, adherenceStats } from "../src/lib/centShort/shared/stats.js";

test("binaryHabitAnalysis returns insufficient_data with one-sided habit logs", () => {
  const phaseEntries = [
    { sunlight: true, afternoon_energy: 5 },
    { sunlight: true, afternoon_energy: 6 },
    { sunlight: true, afternoon_energy: 7 }
  ];
  const out = binaryHabitAnalysis(phaseEntries, "sunlight", "afternoon_energy", {
    minObservations: 1
  });
  assert.equal(out.status, "insufficient_data");
  assert.equal(out.not_followed_n, 0);
});

test("effectSize reports improved direction for better active phase", () => {
  const baseline = phaseStats(
    [{ y: 2 }, { y: 3 }, { y: 2 }, { y: 3 }, { y: 2 }, { y: 3 }, { y: 2 }],
    "y"
  );
  const active = phaseStats(
    [{ y: 7 }, { y: 8 }, { y: 7 }, { y: 8 }, { y: 7 }, { y: 8 }, { y: 7 }],
    "y"
  );
  const out = effectSize(baseline, active, "y", { minBaselineDays: 1, minActiveDays: 1 });
  assert.equal(out.status, "valid");
  assert.equal(out.direction, "improved");
});

test("adherenceStats computes streak and logging percentage", () => {
  const allEntries = [
    { date: "2026-06-01", phase: "BASELINE", valid_for_analysis: true },
    { date: "2026-06-02", phase: "INTERVENTION", valid_for_analysis: true },
    { date: "2026-06-03", phase: "OPTIMISE", valid_for_analysis: true }
  ];
  const out = adherenceStats(allEntries, "2026-06-01", "2026-06-03");
  assert.equal(out.current_streak, 3);
  assert.equal(out.days_logged, 3);
  assert.equal(out.days_elapsed, 3);
  assert.equal(out.logging_pct, 100);
});
