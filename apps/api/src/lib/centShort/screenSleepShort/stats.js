import {
  MIN_BASELINE_DAYS,
  MIN_HABIT_OBSERVATIONS,
  MIN_STACKING_GROUP,
  SIGNIFICANCE_LEVEL,
  HABITS,
  WINDDOWN_BUCKETS
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
import { sleepQualityBand } from "./constants.js";

function sleepQualityDistribution(values) {
  const n = values.length;
  if (!n) return null;
  const bands = values.map((v) => sleepQualityBand(v)).filter(Boolean);
  const total = bands.length || 1;
  return {
    unrested: bands.filter((b) => b === "unrested").length / total,
    ok: bands.filter((b) => b === "ok").length / total,
    rested: bands.filter((b) => b === "rested").length / total,
    fully_restored: bands.filter((b) => b === "fully_restored").length / total
  };
}

export { mean, percentileRank };

export function phaseStats(entries, outcome) {
  return sharedPhaseStats(entries, outcome, {
    distributionFn: outcome === "sleep_quality" ? sleepQualityDistribution : null
  });
}

export function effectSize(baselineStats, activeStats, outcome) {
  const higherIsBetter = outcome !== "sleep_onset_ordinal";
  return sharedEffectSize(baselineStats, activeStats, outcome, {
    minBaselineDays: MIN_BASELINE_DAYS,
    higherIsBetter
  });
}

export function habitAnalysis(phaseEntries, habitKey, outcome) {
  const higherIsBetter = outcome !== "sleep_onset_ordinal";
  return binaryHabitAnalysis(phaseEntries, habitKey, outcome, {
    minObservations: MIN_HABIT_OBSERVATIONS,
    higherIsBetter
  });
}

export function winddownStackingAnalysis(phaseEntries, outcome) {
  const bucketDefs = WINDDOWN_BUCKETS.map((b) => ({ key: b.key, label: b.label }));
  return bucketStackingAnalysis(
    phaseEntries.filter((e) => e.winddown_minutes !== null),
    outcome,
    (e) => {
      const m = e.winddown_minutes;
      for (const b of WINDDOWN_BUCKETS) {
        if (b.match(m)) return b.key;
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
      return active.filter((e) => e.screen_free_60min || e.no_screens_in_bed).length / active.length;
    }
  });
}

export function periodEffectCheck(allEntries, outcome) {
  const higherIsBetter = outcome !== "sleep_onset_ordinal";
  return sharedPeriodEffectCheck(allEntries, outcome, {
    significanceLevel: SIGNIFICANCE_LEVEL,
    higherIsBetter
  });
}

export function rankHabits(activeEntries) {
  const ranked = HABITS.map((habit) => {
    const result = habitAnalysis(activeEntries, habit, "sleep_quality");
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
