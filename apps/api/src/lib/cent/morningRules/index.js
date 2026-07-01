import { loadDayEntries, logsFromFixture } from "./normalize.js";
import { phaseStats, ruleAnalysis, adherenceStats } from "./stats.js";
import { analyzeMorningRules, evaluateTriggers } from "./triggers.js";
import { generateFinalReport } from "./reports/final.js";
import { generateBaselineReport } from "./reports/baseline.js";
import { generateInterventionReport } from "./reports/intervention.js";
import { generateOptimiseReport } from "./reports/optimise.js";
import { generateCohortComparison } from "./reports/cohort.js";
import { RULES, PRIMARY_OUTCOME } from "./constants.js";

export { loadDayEntries, logsFromFixture } from "./normalize.js";
export * from "./constants.js";
export * from "./stats.js";
export * from "./helpers.js";
export { analyzeMorningRules, evaluateTriggers } from "./triggers.js";
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

export function buildMorningRulesContext(entries, cohortSnapshot = null) {
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
        ? "rules"
        : last.phase === "OPTIMISE"
          ? "optimise"
          : "report";

  const pmBaseline = phaseStats(baseline, "afternoon_energy");
  const pmActive = phaseStats(active, "afternoon_energy");
  const crashBaseline = phaseStats(baseline, PRIMARY_OUTCOME);
  const crashActive = phaseStats(active, PRIMARY_OUTCOME);

  const ruleCounts = {};
  for (const rule of RULES) {
    const followed = active.filter((e) => e[rule]);
    const notFollowed = active.filter((e) => !e[rule]);
    ruleCounts[`${rule}Days`] = followed.length;
    ruleCounts[`no${rule.replace("_", "")}Days`] = notFollowed.length;
  }

  const aggregates = {
    am_energy_avg: phaseStats(entries, "morning_energy").mean,
    pm_energy_avg: phaseStats(entries, "afternoon_energy").mean,
    pm_focus_avg: phaseStats(entries, "afternoon_focus").mean,
    pm_energy_avg_baseline: pmBaseline.mean,
    pm_energy_avg_rules: phaseStats(intervention, "afternoon_energy").mean,
    pm_energy_avg_optimise: phaseStats(optimise, "afternoon_energy").mean,
    crash_days: entries.filter((e) => (e.afternoon_crash_severity ?? 0) >= 2).length,
    logged_days: entries.length,
    crash_pct_baseline:
      crashBaseline.distribution
        ? Math.round((crashBaseline.distribution.noticeable + crashBaseline.distribution.severe) * 100)
        : null,
    crash_pct_optimise:
      crashActive.distribution
        ? Math.round((crashActive.distribution.noticeable + crashActive.distribution.severe) * 100)
        : null
  };

  for (const rule of RULES) {
    const energy = ruleAnalysis(active, rule, "afternoon_energy");
    if (energy.status === "valid") {
      aggregates[`pm_energy_${rule === "stretching" ? "move" : rule === "caffeine_offset" ? "caffeine" : rule === "meditation" ? "med" : "sun"}`] =
        energy.mean_followed;
      aggregates[`pm_energy_no${rule === "stretching" ? "move" : rule === "caffeine_offset" ? "caffeine" : rule === "meditation" ? "med" : "sun"}`] =
        energy.mean_not_followed;
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
      halfway: last.study_day === 28
    },
    counts: {
      loggedDays: entries.length,
      baselineLoggedDays: baseline.length,
      ...ruleCounts
    },
    aggregates,
    adherence: {
      logged_days_pct: adherence.logging_pct,
      streak_n: adherence.current_streak,
      phase_total_days: last.study_day,
      sunlight_pct: active.length
        ? Math.round((active.filter((e) => e.sunlight).length / active.length) * 100)
        : null,
      movement_pct: active.length
        ? Math.round((active.filter((e) => e.stretching).length / active.length) * 100)
        : null,
      caffeine_pct: active.length
        ? Math.round((active.filter((e) => e.caffeine_offset).length / active.length) * 100)
        : null,
      meditation_pct: active.length
        ? Math.round((active.filter((e) => e.meditation).length / active.length) * 100)
        : null
    },
    cohort: cohortSnapshot
      ? { size: cohortSnapshot.by_week?.[String(last.study_week)]?.participant_count ?? 0 }
      : { size: 0 }
  };
}

export async function analyzeFromLogs(logs, studyMeta, cohortSnapshot = null) {
  const entries = loadDayEntries(logs, studyMeta.start_date);
  return analyzeMorningRules(entries, studyMeta, cohortSnapshot);
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
      return generateCohortComparison(entries, studyMeta.week ?? 8, cohortSnapshot, studyMeta);
    default:
      throw new Error(`Unknown report type: ${type}`);
  }
}
