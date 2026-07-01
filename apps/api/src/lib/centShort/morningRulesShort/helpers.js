import {
  MIN_BASELINE_DAYS,
  PRIMARY_OUTCOME,
  RULE_LABELS,
  RULES,
  USER_DISCLAIMER
} from "./constants.js";
import {
  round1,
  formatDateRange,
  buildLimitations as sharedBuildLimitations,
  determineVerdict as sharedDetermineVerdict,
  buildKindComparisonSummary as sharedBuildKindComparisonSummary,
  buildAdherenceNarrative
} from "../shared/helpers.js";

export { USER_DISCLAIMER, round1, formatDateRange, buildAdherenceNarrative };

export function crashSeverityLabel(meanValue) {
  if (meanValue === null || meanValue === undefined) return "no data";
  if (meanValue < 0.3) return "virtually no afternoon crashes";
  if (meanValue < 0.7) return "rare, mild afternoon dips";
  if (meanValue < 1.1) return "occasional mild afternoon dips";
  if (meanValue < 1.5) return "regular mild dips";
  if (meanValue < 1.9) return "occasional noticeable afternoon crashes";
  if (meanValue < 2.3) return "regular noticeable afternoon crashes";
  if (meanValue < 2.7) return "frequent noticeable to severe crashes";
  return "frequent severe afternoon crashes";
}

const BASE_LIMITATIONS = [
  "These results describe your experience only — they are not medical evidence and may not apply to others.",
  "All outcomes are self-reported and can be influenced by mood, expectations, or knowing which phase you are in.",
  "Other changes in sleep, diet, stress, or season may also have affected your afternoons.",
  "Without a return-to-baseline phase, rule effects cannot be fully separated from gradual change over time."
];

export function buildLimitations(adherence, periodFx, baselineEntries, activeEntries) {
  return sharedBuildLimitations(adherence, periodFx, baselineEntries, activeEntries, {
    minBaselineDays: MIN_BASELINE_DAYS,
    baseLimitations: BASE_LIMITATIONS,
    periodEffectMessage:
      "Your scores improved steadily over time, so some of the change may reflect natural drift rather than the morning rules alone."
  });
}

export function buildBaselineHeadline(primaryStats, secondaryStats) {
  const crashLabel = crashSeverityLabel(primaryStats.mean);
  const energyMean =
    secondaryStats.afternoon_energy?.mean != null
      ? Math.round(secondaryStats.afternoon_energy.mean * 10) / 10
      : "—";
  return `Over your ${primaryStats.n}-day baseline, you averaged ${energyMean}/10 afternoon energy with ${crashLabel}. This is your personal starting point for the health exploration.`;
}

export function buildOptimiseGuidance(topRules) {
  if (!topRules.length) {
    return "Keep logging through the Optimise phase. As more data accumulates, clearer rule patterns will emerge.";
  }
  const labels = topRules.map((r) => RULE_LABELS[r] ?? r);
  return `Based on your Morning rules phase data, focus on ${labels.join(" and ")} during Optimise. These rules showed the strongest association with fewer afternoon crashes for you.`;
}

export function buildHealthExplorationHeadline(crashEff, secEffs, rankedRules) {
  const parts = [];
  if (crashEff.status === "valid" && crashEff.improved) {
    parts.push(
      `Your afternoon crash severity improved by ${Math.abs(Math.round(crashEff.mean_diff * 10) / 10)} points on average during the Morning rules phase.`
    );
  }
  const energyEff = secEffs.afternoon_energy;
  if (energyEff?.status === "valid" && energyEff.direction === "improved") {
    parts.push(
      `Afternoon energy rose by ${Math.round(energyEff.mean_diff * 10) / 10} points compared with Baseline.`
    );
  }
  const top = rankedRules.find((r) => r.status === "valid");
  if (top) {
    parts.push(`${RULE_LABELS[top.rule] ?? top.rule} showed the strongest link with fewer crashes for you.`);
  }
  return parts.join(" ") || "Your health exploration data is building a picture of what works for you.";
}

export function buildKindComparisonSummary(
  adhPercentile,
  weekComparison,
  ruleAlignment,
  userTopRule,
  communityTopRule
) {
  return sharedBuildKindComparisonSummary(
    adhPercentile,
    weekComparison,
    ruleAlignment,
    userTopRule ? RULE_LABELS[userTopRule] ?? userTopRule : null,
    communityTopRule ? RULE_LABELS[communityTopRule] ?? communityTopRule : null,
    {
      outcomeLabel: "afternoon energy",
      entityLabel: "rule",
      belowAverageMessage:
        "Your afternoon energy is currently below the kind community average. If you have not yet tried following three or more morning rules on the same day, that tends to help most explorers."
    }
  );
}

export function determineVerdict(crashEff, secEffs, periodFx) {
  return sharedDetermineVerdict(crashEff, secEffs, periodFx, { primaryKey: "afternoon_energy" });
}

export function buildPersonalisedFindings(fullRule) {
  const findings = [];
  for (const rule of RULES) {
    const energy = fullRule[rule]?.energy;
    if (energy?.status === "valid" && energy.beneficial) {
      findings.push({
        rule,
        label: RULE_LABELS[rule],
        energy_uplift: Math.round(energy.difference * 10) / 10,
        crash_reduction:
          fullRule[rule]?.primary?.status === "valid" ? fullRule[rule].primary.difference : null
      });
    }
  }
  findings.sort((a, b) => (b.energy_uplift ?? 0) - (a.energy_uplift ?? 0));
  return findings;
}

export function buildKindCompareBody(energyDelta, loggingPct, cohortSnapshot) {
  const avgImprovement = cohortSnapshot?.avg_improvement_points ?? 1.1;
  const communityTop = cohortSnapshot?.top_rule_by_crash
    ? RULE_LABELS[cohortSnapshot.top_rule_by_crash] ?? cohortSnapshot.top_rule_by_crash
    : null;
  let body = `Kind explorers improved afternoon energy by about ${avgImprovement} points on average. Your ${energyDelta >= 0 ? "+" : ""}${energyDelta} puts you ${energyDelta >= avgImprovement ? "a little ahead of" : "in line with"} the community`;
  body += ` — and you logged ${loggingPct >= 78 ? "more" : "about as"} consistently as most (${loggingPct}% vs ~78%).`;
  if (communityTop) {
    body += ` The rule most followed across the community is ${communityTop}.`;
  }
  return body;
}
