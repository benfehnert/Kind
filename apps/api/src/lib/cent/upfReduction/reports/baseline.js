import { PRIMARY_OUTCOME, SECONDARY_OUTCOMES, HEALTH_EXPLORATION_LABEL } from "../constants.js";
import { phaseStats, adherenceStats } from "../stats.js";
import { buildBaselineHeadline } from "../helpers.js";
import { meanUpfPct } from "../normalize.js";

export function generateBaselineReport(baselineEntries, studyMeta) {
  const endDate = studyMeta.baseline_end_date ?? studyMeta.endDate ?? baselineEntries.at(-1)?.date;
  const adherence = adherenceStats(baselineEntries, studyMeta.start_date, endDate);
  const primaryStats = phaseStats(baselineEntries, PRIMARY_OUTCOME);
  const secStats = Object.fromEntries(
    SECONDARY_OUTCOMES.map((o) => [o, phaseStats(baselineEntries, o)])
  );
  const sufficient = primaryStats.n >= 7;
  const upfMean = meanUpfPct(baselineEntries);

  const wk1 = phaseStats(baselineEntries.filter((e) => e.study_week === 1), PRIMARY_OUTCOME);
  const wk2 = phaseStats(baselineEntries.filter((e) => e.study_week === 2), PRIMARY_OUTCOME);

  return {
    type: "BASELINE_SUMMARY",
    reportTitle: "Baseline summary report",
    phaseLabel: "Baseline",
    explorationLabel: HEALTH_EXPLORATION_LABEL,
    generated: new Date().toISOString(),
    primary_baseline: primaryStats,
    sec_baselines: secStats,
    upf_pct_mean: upfMean,
    week_1_mood: wk1,
    week_2_mood: wk2,
    adherence,
    data_sufficient: sufficient,
    quality_warnings: sufficient ? [] : ["Low Baseline logging — estimates may be imprecise"],
    headline: buildBaselineHeadline(primaryStats, upfMean),
    phase_b_guidance:
      "Starting next week you enter the gradual reduction phase of your health exploration. Log your estimated UPF %, daily mood, energy, and any whole-food swaps each day."
  };
}
