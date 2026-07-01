import { PHASE_TEN_HOUR, PHASE_EIGHT_HOUR, PHASE_OUTPUT } from "./constants.js";
import { generateBaselineReport } from "./reports/baseline.js";
import { generateInterventionReport } from "./reports/intervention.js";
import { generateOptimiseReport } from "./reports/optimise.js";
import { generateFinalReport } from "./reports/final.js";
import { generateCohortComparison } from "./reports/cohort.js";

const COHORT_WEEKS = [2, 4, 6];

export function evaluateTriggers(newEntry, allEntries, studyMeta, cohortSnapshot = null) {
  const reports = [];
  const d = newEntry.study_day;
  const w = newEntry.study_week;

  if (d === PHASE_TEN_HOUR.start) {
    const baselineEntries = allEntries.filter((e) => e.phase === "BASELINE");
    reports.push(generateBaselineReport(baselineEntries, studyMeta));
  }

  if (d === PHASE_EIGHT_HOUR.start) {
    const bEntries = allEntries.filter((e) => e.phase === "BASELINE");
    const iEntries = allEntries.filter((e) => e.phase === "INTERVENTION");
    reports.push(generateInterventionReport(bEntries, iEntries, studyMeta));
  }

  if (d === PHASE_EIGHT_HOUR.end) {
    const iEntries = allEntries.filter((e) => e.phase === "INTERVENTION");
    const oEntries = allEntries.filter((e) => e.phase === "OPTIMISE");
    reports.push(
      generateOptimiseReport(allEntries, oEntries, iEntries, {
        ...studyMeta,
        optimise_end_date: newEntry.date
      })
    );
  }

  if (d >= PHASE_OUTPUT.start && !studyMeta.final_report_generated) {
    const { centReport } = generateFinalReport(allEntries, studyMeta, cohortSnapshot);
    reports.push(centReport);
    studyMeta.final_report_generated = true;
  }

  if (COHORT_WEEKS.includes(d) && cohortSnapshot) {
    reports.push(generateCohortComparison(allEntries, w, cohortSnapshot, studyMeta));
  }

  return reports;
}

export function analyzeTimeRestrictedEating(allEntries, studyMeta, cohortSnapshot = null) {
  const reports = [];
  const baselineEntries = allEntries.filter((e) => e.phase === "BASELINE");
  const interventionEntries = allEntries.filter((e) => e.phase === "INTERVENTION");
  const optimiseEntries = allEntries.filter((e) => e.phase === "OPTIMISE");

  if (baselineEntries.length) {
    reports.push(generateBaselineReport(baselineEntries, studyMeta));
  }
  if (interventionEntries.length) {
    reports.push(generateInterventionReport(baselineEntries, interventionEntries, studyMeta));
  }
  if (optimiseEntries.length) {
    reports.push(
      generateOptimiseReport(allEntries, optimiseEntries, interventionEntries, studyMeta)
    );
  }

  const finalResult = generateFinalReport(allEntries, studyMeta, cohortSnapshot);
  if (finalResult.centReport) {
    reports.push(finalResult.centReport);
  } else {
    reports.push(finalResult);
  }

  for (const week of [2, 4, 6]) {
    if (cohortSnapshot) {
      const cohort = generateCohortComparison(
        allEntries.filter((e) => e.study_week <= week),
        week,
        cohortSnapshot,
        studyMeta
      );
      if (!cohort.suppressed) reports.push(cohort);
    }
  }

  return { reports, finalResult };
}
