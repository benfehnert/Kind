import {
  MIN_BASELINE_DAYS,
  HABITS,
  HABIT_LABELS,
  USER_DISCLAIMER,
  THEME_PRIMARY,
  THEME_BADGE_BG
} from "./constants.js";
import {
  round1,
  formatDateRange,
  buildLimitations as sharedBuildLimitations,
  determineVerdict as sharedDetermineVerdict,
  buildKindComparisonSummary as sharedBuildKindComparisonSummary,
  buildAdherenceNarrative
} from "../shared/helpers.js";

export { USER_DISCLAIMER, round1, formatDateRange, buildAdherenceNarrative, THEME_PRIMARY, THEME_BADGE_BG };

const BASE_LIMITATIONS = [
  "These results describe your experience only — they are not medical evidence and may not apply to others.",
  "All outcomes are self-reported and can be influenced by mood, expectations, or knowing which phase you are in.",
  "Sleep, workload, and life events also shape stress and composure — this exploration cannot isolate every factor.",
  "Without a return-to-baseline phase, timing effects cannot be fully separated from gradual change over time.",
  "Practice quality and duration were not logged — only whether each practice was done that day."
];

export function buildLimitations(adherence, periodFx, baselineEntries, activeEntries) {
  return sharedBuildLimitations(adherence, periodFx, baselineEntries, activeEntries, {
    minBaselineDays: MIN_BASELINE_DAYS,
    baseLimitations: BASE_LIMITATIONS,
    periodEffectMessage:
      "Your scores improved steadily over time, so some of the change may reflect natural drift rather than the practices alone."
  });
}

export function buildBaselineHeadline(primaryStats, practiceMean) {
  const composureMean = primaryStats.mean != null ? round1(primaryStats.mean) : "—";
  const practiceLabel =
    practiceMean != null ? `${round1(practiceMean)} practices per day` : "no new practices";
  return `Over your ${primaryStats.n}-day baseline, you averaged ${composureMean}/10 composure with ${practiceLabel}. This is your personal starting point for the health exploration.`;
}

export function buildPracticesGuidance(topHabits) {
  if (!topHabits.length) {
    return "Keep logging through the optimise phase. As more data accumulates, clearer practice patterns will emerge.";
  }
  const labels = topHabits.map((h) => HABIT_LABELS[h] ?? h);
  return `Based on your practices phase data, focus on ${labels.join(" and ")} during the optional optimise week. These habits showed the strongest association with lower stress for you.`;
}

export function buildHealthExplorationHeadline(composureEff, stressEff, rankedHabits) {
  const parts = [];
  if (composureEff?.status === "valid" && composureEff.direction === "improved") {
    parts.push(
      `Your composure rose by ${round1(composureEff.mean_diff)} points on average during the practices phase compared with Baseline.`
    );
  }
  if (stressEff?.status === "valid" && stressEff.direction === "improved") {
    parts.push(
      `Your stress fell by ${Math.abs(round1(stressEff.mean_diff))} points compared with Baseline.`
    );
  }
  const top = rankedHabits.find((r) => r.status === "valid");
  if (top) {
    parts.push(`${HABIT_LABELS[top.habit] ?? top.habit} showed the strongest link with lower stress for you.`);
  }
  return parts.join(" ") || "Your health exploration data is building a picture of what works for you.";
}

export function buildKindComparisonSummary(
  adhPercentile,
  weekComparison,
  habitAlignment,
  userTopHabit,
  communityTopHabit
) {
  return sharedBuildKindComparisonSummary(
    adhPercentile,
    weekComparison,
    habitAlignment,
    userTopHabit ? HABIT_LABELS[userTopHabit] ?? userTopHabit : null,
    communityTopHabit ? HABIT_LABELS[communityTopHabit] ?? communityTopHabit : null,
    {
      outcomeLabel: "composure",
      belowAverageMessage:
        "Your composure is currently below the kind community average. Regular practice days tend to help most explorers."
    }
  );
}

export function determineVerdict(composureEff, secEffs, periodFx) {
  return sharedDetermineVerdict(composureEff, secEffs, periodFx, { primaryKey: "stress" });
}

export function buildPersonalisedFindings(fullHabit) {
  const findings = [];
  for (const habit of HABITS) {
    const stress = fullHabit[habit]?.stress;
    if (stress?.status === "valid" && stress.beneficial) {
      findings.push({
        habit,
        label: HABIT_LABELS[habit],
        stress_reduction: round1(Math.abs(stress.difference)),
        composure_uplift:
          fullHabit[habit]?.composure?.status === "valid" ? round1(fullHabit[habit].composure.difference) : null
      });
    }
  }
  findings.sort((a, b) => (b.stress_reduction ?? 0) - (a.stress_reduction ?? 0));
  return findings;
}

export function buildKindCompareBody(composureDelta, stressDelta, loggingPct, cohortSnapshot) {
  const avgStressDrop = cohortSnapshot?.avg_stress_reduction_points ?? 1.3;
  const avgComposureGain = cohortSnapshot?.avg_composure_gain_points ?? 1.2;
  let body = `Explorers logging 4+ practice days per week reduced mean stress by about ${avgStressDrop} points. Your ${stressDelta <= 0 ? "" : "+"}${round1(stressDelta)} stress shift and ${composureDelta >= 0 ? "+" : ""}${round1(composureDelta)} composure gain are ${Math.abs(stressDelta) >= avgStressDrop ? "above" : "in line with"} the group average`;
  body += ` — and you logged ${loggingPct >= 78 ? "more" : "about as"} consistently as most (${loggingPct}% vs ~78%).`;
  return body;
}

export function keepListLabel(habit) {
  return HABIT_LABELS[habit] ?? habit;
}

export function formatStressReduction(difference) {
  if (difference === null || difference === undefined) return "—";
  const rounded = round1(difference);
  if (rounded === 0) return "0";
  return `${rounded}`;
}

export function relaxationBadgeColors(badge) {
  if (badge.startsWith("Strong") || badge.startsWith("Moderate–strong")) {
    return { badgeBg: THEME_BADGE_BG, badgeText: THEME_PRIMARY, bar: THEME_PRIMARY };
  }
  if (badge.startsWith("Moderate")) {
    return { badgeBg: "#FAEEDA", badgeText: "#854F0B", bar: "#EF9F27" };
  }
  if (badge.startsWith("Mild")) {
    return { badgeBg: "#F1EFE8", badgeText: "#444441", bar: "#888780", valColor: "#5F6B5C" };
  }
  return { badgeBg: "#F1EFE8", badgeText: "#444441", bar: "#888780", valColor: "#5F6B5C" };
}

export function relaxationEvidenceBadge(habitResult, followedPct, phaseLabel = "practice") {
  if (habitResult.status !== "valid") return "Insufficient data";
  const abs = habitResult.abs_effect ?? Math.abs(habitResult.difference ?? 0);
  if (abs >= 1.5 && followedPct >= 60) return `Strong signal · ${followedPct}% of ${phaseLabel} days`;
  if (abs >= 0.8 && followedPct >= 45) return `Moderate–strong · ${followedPct}% of days`;
  if (abs >= 0.5) return `Moderate · ${followedPct}% of days`;
  if (abs >= 0.3) return `Mild · less consistent`;
  return "Unclear · too inconsistent";
}
