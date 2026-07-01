import {
  MIN_BASELINE_DAYS,
  MIN_HABIT_OBSERVATIONS,
  MIN_STACKING_GROUP,
  SIGNIFICANCE_LEVEL,
  HABITS,
  WINDOW_BUCKETS
} from "./constants.js";
import {
  mean,
  phaseStats as sharedPhaseStats,
  effectSize as sharedEffectSize,
  binaryHabitAnalysis,
  bucketStackingAnalysis,
  adherenceStats as sharedAdherenceStats,
  periodEffectCheck as sharedPeriodEffectCheck,
  percentileRank
} from "../shared/stats.js";
import { hungerBand } from "./constants.js";

function hungerDistribution(values) {
  const n = values.length;
  if (!n) return null;
  const bands = values.map((v) => hungerBand(v)).filter(Boolean);
  const total = bands.length || 1;
  return {
    very_hungry: bands.filter((b) => b === "very_hungry").length / total,
    hungry: bands.filter((b) => b === "hungry").length / total,
    manageable: bands.filter((b) => b === "manageable").length / total,
    comfortable: bands.filter((b) => b === "comfortable").length / total
  };
}

export { mean, percentileRank };

export function phaseStats(entries, outcome) {
  return sharedPhaseStats(entries, outcome, {
    distributionFn: outcome === "hunger_comfort" ? hungerDistribution : null
  });
}

export function effectSize(baselineStats, activeStats, outcome) {
  return sharedEffectSize(baselineStats, activeStats, outcome, {
    minBaselineDays: MIN_BASELINE_DAYS,
    higherIsBetter: outcome !== "eating_window_hours"
  });
}

export function habitAnalysis(phaseEntries, habitKey, outcome) {
  return binaryHabitAnalysis(phaseEntries, habitKey, outcome, {
    minObservations: MIN_HABIT_OBSERVATIONS,
    higherIsBetter: outcome !== "eating_window_hours"
  });
}

export function windowStackingAnalysis(phaseEntries, outcome) {
  const bucketDefs = WINDOW_BUCKETS.map((b) => ({ key: b.key, label: b.label }));
  const raw = bucketStackingAnalysis(
    phaseEntries.filter((e) => e.eating_window_hours !== null),
    outcome,
    (e) => {
      const h = e.eating_window_hours;
      for (const b of WINDOW_BUCKETS) {
        if (b.match(h)) return b.key;
      }
      return null;
    },
    bucketDefs,
    MIN_STACKING_GROUP
  );
  return raw;
}

export function adherenceStats(allEntries, studyStart, currentDate) {
  return sharedAdherenceStats(allEntries, studyStart, currentDate, {
    activePhases: ["INTERVENTION", "OPTIMISE"],
    adherenceFn: (active) => {
      const withWindow = active.filter((e) => e.eating_window_hours !== null);
      if (!withWindow.length) return null;
      return withWindow.filter((e) => e.window_10h_or_less).length / withWindow.length;
    }
  });
}

export function periodEffectCheck(allEntries, outcome) {
  return sharedPeriodEffectCheck(allEntries, outcome, {
    significanceLevel: SIGNIFICANCE_LEVEL,
    higherIsBetter: outcome !== "eating_window_hours"
  });
}

export function rankHabits(activeEntries) {
  const ranked = HABITS.map((habit) => {
    const result = habitAnalysis(activeEntries, habit, "daily_energy");
    if (result.status === "valid" && result.beneficial) {
      return { habit, abs_effect: result.abs_effect, status: "valid" };
    }
    return { habit, abs_effect: null, status: result.status };
  });

  ranked.sort((a, b) => {
    if (a.status === "valid" && b.status !== "valid") return -1;
    if (b.status === "valid" && a.status !== "valid") return 1;
    return (b.abs_effect ?? -1) - (a.abs_effect ?? -1);
  });
  return ranked;
}
