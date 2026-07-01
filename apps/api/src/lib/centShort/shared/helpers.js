export { round1, formatDateRange } from "./math.js";

export function buildLimitations(adherence, periodFx, baselineEntries, activeEntries, options = {}) {
  const minBaseline = options.minBaselineDays ?? 7;
  const lims = [...(options.baseLimitations ?? [])];

  if (adherence?.low_adherence_flag) {
    lims.push(
      `You logged on ${adherence.logging_pct}% of days — below the 70% threshold — so missing days may affect these estimates.`
    );
  }
  if (baselineEntries.length < minBaseline) {
    lims.push(
      `Only ${baselineEntries.length} baseline days were logged (we recommend at least ${minBaseline}).`
    );
  }
  if (periodFx?.significant) {
    lims.push(
      options.periodEffectMessage ??
        "Your scores improved steadily over time, so some of the change may reflect natural drift rather than the intervention alone."
    );
  }
  return lims;
}

export function determineVerdict(primaryEff, secondaryEffs, periodFx, options = {}) {
  const primaryKey = options.primaryKey ?? Object.keys(secondaryEffs ?? {})[0];
  const sec = primaryKey ? secondaryEffs?.[primaryKey] : null;

  if (primaryEff?.status !== "valid") return "INCONCLUSIVE";

  const primaryImproved = primaryEff.direction === "improved";
  const secImproved = sec?.direction === "improved";

  if (primaryImproved && (!sec || secImproved)) {
    if (periodFx?.significant && periodFx.improving_over_time) {
      return "PROBABLY_BENEFICIAL_PERIOD_EFFECT_PRESENT";
    }
    return "BENEFICIAL";
  }
  if (primaryEff.direction === "worsened") return "NOT_BENEFICIAL";
  if (primaryEff.direction === "no_change" && (!sec || sec.direction === "no_change")) {
    return "NO_EFFECT_DETECTED";
  }
  return "MIXED";
}

export function buildKindComparisonSummary(
  adhPercentile,
  weekComparison,
  ruleAlignment,
  userTopLabel,
  communityTopLabel,
  options = {}
) {
  const entityLabel = options.entityLabel ?? "habit";
  const explorerLabel = options.explorerLabel ?? "kind explorers";
  const outcomeLabel = options.outcomeLabel ?? "daily energy";
  const parts = [];

  if (adhPercentile !== null) {
    if (adhPercentile >= 75) {
      parts.push(`Your logging consistency is in the top quarter of ${explorerLabel} at this stage — great work.`);
    } else if (adhPercentile >= 50) {
      parts.push(`Your logging consistency is around average for ${explorerLabel} at this stage.`);
    } else {
      parts.push(
        `More consistent logging would strengthen your results. Most explorers who complete the health exploration log at least five days per week.`
      );
    }
  }
  if (weekComparison?.status !== "no_data") {
    if (weekComparison.relative === "above_average") {
      parts.push(`Your ${outcomeLabel} this week is tracking above the kind community range.`);
    } else if (weekComparison.relative === "average") {
      parts.push(`Your ${outcomeLabel} is in line with the kind community average.`);
    } else if (weekComparison.relative === "below_average") {
      parts.push(
        options.belowAverageMessage ??
          `Your ${outcomeLabel} is currently below the kind community average.`
      );
    }
  }
  if (ruleAlignment === true && userTopLabel && communityTopLabel) {
    parts.push(
      `Your most effective ${entityLabel} — ${userTopLabel} — matches the ${entityLabel} most followed by the kind community (${communityTopLabel}).`
    );
  } else if (ruleAlignment === false && userTopLabel && communityTopLabel) {
    parts.push(
      `Your most effective ${entityLabel} is ${userTopLabel}. The kind community's most followed ${entityLabel} is ${communityTopLabel} — individual responses often differ, and that is normal.`
    );
  } else if (communityTopLabel) {
    parts.push(
      `Across the kind community, ${communityTopLabel} is the ${entityLabel} most associated with better ${outcomeLabel}.`
    );
  }
  return parts.join(" ");
}

export function buildAdherenceNarrative(percentile, explorerLabel = "kind explorers") {
  if (percentile === null) return "";
  if (percentile >= 75) {
    return `You are logging more consistently than ${percentile}% of ${explorerLabel} at this stage.`;
  }
  if (percentile >= 50) {
    return `Your logging consistency is around the ${percentile}th percentile for ${explorerLabel} at this stage.`;
  }
  return `Your logging is in the ${percentile}th percentile — a few more check-ins each week will strengthen your results.`;
}
