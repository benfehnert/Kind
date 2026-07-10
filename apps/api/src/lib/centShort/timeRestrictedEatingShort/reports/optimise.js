import { generateOptimiseReport as generateCentOptimiseReport } from "../../../cent/timeRestrictedEating/reports/optimise.js";

export function generateOptimiseReport(allEntries, optimiseEntries, interventionEntries, studyMeta, options = {}) {
  return generateCentOptimiseReport(allEntries, optimiseEntries, interventionEntries, studyMeta, { ...options, isShort: true });
}
