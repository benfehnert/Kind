import {
  assignPhase,
  studyWeek,
  FIRST_MEAL_HOUR,
  LAST_MEAL_HOUR,
  hungerBand
} from "./constants.js";
import { parseDate, daysBetween } from "../shared/math.js";

function clampNumeric(value, min, max) {
  if (value === null || value === undefined || value === "") return null;
  const n = Number(value);
  if (Number.isNaN(n)) return null;
  if (n < min || n > max) return null;
  return n;
}

function mealHour(raw, map) {
  if (raw === null || raw === undefined || raw === "") return null;
  const key = String(raw).trim();
  return map[key] ?? null;
}

function deriveHabits(firstBucket, lastBucket, windowHours) {
  return {
    window_10h_or_less: windowHours !== null && windowHours <= 10,
    first_meal_around_8am:
      firstBucket === "7–8am" || firstBucket === "8–9am",
    last_meal_before_6pm:
      lastBucket === "Before 4pm" || lastBucket === "4–6pm"
  };
}

export function validateAndEnrichEntry(rawEntry, studyStartDate) {
  const date = parseDate(rawEntry.log_date ?? rawEntry.date);
  const studyDay = daysBetween(studyStartDate, date) + 1;
  const fieldValues = rawEntry.field_values ?? rawEntry;

  const firstBucket = fieldValues.te_first ?? null;
  const lastBucket = fieldValues.te_last ?? null;
  const firstMealHour = mealHour(firstBucket, FIRST_MEAL_HOUR);
  const lastMealHour = mealHour(lastBucket, LAST_MEAL_HOUR);
  const eatingWindowHours =
    firstMealHour !== null && lastMealHour !== null
      ? Math.round((lastMealHour - firstMealHour) * 10) / 10
      : null;

  const dailyEnergy = clampNumeric(fieldValues.te_energy, 0, 10);
  const hungerComfort = clampNumeric(fieldValues.te_hunger, 0, 10);
  const mood = clampNumeric(fieldValues.te_mood, 0, 10);
  const habits = deriveHabits(firstBucket, lastBucket, eatingWindowHours);

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
    first_meal_bucket: firstBucket,
    last_meal_bucket: lastBucket,
    first_meal_hour: firstMealHour,
    last_meal_hour: lastMealHour,
    eating_window_hours: eatingWindowHours,
    daily_energy: dailyEnergy,
    hunger_comfort: hungerComfort,
    hunger_band: hungerBand(hungerComfort),
    mood,
    ...habits,
    valid_for_analysis: dailyEnergy !== null
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

export function meanWindowHours(entries) {
  const valid = entries.filter((e) => e.eating_window_hours !== null);
  if (!valid.length) return null;
  return valid.reduce((a, e) => a + e.eating_window_hours, 0) / valid.length;
}
