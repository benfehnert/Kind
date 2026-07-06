import { assignPhase, studyWeek, anxietyBand } from "./constants.js";
import { parseDate, daysBetween } from "../shared/math.js";

const PRACTICE_PATTERNS = {
  vagal_breathing: /vagal/i,
  pmr: /progressive muscle|pmr/i,
  nature_walk: /nature walk/i,
  meditation: /meditation|visuali/i
};

function clampNumeric(value, min, max) {
  if (value === null || value === undefined || value === "") return null;
  const n = Number(value);
  if (Number.isNaN(n)) return null;
  if (n < min || n > max) return null;
  return n;
}

function parsePractices(fieldValues) {
  const practicesArr = Array.isArray(fieldValues?.rp_practices) ? fieldValues.rp_practices : [];
  const result = {
    vagal_breathing: false,
    pmr: false,
    nature_walk: false,
    meditation: false
  };
  for (const label of practicesArr) {
    for (const [key, pattern] of Object.entries(PRACTICE_PATTERNS)) {
      if (pattern.test(String(label))) result[key] = true;
    }
  }
  return result;
}

export function validateAndEnrichEntry(rawEntry, studyStartDate) {
  const date = parseDate(rawEntry.log_date ?? rawEntry.date);
  const studyDay = daysBetween(studyStartDate, date) + 1;
  const fieldValues = rawEntry.field_values ?? rawEntry;

  const practices = parsePractices(fieldValues);
  const practiceCount = Object.values(practices).filter(Boolean).length;

  const stress = clampNumeric(fieldValues.rp_stress, 1, 10);
  const anxiety = clampNumeric(fieldValues.rp_anxiety, 1, 10);
  const composure = clampNumeric(fieldValues.rp_composure, 1, 10);

  let phase;
  try {
    phase = assignPhase(studyDay);
  } catch {
    phase = null;
  }

  return {
    date,
    study_day: studyDay,
    study_week: studyWeek(studyDay),
    phase,
    ...practices,
    practice_count: practiceCount,
    stress,
    anxiety,
    anxiety_band: anxietyBand(anxiety),
    composure,
    valid_for_analysis: composure !== null
  };
}

export function loadDayEntries(logs, studyStartDate) {
  const start = parseDate(studyStartDate);
  if (!start) return [];

  return logs
    .map((log) => validateAndEnrichEntry(log, start))
    .filter((e) => e.date && e.phase)
    .sort((a, b) => a.date.localeCompare(b.date));
}

export function logsFromFixture(fixture) {
  const studyStartDate = fixture.studyStartDate ?? fixture.started_at;
  const logs = (fixture.logs ?? []).map((row) =>
    row.field_values ? row : { log_date: row.date, field_values: row.field_values ?? row }
  );
  return loadDayEntries(logs, studyStartDate);
}

export function meanPracticeCount(entries) {
  const valid = entries.filter((e) => e.practice_count !== null);
  if (!valid.length) return null;
  return valid.reduce((a, e) => a + e.practice_count, 0) / valid.length;
}
