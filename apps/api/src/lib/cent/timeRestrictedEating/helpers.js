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
  "Other changes in sleep, diet, stress, or season may also have affected your daily energy.",
  "Without a return-to-baseline phase, timing effects cannot be fully separated from gradual change over time.",
  "Water intake outside the eating window was not logged in this exploration and is not included in the analysis."
];

export function buildLimitations(adherence, periodFx, baselineEntries, activeEntries) {
  return sharedBuildLimitations(adherence, periodFx, baselineEntries, activeEntries, {
    minBaselineDays: MIN_BASELINE_DAYS,
    baseLimitations: BASE_LIMITATIONS,
    periodEffectMessage:
      "Your scores improved steadily over time, so some of the change may reflect natural drift rather than the eating window alone."
  });
}

export function buildBaselineHeadline(primaryStats, windowMean) {
  const energyMean = primaryStats.mean != null ? round1(primaryStats.mean) : "—";
  const windowLabel = windowMean != null ? `${Math.round(windowMean)} hours` : "—";
  return `Over your ${primaryStats.n}-day baseline, you averaged ${energyMean}/10 daily energy with a typical eating window of ${windowLabel}. This is your personal starting point for the health exploration.`;
}

export function buildTenHourGuidance(topHabits) {
  if (!topHabits.length) {
    return "Keep logging through the 8-hour window phase. As more data accumulates, clearer timing patterns will emerge.";
  }
  const labels = topHabits.map((h) => HABIT_LABELS[h] ?? h);
  return `Based on your 10-hour window phase data, focus on ${labels.join(" and ")} during the optional 8-hour trial. These habits showed the strongest association with higher daily energy for you.`;
}

export function buildHealthExplorationHeadline(energyEff, windowEff, rankedHabits) {
  const parts = [];
  if (energyEff?.status === "valid" && energyEff.direction === "improved") {
    parts.push(
      `Your daily energy rose by ${round1(energyEff.mean_diff)} points on average during the 10-hour window phase compared with Baseline.`
    );
  }
  if (windowEff?.status === "valid" && windowEff.direction === "improved") {
    parts.push(
      `Your eating window narrowed by ${Math.abs(round1(windowEff.mean_diff))} hours compared with Baseline.`
    );
  }
  const top = rankedHabits.find((r) => r.status === "valid");
  if (top) {
    parts.push(`${HABIT_LABELS[top.habit] ?? top.habit} showed the strongest link with higher daily energy for you.`);
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
      outcomeLabel: "daily energy",
      belowAverageMessage:
        "Your daily energy is currently below the kind community average. A consistent 10-hour eating window tends to help most explorers."
    }
  );
}

export function determineVerdict(energyEff, secEffs, periodFx) {
  return sharedDetermineVerdict(energyEff, secEffs, periodFx, { primaryKey: "hunger_comfort" });
}

export function buildPersonalisedFindings(fullHabit) {
  const findings = [];
  for (const habit of HABITS) {
    const energy = fullHabit[habit]?.energy;
    if (energy?.status === "valid" && energy.beneficial) {
      findings.push({
        habit,
        label: HABIT_LABELS[habit],
        energy_uplift: round1(energy.difference),
        window_change:
          fullHabit[habit]?.window?.status === "valid" ? round1(fullHabit[habit].window.difference) : null
      });
    }
  }
  findings.sort((a, b) => (b.energy_uplift ?? 0) - (a.energy_uplift ?? 0));
  return findings;
}

export function buildKindCompareBody(energyDelta, loggingPct, cohortSnapshot) {
  const avgImprovement = cohortSnapshot?.avg_improvement_points ?? 1.6;
  const communityTop = cohortSnapshot?.top_habit_by_energy
    ? HABIT_LABELS[cohortSnapshot.top_habit_by_energy] ?? cohortSnapshot.top_habit_by_energy
    : null;
  let body = `Kind explorers improved daily energy by about ${avgImprovement} points on average. Your ${energyDelta >= 0 ? "+" : ""}${energyDelta} puts you ${energyDelta >= avgImprovement ? "a little ahead of" : "in line with"} the community`;
  body += ` — and you logged ${loggingPct >= 78 ? "more" : "about as"} consistently as most (${loggingPct}% vs ~78%).`;
  if (communityTop) {
    body += ` The timing habit most followed across the community is ${communityTop}.`;
  }
  return body;
}

export function formatWindowHours(hours) {
  if (hours === null || hours === undefined) return "—";
  return `${Math.round(hours)}h`;
}

export function keepListLabel(habit) {
  if (habit === "window_10h_or_less") return "10-hour eating window";
  if (habit === "first_meal_around_8am") return "First meal ~8am";
  if (habit === "last_meal_before_6pm") return "Last meal before 6pm";
  return HABIT_LABELS[habit] ?? habit;
}
