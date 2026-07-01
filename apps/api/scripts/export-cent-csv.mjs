#!/usr/bin/env node
import { readFileSync, mkdirSync, writeFileSync, copyFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { homedir } from "node:os";
import {
  logsFromFixture,
  buildStudyMeta,
  analyzeMorningRules,
  loadDayEntries,
  phaseStats,
  ruleAnalysis,
  stackingAnalysis,
  effectSize,
  PRIMARY_OUTCOME,
  SECONDARY_OUTCOMES,
  RULES
} from "../src/lib/cent/morningRules/index.js";

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
      `SELECT started_at FROM user_explorations WHERE individual_id = $1 AND exploration_id = 'morning-rules'`,
      [individualId]
    );
    const { rows: logs } = await query(
      `SELECT log_date, field_values FROM daily_logs WHERE individual_id = $1 AND exploration_id = 'morning-rules' ORDER BY log_date`,
      [individualId]
    );
    return {
      entries: loadDayEntries(logs, ueRows[0]?.started_at),
      studyMeta: buildStudyMeta({ started_at: ueRows[0]?.started_at, participantName: "Anna" }),
      cohort: JSON.parse(
        readFileSync(path.join(__dirname, "../src/data/fixtures/cohort-snapshot-morning-rules.json"), "utf8")
      )
    };
  }

  const fixturePath = path.join(__dirname, "../src/data/fixtures/anna-morning-rules-completion.json");
  const fixture = JSON.parse(readFileSync(fixturePath, "utf8"));
  const cohort = JSON.parse(
    readFileSync(path.join(__dirname, "../src/data/fixtures/cohort-snapshot-morning-rules.json"), "utf8")
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
      baseline_crash_mean: report.primary_baseline?.mean,
      baseline_energy_mean: report.sec_baselines?.afternoon_energy?.mean,
      logging_pct: report.adherence?.logging_pct
    };
  }
  if (report.type === "INTERVENTION_INTERIM") {
    return {
      ...base,
      headline: report.headline,
      crash_mean_diff: report.primary_effect?.mean_diff,
      energy_mean_diff: report.secondary_effects?.afternoon_energy?.mean_diff,
      optimise_rules: (report.optimise_rules ?? []).join("; ")
    };
  }
  if (report.type === "FINAL_STUDY_COMPLETE") {
    return {
      ...base,
      verdict: report.overall_verdict,
      crash_mean_diff: report.primary_outcome?.effect?.mean_diff,
      energy_mean_diff: report.secondary_outcomes?.afternoon_energy?.effect?.mean_diff,
      baseline_energy: report.secondary_outcomes?.afternoon_energy?.baseline?.mean,
      active_energy: report.secondary_outcomes?.afternoon_energy?.active?.mean
    };
  }
  if (report.type === "KIND_COMPARISON" || report.type === "COHORT_COMPARISON") {
    if (report.suppressed) return { report_type: report.type, suppressed: true };
    return {
      ...base,
      report_title: report.reportTitle ?? "Kind comparison",
      week: report.week,
      kind_community_size: report.kind_community_size ?? report.cohort_size,
      logging_percentile: report.adherence_comparison?.logging_percentile,
      your_top_rule: report.rule_comparison?.your_top_rule_label,
      community_top_rule: report.rule_comparison?.kind_community_top_rule_label,
      summary: report.summary
    };
  }
  return { ...base, message: report.message ?? report.headline ?? "" };
}

