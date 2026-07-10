import {
  PRIMARY_OUTCOME,
  SECONDARY_OUTCOMES,
  HEALTH_EXPLORATION_LABEL
} from "../constants.js";
import { phaseStats, effectSize, rankHabits, adherenceStats } from "../stats.js";
import { buildLimitations, round1, keepListLabel } from "../helpers.js";
import { buildScreenSleepMobileViewForReport } from "./mobileView.js";

export function generateOptimiseReport(allEntries, optimiseEntries, interventionEntries, studyMeta, options = {}) {
  const bValid = allEntries.filter((e) => e.phase === "BASELINE" && e.valid_for_analysis);
  const iValid = interventionEntries.filter((e) => e.valid_for_analysis);
  const oValid = optimiseEntries.filter((e) => e.valid_for_analysis);

  const optimiseSleep = phaseStats(oValid, PRIMARY_OUTCOME);
  const thirtyMinSleep = phaseStats(iValid, PRIMARY_OUTCOME);
  const outputEntries = allEntries.filter((e) => e.phase === "OUTPUT" && e.valid_for_analysis);
  const outputSleep = phaseStats(outputEntries, PRIMARY_OUTCOME);

  const activeAll = [...iValid, ...oValid];
  const ranked = rankHabits(activeAll);
  const keepHabits = ranked.filter((r) => r.status === "valid").slice(0, 2);
  const keepLabels = keepHabits.map((r) => keepListLabel(r.habit));

  const endDate = studyMeta.optimise_end_date ?? oValid.at(-1)?.date ?? allEntries.at(-1)?.date;
  const adherence = adherenceStats(allEntries, studyMeta.start_date, endDate);
  const periodFx = { significant: false };

  const sleepEff = effectSize(
    phaseStats(bValid, PRIMARY_OUTCOME),
    phaseStats(oValid.length ? oValid : outputEntries, PRIMARY_OUTCOME),
    PRIMARY_OUTCOME
  );

  const report = {
    type: "OPTIMISE_COMPLETION",
    reportTitle: "60-min screen-free completion report",
    phaseLabel: "60-min free",
    explorationLabel: HEALTH_EXPLORATION_LABEL,
    generated: new Date().toISOString(),
    optimise_sleep: optimiseSleep,
    thirty_min_sleep: thirtyMinSleep,
    output_sleep: outputSleep,
    confirmed_keep_habits: keepHabits.map((r) => r.habit),
    confirmed_keep_labels: keepLabels,
    keep_list: {
      title: "Your keep list",
      items: keepLabels.length ? keepLabels : ["60-min screen-free", "No screens in bed"],
      body:
        "The 60-minute buffer made the biggest difference — especially when paired with no in-bed scrolling. Reading on paper helped on tougher nights."
    },
    primary_effect_vs_baseline: sleepEff,
    secondary_effects: Object.fromEntries(
      SECONDARY_OUTCOMES.map((o) => [
        o,
        effectSize(phaseStats(bValid, o), phaseStats(oValid.length ? oValid : outputEntries, o), o)
      ])
    ),
    adherence,
    headline:
      keepLabels.length >= 2
        ? `During the optional 60-min trial, your sleep quality averaged ${round1(optimiseSleep.mean ?? outputSleep.mean)}/10. Keep focusing on ${keepLabels.join(" and ")}.`
        : `Your sleep quality averaged ${round1(optimiseSleep.mean ?? outputSleep.mean)}/10 during week 5. Continue logging to confirm your best evening habits.`,
    limitations: buildLimitations(adherence, periodFx, bValid, oValid.length ? oValid : outputEntries)
  };

  return {
    ...report,
    mobileView: buildScreenSleepMobileViewForReport(report, {
      studyMeta,
      allEntries,
      isShort: options.isShort ?? false,
      cohortSnapshot: options.cohortSnapshot ?? null
    })
  };
}
