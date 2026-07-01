import { HABITS, HABIT_LABELS, WINDOW_BUCKETS } from "./constants.js";
import { windowStackingAnalysis } from "./stats.js";
import { round1 } from "./helpers.js";

export function buildWindowEnergyChart(activeEntries, baselineEnergyMean) {
  const stacking = windowStackingAnalysis(activeEntries, "daily_energy");
  const points = [];

  for (const bucket of WINDOW_BUCKETS) {
    const group = stacking[bucket.key];
    if (group?.mean == null) continue;
    points.push({
      label: bucket.label,
      bucketKey: bucket.key,
      dailyEnergy: round1(group.mean),
      changeFromBaseline:
        baselineEnergyMean != null ? round1(group.mean - baselineEnergyMean) : null,
      daysLogged: group.n
    });
  }

  return {
    title: "Eating window and daily energy",
    subtitle: "How your daily energy varied with your eating window width each day",
    yAxisLabel: "Average daily energy (0–10 scale)",
    xAxisLabel: "Eating window width",
    baselineReference: baselineEnergyMean != null ? round1(baselineEnergyMean) : null,
    points
  };
}

export function buildHabitUpliftChart(habitEnergyResults) {
  const points = HABITS.map((habit) => {
    const result = habitEnergyResults[habit];
    if (!result || result.status !== "valid") {
      return {
        habit,
        label: HABIT_LABELS[habit],
        status: result?.status ?? "insufficient_data",
        changeInDailyEnergy: null,
        daysFollowed: result?.followed_n ?? 0,
        daysNotFollowed: result?.not_followed_n ?? 0
      };
    }
    return {
      habit,
      label: HABIT_LABELS[habit],
      status: "valid",
      changeInDailyEnergy: round1(result.difference),
      daysFollowed: result.followed_n,
      daysNotFollowed: result.not_followed_n
    };
  });

  return {
    title: "Each timing habit and your daily energy",
    subtitle: "Change in daily energy on days you followed each habit compared with days you did not",
    yAxisLabel: "Change in daily energy (points on 0–10 scale)",
    points: points.filter((p) => p.status === "valid")
  };
}
