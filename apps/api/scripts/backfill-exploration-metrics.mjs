/**
 * Recompute streak_days and week_current on all user_explorations rows from
 * their daily_logs history.
 *
 * Usage:
 *   node apps/api/scripts/backfill-exploration-metrics.mjs           (dry-run)
 *   node apps/api/scripts/backfill-exploration-metrics.mjs --confirm (applies)
 */

import pg from "pg";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { config } from "dotenv";
import { isShortExploration } from "../src/lib/centShort/index.js";
import { computeExplorationStreak } from "../src/lib/explorationStreak.js";
import {
  maxStudyDayFromLogRows,
  weekCurrentFromMaxStudyDay
} from "../src/lib/explorationMetrics.js";

const __dir = dirname(fileURLToPath(import.meta.url));
config({ path: join(__dir, "../.env") });

const confirm = process.argv.includes("--confirm");

function metricsFromLogs({ explorationId, startedAt, weeksTotal, logRows }) {
  const isShort = isShortExploration(explorationId);
  const maxStudyDay = maxStudyDayFromLogRows(logRows, startedAt);
  const weekCurrent = weekCurrentFromMaxStudyDay(maxStudyDay, weeksTotal, isShort);
  const streakDays = computeExplorationStreak(logRows);
  return { maxStudyDay, weekCurrent, streakDays };
}

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error("DATABASE_URL is not set. Copy apps/api/.env.example → apps/api/.env and fill in values.");
    process.exit(1);
  }

  const client = new pg.Client({ connectionString });
  await client.connect();

  try {
    const { rows: runs } = await client.query(
      `SELECT ue.id, ue.individual_id, ue.exploration_id, ue.started_at,
              ue.weeks_total, ue.week_current, ue.streak_days
       FROM user_explorations ue
       ORDER BY ue.individual_id, ue.exploration_id`
    );

    console.log(`Found ${runs.length} user exploration runs.`);

    let changed = 0;
    for (const run of runs) {
      const { rows: logRows } = await client.query(
        `SELECT log_date FROM daily_logs
         WHERE individual_id = $1 AND exploration_id = $2
         ORDER BY log_date ASC`,
        [run.individual_id, run.exploration_id]
      );

      const { weekCurrent, streakDays } = metricsFromLogs({
        explorationId: run.exploration_id,
        startedAt: run.started_at,
        weeksTotal: run.weeks_total,
        logRows
      });

      const nextWeekCurrent = weekCurrent ?? run.week_current;
      const nextStreak = streakDays;

      if (nextWeekCurrent === run.week_current && nextStreak === run.streak_days) continue;

      changed += 1;
      console.log(
        `${run.exploration_id} (${run.id.slice(0, 8)}…): ` +
          `week ${run.week_current} → ${nextWeekCurrent}, ` +
          `streak ${run.streak_days} → ${nextStreak}`
      );

      if (confirm) {
        await client.query(
          `UPDATE user_explorations
           SET week_current = $1, streak_days = $2, updated_at = NOW()
           WHERE id = $3`,
          [nextWeekCurrent, nextStreak, run.id]
        );
      }
    }

    console.log(
      confirm
        ? `Updated ${changed} exploration run(s).`
        : `Would update ${changed} exploration run(s). Re-run with --confirm to apply.`
    );
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
