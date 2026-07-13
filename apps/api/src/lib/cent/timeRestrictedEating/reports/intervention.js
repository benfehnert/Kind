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
  buildTenHourGuidance,
  round1
} from "../helpers.js";
import { buildWindowEnergyChart, buildHabitUpliftChart } from "../charts.js";
import { meanWindowHours } from "../normalize.js";
import { generateInsufficientDataReport } from "./insufficient.js";
import { buildTimeRestrictedEatingMobileViewForReport } from "./mobileView.js";
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

  const baselineEnergyMean = phaseStats(bValid, PRIMARY_OUTCOME).mean;
  const energyEff = effectSize(
    phaseStats(bValid, PRIMARY_OUTCOME),
    phaseStats(iValid, PRIMARY_OUTCOME),
    PRIMARY_OUTCOME
  );
  const windowEff = effectSize(
    phaseStats(bValid, "eating_window_hours"),
    phaseStats(iValid, "eating_window_hours"),
    "eating_window_hours"
  );
  const secEffs = Object.fromEntries(
    SECONDARY_OUTCOMES.filter((o) => o !== "eating_window_hours").map((o) => [
      o,
      effectSize(phaseStats(bValid, o), phaseStats(iValid, o), o)
    ])
  );

  const habitEnergy = Object.fromEntries(
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

  const windowEnergyChart = buildWindowEnergyChart(iValid, baselineEnergyMean);
  const habitUpliftChart = buildHabitUpliftChart(habitEnergy);

  const report = {
    type: "INTERVENTION_INTERIM",
    reportTitle: "Health exploration interim report",
    phaseLabel: "10-hour window",
    explorationLabel: HEALTH_EXPLORATION_LABEL,
    generated: new Date().toISOString(),
    primary_effect: energyEff,
    window_effect: windowEff,
    secondary_effects: secEffs,
    habit_energy: habitEnergy,
    window_energy_chart: windowEnergyChart,
    habit_uplift_chart: habitUpliftChart,
    weekly_trend: weekly,
    period_effect: periodFx,
    adherence,
    optimise_habits: top2Habits,
    optimise_habit_labels: top2Labels,
    optimise_guidance: buildTenHourGuidance(top2Habits),
    limitations: buildLimitations(adherence, periodFx, bValid, iValid),
    headline: buildHealthExplorationHeadline(energyEff, windowEff, rankedHabits),
    summary_tiles: [
      {
        label: "Daily energy change",
        value:
          energyEff.mean_diff != null && baselineEnergyMean != null
            ? `${round1(baselineEnergyMean)} → ${round1(baselineEnergyMean + energyEff.mean_diff)}`
            : energyEff.mean_diff != null
              ? `${energyEff.mean_diff >= 0 ? "+" : ""}${round1(energyEff.mean_diff)} points`
              : "—",
        note:
          energyEff.mean_diff != null
            ? `${energyEff.mean_diff >= 0 ? "+" : ""}${round1(energyEff.mean_diff)} pts`
            : "Compared with Baseline average"
      },
      {
        label: "Eating window change",
        value:
          windowEff.mean_diff != null && meanWindowHours(bValid) != null && meanWindowHours(iValid) != null
            ? `${Math.round(meanWindowHours(bValid))}h → ${Math.round(meanWindowHours(iValid))}h`
            : windowEff.mean_diff != null
              ? `${windowEff.mean_diff >= 0 ? "+" : ""}${round1(windowEff.mean_diff)} hrs`
              : "—",
        note:
          windowEff.mean_diff != null
            ? `${windowEff.mean_diff >= 0 ? "+" : ""}${round1(windowEff.mean_diff)} hrs`
            : `Baseline avg ${round1(meanWindowHours(bValid))}h → 10-hour phase ${round1(meanWindowHours(iValid))}h`
      }
    ]
  };

  return {
    ...report,
    mobileView: buildTimeRestrictedEatingMobileViewForReport(report, {
      studyMeta,
      allEntries: [...baselineEntries, ...interventionEntries],
      isShort: options.isShort ?? false,
      cohortSnapshot: options.cohortSnapshot ?? null
    })
  };
}
