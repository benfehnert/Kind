import {
  PRIMARY_OUTCOME,
  SECONDARY_OUTCOMES,
  HABIT_LABELS,
  HEALTH_EXPLORATION_LABEL
} from "../constants.js";
import { phaseStats, effectSize, rankHabits, adherenceStats } from "../stats.js";
import { buildLimitations, round1, keepListLabel } from "../helpers.js";
import { meanWindowHours } from "../normalize.js";
import { buildTimeRestrictedEatingMobileViewForReport } from "./mobileView.js";

export function generateOptimiseReport(allEntries, optimiseEntries, interventionEntries, studyMeta, options = {}) {
  const bValid = allEntries.filter((e) => e.phase === "BASELINE" && e.valid_for_analysis);
  const iValid = interventionEntries.filter((e) => e.valid_for_analysis);
  const oValid = optimiseEntries.filter((e) => e.valid_for_analysis);

  const optimiseEnergy = phaseStats(oValid, PRIMARY_OUTCOME);
  const tenHourEnergy = phaseStats(iValid, PRIMARY_OUTCOME);
  const outputEntries = allEntries.filter((e) => e.phase === "OUTPUT" && e.valid_for_analysis);
  const outputEnergy = phaseStats(outputEntries, PRIMARY_OUTCOME);

  const activeAll = [...iValid, ...oValid];
  const ranked = rankHabits(activeAll);
  const keepHabits = ranked.filter((r) => r.status === "valid").slice(0, 2);
  const keepLabels = keepHabits.map((r) => keepListLabel(r.habit));

  const endDate = studyMeta.optimise_end_date ?? oValid.at(-1)?.date ?? allEntries.at(-1)?.date;
  const adherence = adherenceStats(allEntries, studyMeta.start_date, endDate);
  const periodFx = { significant: false };

  const energyEff = effectSize(
    phaseStats(bValid, PRIMARY_OUTCOME),
    phaseStats(oValid.length ? oValid : outputEntries, PRIMARY_OUTCOME),
    PRIMARY_OUTCOME
  );

  const tenHourWindow = meanWindowHours(iValid);
  const eightHourWindow = meanWindowHours(oValid);
  const stableTenHour = eightHourWindow === null || tenHourWindow <= eightHourWindow + 0.5;

  const report = {
    type: "OPTIMISE_COMPLETION",
    reportTitle: "8-hour window completion report",
    phaseLabel: "8-hour window",
    explorationLabel: HEALTH_EXPLORATION_LABEL,
    generated: new Date().toISOString(),
    optimise_energy: optimiseEnergy,
    ten_hour_energy: tenHourEnergy,
    output_energy: outputEnergy,
    confirmed_keep_habits: keepHabits.map((r) => r.habit),
    confirmed_keep_labels: keepLabels,
    keep_list: {
      title: "Your keep list",
      items: keepLabels.length ? keepLabels : ["10-hour eating window", "First meal ~8am"],
      body: stableTenHour
        ? "Your clearest gains came from a stable window rather than pushing to 8 hours. Hunger comfort normalised by week 4 — worth keeping the rhythm you found."
        : "Continue logging to confirm which timing habits to keep."
    },
    primary_effect_vs_baseline: energyEff,
    secondary_effects: Object.fromEntries(
      SECONDARY_OUTCOMES.map((o) => [
        o,
        effectSize(phaseStats(bValid, o), phaseStats(oValid.length ? oValid : outputEntries, o), o)
      ])
    ),
    adherence,
    headline:
      keepLabels.length >= 2
        ? `During the optional 8-hour trial, your daily energy averaged ${round1(optimiseEnergy.mean ?? outputEnergy.mean)}/10. Keep focusing on ${keepLabels.join(" and ")}.`
        : `Your daily energy averaged ${round1(optimiseEnergy.mean ?? outputEnergy.mean)}/10 during week 5. Continue logging to confirm your best timing habits.`,
    limitations: buildLimitations(adherence, periodFx, bValid, oValid.length ? oValid : outputEntries)
  };

  return {
    ...report,
    mobileView: buildTimeRestrictedEatingMobileViewForReport(report, {
      studyMeta,
      allEntries,
      isShort: options.isShort ?? false,
      cohortSnapshot: options.cohortSnapshot ?? null
    })
  };
}
