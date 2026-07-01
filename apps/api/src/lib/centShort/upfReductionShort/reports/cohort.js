import { MIN_COHORT_SIZE, HABIT_LABELS, HEALTH_EXPLORATION_LABEL } from "../constants.js";
import { phaseStats, adherenceStats, rankHabits, percentileRank } from "../stats.js";
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
      "daily_mood"
    );
  }

  const trajectory = {};
  for (let w = 1; w <= currentWeek; w += 1) {
    const u = userWeekly[w]?.mean;
    const c = cohortSnapshot.weekly_mood?.[String(w)] ?? cohortSnapshot.weekly_mood?.[w];
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
    (e) => (e.phase === "INTERVENTION" || e.phase === "OPTIMISE" || e.phase === "OUTPUT") && e.valid_for_analysis
  );
  const ranked = rankHabits(activeUser);
  const userTop = ranked.find((r) => r.status === "valid") ?? null;
  const communityTopHabit = cohortSnapshot.top_habit_by_mood ?? null;
  const habitMatch = userTop && communityTopHabit && userTop.habit === communityTopHabit;

  const currentWeekComparison = trajectory[currentWeek] ?? { status: "no_data" };

  return {
    type: "KIND_COMPARISON",
    reportTitle: "Kind comparison",
    explorationLabel: HEALTH_EXPLORATION_LABEL,
    week: currentWeek,
    kind_community_size: cohortAtWeek.participant_count,
    adherence_comparison: {
      your_logging_percentage: userAdherence.logging_pct,
      your_upf_adherence_percentage: userAdherence.intervention_adherence_pct,
      logging_percentile: adhPercentile,
      narrative: buildAdherenceNarrative(adhPercentile)
    },
    outcome_comparison: {
      by_week: trajectory,
      current_week: currentWeekComparison
    },
    habit_comparison: {
      kind_community_top_habit: communityTopHabit,
      kind_community_top_habit_label: communityTopHabit ? HABIT_LABELS[communityTopHabit] : null,
      your_top_habit: userTop?.habit ?? null,
      your_top_habit_label: userTop ? HABIT_LABELS[userTop.habit] : null,
      alignment: habitMatch,
      kind_community_stacking:
        cohortSnapshot.stacking_effect_at_week?.[String(currentWeek)] ??
        cohortSnapshot.stacking_effect_at_week?.[currentWeek] ??
        null
    },
    summary: buildKindComparisonSummary(
      adhPercentile,
      currentWeekComparison,
      habitMatch,
      userTop?.habit ?? null,
      communityTopHabit
    )
  };
}

export { generateCohortComparison as generateKindComparison };
