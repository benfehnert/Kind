#!/usr/bin/env node
/** Generates anna-eating-completion.json — run once to refresh fixture. */
import { writeFileSync, mkdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.join(__dirname, "../src/data/fixtures");
mkdirSync(outDir, { recursive: true });

const STUDY_START = "2026-03-03";

function addDays(iso, n) {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

function dayRow(studyDay, first, last, energy, hunger, mood = null) {
  return {
    log_date: addDays(STUDY_START, studyDay - 1),
    field_values: {
      te_first: first,
      te_last: last,
      te_energy: Math.round(energy * 10) / 10,
      te_hunger: Math.round(hunger * 10) / 10,
      te_mood: mood ?? Math.min(10, Math.round(energy * 0.9))
    }
  };
}

const skipDays = new Set([5, 12, 23, 38]);
const logs = [];

for (let day = 1; day <= 42; day += 1) {
  if (skipDays.has(day)) continue;

  if (day <= 14) {
    const first = "Before 7am";
    const last = "After 8pm";
    logs.push(dayRow(day, first, last, 5.15 + (day % 4) * 0.02, 4.2 + (day % 3) * 0.25));
    continue;
  }

  if (day <= 28) {
    const wideWindowDay = day % 4 === 0;
    if (wideWindowDay) {
      logs.push(dayRow(day, "9–10am", "After 8pm", 5.4 + (day % 2) * 0.1, 4.3));
      continue;
    }
    const first = day % 2 === 0 ? "8–9am" : "7–8am";
    const last = day % 3 === 0 ? "4–6pm" : "6–7pm";
    const idx = day - 15;
    const energy = 6.3 + idx * 0.11 + (idx % 2) * 0.06;
    logs.push(dayRow(day, first, last, Math.min(7.6, energy), 5.2 + idx * 0.14));
    continue;
  }

  if (day <= 35) {
    const useEightHour = day % 5 === 0;
    if (useEightHour) {
      logs.push(dayRow(day, "9–10am", "4–6pm", 6.6, 5.8));
      continue;
    }
    logs.push(dayRow(day, "8–9am", "6–7pm", 7.25 + (day % 2) * 0.05, 6.5));
    continue;
  }

  logs.push(dayRow(day, "8–9am", "6–7pm", 7.55 + (day % 3) * 0.03, 6.9 + (day % 2) * 0.15));
}

const fixture = {
  participantName: "Anna",
  studyStartDate: STUDY_START,
  endDate: addDays(STUDY_START, 41),
  explorationId: "eating",
  logs
};

writeFileSync(
  path.join(outDir, "anna-eating-completion.json"),
  JSON.stringify(fixture, null, 2)
);

const cohort = {
  generated_at: new Date().toISOString(),
  exploration_id: "eating",
  avg_improvement_points: 1.6,
  top_habit_by_energy: "window_10h_or_less",
  by_week: Object.fromEntries(
    [1, 2, 3, 4, 5, 6].map((w) => [
      String(w),
      {
        participant_count: 64,
        logging_pct_distribution: [48, 55, 60, 65, 70, 74, 78, 82, 85, 88, 91, 93, 95, 97, 98]
      }
    ])
  ),
  weekly_energy: Object.fromEntries(
    [1, 2, 3, 4, 5, 6].map((w) => [
      String(w),
      {
        n: 52 + w * 2,
        mean: 5.0 + w * 0.22,
        p25: 4.3 + w * 0.15,
        p75: 5.7 + w * 0.25
      }
    ])
  ),
  stacking_effect_at_week: Object.fromEntries(
    [1, 2, 3, 4, 5, 6].map((w) => [
      String(w),
      {
        mean_energy_10h_or_less: 5.6 + w * 0.25,
        mean_energy_wider_window: 4.9 + w * 0.12
      }
    ])
  )
};

writeFileSync(
  path.join(outDir, "cohort-snapshot-eating.json"),
  JSON.stringify(cohort, null, 2)
);

console.log(`Wrote ${logs.length} logs (~${Math.round((logs.length / 42) * 100)}% adherence)`);
