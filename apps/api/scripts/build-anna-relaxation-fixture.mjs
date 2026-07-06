#!/usr/bin/env node
/** Generates anna-relaxation-completion.json — run once to refresh fixture. */
import { writeFileSync, mkdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.join(__dirname, "../src/data/fixtures");
mkdirSync(outDir, { recursive: true });

const STUDY_START = "2025-11-05";

function addDays(iso, n) {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

function dayRow(studyDay, practices, stress, anxiety, composure) {
  return {
    log_date: addDays(STUDY_START, studyDay - 1),
    field_values: {
      rp_practices: practices,
      rp_stress: Math.round(stress * 10) / 10,
      rp_anxiety: Math.round(anxiety * 10) / 10,
      rp_composure: Math.round(composure * 10) / 10
    }
  };
}

const VAGAL = "Vagal breathing";
const PMR = "Progressive muscle relaxation";
const WALK = "Short nature walk";
const MED = "Meditation / visualisation";

const skipDays = new Set([4, 9, 14, 20, 25, 31, 38]);

const BASELINE_ANXIETY = [7.5, 5.5, 5.5, 3.5, 3.5, 2, 7, 5.5, 3.5, 2, 5.5];

/** 24 active rows: intervention composure ~6.4, output ~7.4, habit effects tuned for CENT */
const ACTIVE_DAY_PLANS = [
  { vagal: true, walk: true, pmr: false, med: false, stress: 3.8, composure: 6.3, anxiety: 4.5 },
  { vagal: true, walk: false, pmr: true, med: false, stress: 4.0, composure: 6.5, anxiety: 4.2 },
  { vagal: true, walk: true, pmr: false, med: true, stress: 3.7, composure: 6.4, anxiety: 3.8 },
  { vagal: false, walk: false, pmr: false, med: false, stress: 5.7, composure: 6.1, anxiety: 5.8 },
  { vagal: true, walk: true, pmr: false, med: false, stress: 3.9, composure: 6.6, anxiety: 4.0 },
  { vagal: true, walk: false, pmr: false, med: false, stress: 4.1, composure: 6.3, anxiety: 4.8 },
  { vagal: true, walk: true, pmr: true, med: false, stress: 3.6, composure: 6.7, anxiety: 3.5 },
  { vagal: false, walk: true, pmr: false, med: false, stress: 5.4, composure: 6.2, anxiety: 5.2 },
  { vagal: true, walk: true, pmr: false, med: false, stress: 3.8, composure: 6.5, anxiety: 3.9 },
  { vagal: false, walk: false, pmr: true, med: false, stress: 5.6, composure: 6.0, anxiety: 5.5 },
  { vagal: true, walk: true, pmr: false, med: true, stress: 3.7, composure: 6.8, anxiety: 3.2 },
  { vagal: false, walk: false, pmr: false, med: false, stress: 5.8, composure: 6.0, anxiety: 5.6 },
  { vagal: true, walk: true, pmr: false, med: false, stress: 3.7, composure: 7.2, anxiety: 3.0 },
  { vagal: true, walk: true, pmr: true, med: false, stress: 3.6, composure: 7.3, anxiety: 2.8 },
  { vagal: true, walk: true, pmr: false, med: false, stress: 3.8, composure: 7.4, anxiety: 2.5 },
  { vagal: true, walk: false, pmr: false, med: true, stress: 4.0, composure: 7.2, anxiety: 2.2 },
  { vagal: true, walk: true, pmr: false, med: false, stress: 3.7, composure: 7.5, anxiety: 2.0 },
  { vagal: false, walk: true, pmr: false, med: false, stress: 5.3, composure: 7.1, anxiety: 3.4 },
  { vagal: true, walk: true, pmr: false, med: false, stress: 3.8, composure: 7.4, anxiety: 2.0 },
  { vagal: true, walk: true, pmr: false, med: true, stress: 3.9, composure: 7.4, anxiety: 2.3 },
  { vagal: true, walk: true, pmr: true, med: false, stress: 3.6, composure: 7.5, anxiety: 2.0 },
  { vagal: false, walk: false, pmr: false, med: false, stress: 5.5, composure: 7.3, anxiety: 2.8 },
  { vagal: true, walk: true, pmr: false, med: false, stress: 3.7, composure: 7.4, anxiety: 1.9 },
  { vagal: true, walk: false, pmr: false, med: false, stress: 4.1, composure: 7.4, anxiety: 2.4 }
];

const logs = [];
let baselineIdx = 0;
let activeIdx = 0;

for (let day = 1; day <= 42; day += 1) {
  if (skipDays.has(day)) continue;

  if (day <= 14) {
    logs.push(dayRow(day, [], 6.2, BASELINE_ANXIETY[baselineIdx % BASELINE_ANXIETY.length], 5.5));
    baselineIdx += 1;
    continue;
  }

  const planEntry = ACTIVE_DAY_PLANS[activeIdx] ?? ACTIVE_DAY_PLANS.at(-1);
  activeIdx += 1;

  const practices = [];
  if (planEntry.vagal) practices.push(VAGAL);
  if (planEntry.pmr) practices.push(PMR);
  if (planEntry.walk) practices.push(WALK);
  if (planEntry.med) practices.push(MED);

  logs.push(dayRow(day, practices, planEntry.stress, planEntry.anxiety, planEntry.composure));
}

const fixture = {
  participantName: "Anna",
  studyStartDate: STUDY_START,
  endDate: addDays(STUDY_START, 41),
  explorationId: "relaxation",
  logs
};

writeFileSync(
  path.join(outDir, "anna-relaxation-completion.json"),
  JSON.stringify(fixture, null, 2)
);

const cohort = {
  generated_at: new Date().toISOString(),
  exploration_id: "relaxation",
  avg_stress_reduction_points: 1.3,
  avg_composure_gain_points: 1.2,
  top_habit_by_stress: "vagal_breathing",
  by_week: Object.fromEntries(
    [1, 2, 3, 4, 5, 6].map((w) => [
      String(w),
      {
        participant_count: 58,
        logging_pct_distribution: [46, 52, 58, 63, 68, 72, 76, 80, 83, 86, 88, 90, 92, 94, 95]
      }
    ])
  ),
  weekly_composure: Object.fromEntries(
    [1, 2, 3, 4, 5, 6].map((w) => [
      String(w),
      {
        n: 48 + w * 2,
        mean: 5.2 + w * 0.18,
        p25: 4.5 + w * 0.12,
        p75: 5.9 + w * 0.2
      }
    ])
  ),
  stacking_effect_at_week: Object.fromEntries(
    [1, 2, 3, 4, 5, 6].map((w) => [
      String(w),
      {
        mean_composure_2plus_practices: 5.8 + w * 0.22,
        mean_composure_few_practices: 5.1 + w * 0.1
      }
    ])
  )
};

writeFileSync(
  path.join(outDir, "cohort-snapshot-relaxation.json"),
  JSON.stringify(cohort, null, 2)
);

console.log(`Wrote ${logs.length} logs (~${Math.round((logs.length / 42) * 100)}% adherence)`);
