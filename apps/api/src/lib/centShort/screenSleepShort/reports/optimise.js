import { generateOptimiseReport as generateCentOptimiseReport } from "../../../cent/screenSleep/reports/optimise.js";

export function generateOptimiseReport(allEntries, optimiseEntries, interventionEntries, studyMeta, options = {}) {
  return generateCentOptimiseReport(allEntries, optimiseEntries, interventionEntries, studyMeta, { ...options, isShort: true });
}