async function main() {
  const { entries, studyMeta, cohort } = await loadData();
  const analysis = analyzeMorningRules(entries, studyMeta, cohort);

  const outDir = path.join(__dirname, "../output/cent-morning-rules-anna");
  mkdirSync(outDir, { recursive: true });

  const dailyHeaders = [
    "date",
    "study_day",
    "study_week",
    "phase",
    "sunlight",
    "stretching",
    "caffeine_offset",
    "meditation",
    "rule_count",
    "morning_energy",
    "afternoon_energy",
    "afternoon_focus",
    "afternoon_crash_severity",
    "valid_for_analysis"
  ];
  const dailyRows = entries.map((e) => ({
    date: e.date,
    study_day: e.study_day,
    study_week: e.study_week,
    phase: e.phase,
    sunlight: e.sunlight,
    stretching: e.stretching,
    caffeine_offset: e.caffeine_offset,
    meditation: e.meditation,
    rule_count: e.rule_count,
    morning_energy: e.morning_energy,
    afternoon_energy: e.afternoon_energy,
    afternoon_focus: e.afternoon_focus,
    afternoon_crash_severity: e.afternoon_crash_severity,
    valid_for_analysis: e.valid_for_analysis
  }));

  writeFileSync(
    path.join(outDir, "daily_entries.csv"),
    rowsToDelimited(dailyRows, dailyHeaders)
  );

  const phases = ["BASELINE", "INTERVENTION", "OPTIMISE", "OUTPUT"];
  const phaseRows = [];
  for (const phase of phases) {
    const subset = entries.filter((e) => e.phase === phase);
    for (const outcome of [PRIMARY_OUTCOME, ...SECONDARY_OUTCOMES]) {
      const stats = phaseStats(subset, outcome);
      phaseRows.push({
        phase,
        outcome,
        n: stats.n,
        mean: stats.mean,
        sd: stats.sd,
        median: stats.median
      });
    }
  }
  writeFileSync(
    path.join(outDir, "phase_stats.csv"),
    rowsToDelimited(phaseRows, ["phase", "outcome", "n", "mean", "sd", "median"])
  );

  const active = entries.filter((e) => e.phase === "INTERVENTION" || e.phase === "OPTIMISE");
  const ruleRows = [];
  for (const rule of RULES) {
    for (const outcome of [PRIMARY_OUTCOME, "afternoon_energy"]) {
      const r = ruleAnalysis(active, rule, outcome);
      ruleRows.push({
        rule,
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
    path.join(outDir, "rule_analysis.csv"),
    rowsToDelimited(ruleRows, [
      "rule",
      "outcome",
      "status",
      "followed_n",
      "not_followed_n",
      "mean_followed",
      "mean_not_followed",
      "difference",
      "beneficial"
    ])
  );

  const stacking = stackingAnalysis(active, "afternoon_energy");
  writeFileSync(
    path.join(outDir, "stacking.csv"),
    rowsToDelimited(
      Object.entries(stacking).map(([count, s]) => ({
        rule_count: count,
        n: s.n,
        mean: s.mean ?? "",
        status: s.status ?? "valid"
      })),
      ["rule_count", "n", "mean", "status"]
    )
  );

  const baseline = entries.filter((e) => e.phase === "BASELINE" && e.valid_for_analysis);
  const bStats = phaseStats(baseline, PRIMARY_OUTCOME);
  const aStats = phaseStats(active, PRIMARY_OUTCOME);
  const effectRows = [
    {
      outcome: PRIMARY_OUTCOME,
      ...effectSize(bStats, aStats, PRIMARY_OUTCOME)
    },
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
    direction: r.direction ?? "",
    crash_reduction_pct: r.crash_reduction_pct ?? ""
  }));
  writeFileSync(
    path.join(outDir, "effect_sizes.csv"),
    rowsToDelimited(effectRows, [
      "outcome",
      "status",
      "mean_diff",
      "ci_low",
      "ci_high",
      "direction",
      "crash_reduction_pct"
    ])
  );

  const reportHeaders = [
    "report_type",
    "report_title",
    "generated",
    "headline",
    "baseline_days",
    "baseline_crash_mean",
    "baseline_energy_mean",
    "logging_pct",
    "crash_mean_diff",
    "energy_mean_diff",
    "optimise_rules",
    "verdict",
    "baseline_energy",
    "active_energy",
    "week",
    "kind_community_size",
    "logging_percentile",
    "your_top_rule",
    "community_top_rule",
    "summary",
    "message"
  ];
  const reportRows = analysis.reports.map(flattenReport);

  writeFileSync(
    path.join(outDir, "reports_summary.csv"),
    rowsToDelimited(reportRows, reportHeaders)
  );

  const combined = [
    "# daily_entries",
    rowsToDelimited(dailyRows, dailyHeaders),
    "",
    "# phase_stats",
    rowsToDelimited(phaseRows, ["phase", "outcome", "n", "mean", "sd", "median"]),
    "",
    "# rule_analysis",
    rowsToDelimited(ruleRows, [
      "rule",
      "outcome",
      "status",
      "followed_n",
      "not_followed_n",
      "mean_followed",
      "mean_not_followed",
      "difference",
      "beneficial"
    ]),
    "",
    "# stacking",
    rowsToDelimited(
      Object.entries(stacking).map(([count, s]) => ({
        rule_count: count,
        n: s.n,
        mean: s.mean ?? "",
        status: s.status ?? "valid"
      })),
      ["rule_count", "n", "mean", "status"]
    ),
    "",
    "# effect_sizes",
    rowsToDelimited(effectRows, [
      "outcome",
      "status",
      "mean_diff",
      "ci_low",
      "ci_high",
      "direction",
      "crash_reduction_pct"
    ]),
    "",
    "# reports_summary",
    rowsToDelimited(reportRows, [
      "report_type",
      "report_title",
      "generated",
      "headline",
      "baseline_days",
      "baseline_crash_mean",
      "baseline_energy_mean",
      "logging_pct",
      "crash_mean_diff",
      "energy_mean_diff",
      "optimise_rules",
      "verdict",
      "baseline_energy",
      "active_energy",
      "week",
      "kind_community_size",
      "logging_percentile",
      "your_top_rule",
      "community_top_rule",
      "summary",
      "message"
    ])
  ].join("\n");

  const combinedPath = path.join(outDir, "cent-morning-rules-anna-all.csv");
  writeFileSync(combinedPath, combined);

  const downloadsPath = path.join(homedir(), "Downloads", "cent-morning-rules-anna-all.csv");
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
