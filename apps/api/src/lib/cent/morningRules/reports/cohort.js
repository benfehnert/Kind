import { MIN_COHORT_SIZE, RULE_LABELS, HEALTH_EXPLORATION_LABEL } from "../constants.js";
import { phaseStats, adherenceStats, rankRules, percentileRank } from "../stats.js";
import { buildKindComparisonSummary, buildAdherenceNarrative } from "../helpers.js";

export function generateCohortComparison(userEntries, currentWeek, cohortSnapshot, studyMeta) {
  const cohortAtWeek = cohortSnapshot?.by_week?.[String(currentWeek)] ?? cohortSnapshot?.by_week?.[currentWeek];

  if (!cohortAtWeek || cohortAtWeek.participant_count < MIN_COHORT_SIZE) {
    return { type: "KIND_COMPARISON", week: currentWeek, suppressed: true };
  }

  const endDate = userEntries.at(-1)?.date ?? studyMeta.start_date;
  const userAdherence = adherenceStats(userEntries, studyMeta.start_date, endDate);

  const adhPercentile = percentileRank(
    userAdherence.logging_pct,
    cohortAtWeek.logging_pct_distribution ?? []
  );

  const userWeekly = {};
  for (let w = 1; w <= currentWeek; w += 1) {
    userWeekly[w] = phaseStats(
      userEntries.filter((e) => e.study_week === w),
      "afternoon_energy"
    );
  }

  const trajectory = {};
  for (let w = 1; w <= currentWeek; w += 1) {
    const u = userWeekly[w]?.mean;
    const c = cohortSnapshot.weekly_energy?.[String(w)] ?? cohortSnapshot.weekly_energy?.[w];
    if (u === null || u === undefined || !c?.mean) {
      trajectory[w] = { status: "no_data" };
    } else {
      let relative = "average";
      if (u > c.p75) relative = "above_average";
      else if (u < c.p25) relative = "below_average";
      trajectory[w] = {
        user_mean: u,
        kind_community_mean: c.mean,
        kind_community_25th_percentile: c.p25,
        kind_community_75th_percentile: c.p75,
        relative
      };
    }
  }

  const activeUser = userEntries.filter(
    (e) => (e.phase === "INTERVENTION" || e.phase === "OPTIMISE") && e.valid_for_analysis
  );
  const ranked = rankRules(activeUser);
  const userTop = ranked.find((r) => r.status === "valid") ?? null;
  const communityTopRule = cohortSnapshot.top_rule_by_crash ?? null;
  const ruleMatch =
    userTop && communityTopRule && userTop.rule === communityTopRule;

  const currentWeekComparison = trajectory[currentWeek] ?? { status: "no_data" };

  return {
    type: "KIND_COMPARISON",
    reportTitle: "Kind comparison",
    explorationLabel: HEALTH_EXPLORATION_LABEL,
    week: currentWeek,
    kind_community_size: cohortAtWeek.participant_count,
    adherence_comparison: {
      your_logging_percentage: userAdherence.logging_pct,
      your_rule_adherence_percentage: userAdherence.rule_adherence_pct,
      logging_percentile: adhPercentile,
      narrative: buildAdherenceNarrative(adhPercentile)
    },
    outcome_comparison: {
      by_week: trajectory,
      current_week: currentWeekComparison
    },
    rule_comparison: {
      kind_community_top_rule: communityTopRule,
      kind_community_top_rule_label: communityTopRule ? RULE_LABELS[communityTopRule] : null,
      your_top_rule: userTop?.rule ?? null,
      your_top_rule_label: userTop ? RULE_LABELS[userTop.rule] : null,
      alignment: ruleMatch,
      kind_community_stacking:
        cohortSnapshot.stacking_effect_at_week?.[String(currentWeek)] ??
        cohortSnapshot.stacking_effect_at_week?.[currentWeek] ??
        null
    },
    summary: buildKindComparisonSummary(
      adhPercentile,
      currentWeekComparison,
      ruleMatch,
      userTop?.rule ?? null,
      communityTopRule
    )
  };
}

/** @deprecated Use generateCohortComparison — kept for internal imports */
export { generateCohortComparison as generateKindComparison };
