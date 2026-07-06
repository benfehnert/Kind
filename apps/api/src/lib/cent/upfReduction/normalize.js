import { assignPhase, studyWeek, SWAP_OPTS } from "./constants.js";
import { parseDate, daysBetween } from "../shared/math.js";

function clampNumeric(value, min, max) {
  if (value === null || value === undefined || value === "") return null;
  const n = Number(value);
  if (Number.isNaN(n)) return null;
  if (n < min || n > max) return null;
  return n;
}

function parseSwaps(rawSwaps) {
  const swaps = Array.isArray(rawSwaps) ? rawSwaps.map(String) : [];
  const result = {
    breakfast_swap: false,
    lunch_swap: false,
    dinner_swap: false,
    snack_swap: false
  };
  for (const [habitKey, optLabel] of Object.entries(SWAP_OPTS)) {
    result[habitKey] = swaps.some((s) => s.trim().toLowerCase() === optLabel.toLowerCase());
  }
  return result;
}

export function validateAndEnrichEntry(rawEntry, studyStartDate) {
  const date = parseDate(rawEntry.log_date ?? rawEntry.date);
  const studyDay = daysBetween(studyStartDate, date) + 1;
  const fieldValues = rawEntry.field_values ?? rawEntry;

  const dailyMood = clampNumeric(fieldValues.upf_mood, 0, 10);
  const upfPct = clampNumeric(fieldValues.upf_pct, 0, 100);
  const upfEnergy = clampNumeric(fieldValues.upf_energy, 0, 10);
  const swaps = parseSwaps(fieldValues.upf_swaps);

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
    daily_mood: dailyMood,
    upf_pct: upfPct,
    upf_energy: upfEnergy,
    ...swaps,
    valid_for_analysis: dailyMood !== null
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

export function meanUpfPct(entries) {
  const valid = entries.filter((e) => e.upf_pct !== null);
  if (!valid.length) return null;
  return valid.reduce((a, e) => a + e.upf_pct, 0) / valid.length;
}
