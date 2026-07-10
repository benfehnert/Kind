import { generateBaselineReport as generateCentBaselineReport } from "../../../cent/timeRestrictedEating/reports/baseline.js";

export function generateBaselineReport(baselineEntries, studyMeta, options = {}) {
  return generateCentBaselineReport(baselineEntries, studyMeta, { ...options, isShort: true });
}
