import { HABITS, HABIT_LABELS, WINDDOWN_BUCKETS } from "./constants.js";
import { winddownStackingAnalysis } from "./stats.js";
import { round1 } from "./helpers.js";

export function buildWinddownSleepChart(activeEntries, baselineSleepMean) {
  const stacking = winddownStackingAnalysis(activeEntries, "sleep_quality");
  const points = [];

  for (const bucket of WINDDOWN_BUCKETS) {
    const group = stacking[bucket.key];
    if (group?.mean == null) continue;
    points.push({
      label: bucket.label,
      bucketKey: bucket.key,
      sleepQuality: round1(group.mean),
      changeFromBaseline:
        baselineSleepMean != null ? round1(group.mean - baselineSleepMean) : null,
      nightsLogged: group.n
    });
  }

  return {
    title: "Wind-down time and sleep quality",
    subtitle: "How your sleep quality varied with your screen-free wind-down each night",
    yAxisLabel: "Average sleep quality (0–10 scale)",
    xAxisLabel: "Screen-free wind-down time",
    baselineReference: baselineSleepMean != null ? round1(baselineSleepMean) : null,
    points
  };
}

export function buildHabitUpliftChart(habitSleepResults) {
  const points = HABITS.map((habit) => {
    const result = habitSleepResults[habit];
    if (!result || result.status !== "valid") {
      return {
        habit,
        label: HABIT_LABELS[habit],
        status: result?.status ?? "insufficient_data",
        changeInSleepQuality: null,
        nightsFollowed: result?.followed_n ?? 0,
        nightsNotFollowed: result?.not_followed_n ?? 0
      };
    }
    return {
      habit,
      label: HABIT_LABELS[habit],
      status: "valid",
      changeInSleepQuality: round1(result.difference),
      nightsFollowed: result.followed_n,
      nightsNotFollowed: result.not_followed_n
    };
  });

  return {
    title: "Each evening habit and your sleep quality",
    subtitle: "Change in sleep quality on nights you followed each habit compared with nights you did not",
    yAxisLabel: "Change in sleep quality (points on 0–10 scale)",
    points: points.filter((p) => p.status === "valid")
  };
}
