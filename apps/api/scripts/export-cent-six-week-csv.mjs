#!/usr/bin/env node
import { readFileSync, mkdirSync, writeFileSync, copyFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { homedir } from "node:os";
import { SIX_WEEK_CENT } from "./cent-six-week-config.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const explorationId = process.argv[2];
const cfg = SIX_WEEK_CENT[explorationId];

if (!cfg) {
  console.error(`Usage: node export-cent-six-week-csv.mjs <${Object.keys(SIX_WEEK_CENT).join("|")}>`);
  process.exit(1);
}

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

async function main() {
  const mod = await import(cfg.module);
  const {
    logsFromFixture,
    buildStudyMeta,
    phaseStats,
    habitAnalysis,
    effectSize,
    PRIMARY_OUTCOME,
    SECONDARY_OUTCOMES,
    HABITS
  } = mod;

  const stackingFn =
    mod.winddownStackingAnalysis ??
    mod.practiceStackingAnalysis ??
    mod.upfStackingAnalysis ??
    mod.windowStackingAnalysis;

  const fixture = JSON.parse(
    readFileSync(path.join(__dirname, "../src/data/fixtures", cfg.fixture), "utf8")
  );
  const cohort = JSON.parse(
    readFileSync(path.join(__dirname, "../src/data/fixtures", cfg.cohort), "utf8")
  );
  const entries = logsFromFixture(fixture);
  const studyMeta = buildStudyMeta(fixture);
  const analysis = mod[cfg.analyze](entries, studyMeta, cohort);

  const outDir = path.join(__dirname, "../output", cfg.outputDir);
  mkdirSync(outDir, { recursive: true });

  const dailyHeaders = Object.keys(entries[0] ?? {}).filter((k) => !k.startsWith("_"));
  const dailyRows = entries.map((e) => Object.fromEntries(dailyHeaders.map((h) => [h, e[h]])));
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
  const factorOutcome = mod.FACTOR_OUTCOME ?? PRIMARY_OUTCOME;
  const habitRows = [];
  for (const habit of HABITS) {
    for (const outcome of [PRIMARY_OUTCOME, factorOutcome]) {
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

  const stacking = stackingFn(active, PRIMARY_OUTCOME);
  writeFileSync(
    path.join(outDir, "stacking.csv"),
    rowsToDelimited(
      Object.entries(stacking).map(([key, s]) => ({
        bucket: key,
        label: s.label ?? key,
        n: s.n,
        mean: s.mean ?? "",
        status: s.status ?? "valid"
      })),
      ["bucket", "label", "n", "mean", "status"]
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

  const reportRows = analysis.reports.map((r) => ({
    report_type: r.type,
    report_title: r.reportTitle ?? "",
    headline: r.headline ?? r.summary ?? "",
    verdict: r.overall_verdict ?? ""
  }));
  writeFileSync(
    path.join(outDir, "reports_summary.csv"),
    rowsToDelimited(reportRows, ["report_type", "report_title", "headline", "verdict"])
  );

  const combined = [
    "# daily_entries", rowsToDelimited(dailyRows, dailyHeaders), "",
    "# phase_stats", rowsToDelimited(phaseRows, ["phase", "outcome", "n", "mean", "sd", "median"]), "",
    "# habit_analysis", rowsToDelimited(habitRows, [
      "habit", "outcome", "status", "followed_n", "not_followed_n",
      "mean_followed", "mean_not_followed", "difference", "beneficial"
    ]), "",
    "# stacking", rowsToDelimited(
      Object.entries(stacking).map(([key, s]) => ({
        bucket: key, label: s.label ?? key, n: s.n, mean: s.mean ?? "", status: s.status ?? "valid"
      })),
      ["bucket", "label", "n", "mean", "status"]
    ), "",
    "# effect_sizes", rowsToDelimited(effectRows, ["outcome", "status", "mean_diff", "ci_low", "ci_high", "direction"]), "",
    "# reports_summary", rowsToDelimited(reportRows, ["report_type", "report_title", "headline", "verdict"])
  ].join("\n");

  const combinedPath = path.join(outDir, cfg.downloadsCsv);
  writeFileSync(combinedPath, combined);

  const downloadsPath = path.join(homedir(), "Downloads", cfg.downloadsCsv);
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
