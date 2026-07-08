/** Calendar day number since exploration start (day 1 = start date). */
export function explorationDayCurrent(startedAt, now = new Date()) {
  if (!startedAt) return null;
  const start = new Date(startedAt);
  if (Number.isNaN(start.getTime())) return null;
  return Math.max(1, Math.floor((now - start) / (1000 * 60 * 60 * 24)) + 1);
}

/**
 * Total exploration length in days. Short (alpha) explorations already store
 * their day-count directly in `weeksTotal` (1 logged day = 1 compressed
 * week), so it's returned as-is; full-length explorations are week-based.
 */
export function explorationTotalDays(weeksTotal, isShort = false) {
  const weeks = Number(weeksTotal);
  if (!weeks) return null;
  return isShort ? weeks : weeks * 7;
}

/** Progress as % of elapsed days over total exploration length. */
export function computeExplorationProgress({ startedAt, weeksTotal, weekCurrent, isShort = false } = {}) {
  const totalDays = explorationTotalDays(weeksTotal, isShort);
  if (!totalDays) return 0;

  const dayCurrent = isShort
    ? Number(weekCurrent) || 0
    : explorationDayCurrent(startedAt) ??
      (weekCurrent ? (Number(weekCurrent) - 1) * 7 + 1 : null);
  if (!dayCurrent) return 0;

  return Math.min(100, Math.round((dayCurrent / totalDays) * 100));
}

/**
 * Recompute phase statuses (complete/active/upcoming) from the individual's
 * current week/day, mirroring the server-side logic used to highlight the
 * active phase on the Exploration tab.
 */
export function computeUserPhaseStatuses(phases, weekCurrent, weeksTotal) {
  if (!phases?.length) return [];
  if (!weekCurrent || !weeksTotal) {
    return phases.map((p) => ({ ...p, status: p.status || "upcoming" }));
  }

  const activePhaseIdx = Math.min(
    Math.floor(((weekCurrent - 1) / weeksTotal) * phases.length),
    phases.length - 1
  );
  return phases.map((p, i) => ({
    ...p,
    status: i < activePhaseIdx ? "complete" : i === activePhaseIdx ? "active" : "upcoming"
  }));
}
