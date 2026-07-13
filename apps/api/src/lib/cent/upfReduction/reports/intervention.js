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
  buildReductionGuidance,
  round1
} from "../helpers.js";
import { buildUpfMoodChart, buildHabitUpliftChart } from "../charts.js";
import { meanUpfPct } from "../normalize.js";
import { generateInsufficientDataReport } from "./insufficient.js";
import { buildUpfReductionMobileViewForReport } from "./mobileView.js";
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

  const baselineMoodMean = phaseStats(bValid, PRIMARY_OUTCOME).mean;
  const moodEff = effectSize(
    phaseStats(bValid, PRIMARY_OUTCOME),
    phaseStats(iValid, PRIMARY_OUTCOME),
    PRIMARY_OUTCOME
  );
  const upfEff = effectSize(
    phaseStats(bValid, "upf_pct"),
    phaseStats(iValid, "upf_pct"),
    "upf_pct"
  );
  const secEffs = Object.fromEntries(
    SECONDARY_OUTCOMES.filter((o) => o !== "upf_pct").map((o) => [
      o,
      effectSize(phaseStats(bValid, o), phaseStats(iValid, o), o)
    ])
  );

  const habitMood = Object.fromEntries(
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

  const upfMoodChart = buildUpfMoodChart(iValid, baselineMoodMean);
  const habitUpliftChart = buildHabitUpliftChart(habitMood);

  const report = {
    type: "INTERVENTION_INTERIM",
    reportTitle: "Health exploration interim report",
    phaseLabel: "Gradual reduction",
    explorationLabel: HEALTH_EXPLORATION_LABEL,
    generated: new Date().toISOString(),
    primary_effect: moodEff,
    upf_effect: upfEff,
    secondary_effects: secEffs,
    habit_mood: habitMood,
    upf_mood_chart: upfMoodChart,
    habit_uplift_chart: habitUpliftChart,
    weekly_trend: weekly,
    period_effect: periodFx,
    adherence,
    optimise_habits: top2Habits,
    optimise_habit_labels: top2Labels,
    optimise_guidance: buildReductionGuidance(top2Habits),
    limitations: buildLimitations(adherence, periodFx, bValid, iValid),
    headline: buildHealthExplorationHeadline(moodEff, upfEff, rankedHabits),
    summary_tiles: [
      {
        label: "Daily mood change",
        value:
          moodEff.mean_diff != null && baselineMoodMean != null
            ? `${round1(baselineMoodMean)} → ${round1(baselineMoodMean + moodEff.mean_diff)}`
            : moodEff.mean_diff != null
              ? `${moodEff.mean_diff >= 0 ? "+" : ""}${round1(moodEff.mean_diff)} points`
              : "—",
        note:
          moodEff.mean_diff != null
            ? `${moodEff.mean_diff >= 0 ? "+" : ""}${round1(moodEff.mean_diff)} pts`
            : "Compared with Baseline average"
      },
      {
        label: "UPF share change",
        value:
          upfEff.mean_diff != null && meanUpfPct(bValid) != null && meanUpfPct(iValid) != null
            ? `${Math.round(meanUpfPct(bValid))}% → ${Math.round(meanUpfPct(iValid))}%`
            : upfEff.mean_diff != null
              ? `${upfEff.mean_diff >= 0 ? "+" : ""}${round1(upfEff.mean_diff)} pts`
              : "—",
        note:
          upfEff.mean_diff != null
            ? `${upfEff.mean_diff >= 0 ? "+" : ""}${round1(upfEff.mean_diff)} pts`
            : `Baseline avg ${Math.round(meanUpfPct(bValid) ?? 0)}% → reduction phase ${Math.round(meanUpfPct(iValid) ?? 0)}%`
      }
    ]
  };

  return {
    ...report,
    mobileView: buildUpfReductionMobileViewForReport(report, {
      studyMeta,
      allEntries: [...baselineEntries, ...interventionEntries],
      isShort: options.isShort ?? false,
      cohortSnapshot: options.cohortSnapshot ?? null
    })
  };
}
