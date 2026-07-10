import { generateBaselineReport as generateCentBaselineReport } from "../../../cent/screenSleep/reports/baseline.js";

export function generateBaselineReport(baselineEntries, studyMeta, options = {}) {
  return generateCentBaselineReport(baselineEntries, studyMeta, { ...options, isShort: true });
}
