#!/usr/bin/env node
import { readFileSync, mkdirSync, writeFileSync, copyFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { homedir } from "node:os";
import {
  logsFromFixture,
  buildStudyMeta,
  analyzeTimeRestrictedEating,
  loadDayEntries,
  phaseStats,
  habitAnalysis,
  windowStackingAnalysis,
  effectSize,
  PRIMARY_OUTCOME,
  SECONDARY_OUTCOMES,
  HABITS
} from "../src/lib/cent/timeRestrictedEating/index.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const fromDb = args.includes("--from-db");
const DELIM = "\t";

function escapeField(value) {
  if (value === null || value === undefined) return "";
  const s = String(value);
  if (s.includes(DELIM) || s.includes('"') || s.includes("\n") || s.includes("\r")) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

function rowsToDelimited(rows, headers) {
  const lines = [headers.join(DELIM)];
  for (const row of rows) {
    lines.push(headers.map((h) => escapeField(row[h])).join(DELIM));
  }
  return lines.join("\n");
}

async function loadData() {
  if (fromDb) {
    const { query } = await import("../src/db.js");
    const { rows: indRows } = await query(
      "SELECT id FROM individuals WHERE slug = $1 LIMIT 1",
      ["anna-ross"]
    );
    const individualId = indRows[0]?.id;
    if (!individualId) throw new Error("Anna not found — run npm run seed:kind first");
    const { rows: ueRows } = await query(
      `SELECT started_at FROM user_explorations WHERE individual_id = $1 AND exploration_id = 'eating'`,
      [individualId]
    );
    const { rows: logs } = await query(
      `SELECT log_date, field_values FROM daily_logs WHERE individual_id = $1 AND exploration_id = 'eating' ORDER BY log_date`,
      [individualId]
    );
    return {
      entries: loadDayEntries(logs, ueRows[0]?.started_at),
      studyMeta: buildStudyMeta({ started_at: ueRows[0]?.started_at, participantName: "Anna" }),
      cohort: JSON.parse(
        readFileSync(path.join(__dirname, "../src/data/fixtures/cohort-snapshot-eating.json"), "utf8")
      )
    };
  }

  const fixture = JSON.parse(
    readFileSync(path.join(__dirname, "../src/data/fixtures/anna-eating-completion.json"), "utf8")
  );
  const cohort = JSON.parse(
    readFileSync(path.join(__dirname, "../src/data/fixtures/cohort-snapshot-eating.json"), "utf8")
  );
  return {
    entries: logsFromFixture(fixture),
    studyMeta: buildStudyMeta(fixture),
    cohort
  };
}

function flattenReport(report) {
  const base = {
    report_type: report.type,
    report_title: report.reportTitle ?? "",
    generated: report.generated ?? ""
  };
  if (report.type === "BASELINE_SUMMARY") {
    return {
      ...base,
      headline: report.headline,
      baseline_days: report.primary_baseline?.n,
      baseline_energy_mean: report.primary_baseline?.mean,
      baseline_window_hours: report.eating_window_mean_hours,
      logging_pct: report.adherence?.logging_pct
    };
  }
  if (report.type === "INTERVENTION_INTERIM") {
    return {
      ...base,
      headline: report.headline,
      energy_mean_diff: report.primary_effect?.mean_diff,
      window_mean_diff: report.window_effect?.mean_diff,
      optimise_habits: (report.optimise_habits ?? []).join("; ")
    };
  }
  if (report.type === "FINAL_STUDY_COMPLETE") {
    return {
      ...base,
      verdict: report.overall_verdict,
      energy_mean_diff: report.primary_outcome?.effect?.mean_diff,
      baseline_energy: report.primary_outcome?.baseline?.mean,
      active_energy: report.primary_outcome?.active?.mean,
      baseline_window: report.eating_window?.baseline_hours,
      active_window: report.eating_window?.active_hours
    };
  }
  if (report.type === "KIND_COMPARISON" || report.type === "COHORT_COMPARISON") {
    if (report.suppressed) return { report_type: report.type, suppressed: true };
    return {
      ...base,
      week: report.week,
      kind_community_size: report.kind_community_size,
      logging_percentile: report.adherence_comparison?.logging_percentile,
      your_top_habit: report.habit_comparison?.your_top_habit_label,
      community_top_habit: report.habit_comparison?.kind_community_top_habit_label,
      summary: report.summary
    };
  }
  return { ...base, message: report.message ?? report.headline ?? "" };
}

async function main() {
  const { entries, studyMeta, cohort } = await loadData();
  const analysis = analyzeTimeRestrictedEating(entries, studyMeta, cohort);
  const outDir = path.join(__dirname, "../output/cent-eating-anna");
  mkdirSync(outDir, { recursive: true });

  const dailyHeaders = [
    "date", "study_day", "study_week", "phase",
    "first_meal_bucket", "last_meal_bucket", "eating_window_hours",
    "window_10h_or_less", "first_meal_around_8am", "last_meal_before_6pm",
    "daily_energy", "hunger_comfort", "mood", "valid_for_analysis"
  ];
  const dailyRows = entries.map((e) => ({
    date: e.date,
    study_day: e.study_day,
    study_week: e.study_week,
    phase: e.phase,
    first_meal_bucket: e.first_meal_bucket,
    last_meal_bucket: e.last_meal_bucket,
    eating_window_hours: e.eating_window_hours,
    window_10h_or_less: e.window_10h_or_less,
    first_meal_around_8am: e.first_meal_around_8am,
    last_meal_before_6pm: e.last_meal_before_6pm,
    daily_energy: e.daily_energy,
    hunger_comfort: e.hunger_comfort,
    mood: e.mood,
    valid_for_analysis: e.valid_for_analysis
  }));
  writeFileSync(path.join(outDir, "daily_entries.csv"), rowsToDelimited(dailyRows, dailyHeaders));

  const phases = ["BASELINE", "INTERVENTION", "OPTIMISE", "OUTPUT"];
  const phaseRows = [];
  for (const phase of phases) {
    const subset = entries.filter((e) => e.phase === phase);
    for (const outcome of [PRIMARY_OUTCOME, ...SECONDARY_OUTCOMES]) {
      const stats = phaseStats(subset, outcome);
      phaseRows.push({ phase, outcome, n: stats.n, mean: stats.mean, sd: stats.sd, median: stats.median });
    }
  }
  writeFileSync(
    path.join(outDir, "phase_stats.csv"),
    rowsToDelimited(phaseRows, ["phase", "outcome", "n", "mean", "sd", "median"])
  );

  const active = entries.filter((e) => ["INTERVENTION", "OPTIMISE", "OUTPUT"].includes(e.phase));
  const habitRows = [];
  for (const habit of HABITS) {
    for (const outcome of [PRIMARY_OUTCOME, "eating_window_hours"]) {
      const r = habitAnalysis(active, habit, outcome);
      habitRows.push({
        habit,
        outcome,
        status: r.status,
        followed_n: r.followed_n ?? "",
        not_followed_n: r.not_followed_n ?? "",
        mean_followed: r.mean_followed ?? "",
        mean_not_followed: r.mean_not_followed ?? "",
        difference: r.difference ?? "",
        beneficial: r.beneficial ?? ""
      });
    }
  }
  writeFileSync(
    path.join(outDir, "habit_analysis.csv"),
    rowsToDelimited(habitRows, [
      "habit", "outcome", "status", "followed_n", "not_followed_n",
      "mean_followed", "mean_not_followed", "difference", "beneficial"
    ])
  );

  const stacking = windowStackingAnalysis(active, PRIMARY_OUTCOME);
  writeFileSync(
    path.join(outDir, "window_stacking.csv"),
    rowsToDelimited(
      Object.entries(stacking).map(([key, s]) => ({
        window_bucket: key,
        label: s.label ?? key,
        n: s.n,
        mean: s.mean ?? "",
        status: s.status ?? "valid"
      })),
      ["window_bucket", "label", "n", "mean", "status"]
    )
  );

  const baseline = entries.filter((e) => e.phase === "BASELINE" && e.valid_for_analysis);
  const effectRows = [
    { outcome: PRIMARY_OUTCOME, ...effectSize(phaseStats(baseline, PRIMARY_OUTCOME), phaseStats(active, PRIMARY_OUTCOME), PRIMARY_OUTCOME) },
    ...SECONDARY_OUTCOMES.map((o) => ({
      outcome: o,
      ...effectSize(phaseStats(baseline, o), phaseStats(active, o), o)
    }))
  ].map((r) => ({
    outcome: r.outcome,
    status: r.status,
    mean_diff: r.mean_diff ?? "",
    ci_low: r.ci_low ?? "",
    ci_high: r.ci_high ?? "",
    direction: r.direction ?? ""
  }));
  writeFileSync(
    path.join(outDir, "effect_sizes.csv"),
    rowsToDelimited(effectRows, ["outcome", "status", "mean_diff", "ci_low", "ci_high", "direction"])
  );

  const reportRows = analysis.reports.map(flattenReport);
  writeFileSync(
    path.join(outDir, "reports_summary.csv"),
    rowsToDelimited(reportRows, [
      "report_type", "report_title", "generated", "headline", "baseline_days",
      "baseline_energy_mean", "baseline_window_hours", "logging_pct",
      "energy_mean_diff", "window_mean_diff", "optimise_habits", "verdict",
      "baseline_energy", "active_energy", "baseline_window", "active_window",
      "week", "kind_community_size", "logging_percentile",
      "your_top_habit", "community_top_habit", "summary", "message"
    ])
  );

  const combined = [
    "# daily_entries", rowsToDelimited(dailyRows, dailyHeaders), "",
    "# phase_stats", rowsToDelimited(phaseRows, ["phase", "outcome", "n", "mean", "sd", "median"]), "",
    "# habit_analysis", rowsToDelimited(habitRows, [
      "habit", "outcome", "status", "followed_n", "not_followed_n",
      "mean_followed", "mean_not_followed", "difference", "beneficial"
    ]), "",
    "# window_stacking", rowsToDelimited(
      Object.entries(stacking).map(([key, s]) => ({
        window_bucket: key, label: s.label ?? key, n: s.n, mean: s.mean ?? "", status: s.status ?? "valid"
      })),
      ["window_bucket", "label", "n", "mean", "status"]
    ), "",
    "# effect_sizes", rowsToDelimited(effectRows, ["outcome", "status", "mean_diff", "ci_low", "ci_high", "direction"]), "",
    "# reports_summary", rowsToDelimited(reportRows, [
      "report_type", "report_title", "generated", "headline", "baseline_days",
      "baseline_energy_mean", "baseline_window_hours", "logging_pct",
      "energy_mean_diff", "window_mean_diff", "optimise_habits", "verdict",
      "baseline_energy", "active_energy", "baseline_window", "active_window",
      "week", "kind_community_size", "logging_percentile",
      "your_top_habit", "community_top_habit", "summary", "message"
    ])
  ].join("\n");

  const combinedPath = path.join(outDir, "cent-eating-anna-all.csv");
  writeFileSync(combinedPath, combined);
  const downloadsPath = path.join(homedir(), "Downloads", "cent-eating-anna-all.csv");
  copyFileSync(combinedPath, downloadsPath);
  writeFileSync(path.join(outDir, "analysis.json"), JSON.stringify(analysis, null, 2));
  console.log(`Tab-delimited CSV export written to ${outDir}`);
  console.log(`Combined file: ${combinedPath}`);
  console.log(`Copied to ${downloadsPath}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
