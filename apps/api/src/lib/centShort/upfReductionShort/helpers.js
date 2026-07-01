import {
  MIN_BASELINE_DAYS,
  HABITS,
  HABIT_LABELS,
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

const BASE_LIMITATIONS = [
  "These results describe your experience only — they are not medical evidence and may not apply to others.",
  "All outcomes are self-reported and can be influenced by mood, expectations, or knowing which phase you are in.",
  "Other changes in sleep, stress, or season may also have affected your daily mood and energy.",
  "Without a return-to-baseline phase, timing effects cannot be fully separated from gradual change over time.",
  "Sweetened drinks and other UPF categories were not tracked separately in this exploration."
];

export function buildLimitations(adherence, periodFx, baselineEntries, activeEntries) {
  return sharedBuildLimitations(adherence, periodFx, baselineEntries, activeEntries, {
    minBaselineDays: MIN_BASELINE_DAYS,
    baseLimitations: BASE_LIMITATIONS,
    periodEffectMessage:
      "Your mood scores improved steadily over time, so some of the change may reflect natural drift rather than UPF reduction alone."
  });
}

export function buildBaselineHeadline(primaryStats, upfMean) {
  const moodMean = primaryStats.mean != null ? round1(primaryStats.mean) : "—";
  const upfLabel = upfMean != null ? `${Math.round(upfMean)}%` : "—";
  return `Over your ${primaryStats.n}-day baseline, you averaged ${moodMean}/10 daily mood with about ${upfLabel} of your diet from ultra-processed foods. This is your personal starting point for the health exploration.`;
}

export function buildReductionGuidance(topHabits) {
  if (!topHabits.length) {
    return "Keep logging through the sustained lower-UPF phase. As more data accumulates, clearer swap patterns will emerge.";
  }
  const labels = topHabits.map((h) => HABIT_LABELS[h] ?? h);
  return `Based on your gradual reduction phase data, focus on ${labels.join(" and ")} during the sustained lower-UPF week. These swaps showed the strongest association with higher daily mood for you.`;
}

export function buildHealthExplorationHeadline(moodEff, upfEff, rankedHabits) {
  const parts = [];
  if (moodEff?.status === "valid" && moodEff.direction === "improved") {
    parts.push(
      `Your daily mood rose by ${round1(moodEff.mean_diff)} points on average during the reduction phases compared with Baseline.`
    );
  }
  if (upfEff?.status === "valid" && upfEff.direction === "improved") {
    parts.push(
      `Your UPF share of diet fell by ${Math.abs(round1(upfEff.mean_diff))} percentage points compared with Baseline.`
    );
  }
  const top = rankedHabits.find((r) => r.status === "valid");
  if (top) {
    parts.push(`${HABIT_LABELS[top.habit] ?? top.habit} showed the strongest link with higher daily mood for you.`);
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
      outcomeLabel: "daily mood",
      belowAverageMessage:
        "Your daily mood is currently below the kind community average. Consistent whole-food swaps tend to help most explorers."
    }
  );
}

export function determineVerdict(moodEff, secEffs, periodFx) {
  return sharedDetermineVerdict(moodEff, secEffs, periodFx, { primaryKey: "upf_pct" });
}

export function buildPersonalisedFindings(fullHabit) {
  const findings = [];
  for (const habit of HABITS) {
    const mood = fullHabit[habit]?.mood;
    if (mood?.status === "valid" && mood.beneficial) {
      findings.push({
        habit,
        label: HABIT_LABELS[habit],
        mood_uplift: round1(mood.difference),
        upf_change:
          fullHabit[habit]?.upf?.status === "valid" ? round1(fullHabit[habit].upf.difference) : null
      });
    }
  }
  findings.sort((a, b) => (b.mood_uplift ?? 0) - (a.mood_uplift ?? 0));
  return findings;
}

export function buildKindCompareBody(moodDelta, upfDelta, loggingPct, cohortSnapshot) {
  const avgImprovement = cohortSnapshot?.avg_improvement_points ?? 0.9;
  const communityTop = cohortSnapshot?.top_habit_by_mood
    ? HABIT_LABELS[cohortSnapshot.top_habit_by_mood] ?? cohortSnapshot.top_habit_by_mood
    : null;
  let body = `Explorers cutting UPF by 15+ percentage points reported about +${avgImprovement} mood points by week 5. Your ${upfDelta <= 0 ? "" : "+"}${upfDelta} UPF drop and ${moodDelta >= 0 ? "+" : ""}${moodDelta} mood gain are ${Math.abs(moodDelta) >= avgImprovement ? "among the clearest signals" : "in line with trends"} in this cohort`;
  body += ` — and you logged ${loggingPct >= 78 ? "more" : "about as"} consistently as most (${loggingPct}% vs ~78%).`;
  if (communityTop) {
    body += ` The swap most followed across the community is ${communityTop}.`;
  }
  return body;
}

export function keepListLabel(habit) {
  if (habit === "breakfast_swap") return "Whole-food breakfast";
  if (habit === "snack_swap") return "Unprocessed snacks";
  return HABIT_LABELS[habit] ?? habit;
}

export function upfDistributionBars(stats) {
  if (!stats?.distribution) {
    return [
      { w: 45, c: "#E24B4A" },
      { w: 35, c: "#EF9F27" },
      { w: 20, c: "#5DCAA5" }
    ];
  }
  const d = stats.distribution;
  return [
    { w: Math.round(d.high * 100), c: "#E24B4A" },
    { w: Math.round(d.medium * 100), c: "#EF9F27" },
    { w: Math.round(d.low * 100), c: "#5DCAA5" }
  ];
}
