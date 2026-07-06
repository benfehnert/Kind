import { assignPhase, studyWeek } from "./constants.js";

const RULE_PATTERNS = {
  sunlight: /sunlight/i,
  stretching: /stretch/i,
  caffeine_offset: /caffeine/i,
  meditation: /meditation/i
};

const CRASH_MAP = {
  none: 0,
  "mild dip": 1,
  "noticeable crash": 2,
  "severe crash": 3
};

function parseDate(value) {
  if (!value) return null;
  if (typeof value === "string") return value.slice(0, 10);
  return new Date(value).toISOString().slice(0, 10);
}

function daysBetween(startDate, endDate) {
  const start = new Date(`${startDate}T00:00:00Z`);
  const end = new Date(`${endDate}T00:00:00Z`);
  return Math.round((end - start) / (1000 * 60 * 60 * 24));
}

function clampNumeric(value, min, max) {
  if (value === null || value === undefined || value === "") return null;
  const n = Number(value);
  if (Number.isNaN(n)) return null;
  if (n < min || n > max) return null;
  return n;
}

function parseCrashSeverity(raw) {
  if (raw === null || raw === undefined || raw === "") return null;
  const key = String(raw).trim().toLowerCase();
  if (key in CRASH_MAP) return CRASH_MAP[key];
  return null;
}

function parseRules(fieldValues) {
  const rulesArr = Array.isArray(fieldValues?.mr_rules) ? fieldValues.mr_rules : [];
  const result = {
    sunlight: false,
    stretching: false,
    caffeine_offset: false,
    meditation: false
  };
  for (const label of rulesArr) {
    for (const [key, pattern] of Object.entries(RULE_PATTERNS)) {
      if (pattern.test(String(label))) result[key] = true;
    }
  }
  return result;
}

export function validateAndEnrichEntry(rawEntry, studyStartDate) {
  const date = parseDate(rawEntry.log_date ?? rawEntry.date);
  const studyDay = daysBetween(studyStartDate, date) + 1;
  const fieldValues = rawEntry.field_values ?? rawEntry;

  const rules = parseRules(fieldValues);
  const ruleCount = Object.values(rules).filter(Boolean).length;

  const morningEnergy = clampNumeric(fieldValues.mr_am_energy, 0, 10);
  const afternoonEnergy = clampNumeric(fieldValues.mr_pm_energy, 0, 10);
  const afternoonFocus = clampNumeric(fieldValues.mr_focus, 0, 10);
  const afternoonCrashSeverity = parseCrashSeverity(fieldValues.mr_crash);

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
    ...rules,
    rule_count: ruleCount,
    morning_energy: morningEnergy,
    afternoon_energy: afternoonEnergy,
    afternoon_focus: afternoonFocus,
    afternoon_crash_severity: afternoonCrashSeverity,
    valid_for_analysis: afternoonCrashSeverity !== null
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
