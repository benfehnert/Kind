import { generateFinalReport as generateCentFinalReport } from "../../../cent/timeRestrictedEating/reports/final.js";

export function generateFinalReport(allEntries, studyMeta, cohortSnapshot = null, options = {}) {
  return generateCentFinalReport(allEntries, studyMeta, cohortSnapshot, { ...options, isShort: true });
}
