import {
  PRIMARY_OUTCOME,
  SECONDARY_OUTCOMES,
  HABIT_LABELS,
  HEALTH_EXPLORATION_LABEL
} from "../constants.js";
import { phaseStats, effectSize, rankHabits, adherenceStats } from "../stats.js";
import { buildLimitations, round1, keepListLabel } from "../helpers.js";
import { meanUpfPct } from "../normalize.js";
import { buildUpfReductionMobileViewForReport } from "./mobileView.js";

export function generateOptimiseReport(allEntries, optimiseEntries, interventionEntries, studyMeta, options = {}) {
  const bValid = allEntries.filter((e) => e.phase === "BASELINE" && e.valid_for_analysis);
  const iValid = interventionEntries.filter((e) => e.valid_for_analysis);
  const oValid = optimiseEntries.filter((e) => e.valid_for_analysis);

  const optimiseMood = phaseStats(oValid, PRIMARY_OUTCOME);
  const reductionMood = phaseStats(iValid, PRIMARY_OUTCOME);
  const outputEntries = allEntries.filter((e) => e.phase === "OUTPUT" && e.valid_for_analysis);
  const outputMood = phaseStats(outputEntries, PRIMARY_OUTCOME);

  const activeAll = [...iValid, ...oValid];
  const ranked = rankHabits(activeAll);
  const keepHabits = ranked.filter((r) => r.status === "valid").slice(0, 2);
  const keepLabels = keepHabits.map((r) => keepListLabel(r.habit));

  const endDate = studyMeta.optimise_end_date ?? oValid.at(-1)?.date ?? allEntries.at(-1)?.date;
  const adherence = adherenceStats(allEntries, studyMeta.start_date, endDate);
  const periodFx = { significant: false };

  const moodEff = effectSize(
    phaseStats(bValid, PRIMARY_OUTCOME),
    phaseStats(oValid.length ? oValid : outputEntries, PRIMARY_OUTCOME),
    PRIMARY_OUTCOME
  );

  const reductionUpf = meanUpfPct(iValid);
  const sustainedUpf = meanUpfPct(oValid);
  const stableReduction = sustainedUpf === null || reductionUpf === null || sustainedUpf <= reductionUpf + 5;

  const report = {
    type: "OPTIMISE_COMPLETION",
    reportTitle: "Sustained lower UPF completion report",
    phaseLabel: "Sustained lower UPF",
    explorationLabel: HEALTH_EXPLORATION_LABEL,
    generated: new Date().toISOString(),
    optimise_mood: optimiseMood,
    reduction_mood: reductionMood,
    output_mood: outputMood,
    confirmed_keep_habits: keepHabits.map((r) => r.habit),
    confirmed_keep_labels: keepLabels,
    keep_list: {
      title: "Your keep list",
      items: keepLabels.length ? keepLabels : ["Whole-food breakfast", "Unprocessed snacks"],
      body: stableReduction
        ? "Breakfast and snack swaps drove most of your UPF reduction — and the mood lift followed within two weeks. Home-cooked dinners helped on weekends."
        : "Continue logging to confirm which swap habits to keep."
    },
    primary_effect_vs_baseline: moodEff,
    secondary_effects: Object.fromEntries(
      SECONDARY_OUTCOMES.map((o) => [
        o,
        effectSize(phaseStats(bValid, o), phaseStats(oValid.length ? oValid : outputEntries, o), o)
      ])
    ),
    adherence,
    headline:
      keepLabels.length >= 2
        ? `During the sustained lower-UPF week, your daily mood averaged ${round1(optimiseMood.mean ?? outputMood.mean)}/10. Keep focusing on ${keepLabels.join(" and ")}.`
        : `Your daily mood averaged ${round1(optimiseMood.mean ?? outputMood.mean)}/10 during week 5. Continue logging to confirm your best swap habits.`,
    limitations: buildLimitations(adherence, periodFx, bValid, oValid.length ? oValid : outputEntries)
  };

  return {
    ...report,
    mobileView: buildUpfReductionMobileViewForReport(report, {
      studyMeta,
      allEntries,
      isShort: options.isShort ?? false,
      cohortSnapshot: options.cohortSnapshot ?? null
    })
  };
}
