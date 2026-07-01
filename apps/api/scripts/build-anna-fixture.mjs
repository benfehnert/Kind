#!/usr/bin/env node
/** Generates anna-morning-rules-completion.json — run once to refresh fixture. */
import { writeFileSync, mkdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.join(__dirname, "../src/data/fixtures");
mkdirSync(outDir, { recursive: true });

const STUDY_START = "2026-04-08";
const RULE_SUN = "Early sunlight exposure";
const RULE_STRETCH = "Morning stretching";
const RULE_CAFFEINE = "Caffeine offset (delayed first cup)";
const RULE_MED = "Morning meditation";

function addDays(iso, n) {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

function rulesFromFlags({ sun, stretch, caffeine, med }) {
  const out = [];
  if (sun) out.push(RULE_SUN);
  if (stretch) out.push(RULE_STRETCH);
  if (caffeine) out.push(RULE_CAFFEINE);
  if (med) out.push(RULE_MED);
  return out;
}

function crashLabel(severity) {
  return ["None", "Mild dip", "Noticeable crash", "Severe crash"][severity];
}

/** Build one log row with rule flags driving outcomes. */
function dayRow(studyDay, flags, severity, pmEnergy, amEnergy = 6.5, focus = null) {
  return {
    log_date: addDays(STUDY_START, studyDay - 1),
    field_values: {
      mr_rules: rulesFromFlags(flags),
      mr_am_energy: amEnergy,
      mr_pm_energy: pmEnergy,
      mr_crash: crashLabel(severity),
      mr_focus: focus ?? Math.min(10, Math.round(pmEnergy * 0.85))
    }
  };
}

const skipDays = new Set([5, 19, 33, 44, 52]);
const logs = [];

for (let day = 1; day <= 56; day += 1) {
  if (skipDays.has(day)) continue;

  if (day <= 14) {
    // Baseline: no rules, mostly noticeable/severe crashes, energy ~5.2
    const sev = day % 3 === 0 ? 1 : day % 2 === 0 ? 2 : 3;
    logs.push(dayRow(day, { sun: false, stretch: false, caffeine: false, med: false }, sev, 5.0 + (day % 4) * 0.05, 6.8));
    continue;
  }

  if (day <= 35) {
    // Intervention: varied rule combos for analysis (>=5 yes/no per rule)
    const patterns = [
      { sun: true, stretch: true, caffeine: true, med: true },
      { sun: true, stretch: true, caffeine: false, med: true },
      { sun: true, stretch: false, caffeine: true, med: false },
      { sun: false, stretch: true, caffeine: true, med: true },
      { sun: true, stretch: true, caffeine: true, med: false },
      { sun: false, stretch: false, caffeine: false, med: false },
      { sun: true, stretch: false, caffeine: false, med: false },
      { sun: false, stretch: true, caffeine: false, med: true }
    ];
    const flags = patterns[(day - 15) % patterns.length];
    const t = (day - 15) / 20;
    let base = 5.4 + t * 0.65;
    if (flags.sun) base += 0.55;
    if (flags.stretch) base += 0.35;
    if (flags.med) base += 0.2;
    if (flags.caffeine) base += 0.1;
    base = Math.min(7.2, base);
    const sev = base >= 6.3 ? 0 : base >= 5.8 ? 1 : base >= 5.3 ? 2 : 2;
    logs.push(dayRow(day, flags, sev, Math.round(base * 10) / 10));
    continue;
  }

  if (day <= 49) {
    // Optimise: sunlight + stretch dominant; occasional med/caffeine off-days for contrast
    const flags = {
      sun: day % 7 !== 0,
      stretch: day % 6 !== 0,
      caffeine: day % 5 === 0,
      med: day % 4 === 0
    };
    let base = 6.35;
    if (flags.sun) base += 0.35;
    if (flags.stretch) base += 0.25;
    if (flags.med) base += 0.08;
    if (flags.caffeine) base += 0.05;
    const sev = base >= 6.75 ? 0 : base >= 6.45 ? 1 : day % 3 === 0 ? 2 : 1;
    logs.push(dayRow(day, flags, sev, Math.round(Math.min(7, base) * 10) / 10));
    continue;
  }

  // Output phase
  logs.push(
    dayRow(day, { sun: true, stretch: true, caffeine: false, med: false }, 0, 6.7 + (day % 3) * 0.05)
  );
}

const fixture = {
  participantName: "Anna",
  studyStartDate: STUDY_START,
  endDate: addDays(STUDY_START, 55),
  explorationId: "morning-rules",
  logs
};

writeFileSync(
  path.join(outDir, "anna-morning-rules-completion.json"),
  JSON.stringify(fixture, null, 2)
);

const cohort = {
  generated_at: new Date().toISOString(),
  exploration_id: "morning-rules",
  avg_improvement_points: 1.1,
  top_rule_by_crash: "sunlight",
  by_week: Object.fromEntries(
    [1, 2, 3, 4, 5, 6, 7, 8].map((w) => [
      String(w),
      {
        participant_count: 78,
        logging_pct_distribution: [45, 52, 58, 62, 68, 72, 76, 78, 82, 85, 88, 91, 94, 96, 98]
      }
    ])
  ),
  weekly_energy: Object.fromEntries(
    [1, 2, 3, 4, 5, 6, 7, 8].map((w) => [
      String(w),
      {
        n: 65 + w * 2,
        mean: 5.0 + w * 0.15,
        p25: 4.2 + w * 0.12,
        p75: 5.8 + w * 0.18
      }
    ])
  ),
  stacking_effect_at_week: Object.fromEntries(
    [1, 2, 3, 4, 5, 6, 7, 8].map((w) => [
      String(w),
      { mean_energy_3plus_rules: 5.8 + w * 0.2, mean_energy_0to2_rules: 4.9 + w * 0.1 }
    ])
  )
};

writeFileSync(
  path.join(outDir, "cohort-snapshot-morning-rules.json"),
  JSON.stringify(cohort, null, 2)
);

console.log(`Wrote ${logs.length} logs (~${Math.round((logs.length / 56) * 100)}% adherence)`);
