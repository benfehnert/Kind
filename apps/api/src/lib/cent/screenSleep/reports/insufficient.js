import { PRIMARY_OUTCOME } from "../constants.js";
import { phaseStats } from "../stats.js";
import { buildScreenSleepMobileViewForReport } from "./mobileView.js";

export function generateInsufficientDataReport(reportType, currentN, requiredN, currentEntries = [], options = {}) {
  const gap = requiredN - currentN;
  const descriptive = {};

  if (currentEntries.length) {
    descriptive.primary = phaseStats(currentEntries, PRIMARY_OUTCOME);
    descriptive.winddown_minutes = phaseStats(currentEntries, "winddown_minutes");
    descriptive.nights_logged = currentEntries.length;
  }

  const report = {
    type: "INSUFFICIENT_DATA",
    for_report: reportType,
    valid_days_logged: currentN,
    valid_days_needed: requiredN,
    days_gap: gap,
    message: `You have logged ${currentN} valid nights. ${requiredN} are needed for a reliable analysis. Log ${gap} more nights to unlock your full report.`,
    available_summary: descriptive
  };

  return {
    ...report,
    mobileView: buildScreenSleepMobileViewForReport(report, {
      studyMeta: options.studyMeta ?? {},
      allEntries: currentEntries,
      isShort: options.isShort ?? false,
      cohortSnapshot: options.cohortSnapshot ?? null
    })
  };
}
