import { mean, median, sd, tQuantile975, parseDate, daysBetween } from "./math.js";
import { binaryHabitAnalysis } from "./binaryAnalysis.js";

export { mean, median, sd, binaryHabitAnalysis };

export function phaseStats(entries, outcome, options = {}) {
  const valid = entries.filter((e) => e[outcome] !== null && e[outcome] !== undefined);
  const n = valid.length;
  if (!n) {
    return { n: 0, mean: null, sd: null, median: null, distribution: null };
  }
  const values = valid.map((e) => e[outcome]);
  return {
    n,
    mean: mean(values),
    sd: sd(values),
    median: median(values),
    distribution: options.distributionFn ? options.distributionFn(values) : null
  };
}

export function effectSize(baselineStats, activeStats, outcome, options = {}) {
  const minBaseline = options.minBaselineDays ?? 7;
  const minActive = options.minActiveDays ?? 5;

  if (baselineStats.n < minBaseline || activeStats.n < minActive) {
    return { outcome, status: "insufficient_data" };
  }

  const meanDiff = activeStats.mean - baselineStats.mean;

  if (options.ordinalPrimary && options.distributionImprovement) {
    const bDist = baselineStats.distribution ?? {};
    const aDist = activeStats.distribution ?? {};
    const reduction = options.distributionImprovement(bDist, aDist);
    return {
      outcome,
      mean_diff: meanDiff,
      improved: meanDiff < 0,
      crash_reduction_pct: reduction,
      baseline_distribution: bDist,
      active_distribution: aDist,
      direction: meanDiff < 0 ? "improved" : meanDiff > 0 ? "worsened" : "no_change",
      status: "valid"
    };
  }

  const seB = (baselineStats.sd ?? 0) ** 2 / baselineStats.n;
  const seA = (activeStats.sd ?? 0) ** 2 / activeStats.n;
  const seDiff = Math.sqrt(seB + seA);
  const df =
    seDiff === 0
      ? 1
      : (seB + seA) ** 2 /
        ((seB ** 2) / Math.max(baselineStats.n - 1, 1) + (seA ** 2) / Math.max(activeStats.n - 1, 1));
  const tCrit = tQuantile975(Math.floor(df));
  const ciLow = meanDiff - tCrit * seDiff;
  const ciHigh = meanDiff + tCrit * seDiff;

  const higherIsBetter = options.higherIsBetter ?? true;
  let direction = "no_change";
  if (ciLow < 0 && ciHigh > 0) direction = "direction_unclear";
  else if (higherIsBetter ? meanDiff > 0 : meanDiff < 0) direction = "improved";
  else if (higherIsBetter ? meanDiff < 0 : meanDiff > 0) direction = "worsened";

  return {
    outcome,
    mean_diff: meanDiff,
    ci_low: ciLow,
    ci_high: ciHigh,
    df: Math.floor(df),
    direction,
    status: "valid"
  };
}

export function bucketStackingAnalysis(phaseEntries, outcome, getBucket, bucketDefs, minGroup = 3) {
  const results = {};
  for (const def of bucketDefs) {
    const group = phaseEntries.filter(
      (e) =>
        getBucket(e) === def.key &&
        e[outcome] !== null &&
        e[outcome] !== undefined
    );
    if (group.length >= minGroup) {
      results[def.key] = { n: group.length, mean: mean(group.map((e) => e[outcome])), label: def.label };
    } else {
      results[def.key] = { n: group.length, mean: null, status: "insufficient_data", label: def.label };
    }
  }
  return results;
}

function consecutiveDaysEndingToday(entries, currentDate) {
  const dates = new Set(entries.map((e) => e.date));
  let streak = 0;
  let d = new Date(`${parseDate(currentDate)}T00:00:00Z`);
  while (dates.has(d.toISOString().slice(0, 10))) {
    streak += 1;
    d.setUTCDate(d.getUTCDate() - 1);
  }
  return streak;
}

