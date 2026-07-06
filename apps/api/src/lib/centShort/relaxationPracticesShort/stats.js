import {
  MIN_BASELINE_DAYS,
  MIN_HABIT_OBSERVATIONS,
  MIN_STACKING_GROUP,
  SIGNIFICANCE_LEVEL,
  HABITS,
  PRACTICE_COUNT_BUCKETS,
  FACTOR_OUTCOME
} from "./constants.js";
import { anxietyBand } from "./constants.js";
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

function anxietyDistribution(values) {
  const n = values.length;
  if (!n) return null;
  const bands = values.map((v) => anxietyBand(v)).filter(Boolean);
  const total = bands.length || 1;
  return {
    high: bands.filter((b) => b === "high").length / total,
    moderate: bands.filter((b) => b === "moderate").length / total,
    mild: bands.filter((b) => b === "mild").length / total,
    calm: bands.filter((b) => b === "calm").length / total
  };
}

export { mean, percentileRank };

export function phaseStats(entries, outcome) {
  return sharedPhaseStats(entries, outcome, {
    distributionFn: outcome === "anxiety" ? anxietyDistribution : null
  });
}

export function effectSize(baselineStats, activeStats, outcome) {
  return sharedEffectSize(baselineStats, activeStats, outcome, {
    minBaselineDays: MIN_BASELINE_DAYS,
    higherIsBetter: outcome !== "stress"
  });
}

export function habitAnalysis(phaseEntries, habitKey, outcome = FACTOR_OUTCOME) {
  return binaryHabitAnalysis(phaseEntries, habitKey, outcome, {
    minObservations: MIN_HABIT_OBSERVATIONS,
    higherIsBetter: outcome !== "stress"
  });
}

export function practiceStackingAnalysis(phaseEntries, outcome) {
  const bucketDefs = PRACTICE_COUNT_BUCKETS.map((b) => ({ key: b.key, label: b.label }));
  return bucketStackingAnalysis(
    phaseEntries,
    outcome,
    (e) => {
      const n = e.practice_count ?? 0;
      for (const b of PRACTICE_COUNT_BUCKETS) {
        if (b.match(n)) return b.key;
      }
      return null;
    },
    bucketDefs,
    MIN_STACKING_GROUP
  );
}

export function adherenceStats(allEntries, studyStart, currentDate) {
  return sharedAdherenceStats(allEntries, studyStart, currentDate, {
    activePhases: ["INTERVENTION", "OPTIMISE"],
    adherenceFn: (active) => {
      if (!active.length) return null;
      const withPractice = active.filter((e) => e.practice_count > 0);
      return withPractice.length / active.length;
    }
  });
}

export function periodEffectCheck(allEntries, outcome) {
  return sharedPeriodEffectCheck(allEntries, outcome, {
    significanceLevel: SIGNIFICANCE_LEVEL,
    higherIsBetter: outcome !== "stress"
  });
}

export function rankHabits(activeEntries) {
  const ranked = HABITS.map((habit) => {
    const result = habitAnalysis(activeEntries, habit, FACTOR_OUTCOME);
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
