import { PRIMARY_OUTCOME, SECONDARY_OUTCOMES, HEALTH_EXPLORATION_LABEL } from "../constants.js";
import { phaseStats, adherenceStats } from "../stats.js";
import { buildBaselineHeadline } from "../helpers.js";
import { meanWinddownMinutes } from "../normalize.js";
import { buildScreenSleepMobileViewForReport } from "./mobileView.js";

export function generateBaselineReport(baselineEntries, studyMeta, options = {}) {
  const endDate = studyMeta.baseline_end_date ?? studyMeta.endDate ?? baselineEntries.at(-1)?.date;
  const adherence = adherenceStats(baselineEntries, studyMeta.start_date, endDate);
  const primaryStats = phaseStats(baselineEntries, PRIMARY_OUTCOME);
  const secStats = Object.fromEntries(
    SECONDARY_OUTCOMES.map((o) => [o, phaseStats(baselineEntries, o)])
  );
  const sufficient = primaryStats.n >= 7;
  const winddownMean = meanWinddownMinutes(baselineEntries);

  const wk1 = phaseStats(baselineEntries.filter((e) => e.study_week === 1), PRIMARY_OUTCOME);
  const wk2 = phaseStats(baselineEntries.filter((e) => e.study_week === 2), PRIMARY_OUTCOME);

  const report = {
    type: "BASELINE_SUMMARY",
    reportTitle: "Baseline summary report",
    phaseLabel: "Baseline",
    explorationLabel: HEALTH_EXPLORATION_LABEL,
    generated: new Date().toISOString(),
    primary_baseline: primaryStats,
    sec_baselines: secStats,
    winddown_mean_minutes: winddownMean,
    week_1_sleep: wk1,
    week_2_sleep: wk2,
    adherence,
    data_sufficient: sufficient,
    quality_warnings: sufficient ? [] : ["Low Baseline logging — estimates may be imprecise"],
    headline: buildBaselineHeadline(primaryStats, winddownMean),
    phase_b_guidance:
      "Starting next week you enter the 30-min screen-free phase of your health exploration. Log your last screen use, in-bed screen time, wind-down activities, and sleep quality each morning."
  };

  return {
    ...report,
    mobileView: buildScreenSleepMobileViewForReport(report, {
      studyMeta,
      allEntries: options.allEntries ?? baselineEntries,
      isShort: options.isShort ?? false,
      cohortSnapshot: options.cohortSnapshot ?? null
    })
  };
}
