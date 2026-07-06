import {
  MIN_BASELINE_DAYS,
  HABITS,
  HABIT_LABELS,
  ONSET_OPTS,
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
  "Other changes in caffeine, stress, illness, or season may also have affected your sleep quality.",
  "Without a return-to-baseline phase, timing effects cannot be fully separated from gradual change over time.",
  "Wind-down activities were self-selected and not controlled — their effects may overlap with screen reduction."
];

export function buildLimitations(adherence, periodFx, baselineEntries, activeEntries) {
  return sharedBuildLimitations(adherence, periodFx, baselineEntries, activeEntries, {
    minBaselineDays: MIN_BASELINE_DAYS,
    baseLimitations: BASE_LIMITATIONS,
    periodEffectMessage:
      "Your sleep scores improved steadily over time, so some of the change may reflect natural drift rather than screen habits alone."
  });
}

export function buildBaselineHeadline(primaryStats, winddownMean) {
  const sleepMean = primaryStats.mean != null ? round1(primaryStats.mean) : "—";
  const winddownLabel = winddownMean != null ? `${Math.round(winddownMean)} min` : "—";
  return `Over your ${primaryStats.n}-night baseline, you averaged ${sleepMean}/10 sleep quality with a typical screen-free wind-down of ${winddownLabel}. This is your personal starting point for the health exploration.`;
}

export function buildThirtyMinGuidance(topHabits) {
  if (!topHabits.length) {
    return "Keep logging through the 60-min screen-free phase. As more data accumulates, clearer evening patterns will emerge.";
  }
  const labels = topHabits.map((h) => HABIT_LABELS[h] ?? h);
  return `Based on your 30-min screen-free phase data, focus on ${labels.join(" and ")} during the optional 60-min trial. These habits showed the strongest association with better sleep quality for you.`;
}

export function buildHealthExplorationHeadline(sleepEff, winddownEff, rankedHabits) {
  const parts = [];
  if (sleepEff?.status === "valid" && sleepEff.direction === "improved") {
    parts.push(
      `Your sleep quality rose by ${round1(sleepEff.mean_diff)} points on average during the 30-min screen-free phase compared with Baseline.`
    );
  }
  if (winddownEff?.status === "valid" && winddownEff.direction === "improved") {
    parts.push(
      `Your screen-free wind-down time increased by ${round1(winddownEff.mean_diff)} minutes compared with Baseline.`
    );
  }
  const top = rankedHabits.find((r) => r.status === "valid");
  if (top) {
    parts.push(`${HABIT_LABELS[top.habit] ?? top.habit} showed the strongest link with better sleep for you.`);
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
      outcomeLabel: "sleep quality",
      belowAverageMessage:
        "Your sleep quality is currently below the kind community average. A consistent 60-min screen-free buffer tends to help most explorers."
    }
  );
}

export function determineVerdict(sleepEff, secEffs, periodFx) {
  return sharedDetermineVerdict(sleepEff, secEffs, periodFx, { primaryKey: "sleep_onset_ordinal" });
}

export function buildPersonalisedFindings(fullHabit) {
  const findings = [];
  for (const habit of HABITS) {
    const sleep = fullHabit[habit]?.sleep;
    if (sleep?.status === "valid" && sleep.beneficial) {
      findings.push({
        habit,
        label: HABIT_LABELS[habit],
        sleep_uplift: round1(sleep.difference),
        winddown_change:
          fullHabit[habit]?.winddown?.status === "valid" ? round1(fullHabit[habit].winddown.difference) : null
      });
    }
  }
  findings.sort((a, b) => (b.sleep_uplift ?? 0) - (a.sleep_uplift ?? 0));
  return findings;
}

export function buildKindCompareBody(sleepDelta, loggingPct, cohortSnapshot) {
  const avgImprovement = cohortSnapshot?.avg_improvement_points ?? 1.4;
  const communityTop = cohortSnapshot?.top_habit_by_sleep
    ? HABIT_LABELS[cohortSnapshot.top_habit_by_sleep] ?? cohortSnapshot.top_habit_by_sleep
    : null;
  let body = `Explorers who hit both core habits on 5+ nights per week gained about +${avgImprovement} sleep-quality points on average. Your ${sleepDelta >= 0 ? "+" : ""}${sleepDelta} puts you ${sleepDelta >= avgImprovement ? "among the strongest responders in the cohort" : "in line with the community"}`;
  body += ` — and you logged ${loggingPct >= 78 ? "more" : "about as"} consistently as most (${loggingPct}% vs ~78%).`;
  if (communityTop) {
    body += ` The evening habit most followed across the community is ${communityTop}.`;
  }
  return body;
}

export function formatWinddownMinutes(minutes) {
  if (minutes === null || minutes === undefined) return "—";
  return `${Math.round(minutes)} min`;
}

export function keepListLabel(habit) {
  if (habit === "screen_free_60min") return "60-min screen-free";
  if (habit === "no_screens_in_bed") return "No screens in bed";
  if (habit === "reading_winddown") return "Reading wind-down";
  if (habit === "stretching_before_bed") return "Stretching before bed";
  return HABIT_LABELS[habit] ?? habit;
}

export function formatOnsetRange(entries) {
  const valid = entries.filter((e) => e.sleep_onset_ordinal !== null);
  if (!valid.length) return "—";
  const ordinals = valid.map((e) => e.sleep_onset_ordinal);
  const mode = ordinals.sort((a, b) =>
    ordinals.filter((v) => v === b).length - ordinals.filter((v) => v === a).length
  )[0];
  return ONSET_OPTS[mode] ?? "—";
}

export function formatOnsetTileValue(baselineEntries, activeEntries) {
  const before = formatOnsetRange(baselineEntries);
  const after = formatOnsetRange(activeEntries);
  if (before === "—" || after === "—") return { value: "—", delta: "—" };
  const beforeOrd = ONSET_OPTS.indexOf(before);
  const afterOrd = ONSET_OPTS.indexOf(after);
  const delta = afterOrd < beforeOrd ? "Faster" : afterOrd > beforeOrd ? "Slower" : "Similar";
  return { value: `${before} → ${after}`, delta };
}
