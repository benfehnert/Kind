import test from "node:test";
import assert from "node:assert/strict";
import { buildMorningRulesMobileView } from "../src/lib/cent/morningRules/reports/mobileView.js";
import { generateInterventionReport } from "../src/lib/cent/morningRules/reports/intervention.js";
import { getCentShortModule } from "../src/lib/centShort/index.js";
import { runSyntheticAnalysis } from "./helpers/syntheticExplorationData.js";

test("morning-rules mobileView baseline has one phase point and no factors", () => {
  const { entries, studyMeta } = runSyntheticAnalysis("morning-rules", { short: false, scenario: "improved" });
  const baselineEntries = entries.filter((e) => e.phase === "BASELINE");
  const view = buildMorningRulesMobileView({
    reportType: "BASELINE_SUMMARY",
    allEntries: baselineEntries,
    studyMeta,
    isShort: false,
    lede: "Baseline headline"
  });

  assert.equal(view.phaseChart.points.length, 1);
  assert.equal(view.phaseChart.points[0].label, "Baseline");
  assert.equal(view.factors, undefined);
  assert.ok(view.distribution?.before);
  assert.equal(view.distribution.after, undefined);
  assert.match(view.explorationName, /morning rules/i);
});

test("morning-rules mobileView interim adds intervention phase and factors", () => {
  const { entries, studyMeta } = runSyntheticAnalysis("morning-rules", { short: false, scenario: "improved" });
  const view = buildMorningRulesMobileView({
    reportType: "INTERVENTION_INTERIM",
    allEntries: entries.filter((e) => e.study_day <= 28),
    studyMeta,
    isShort: false,
    lede: "Interim headline"
  });

  assert.ok(view.phaseChart.points.length >= 2);
  assert.ok(view.factors?.rows?.length > 0);
  assert.ok(view.distribution?.after);
});

test("morning-rules-short mobileView uses day-based phase labels", () => {
  const { entries, studyMeta, analysis } = runSyntheticAnalysis("morning-rules-short", {
    short: true,
    scenario: "improved"
  });
  const mobile = analysis.finalResult?.mobileReport;
  assert.ok(mobile?.phaseChart?.points?.length >= 2);
  assert.match(mobile.phaseChart.points[1].label, /days 3/i);
  assert.match(mobile.explorationName, /\(Short\)/i);
});

test("morning-rules-short interim mobileView includes numeric change deltas", () => {
  const { analysis } = runSyntheticAnalysis("morning-rules-short", {
    short: true,
    scenario: "improved"
  });
  const interim = (analysis.reports ?? []).find((r) => r.type === "INTERVENTION_INTERIM");
  assert.ok(interim?.mobileView?.tiles?.length >= 2);

  for (const tile of interim.mobileView.tiles) {
    assert.notEqual(tile.value, "—");
    assert.notEqual(tile.delta, "—");
    assert.match(String(tile.delta), /pts|percentage points/i);
  }
});

test("morning-rules-short interim shows crash change when afternoon energy is missing", () => {
  const mod = getCentShortModule("morning-rules-short");
  const startDate = "2026-06-01";
  const logs = [
    { log_date: "2026-06-01", field_values: { mr_crash: "Severe crash" } },
    { log_date: "2026-06-02", field_values: { mr_crash: "Severe crash" } },
    { log_date: "2026-06-03", field_values: { mr_crash: "None", mr_rules: ["Early sunlight exposure"] } },
    { log_date: "2026-06-04", field_values: { mr_crash: "None", mr_rules: ["Early sunlight exposure"] } }
  ];
  const entries = mod.loadDayEntries(logs, startDate);
  const studyMeta = mod.buildStudyMeta({
    start_date: startDate,
    end_date: "2026-06-04",
    participant_name: "You"
  });
  const interim = mod
    .analyze(entries, studyMeta, null)
    .reports.find((r) => r.type === "INTERVENTION_INTERIM");

  const crashTile = interim?.mobileView?.tiles?.find((t) => /crash/i.test(t.label));
  assert.ok(crashTile);
  assert.match(crashTile.value, /\d+% → \d+%/);
  assert.match(crashTile.delta, /percentage points/);
});

test("morning-rules interim summary_tiles include change values without mobileView", () => {
  const { entries, studyMeta } = runSyntheticAnalysis("morning-rules-short", {
    short: true,
    scenario: "improved"
  });
  const baselineEntries = entries.filter((e) => e.phase === "BASELINE");
  const interventionEntries = entries.filter((e) => e.phase === "INTERVENTION");
  const report = generateInterventionReport(baselineEntries, interventionEntries, studyMeta, {
    isShort: true
  });

  assert.ok(report.summary_tiles?.length >= 2);
  for (const tile of report.summary_tiles) {
    assert.notEqual(tile.value, "—", `${tile.label} should not be a dash`);
  }
});
