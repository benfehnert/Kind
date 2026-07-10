import { generateBaselineReport as generateCentBaselineReport } from "../../../cent/relaxationPractices/reports/baseline.js";

export function generateBaselineReport(baselineEntries, studyMeta, options = {}) {
  return generateCentBaselineReport(baselineEntries, studyMeta, { ...options, isShort: true });
}