function maxConsecutiveDays(entries) {
  if (!entries.length) return 0;
  const sorted = [...entries].map((e) => e.date).sort();
  let max = 1;
  let current = 1;
  for (let i = 1; i < sorted.length; i += 1) {
    const gap = daysBetween(sorted[i - 1], sorted[i]);
    if (gap === 1) {
      current += 1;
      max = Math.max(max, current);
    } else if (gap > 1) {
      current = 1;
    }
  }
  return max;
}

export function adherenceStats(allEntries, studyStart, currentDate, options = {}) {
  const activePhases = options.activePhases ?? ["INTERVENTION", "OPTIMISE"];
  const adherenceFn = options.adherenceFn ?? null;

  const daysElapsed = Math.max(1, daysBetween(studyStart, currentDate) + 1);
  const daysLogged = allEntries.length;
  const loggingRate = daysLogged / daysElapsed;

  const active = allEntries.filter(
    (e) => activePhases.includes(e.phase) && e.valid_for_analysis
  );
  let interventionPct = null;
  if (adherenceFn && active.length > 0) {
    interventionPct = Math.round(adherenceFn(active) * 1000) / 10;
  }

  return {
    logging_pct: Math.round(loggingRate * 1000) / 10,
    rule_adherence_pct: interventionPct,
    intervention_adherence_pct: interventionPct,
    days_logged: daysLogged,
    days_elapsed: daysElapsed,
    current_streak: consecutiveDaysEndingToday(allEntries, currentDate),
    longest_streak: maxConsecutiveDays(allEntries),
    low_adherence_flag: loggingRate < (options.adherenceWarningThreshold ?? 0.7)
  };
}

function ordinaryLeastSquares(x, y) {
  const xMean = mean(x);
  const yMean = mean(y);
  let num = 0;
  let den = 0;
  for (let i = 0; i < x.length; i += 1) {
    num += (x[i] - xMean) * (y[i] - yMean);
    den += (x[i] - xMean) ** 2;
  }
  const slope = den === 0 ? 0 : num / den;
  const intercept = yMean - slope * xMean;
  let ssRes = 0;
  let ssTot = 0;
  for (let i = 0; i < x.length; i += 1) {
    const pred = intercept + slope * x[i];
    ssRes += (y[i] - pred) ** 2;
    ssTot += (y[i] - yMean) ** 2;
  }
  const rSquared = ssTot === 0 ? 0 : 1 - ssRes / ssTot;
  const se = Math.sqrt(ssRes / Math.max(x.length - 2, 1) / Math.max(den, 1e-9));
  const tStat = se === 0 ? 0 : slope / se;
  const pValue = 2 * (1 - normalCdf(Math.abs(tStat)));
  return { slope, intercept, rSquared, pValue };
}

function normalCdf(x) {
  const t = 1 / (1 + 0.2316419 * x);
  const d = 0.3989423 * Math.exp((-x * x) / 2);
  const p =
    d *
    t *
    (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274))));
  return 1 - p;
}

export function periodEffectCheck(allEntries, outcome, options = {}) {
  const valid = allEntries.filter((e) => e[outcome] !== null && e[outcome] !== undefined);
  if (valid.length < (options.minDays ?? 14)) {
    return { detectable: false, reason: "insufficient_data" };
  }
  const x = valid.map((e) => e.study_day);
  const y = valid.map((e) => e[outcome]);
  const { slope, rSquared, pValue } = ordinaryLeastSquares(x, y);
  const higherIsBetter = options.higherIsBetter ?? true;
  const improving = higherIsBetter ? slope > 0 : slope < 0;

  return {
    detectable: true,
    slope: Math.round(slope * 10000) / 10000,
    r_squared: Math.round(rSquared * 1000) / 1000,
    p_value: Math.round(pValue * 10000) / 10000,
    significant: pValue < (options.significanceLevel ?? 0.05),
    improving_over_time: improving
  };
}

export function percentileRank(value, sortedArray) {
  if (!sortedArray?.length) return null;
  const below = sortedArray.filter((v) => v < value).length;
  return Math.round((below / sortedArray.length) * 100);
}
