import { HABITS, HABIT_LABELS, PRACTICE_COUNT_BUCKETS } from "./constants.js";
import { practiceStackingAnalysis } from "./stats.js";
import { round1 } from "./helpers.js";

export function buildPracticeComposureChart(activeEntries, baselineComposureMean) {
  const stacking = practiceStackingAnalysis(activeEntries, "composure");
  const points = [];

  for (const bucket of PRACTICE_COUNT_BUCKETS) {
    const group = stacking[bucket.key];
    if (group?.mean == null) continue;
    points.push({
      label: bucket.label,
      bucketKey: bucket.key,
      composure: round1(group.mean),
      changeFromBaseline:
        baselineComposureMean != null ? round1(group.mean - baselineComposureMean) : null,
      daysLogged: group.n
    });
  }

  return {
    title: "Practice count and composure",
    subtitle: "How your composure varied with the number of relaxation practices logged each day",
    yAxisLabel: "Average composure (0–10 scale)",
    xAxisLabel: "Practices per day",
    baselineReference: baselineComposureMean != null ? round1(baselineComposureMean) : null,
    points
  };
}

export function buildHabitStressChart(habitStressResults) {
  const points = HABITS.map((habit) => {
    const result = habitStressResults[habit];
    if (!result || result.status !== "valid") {
      return {
        habit,
        label: HABIT_LABELS[habit],
        status: result?.status ?? "insufficient_data",
        changeInStress: null,
        daysFollowed: result?.followed_n ?? 0,
        daysNotFollowed: result?.not_followed_n ?? 0
      };
    }
    return {
      habit,
      label: HABIT_LABELS[habit],
      status: "valid",
      changeInStress: round1(result.difference),
      daysFollowed: result.followed_n,
      daysNotFollowed: result.not_followed_n
    };
  });

  return {
    title: "Each practice and your stress level",
    subtitle: "Change in stress on days you used each practice compared with days you did not",
    yAxisLabel: "Change in stress (points on 0–10 scale; lower is better)",
    points: points.filter((p) => p.status === "valid")
  };
}
