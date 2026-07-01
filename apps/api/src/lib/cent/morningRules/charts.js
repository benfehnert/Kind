import { RULES, RULE_LABELS } from "./constants.js";
import { stackingAnalysis } from "./stats.js";
import { round1 } from "./helpers.js";

function ruleCountLabel(count) {
  if (count === 0) return "No morning rules";
  if (count === 1) return "1 morning rule";
  return `${count} morning rules`;
}

export function buildMorningRulesEnergyChart(activeEntries, baselineEnergyMean) {
  const stacking = stackingAnalysis(activeEntries, "afternoon_energy");
  const points = [];

  for (let count = 0; count <= 4; count += 1) {
    const group = stacking[count];
    if (group?.mean == null) continue;
    points.push({
      label: ruleCountLabel(count),
      ruleCount: count,
      afternoonEnergy: round1(group.mean),
      changeFromBaseline:
        baselineEnergyMean != null ? round1(group.mean - baselineEnergyMean) : null,
      daysLogged: group.n
    });
  }

  return {
    title: "Morning rules and afternoon energy",
    subtitle:
      "How your afternoon energy varied with the number of morning rules you followed each day",
    yAxisLabel: "Average afternoon energy (0–10 scale)",
    xAxisLabel: "Morning rules followed that day",
    baselineReference: baselineEnergyMean != null ? round1(baselineEnergyMean) : null,
    points
  };
}

export function buildRuleUpliftChart(ruleEnergyResults) {
  const points = RULES.map((rule) => {
    const result = ruleEnergyResults[rule];
    if (!result || result.status !== "valid") {
      return {
        rule,
        label: RULE_LABELS[rule],
        status: result?.status ?? "insufficient_data",
        changeInAfternoonEnergy: null,
        daysFollowed: result?.followed_n ?? 0,
        daysNotFollowed: result?.not_followed_n ?? 0
      };
    }
    return {
      rule,
      label: RULE_LABELS[rule],
      status: "valid",
      changeInAfternoonEnergy: round1(result.difference),
      daysFollowed: result.followed_n,
      daysNotFollowed: result.not_followed_n
    };
  });

  return {
    title: "Each morning rule and your afternoon energy",
    subtitle:
      "Change in afternoon energy on days you followed each rule compared with days you did not",
    yAxisLabel: "Change in afternoon energy (points on 0–10 scale)",
    points: points.filter((p) => p.status === "valid")
  };
}
