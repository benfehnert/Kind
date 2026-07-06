import {
  PRIMARY_OUTCOME,
  MIN_BASELINE_DAYS,
  MIN_RULE_OBSERVATIONS,
  MIN_STACKING_GROUP,
  SIGNIFICANCE_LEVEL,
  ADVERSE_MORNING_DROP,
  RULES
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

function crashDistribution(values) {
  const n = values.length;
  if (!n) return null;
  return {
    none: values.filter((v) => v === 0).length / n,
    mild_dip: values.filter((v) => v === 1).length / n,
    noticeable: values.filter((v) => v === 2).length / n,
    severe: values.filter((v) => v === 3).length / n
  };
}

export { mean, percentileRank };

export function phaseStats(entries, outcome) {
  return sharedPhaseStats(entries, outcome, {
    distributionFn: outcome === PRIMARY_OUTCOME ? crashDistribution : null
  });
}

export function effectSize(baselineStats, activeStats, outcome) {
  if (outcome === PRIMARY_OUTCOME) {
    return sharedEffectSize(baselineStats, activeStats, outcome, {
      minBaselineDays: MIN_BASELINE_DAYS,
      ordinalPrimary: true,
      distributionImprovement: (bDist, aDist) =>
        ((bDist.noticeable ?? 0) + (bDist.severe ?? 0) - ((aDist.noticeable ?? 0) + (aDist.severe ?? 0))) * 100
    });
  }
  return sharedEffectSize(baselineStats, activeStats, outcome, {
    minBaselineDays: MIN_BASELINE_DAYS,
    higherIsBetter: true
  });
}

export function ruleAnalysis(phaseEntries, ruleName, outcome) {
  return binaryHabitAnalysis(phaseEntries, ruleName, outcome, {
    minObservations: MIN_RULE_OBSERVATIONS,
    higherIsBetter: outcome !== PRIMARY_OUTCOME
  });
}

export function stackingAnalysis(phaseEntries, outcome) {
  const bucketDefs = [0, 1, 2, 3, 4].map((count) => ({
    key: count,
    label: `${count} rules`
  }));
  const raw = bucketStackingAnalysis(
    phaseEntries,
    outcome,
    (e) => e.rule_count,
    bucketDefs,
    MIN_STACKING_GROUP
  );
  const results = {};
  for (const def of bucketDefs) {
    results[def.key] = raw[def.key] ?? { n: 0, mean: null, status: "insufficient_data" };
  }
  return results;
}

export function adherenceStats(allEntries, studyStart, currentDate) {
  return sharedAdherenceStats(allEntries, studyStart, currentDate, {
    activePhases: ["INTERVENTION", "OPTIMISE"],
    adherenceFn: (active) => mean(active.map((e) => e.rule_count)) / 4
  });
}

export function periodEffectCheck(allEntries, outcome) {
  return sharedPeriodEffectCheck(allEntries, outcome, {
    significanceLevel: SIGNIFICANCE_LEVEL,
    higherIsBetter: outcome !== PRIMARY_OUTCOME
  });
}

export function adverseEffectCheck(baselineEntries, interventionEntries) {
  const bValid = baselineEntries.filter((e) => e.morning_energy !== null);
  const iValid = interventionEntries.filter((e) => e.morning_energy !== null);
  if (bValid.length < 3 || iValid.length < 3) {
    return { flag: false, reason: "insufficient_data" };
  }
  const meanB = mean(bValid.map((e) => e.morning_energy));
  const meanI = mean(iValid.map((e) => e.morning_energy));
  const drop = meanB - meanI;
  if (drop > ADVERSE_MORNING_DROP) {
    return {
      flag: true,
      type: "morning_energy_worsening",
      baseline_mean: Math.round(meanB * 10) / 10,
      intervention_mean: Math.round(meanI * 10) / 10,
      drop: Math.round(drop * 10) / 10,
      message: `Morning energy dropped by ${Math.round(drop * 10) / 10} points during the intervention phase. Consider whether any morning rule is creating disruption or stress. If you have concerns about your health, seek advice from a health professional.`
    };
  }
  return {
    flag: false,
    baseline_mean: Math.round(meanB * 10) / 10,
    intervention_mean: Math.round(meanI * 10) / 10
  };
}

export function rankRules(activeEntries) {
  const ranked = RULES.map((rule) => {
    const result = ruleAnalysis(activeEntries, rule, PRIMARY_OUTCOME);
    if (result.status === "valid" && result.beneficial) {
      return { rule, abs_effect: result.abs_effect, status: "valid" };
    }
    return { rule, abs_effect: null, status: result.status };
  });

  ranked.sort((a, b) => {
    if (a.status === "valid" && b.status !== "valid") return -1;
    if (b.status === "valid" && a.status !== "valid") return 1;
    return (b.abs_effect ?? -1) - (a.abs_effect ?? -1);
  });
  return ranked;
}
