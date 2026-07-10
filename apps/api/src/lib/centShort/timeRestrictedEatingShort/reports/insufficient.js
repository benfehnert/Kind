import { generateInsufficientDataReport as generateCentInsufficientDataReport } from "../../../cent/timeRestrictedEating/reports/insufficient.js";

export function generateInsufficientDataReport(reportType, currentN, requiredN, currentEntries = [], options = {}) {
  return generateCentInsufficientDataReport(reportType, currentN, requiredN, currentEntries, { ...options, isShort: true });
}
