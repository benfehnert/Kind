import {
  PRIMARY_OUTCOME,
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
  buildThirtyMinGuidance,
  round1
} from "../helpers.js";
import { buildWinddownSleepChart, buildHabitUpliftChart } from "../charts.js";
import { meanWinddownMinutes } from "../normalize.js";
import { generateInsufficientDataReport } from "./insufficient.js";
import { buildScreenSleepMobileViewForReport } from "./mobileView.js";
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

  const baselineSleepMean = phaseStats(bValid, PRIMARY_OUTCOME).mean;
  const sleepEff = effectSize(
    phaseStats(bValid, PRIMARY_OUTCOME),
    phaseStats(iValid, PRIMARY_OUTCOME),
    PRIMARY_OUTCOME
  );
  const winddownEff = effectSize(
    phaseStats(bValid, "winddown_minutes"),
    phaseStats(iValid, "winddown_minutes"),
    "winddown_minutes"
  );
  const secEffs = Object.fromEntries(
    SECONDARY_OUTCOMES.filter((o) => o !== "winddown_minutes").map((o) => [
      o,
      effectSize(phaseStats(bValid, o), phaseStats(iValid, o), o)
    ])
  );

  const habitSleep = Object.fromEntries(
    HABITS.map((h) => [h, habitAnalysis(iValid, h, PRIMARY_OUTCOME)])
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

  const winddownSleepChart = buildWinddownSleepChart(iValid, baselineSleepMean);
  const habitUpliftChart = buildHabitUpliftChart(habitSleep);

  const report = {
    type: "INTERVENTION_INTERIM",
    reportTitle: "Health exploration interim report",
    phaseLabel: "30-min free",
    explorationLabel: HEALTH_EXPLORATION_LABEL,
    generated: new Date().toISOString(),
    primary_effect: sleepEff,
    winddown_effect: winddownEff,
    secondary_effects: secEffs,
    habit_sleep: habitSleep,
    winddown_sleep_chart: winddownSleepChart,
    habit_uplift_chart: habitUpliftChart,
    weekly_trend: weekly,
    period_effect: periodFx,
    adherence,
    optimise_habits: top2Habits,
    optimise_habit_labels: top2Labels,
    optimise_guidance: buildThirtyMinGuidance(top2Habits),
    limitations: buildLimitations(adherence, periodFx, bValid, iValid),
    headline: buildHealthExplorationHeadline(sleepEff, winddownEff, rankedHabits),
    summary_tiles: [
      {
        label: "Sleep quality change",
        value:
          sleepEff.mean_diff != null
            ? `${sleepEff.mean_diff >= 0 ? "+" : ""}${round1(sleepEff.mean_diff)} points`
            : "—",
        note: "Compared with Baseline average"
      },
      {
        label: "Wind-down time change",
        value:
          winddownEff.mean_diff != null
            ? `${winddownEff.mean_diff >= 0 ? "+" : ""}${round1(winddownEff.mean_diff)} min`
            : "—",
        note: `Baseline avg ${round1(meanWinddownMinutes(bValid))} min → 30-min phase ${round1(meanWinddownMinutes(iValid))} min`
      }
    ]
  };

  return {
    ...report,
    mobileView: buildScreenSleepMobileViewForReport(report, {
      studyMeta,
      allEntries: [...baselineEntries, ...interventionEntries],
      isShort: options.isShort ?? false,
      cohortSnapshot: options.cohortSnapshot ?? null
    })
  };
}
