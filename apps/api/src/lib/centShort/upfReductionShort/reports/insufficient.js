import { generateInsufficientDataReport as generateCentInsufficientDataReport } from "../../../cent/upfReduction/reports/insufficient.js";

export function generateInsufficientDataReport(reportType, currentN, requiredN, currentEntries = [], options = {}) {
  return generateCentInsufficientDataReport(reportType, currentN, requiredN, currentEntries, { ...options, isShort: true });
}
