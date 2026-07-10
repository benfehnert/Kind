import {
  PRIMARY_OUTCOME,
  SECONDARY_OUTCOMES,
  RULE_LABELS,
  HEALTH_EXPLORATION_LABEL
} from "../constants.js";
import { phaseStats, effectSize, rankRules, adherenceStats } from "../stats.js";
import { buildLimitations, round1 } from "../helpers.js";
import { buildMorningRulesMobileViewForReport } from "./mobileView.js";

export function generateOptimiseReport(allEntries, optimiseEntries, interventionEntries, studyMeta, options = {}) {
  const bValid = allEntries.filter((e) => e.phase === "BASELINE" && e.valid_for_analysis);
  const iValid = interventionEntries.filter((e) => e.valid_for_analysis);
  const oValid = optimiseEntries.filter((e) => e.valid_for_analysis);

  const optimiseStats = phaseStats(oValid, PRIMARY_OUTCOME);
  const optimiseEnergy = phaseStats(oValid, "afternoon_energy");
  const interventionEnergy = phaseStats(iValid, "afternoon_energy");

  const activeAll = [...iValid, ...oValid];
  const ranked = rankRules(activeAll);
  const keepRules = ranked.filter((r) => r.status === "valid").slice(0, 2);
  const keepLabels = keepRules.map((r) => RULE_LABELS[r.rule]);

  const endDate = studyMeta.optimise_end_date ?? oValid.at(-1)?.date ?? allEntries.at(-1)?.date;
  const adherence = adherenceStats(allEntries, studyMeta.start_date, endDate);
  const periodFx = { significant: false };

  const crashEff = effectSize(
    phaseStats(bValid, PRIMARY_OUTCOME),
    phaseStats(oValid, PRIMARY_OUTCOME),
    PRIMARY_OUTCOME
  );

  const report = {
    type: "OPTIMISE_COMPLETION",
    reportTitle: "Optimise completion report",
    phaseLabel: "Optimise",
    explorationLabel: HEALTH_EXPLORATION_LABEL,
    generated: new Date().toISOString(),
    optimise_primary: optimiseStats,
    optimise_energy: optimiseEnergy,
    morning_rules_energy: interventionEnergy,
    confirmed_keep_rules: keepRules.map((r) => r.rule),
    confirmed_keep_labels: keepLabels,
    keep_list: {
      title: "Your keep list",
      items: keepLabels,
      body:
        keepLabels.length >= 2
          ? "These morning rules tracked most closely with your better afternoons during the health exploration."
          : "Continue logging to confirm which morning rules to keep."
    },
    primary_effect_vs_baseline: crashEff,
    secondary_effects: Object.fromEntries(
      SECONDARY_OUTCOMES.map((o) => [
        o,
        effectSize(phaseStats(bValid, o), phaseStats(oValid, o), o)
      ])
    ),
    adherence,
    headline:
      keepLabels.length >= 2
        ? `During Optimise, your afternoon energy averaged ${round1(optimiseEnergy.mean)}/10 on the 0–10 scale. Keep focusing on ${keepLabels.join(" and ")}.`
        : `During Optimise, your afternoon energy averaged ${round1(optimiseEnergy.mean)}/10 on the 0–10 scale. Continue logging to confirm your best rule combinations.`,
    limitations: buildLimitations(adherence, periodFx, bValid, oValid)
  };

  return {
    ...report,
    mobileView: buildMorningRulesMobileViewForReport(report, {
      studyMeta,
      allEntries,
      isShort: options.isShort ?? false,
      cohortSnapshot: options.cohortSnapshot ?? null
    })
  };
}
