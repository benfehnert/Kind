import { generateInterventionReport as generateCentInterventionReport } from "../../../cent/timeRestrictedEating/reports/intervention.js";

export function generateInterventionReport(baselineEntries, interventionEntries, studyMeta, options = {}) {
  return generateCentInterventionReport(baselineEntries, interventionEntries, studyMeta, { ...options, isShort: true });
}
