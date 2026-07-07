import test from "node:test";
import assert from "node:assert/strict";
import { listExplorationIds, runSyntheticAnalysis } from "./helpers/syntheticExplorationData.js";

function reportTypeFromAnalysis(analysis) {
  return analysis.finalResult?.centReport?.type ?? analysis.finalResult?.type ?? null;
}

for (const explorationId of listExplorationIds(false)) {
  test(`full pipeline improved completes: ${explorationId}`, () => {
    const { analysis } = runSyntheticAnalysis(explorationId, { short: false, scenario: "improved" });
    assert.equal(reportTypeFromAnalysis(analysis), "FINAL_STUDY_COMPLETE");
  });

  test(`full pipeline insufficient data: ${explorationId}`, () => {
    const { analysis } = runSyntheticAnalysis(explorationId, {
      short: false,
      scenario: "insufficient"
    });
    assert.equal(reportTypeFromAnalysis(analysis), "INSUFFICIENT_DATA");
  });

  test(`full pipeline excludes missing primary outcomes: ${explorationId}`, () => {
    const { entries } = runSyntheticAnalysis(explorationId, {
      short: false,
      scenario: "missingPrimary"
    });
    const invalidCount = entries.filter((entry) => entry.valid_for_analysis === false).length;
    assert.ok(invalidCount >= 1);
  });
}

for (const explorationId of listExplorationIds(true)) {
  test(`short pipeline improved completes: ${explorationId}`, () => {
    const { analysis } = runSyntheticAnalysis(explorationId, { short: true, scenario: "improved" });
    assert.equal(reportTypeFromAnalysis(analysis), "FINAL_STUDY_COMPLETE");
  });

  test(`short pipeline insufficient data: ${explorationId}`, () => {
    const { analysis } = runSyntheticAnalysis(explorationId, {
      short: true,
      scenario: "insufficient"
    });
    assert.equal(reportTypeFromAnalysis(analysis), "INSUFFICIENT_DATA");
  });

  test(`short pipeline excludes missing primary outcomes: ${explorationId}`, () => {
    const { entries } = runSyntheticAnalysis(explorationId, {
      short: true,
      scenario: "missingPrimary"
    });
    const invalidCount = entries.filter((entry) => entry.valid_for_analysis === false).length;
    assert.ok(invalidCount >= 1);
  });
}
