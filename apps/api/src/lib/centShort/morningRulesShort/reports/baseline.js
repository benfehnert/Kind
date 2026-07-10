import { generateBaselineReport as generateCentBaselineReport } from "../../../cent/morningRules/reports/baseline.js";

export function generateBaselineReport(baselineEntries, studyMeta, options = {}) {
  return generateCentBaselineReport(baselineEntries, studyMeta, { ...options, isShort: true });
}
