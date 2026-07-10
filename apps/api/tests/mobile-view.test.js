import test from "node:test";
import assert from "node:assert/strict";
import { buildMorningRulesMobileView } from "../src/lib/cent/morningRules/reports/mobileView.js";
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
