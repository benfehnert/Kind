import { generateInsufficientDataReport as generateCentInsufficientDataReport } from "../../../cent/screenSleep/reports/insufficient.js";

export function generateInsufficientDataReport(reportType, currentN, requiredN, currentEntries = [], options = {}) {
  return generateCentInsufficientDataReport(reportType, currentN, requiredN, currentEntries, { ...options, isShort: true });
}
