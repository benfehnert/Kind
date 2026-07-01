import {
  MIN_BASELINE_DAYS,
  MIN_HABIT_OBSERVATIONS,
  MIN_STACKING_GROUP,
  SIGNIFICANCE_LEVEL,
  HABITS,
  UPF_BUCKETS
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
import { upfBand } from "./constants.js";

function upfDistribution(values) {
  const n = values.length;
  if (!n) return null;
  const bands = values.map((v) => upfBand(v)).filter(Boolean);
  const total = bands.length || 1;
  return {
    high: bands.filter((b) => b === "high").length / total,
    medium: bands.filter((b) => b === "medium").length / total,
    low: bands.filter((b) => b === "low").length / total
  };
}

export { mean, percentileRank };

export function phaseStats(entries, outcome) {
  return sharedPhaseStats(entries, outcome, {
    distributionFn: outcome === "upf_pct" ? upfDistribution : null
  });
}

export function effectSize(baselineStats, activeStats, outcome) {
  return sharedEffectSize(baselineStats, activeStats, outcome, {
    minBaselineDays: MIN_BASELINE_DAYS,
    higherIsBetter: outcome !== "upf_pct"
  });
}

export function habitAnalysis(phaseEntries, habitKey, outcome) {
  return binaryHabitAnalysis(phaseEntries, habitKey, outcome, {
    minObservations: MIN_HABIT_OBSERVATIONS,
    higherIsBetter: outcome !== "upf_pct"
  });
}

export function upfStackingAnalysis(phaseEntries, outcome) {
  const bucketDefs = UPF_BUCKETS.map((b) => ({ key: b.key, label: b.label }));
  return bucketStackingAnalysis(
    phaseEntries.filter((e) => e.upf_pct !== null),
    outcome,
    (e) => upfBand(e.upf_pct),
    bucketDefs,
    MIN_STACKING_GROUP
  );
}

export function adherenceStats(allEntries, studyStart, currentDate) {
  return sharedAdherenceStats(allEntries, studyStart, currentDate, {
    activePhases: ["INTERVENTION", "OPTIMISE"],
    adherenceFn: (active) => {
      const withPct = active.filter((e) => e.upf_pct !== null);
      if (!withPct.length) return null;
      return withPct.filter((e) => e.upf_pct < 30).length / withPct.length;
    }
  });
}

export function periodEffectCheck(allEntries, outcome) {
  return sharedPeriodEffectCheck(allEntries, outcome, {
    significanceLevel: SIGNIFICANCE_LEVEL,
    higherIsBetter: outcome !== "upf_pct"
  });
}

export function rankHabits(activeEntries) {
  const ranked = HABITS.map((habit) => {
    const result = habitAnalysis(activeEntries, habit, "daily_mood");
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
