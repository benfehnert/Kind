import { loadDayEntries, logsFromFixture } from "./normalize.js";
import { phaseStats, habitAnalysis, adherenceStats } from "./stats.js";
import { analyzeRelaxationPractices, evaluateTriggers } from "./triggers.js";
import { generateFinalReport } from "./reports/final.js";
import { generateBaselineReport } from "./reports/baseline.js";
import { generateInterventionReport } from "./reports/intervention.js";
import { generateOptimiseReport } from "./reports/optimise.js";
import { generateCohortComparison } from "./reports/cohort.js";
import { HABITS, PRIMARY_OUTCOME, FACTOR_OUTCOME } from "./constants.js";

export { loadDayEntries, logsFromFixture } from "./normalize.js";
export * from "./constants.js";
export * from "./stats.js";
export * from "./helpers.js";
export { analyzeRelaxationPractices, evaluateTriggers } from "./triggers.js";
export { generateFinalReport } from "./reports/final.js";
export { generateBaselineReport } from "./reports/baseline.js";
export { generateInterventionReport } from "./reports/intervention.js";
export { generateOptimiseReport } from "./reports/optimise.js";
export { generateCohortComparison } from "./reports/cohort.js";

export function buildStudyMeta(fixtureOrMeta) {
  return {
    start_date: fixtureOrMeta.studyStartDate ?? fixtureOrMeta.started_at ?? fixtureOrMeta.start_date,
    end_date: fixtureOrMeta.endDate ?? fixtureOrMeta.end_date,
    participant_name: fixtureOrMeta.participantName ?? fixtureOrMeta.participant_name ?? "Anna",
    final_report_generated: false
  };
}

export function buildRelaxationContext(entries, cohortSnapshot = null) {
  const last = entries.at(-1);
  if (!last) return { phase: "baseline", week: 1, counts: {}, aggregates: {}, adherence: {} };

  const baseline = entries.filter((e) => e.phase === "BASELINE");
  const intervention = entries.filter((e) => e.phase === "INTERVENTION");
  const optimise = entries.filter((e) => e.phase === "OPTIMISE");
  const active = [...intervention, ...optimise];

  const phaseKey =
    last.phase === "BASELINE"
      ? "baseline"
      : last.phase === "INTERVENTION"
        ? "practices"
        : last.phase === "OPTIMISE"
          ? "optimise"
          : "report";

  const composureBaseline = phaseStats(baseline, PRIMARY_OUTCOME);
  const composureActive = phaseStats(active, PRIMARY_OUTCOME);

  const habitCounts = {};
  for (const habit of HABITS) {
    const followed = active.filter((e) => e[habit]);
    habitCounts[`${habit}Days`] = followed.length;
  }

  const aggregates = {
    composure_avg: phaseStats(entries, PRIMARY_OUTCOME).mean,
    composure_avg_baseline: composureBaseline.mean,
    composure_avg_practices: phaseStats(intervention, PRIMARY_OUTCOME).mean,
    composure_avg_optimise: phaseStats(optimise, PRIMARY_OUTCOME).mean,
    stress_avg: phaseStats(entries, FACTOR_OUTCOME).mean,
    stress_avg_baseline: phaseStats(baseline, FACTOR_OUTCOME).mean,
    logged_days: entries.length
  };

  for (const habit of HABITS) {
    const stress = habitAnalysis(active, habit, FACTOR_OUTCOME);
    if (stress.status === "valid") {
      aggregates[`stress_${habit}_followed`] = stress.mean_followed;
      aggregates[`stress_${habit}_not_followed`] = stress.mean_not_followed;
    }
  }

  const studyStart = entries[0]?.date;
  const adherence = adherenceStats(entries, studyStart, last.date);

  return {
    phase: phaseKey,
    week: last.study_week,
    events: {
      firstLog: entries.length === 1,
      baselineComplete: last.study_day === 14,
      weekEnd: last.study_day % 7 === 0,
      halfway: last.study_day === 21
    },
    counts: {
      loggedDays: entries.length,
      baselineLoggedDays: baseline.length,
      ...habitCounts
    },
    aggregates,
    adherence: {
      logged_days_pct: adherence.logging_pct,
      streak_n: adherence.current_streak,
      phase_total_days: last.study_day,
      practice_days_pct: active.length
        ? Math.round((active.filter((e) => e.practice_count > 0).length / active.length) * 100)
        : null
    },
    cohort: cohortSnapshot
      ? { size: cohortSnapshot.by_week?.[String(last.study_week)]?.participant_count ?? 0 }
      : { size: 0 }
  };
}

export async function analyzeFromLogs(logs, studyMeta, cohortSnapshot = null) {
  const entries = loadDayEntries(logs, studyMeta.start_date);
  return analyzeRelaxationPractices(entries, studyMeta, cohortSnapshot);
}

export function generateReport(type, entries, studyMeta, cohortSnapshot = null) {
  const baseline = entries.filter((e) => e.phase === "BASELINE");
  const intervention = entries.filter((e) => e.phase === "INTERVENTION");
  const optimise = entries.filter((e) => e.phase === "OPTIMISE");

  switch (type) {
    case "BASELINE_SUMMARY":
      return generateBaselineReport(baseline, studyMeta);
    case "INTERVENTION_INTERIM":
      return generateInterventionReport(baseline, intervention, studyMeta);
    case "OPTIMISE_COMPLETION":
      return generateOptimiseReport(entries, optimise, intervention, studyMeta);
    case "FINAL_STUDY_COMPLETE":
      return generateFinalReport(entries, studyMeta, cohortSnapshot);
    case "KIND_COMPARISON":
    case "COHORT_COMPARISON":
      return generateCohortComparison(entries, studyMeta.week ?? 6, cohortSnapshot, studyMeta);
    default:
      throw new Error(`Unknown report type: ${type}`);
  }
}
