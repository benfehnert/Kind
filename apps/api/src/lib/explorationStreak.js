import { parseDate } from "./centShort/shared/math.js";

/** Count consecutive calendar days ending on anchorDate (inclusive). */
export function consecutiveDaysEndingOnDate(logDates, anchorDate) {
  const dates = new Set(
    (logDates ?? []).map((d) => parseDate(d)).filter(Boolean)
  );
  const anchor = parseDate(anchorDate);
  if (!dates.size || !anchor) return 0;

  let streak = 0;
  const cursor = new Date(`${anchor}T00:00:00Z`);
  while (dates.has(cursor.toISOString().slice(0, 10))) {
    streak += 1;
    cursor.setUTCDate(cursor.getUTCDate() - 1);
  }
  return streak;
}

/** Streak ending on the most recent log date (not requiring today to be logged). */
export function computeExplorationStreak(logRows) {
  if (!logRows?.length) return 0;
  const dates = logRows
    .map((row) => row.log_date ?? row.date)
    .filter(Boolean)
    .sort();
  const anchor = dates.at(-1);
  return consecutiveDaysEndingOnDate(dates, anchor);
}
