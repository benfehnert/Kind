import { HABITS, HABIT_LABELS, UPF_BUCKETS } from "./constants.js";
import { upfStackingAnalysis } from "./stats.js";
import { round1 } from "./helpers.js";

export function buildUpfMoodChart(activeEntries, baselineMoodMean) {
  const stacking = upfStackingAnalysis(activeEntries, "daily_mood");
  const points = [];

  for (const bucket of UPF_BUCKETS) {
    const group = stacking[bucket.key];
    if (group?.mean == null) continue;
    points.push({
      label: bucket.label,
      bucketKey: bucket.key,
      dailyMood: round1(group.mean),
      changeFromBaseline:
        baselineMoodMean != null ? round1(group.mean - baselineMoodMean) : null,
      daysLogged: group.n
    });
  }

  return {
    title: "UPF share and daily mood",
    subtitle: "How your daily mood varied with your estimated UPF intake each day",
    yAxisLabel: "Average daily mood (0–10 scale)",
    xAxisLabel: "UPF share of diet",
    baselineReference: baselineMoodMean != null ? round1(baselineMoodMean) : null,
    points
  };
}

export function buildHabitUpliftChart(habitMoodResults) {
  const points = HABITS.map((habit) => {
    const result = habitMoodResults[habit];
    if (!result || result.status !== "valid") {
      return {
        habit,
        label: HABIT_LABELS[habit],
        status: result?.status ?? "insufficient_data",
        changeInDailyMood: null,
        daysFollowed: result?.followed_n ?? 0,
        daysNotFollowed: result?.not_followed_n ?? 0
      };
    }
    return {
      habit,
      label: HABIT_LABELS[habit],
      status: "valid",
      changeInDailyMood: round1(result.difference),
      daysFollowed: result.followed_n,
      daysNotFollowed: result.not_followed_n
    };
  });

  return {
    title: "Each swap habit and your daily mood",
    subtitle: "Change in daily mood on days you made each swap compared with days you did not",
    yAxisLabel: "Change in daily mood (points on 0–10 scale)",
    points: points.filter((p) => p.status === "valid")
  };
}
