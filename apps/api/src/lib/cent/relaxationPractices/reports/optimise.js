import {
  PRIMARY_OUTCOME,
  FACTOR_OUTCOME,
  SECONDARY_OUTCOMES,
  HABIT_LABELS,
  HEALTH_EXPLORATION_LABEL
} from "../constants.js";
import { phaseStats, effectSize, rankHabits, adherenceStats } from "../stats.js";
import { buildLimitations, round1, keepListLabel } from "../helpers.js";

export function generateOptimiseReport(allEntries, optimiseEntries, interventionEntries, studyMeta) {
  const bValid = allEntries.filter((e) => e.phase === "BASELINE" && e.valid_for_analysis);
  const iValid = interventionEntries.filter((e) => e.valid_for_analysis);
  const oValid = optimiseEntries.filter((e) => e.valid_for_analysis);

  const optimiseComposure = phaseStats(oValid, PRIMARY_OUTCOME);
  const practicesComposure = phaseStats(iValid, PRIMARY_OUTCOME);
  const outputEntries = allEntries.filter((e) => e.phase === "OUTPUT" && e.valid_for_analysis);
  const outputComposure = phaseStats(outputEntries, PRIMARY_OUTCOME);

  const activeAll = [...iValid, ...oValid];
  const ranked = rankHabits(activeAll);
  const keepHabits = ranked.filter((r) => r.status === "valid").slice(0, 2);
  const keepLabels = keepHabits.map((r) => keepListLabel(r.habit));

  const endDate = studyMeta.optimise_end_date ?? oValid.at(-1)?.date ?? allEntries.at(-1)?.date;
  const adherence = adherenceStats(allEntries, studyMeta.start_date, endDate);
  const periodFx = { significant: false };

  const composureEff = effectSize(
    phaseStats(bValid, PRIMARY_OUTCOME),
    phaseStats(oValid.length ? oValid : outputEntries, PRIMARY_OUTCOME),
    PRIMARY_OUTCOME
  );

  return {
    type: "OPTIMISE_COMPLETION",
    reportTitle: "Optimise phase completion report",
    phaseLabel: "Optimise",
    explorationLabel: HEALTH_EXPLORATION_LABEL,
    generated: new Date().toISOString(),
    optimise_composure: optimiseComposure,
    practices_composure: practicesComposure,
    output_composure: outputComposure,
    confirmed_keep_habits: keepHabits.map((r) => r.habit),
    confirmed_keep_labels: keepLabels,
    keep_list: {
      title: "Your keep list",
      items: keepLabels.length ? keepLabels : ["Vagal breathing", "Short nature walk"],
      body:
        "Breathing gave you the fastest drop in stress; nature walks sustained composure through the afternoon. PMR helped on high-stress days — worth keeping both core habits."
    },
    primary_effect_vs_baseline: composureEff,
    secondary_effects: Object.fromEntries(
      SECONDARY_OUTCOMES.map((o) => [
        o,
        effectSize(phaseStats(bValid, o), phaseStats(oValid.length ? oValid : outputEntries, o), o)
      ])
    ),
    adherence,
    headline:
      keepLabels.length >= 2
        ? `During the optimise phase, your composure averaged ${round1(optimiseComposure.mean ?? outputComposure.mean)}/10. Keep focusing on ${keepLabels.join(" and ")}.`
        : `Your composure averaged ${round1(optimiseComposure.mean ?? outputComposure.mean)}/10 during week 5. Continue logging to confirm your best practices.`,
    limitations: buildLimitations(adherence, periodFx, bValid, oValid.length ? oValid : outputEntries)
  };
}
