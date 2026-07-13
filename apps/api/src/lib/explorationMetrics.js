import { query } from "../db.js";
import { daysBetween, parseDate } from "./centShort/shared/math.js";
import { isShortExploration } from "./centShort/index.js";
import { computeExplorationStreak } from "./explorationStreak.js";

export function shouldMarkExplorationComplete({ weekCurrent, weeksTotal, status } = {}) {
  if (status === "complete") return false;
  const total = Number(weeksTotal);
  const current = Number(weekCurrent);
  return total > 0 && current >= total;
}

export async function markUserExplorationComplete(individualId, explorationId) {
  const { rows } = await query(
    `UPDATE user_explorations SET
       status = 'complete',
       completed_at = COALESCE(completed_at, CURRENT_DATE),
       week_current = weeks_total,
       is_active = FALSE,
       updated_at = NOW()
     WHERE individual_id = $1 AND exploration_id = $2 AND status != 'complete'
     RETURNING exploration_id`,
    [individualId, explorationId]
  );
  if (!rows.length) return false;

  await query(
    `UPDATE exploration_consents SET is_active = FALSE, updated_at = NOW()
     WHERE individual_id = $1 AND exploration_id = $2`,
    [individualId, explorationId]
  );
  return true;
}

/** Max study day from raw log dates, independent of cent phase filtering. */
export function maxStudyDayFromLogRows(logRows, startedAt) {
  const start = parseDate(startedAt);
  if (!start || !logRows?.length) return 0;

  return Math.max(
    0,
    ...logRows.map((row) => {
      const logDate = parseDate(row.log_date ?? row.date);
      if (!logDate) return 0;
      return daysBetween(start, logDate) + 1;
    })
  );
}

/** Map max study day to week_current for short (days) or full (weeks) explorations. */
export function weekCurrentFromMaxStudyDay(maxStudyDay, weeksTotal, isShort = false) {
  if (!maxStudyDay || !weeksTotal) return null;
  const current = isShort ? maxStudyDay : Math.max(1, Math.ceil(maxStudyDay / 7));
  return Math.min(Number(weeksTotal), current);
}

/** Recompute streak_days and week_current from daily_logs for one exploration run. */
export async function updateUserExplorationMetrics(individualId, explorationId) {
  const { rows: ueRows } = await query(
    `SELECT id, started_at, weeks_total, status::text AS status FROM user_explorations
     WHERE individual_id = $1 AND exploration_id = $2`,
    [individualId, explorationId]
  );
  const ue = ueRows[0];
  if (!ue) return { newlyCompleted: false };

  const { rows: logRows } = await query(
    `SELECT log_date FROM daily_logs
     WHERE individual_id = $1 AND exploration_id = $2
     ORDER BY log_date ASC`,
    [individualId, explorationId]
  );

  const isShort = isShortExploration(explorationId);
  const maxStudyDay = maxStudyDayFromLogRows(logRows, ue.started_at);
  const weekCurrent = weekCurrentFromMaxStudyDay(maxStudyDay, ue.weeks_total, isShort);
  const streakDays = computeExplorationStreak(logRows);

  if (weekCurrent != null && maxStudyDay > 0) {
    await query(
      `UPDATE user_explorations
       SET week_current = $1, streak_days = $2, updated_at = NOW()
       WHERE id = $3`,
      [weekCurrent, streakDays, ue.id]
    );
  } else {
    await query(
      `UPDATE user_explorations SET streak_days = $1, updated_at = NOW() WHERE id = $2`,
      [streakDays, ue.id]
    );
  }

  const newlyCompleted = shouldMarkExplorationComplete({
    weekCurrent,
    weeksTotal: ue.weeks_total,
    status: ue.status
  })
    ? await markUserExplorationComplete(individualId, explorationId)
    : false;

  return { newlyCompleted };
}
