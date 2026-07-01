#!/usr/bin/env node
/** Generates anna-screen-sleep-completion.json — run once to refresh fixture. */
import { writeFileSync, mkdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.join(__dirname, "../src/data/fixtures");
mkdirSync(outDir, { recursive: true });

const STUDY_START = "2026-01-10";

function addDays(iso, n) {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

function dayRow(studyDay, last, bed, windup, onset, sleep, activities = []) {
  return {
    log_date: addDays(STUDY_START, studyDay - 1),
    field_values: {
      ss_last: last,
      ss_bed: bed,
      ss_windup: windup,
      ss_onset: onset,
      ss_sleep: Math.round(sleep * 10) / 10,
      ss_activities: activities
    }
  };
}

const skipDays = new Set([4, 9, 16, 24, 31, 40]);
const logs = [];

for (let day = 1; day <= 42; day += 1) {
  if (skipDays.has(day)) continue;

  if (day <= 14) {
    const sleep = 5.38 + (day % 5) * 0.02;
    logs.push(
      dayRow(
        day,
        day % 3 === 0 ? "15–30 min before" : "Right before bed",
        day % 4 === 0 ? "30+ min" : "15–30 min",
        day % 2 === 0 ? 5 : 10,
        "20–40 min",
        sleep,
        day % 5 === 0 ? ["Conversation"] : []
      )
    );
    continue;
  }

  if (day <= 28) {
    const idx = day - 15;
    const offNight = day % 6 === 0;
    if (offNight) {
      logs.push(
        dayRow(day, "Right before bed", "30+ min", 10, "Over 40 min", 5.8, [])
      );
      continue;
    }
    const sleep = 6.52 + idx * 0.095 + (idx % 2) * 0.04;
    const noBed = day % 3 !== 0;
    const activities = [];
    if (day % 3 === 0) activities.push("Reading");
    logs.push(
      dayRow(
        day,
        "30–60 min before",
        noBed ? "None" : "Under 15 min",
        35 + (idx % 3) * 5,
        idx >= 4 ? "Under 10 min" : "20–40 min",
        noBed ? Math.min(7.05, sleep + 0.12) : sleep - 0.35,
        activities
      )
    );
    continue;
  }

  if (day <= 35) {
    const offNight = day % 7 === 0;
    if (offNight) {
      logs.push(dayRow(day, "15–30 min before", "Under 15 min", 40, "10–20 min", 6.9, []));
      continue;
    }
    const activities = ["Reading"];
    if (day % 2 === 0) activities.push("Stretching");
    logs.push(
      dayRow(
        day,
        "60+ min before",
        "None",
        60 + (day % 3) * 5,
        "Under 10 min",
        7.78 + (day % 2) * 0.04,
        activities
      )
    );
    continue;
  }

  const activities = day % 2 === 0 ? ["Reading", "Stretching"] : ["Reading"];
  logs.push(
    dayRow(
      day,
      "60+ min before",
      "None",
      65 + (day % 2) * 5,
      "Under 10 min",
      7.88 + (day % 3) * 0.02,
      activities
    )
  );
}

const fixture = {
  participantName: "Anna",
  studyStartDate: STUDY_START,
  endDate: addDays(STUDY_START, 41),
  explorationId: "screen-sleep",
  logs
};

writeFileSync(
  path.join(outDir, "anna-screen-sleep-completion.json"),
  JSON.stringify(fixture, null, 2)
);

const cohort = {
  generated_at: new Date().toISOString(),
  exploration_id: "screen-sleep",
  avg_improvement_points: 1.4,
  top_habit_by_sleep: "screen_free_60min",
  by_week: Object.fromEntries(
    [1, 2, 3, 4, 5, 6].map((w) => [
      String(w),
      {
        participant_count: 51,
        logging_pct_distribution: [45, 52, 58, 63, 68, 72, 76, 79, 82, 85, 88, 90, 92, 94, 96]
      }
    ])
  ),
  weekly_sleep: Object.fromEntries(
    [1, 2, 3, 4, 5, 6].map((w) => [
      String(w),
      {
        n: 40 + w * 2,
        mean: 5.2 + w * 0.28,
        p25: 4.5 + w * 0.18,
        p75: 5.9 + w * 0.32
      }
    ])
  ),
  stacking_effect_at_week: Object.fromEntries(
    [1, 2, 3, 4, 5, 6].map((w) => [
      String(w),
      {
        mean_sleep_60min_free: 5.8 + w * 0.3,
        mean_sleep_less_buffer: 5.0 + w * 0.15
      }
    ])
  )
};

writeFileSync(
  path.join(outDir, "cohort-snapshot-screen-sleep.json"),
  JSON.stringify(cohort, null, 2)
);

console.log(`Wrote ${logs.length} logs (~${Math.round((logs.length / 42) * 100)}% adherence)`);
