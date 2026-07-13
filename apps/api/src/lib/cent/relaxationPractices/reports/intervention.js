import {
  PRIMARY_OUTCOME,
  FACTOR_OUTCOME,
  SECONDARY_OUTCOMES,
  HABITS,
  HABIT_LABELS,
  MIN_INTERVENTION_DAYS,
  HEALTH_EXPLORATION_LABEL
} from "../constants.js";
import {
  phaseStats,
  effectSize,
  habitAnalysis,
  adherenceStats,
  periodEffectCheck,
  rankHabits
} from "../stats.js";
import {
  buildLimitations,
  buildHealthExplorationHeadline,
  buildPracticesGuidance,
  round1
} from "../helpers.js";
import { buildPracticeComposureChart, buildHabitStressChart } from "../charts.js";
import { generateInsufficientDataReport } from "./insufficient.js";
import { buildRelaxationPracticesMobileViewForReport } from "./mobileView.js";
import { resolveAnalysisThresholds } from "../../shared/mobileView.js";

export function generateInterventionReport(baselineEntries, interventionEntries, studyMeta, options = {}) {
  const bValid = baselineEntries.filter((e) => e.valid_for_analysis);
  const iValid = interventionEntries.filter((e) => e.valid_for_analysis);
  const thresholds = resolveAnalysisThresholds(options.isShort ?? false, { MIN_INTERVENTION_DAYS });

  if (iValid.length < thresholds.MIN_INTERVENTION_DAYS) {
    return generateInsufficientDataReport("INTERVENTION_INTERIM", iValid.length, thresholds.MIN_INTERVENTION_DAYS, iValid, {
      studyMeta,
      isShort: options.isShort ?? false
    });
  }

  const baselineComposureMean = phaseStats(bValid, PRIMARY_OUTCOME).mean;
  const composureEff = effectSize(
    phaseStats(bValid, PRIMARY_OUTCOME),
    phaseStats(iValid, PRIMARY_OUTCOME),
    PRIMARY_OUTCOME
  );
  const stressEff = effectSize(
    phaseStats(bValid, FACTOR_OUTCOME),
    phaseStats(iValid, FACTOR_OUTCOME),
    FACTOR_OUTCOME
  );
  const secEffs = Object.fromEntries(
    SECONDARY_OUTCOMES.map((o) => [
      o,
      effectSize(phaseStats(bValid, o), phaseStats(iValid, o), o)
    ])
  );

  const habitStress = Object.fromEntries(
    HABITS.map((h) => [h, habitAnalysis(iValid, h, FACTOR_OUTCOME)])
  );

  const weekly = {};
  for (let w = 1; w <= 4; w += 1) {
    weekly[w] = phaseStats(
      [...bValid, ...iValid].filter((e) => e.study_week === w),
      PRIMARY_OUTCOME
    );
  }

  const periodFx = periodEffectCheck([...bValid, ...iValid], PRIMARY_OUTCOME);
  const rankedHabits = rankHabits(iValid);
  const top2Habits = rankedHabits.filter((r) => r.status === "valid").slice(0, 2).map((r) => r.habit);
  const top2Labels = top2Habits.map((h) => HABIT_LABELS[h]);

  const endDate = studyMeta.intervention_end_date ?? iValid.at(-1)?.date;
  const adherence = adherenceStats([...baselineEntries, ...interventionEntries], studyMeta.start_date, endDate);

  const practiceComposureChart = buildPracticeComposureChart(iValid, baselineComposureMean);
  const habitStressChart = buildHabitStressChart(habitStress);

  const report = {
    type: "INTERVENTION_INTERIM",
    reportTitle: "Health exploration interim report",
    phaseLabel: "Practices",
    explorationLabel: HEALTH_EXPLORATION_LABEL,
    generated: new Date().toISOString(),
    primary_effect: composureEff,
    stress_effect: stressEff,
    secondary_effects: secEffs,
    habit_stress: habitStress,
    practice_composure_chart: practiceComposureChart,
    habit_stress_chart: habitStressChart,
    weekly_trend: weekly,
    period_effect: periodFx,
    adherence,
    optimise_habits: top2Habits,
    optimise_habit_labels: top2Labels,
    optimise_guidance: buildPracticesGuidance(top2Habits),
    limitations: buildLimitations(adherence, periodFx, bValid, iValid),
    headline: buildHealthExplorationHeadline(composureEff, stressEff, rankedHabits),
    summary_tiles: [
      {
        label: "Composure change",
        value:
          composureEff.mean_diff != null && baselineComposureMean != null
            ? `${round1(baselineComposureMean)} → ${round1(baselineComposureMean + composureEff.mean_diff)}`
            : composureEff.mean_diff != null
              ? `${composureEff.mean_diff >= 0 ? "+" : ""}${round1(composureEff.mean_diff)} points`
              : "—",
        note:
          composureEff.mean_diff != null
            ? `${composureEff.mean_diff >= 0 ? "+" : ""}${round1(composureEff.mean_diff)} pts`
            : "Compared with Baseline average"
      },
      {
        label: "Stress change",
        value:
          stressEff.mean_diff != null &&
          phaseStats(bValid, FACTOR_OUTCOME).mean != null &&
          phaseStats(iValid, FACTOR_OUTCOME).mean != null
            ? `${round1(phaseStats(bValid, FACTOR_OUTCOME).mean)} → ${round1(phaseStats(iValid, FACTOR_OUTCOME).mean)}`
            : stressEff.mean_diff != null
              ? `${stressEff.mean_diff <= 0 ? "" : "+"}${round1(stressEff.mean_diff)} points`
              : "—",
        note:
          stressEff.mean_diff != null
            ? `${stressEff.mean_diff <= 0 ? "" : "+"}${round1(stressEff.mean_diff)} pts`
            : `Baseline avg ${round1(phaseStats(bValid, FACTOR_OUTCOME).mean)} → practices ${round1(phaseStats(iValid, FACTOR_OUTCOME).mean)}`
      }
    ]
  };

  return {
    ...report,
    mobileView: buildRelaxationPracticesMobileViewForReport(report, {
      studyMeta,
      allEntries: [...baselineEntries, ...interventionEntries],
      isShort: options.isShort ?? false,
      cohortSnapshot: options.cohortSnapshot ?? null
    })
  };
}
