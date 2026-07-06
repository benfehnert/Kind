#!/usr/bin/env node
/** Generates anna-upf-mood-completion.json — run once to refresh fixture. */
import { writeFileSync, mkdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.join(__dirname, "../src/data/fixtures");
mkdirSync(outDir, { recursive: true });

const STUDY_START = "2026-02-01";
const SKIP = new Set([5, 12, 23, 38, 41]);

function addDays(iso, n) {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

function dayRow(studyDay, upfPct, mood, energy, swaps) {
  return {
    log_date: addDays(STUDY_START, studyDay - 1),
    field_values: {
      upf_pct: Math.round(upfPct),
      upf_mood: Math.round(mood * 10) / 10,
      upf_energy: Math.round(energy * 10) / 10,
      upf_swaps: swaps
    }
  };
}

/** 12 baseline days — avg ~58% UPF, ~5.6 mood, bands ~42/33/25 */
const BASELINE = [
  { upf: 86, mood: 5.5, energy: 5.3, swaps: [] },
  { upf: 84, mood: 5.6, energy: 5.4, swaps: [] },
  { upf: 82, mood: 5.55, energy: 5.35, swaps: [] },
  { upf: 80, mood: 5.65, energy: 5.45, swaps: [] },
  { upf: 78, mood: 5.58, energy: 5.38, swaps: [] },
  { upf: 52, mood: 5.62, energy: 5.42, swaps: [] },
  { upf: 50, mood: 5.54, energy: 5.36, swaps: [] },
  { upf: 48, mood: 5.68, energy: 5.48, swaps: [] },
  { upf: 46, mood: 5.56, energy: 5.4, swaps: [] },
  { upf: 29, mood: 5.6, energy: 5.44, swaps: [] },
  { upf: 28, mood: 5.52, energy: 5.32, swaps: [] },
  { upf: 27, mood: 5.64, energy: 5.46, swaps: [] }
];

/** 13 reduction days — mood ~6.4, UPF falling toward ~30% */
const REDUCTION = [
  { upf: 44, mood: 6.2, energy: 5.9, swaps: ["Breakfast"] },
  { upf: 42, mood: 6.35, energy: 6.0, swaps: ["Breakfast", "Snacks"] },
  { upf: 40, mood: 6.4, energy: 6.1, swaps: ["Snacks"] },
  { upf: 38, mood: 6.45, energy: 6.15, swaps: ["Breakfast", "Snacks"] },
  { upf: 36, mood: 5.95, energy: 6.05, swaps: ["Lunch"] },
  { upf: 34, mood: 6.38, energy: 6.12, swaps: ["Breakfast", "Snacks"] },
  { upf: 33, mood: 6.42, energy: 6.18, swaps: ["Breakfast"] },
  { upf: 32, mood: 6.48, energy: 6.22, swaps: ["Breakfast", "Snacks", "Lunch"] },
  { upf: 31, mood: 6.05, energy: 6.05, swaps: ["Dinner"] },
  { upf: 30, mood: 6.44, energy: 6.2, swaps: ["Breakfast", "Snacks"] },
  { upf: 29, mood: 6.15, energy: 6.1, swaps: ["Dinner"] },
  { upf: 28, mood: 6.2, energy: 6.12, swaps: ["Snacks", "Lunch"] },
  { upf: 27, mood: 6.4, energy: 6.15, swaps: ["Breakfast", "Snacks"] }
];

/** 7 sustained days — mood ~7.8 lifts active average, UPF ~28% */
const SUSTAINED = [
  { upf: 32, mood: 7.7, energy: 6.6, swaps: ["Breakfast", "Snacks"] },
  { upf: 30, mood: 7.85, energy: 6.7, swaps: ["Breakfast"] },
  { upf: 29, mood: 7.9, energy: 6.75, swaps: ["Breakfast", "Snacks"] },
  { upf: 31, mood: 6.8, energy: 6.3, swaps: ["Lunch", "Dinner"] },
  { upf: 27, mood: 7.95, energy: 6.8, swaps: ["Breakfast", "Snacks"] },
  { upf: 26, mood: 7.8, energy: 6.72, swaps: ["Breakfast", "Snacks", "Dinner"] },
  { upf: 25, mood: 7.88, energy: 6.78, swaps: ["Snacks"] }
];

/** 5 output days — mood ~7.2, UPF ~32% */
const OUTPUT = [
  { upf: 34, mood: 7.15, energy: 6.85, swaps: ["Breakfast", "Snacks"] },
  { upf: 32, mood: 7.2, energy: 6.9, swaps: ["Breakfast", "Snacks"] },
  { upf: 28, mood: 7.25, energy: 6.95, swaps: ["Breakfast", "Snacks", "Lunch"] },
  { upf: 33, mood: 7.18, energy: 6.88, swaps: ["Breakfast", "Snacks"] },
  { upf: 27, mood: 7.22, energy: 6.92, swaps: ["Breakfast", "Snacks", "Dinner"] }
];

const logs = [];
let bIdx = 0;
let rIdx = 0;
let sIdx = 0;
let oIdx = 0;

for (let day = 1; day <= 42; day += 1) {
  if (SKIP.has(day)) continue;

  if (day <= 14) {
    const row = BASELINE[bIdx++];
    logs.push(dayRow(day, row.upf, row.mood, row.energy, row.swaps));
    continue;
  }
  if (day <= 28) {
    const row = REDUCTION[rIdx++];
    logs.push(dayRow(day, row.upf, row.mood, row.energy, row.swaps));
    continue;
  }
  if (day <= 35) {
    const row = SUSTAINED[sIdx++];
    logs.push(dayRow(day, row.upf, row.mood, row.energy, row.swaps));
    continue;
  }
  const row = OUTPUT[oIdx++];
  logs.push(dayRow(day, row.upf, row.mood, row.energy, row.swaps));
}

const fixture = {
  participantName: "Anna",
  studyStartDate: STUDY_START,
  endDate: "2026-03-14",
  explorationId: "upf-mood",
  logs
};

writeFileSync(
  path.join(outDir, "anna-upf-mood-completion.json"),
  JSON.stringify(fixture, null, 2)
);

const cohort = {
  generated_at: new Date().toISOString(),
  exploration_id: "upf-mood",
  avg_improvement_points: 0.9,
  top_habit_by_mood: "breakfast_swap",
  by_week: Object.fromEntries(
    [1, 2, 3, 4, 5, 6].map((w) => [
      String(w),
      {
        participant_count: 22,
        logging_pct_distribution: [42, 48, 55, 62, 68, 74, 78, 82, 85, 88, 90, 92, 94, 96, 97]
      }
    ])
  ),
  weekly_mood: Object.fromEntries(
    [1, 2, 3, 4, 5, 6].map((w) => [
      String(w),
      {
        n: 18 + w,
        mean: 5.4 + w * 0.18,
        p25: 4.8 + w * 0.12,
        p75: 6.0 + w * 0.2
      }
    ])
  ),
  stacking_effect_at_week: Object.fromEntries(
    [1, 2, 3, 4, 5, 6].map((w) => [
      String(w),
      {
        mean_mood_under_30_upf: 5.8 + w * 0.22,
        mean_mood_over_50_upf: 5.2 + w * 0.08
      }
    ])
  )
};

writeFileSync(
  path.join(outDir, "cohort-snapshot-upf-mood.json"),
  JSON.stringify(cohort, null, 2)
);

console.log(`Wrote ${logs.length} logs (~${Math.round((logs.length / 42) * 100)}% adherence)`);
