import {
  assignPhase,
  studyWeek,
  ONSET_ORDINAL,
  sleepQualityBand
} from "./constants.js";
import { parseDate, daysBetween } from "../shared/math.js";

function clampNumeric(value, min, max) {
  if (value === null || value === undefined || value === "") return null;
  const n = Number(value);
  if (Number.isNaN(n)) return null;
  if (n < min || n > max) return null;
  return n;
}

function parseActivities(raw) {
  if (raw === null || raw === undefined) return [];
  if (Array.isArray(raw)) return raw.map(String);
  if (typeof raw === "string" && raw.trim()) {
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed.map(String);
    } catch {
      return raw.split(",").map((s) => s.trim()).filter(Boolean);
    }
  }
  return [];
}

function parseOnset(raw) {
  if (raw === null || raw === undefined || raw === "") return null;
  if (typeof raw === "number" && raw >= 0 && raw <= 3) return raw;
  const key = String(raw).trim();
  return ONSET_ORDINAL[key] ?? null;
}

function deriveHabits(lastScreen, bedScreen, winddownMinutes, activities) {
  return {
    screen_free_60min:
      lastScreen === "60+ min before" ||
      (winddownMinutes !== null && winddownMinutes >= 60),
    no_screens_in_bed: bedScreen === "None",
    reading_winddown: activities.includes("Reading"),
    stretching_before_bed: activities.includes("Stretching")
  };
}

export function validateAndEnrichEntry(rawEntry, studyStartDate) {
  const date = parseDate(rawEntry.log_date ?? rawEntry.date);
  const studyDay = daysBetween(studyStartDate, date) + 1;
  const fieldValues = rawEntry.field_values ?? rawEntry;

  const lastScreen = fieldValues.ss_last ?? null;
  const bedScreen = fieldValues.ss_bed ?? null;
  const winddownMinutes = clampNumeric(fieldValues.ss_windup, 0, 90);
  const activities = parseActivities(fieldValues.ss_activities);
  const sleepOnsetOrdinal = parseOnset(fieldValues.ss_onset);
  const sleepQuality = clampNumeric(fieldValues.ss_sleep, 1, 10);
  const habits = deriveHabits(lastScreen, bedScreen, winddownMinutes, activities);

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
    last_screen: lastScreen,
    bed_screen: bedScreen,
    winddown_minutes: winddownMinutes,
    winddown_activities: activities,
    sleep_onset_ordinal: sleepOnsetOrdinal,
    sleep_quality: sleepQuality,
    sleep_quality_band: sleepQualityBand(sleepQuality),
    ...habits,
    valid_for_analysis: sleepQuality !== null
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

export function meanWinddownMinutes(entries) {
  const valid = entries.filter((e) => e.winddown_minutes !== null);
  if (!valid.length) return null;
  return valid.reduce((a, e) => a + e.winddown_minutes, 0) / valid.length;
}
