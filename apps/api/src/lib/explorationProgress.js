/** Calendar day number since exploration start (day 1 = start date). */
export function explorationDayCurrent(startedAt, now = new Date()) {
  if (!startedAt) return null;
  const start = new Date(startedAt);
  if (Number.isNaN(start.getTime())) return null;
  return Math.max(1, Math.floor((now - start) / (1000 * 60 * 60 * 24)) + 1);
}

export function explorationTotalDays(weeksTotal) {
  const weeks = Number(weeksTotal);
  if (!weeks) return null;
  return weeks * 7;
}

/** Progress as % of elapsed calendar days over total exploration length. */
export function computeExplorationProgress({ startedAt, weeksTotal, weekCurrent } = {}) {
  const totalDays = explorationTotalDays(weeksTotal);
  if (!totalDays) return 0;

  const dayCurrent =
    explorationDayCurrent(startedAt) ??
    (weekCurrent ? (Number(weekCurrent) - 1) * 7 + 1 : null);
  if (!dayCurrent) return 0;

  return Math.min(100, Math.round((dayCurrent / totalDays) * 100));
}
