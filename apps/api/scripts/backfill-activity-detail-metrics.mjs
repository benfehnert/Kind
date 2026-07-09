/**
 * Backfill `detail_metrics` on existing activity_posts rows that predate the
 * full-breakdown feature (or were created before the range-unit formatting
 * fix), by recomputing it from the matching daily_logs entry.
 *
 * For each activity_posts row, finds the daily_logs row with the same
 * individual_id + exploration_id + log_date (posted_at::date), then
 * regenerates detail_metrics via the same formatFullLogDetail() used for
 * new logs. Rows with no matching daily_logs entry (seeded demo posts) are
 * skipped — those get their detail from the seed script instead.
 *
 * Usage:
 *   node apps/api/scripts/backfill-activity-detail-metrics.mjs           (dry-run)
 *   node apps/api/scripts/backfill-activity-detail-metrics.mjs --confirm (applies)
 */

import pg from "pg";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { config } from "dotenv";
import { formatFullLogDetail } from "../src/lib/logDetailFormat.js";

const __dir = dirname(fileURLToPath(import.meta.url));
config({ path: join(__dir, "../.env") });

const confirm = process.argv.includes("--confirm");

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error("DATABASE_URL is not set. Copy apps/api/.env.example → apps/api/.env and fill in values.");
    process.exit(1);
  }

  const client = new pg.Client({ connectionString });
  await client.connect();

  try {
    // Both log_date and posted_at (set via NOW() in recordActivityFromLog) are
    // computed relative to UTC on the write path, so match them in UTC here
    // too rather than relying on the DB session's timezone setting.
    const { rows: candidates } = await client.query(
      `SELECT ap.id, ap.exploration_id, ap.detail_metrics AS current_detail, dl.field_values
       FROM activity_posts ap
       JOIN daily_logs dl
         ON dl.individual_id = ap.individual_id
        AND dl.exploration_id = ap.exploration_id
        AND dl.log_date = (ap.posted_at AT TIME ZONE 'UTC')::date
       WHERE ap.exploration_id IS NOT NULL`
    );

    console.log(`Found ${candidates.length} activity posts with a matching daily log.`);

    const fieldDefsByExploration = new Map();
    async function fieldsFor(explorationId) {
      if (fieldDefsByExploration.has(explorationId)) return fieldDefsByExploration.get(explorationId);
      const { rows } = await client.query(
        `SELECT field_key AS id, field_type::text AS type, label,
                min_value AS min, max_value AS max, unit, options AS opts
         FROM log_field_defs
         WHERE exploration_id = $1
         ORDER BY sort_order`,
        [explorationId]
      );
      fieldDefsByExploration.set(explorationId, rows);
      return rows;
    }

    let changed = 0;
    let unchanged = 0;
    let emptyResult = 0;

    for (const row of candidates) {
      const fields = await fieldsFor(row.exploration_id);
      const detailMetrics = formatFullLogDetail(fields, row.field_values) || null;

      if (!detailMetrics) {
        emptyResult += 1;
        continue;
      }
      if (detailMetrics === row.current_detail) {
        unchanged += 1;
        continue;
      }

      changed += 1;
      if (confirm) {
        await client.query(`UPDATE activity_posts SET detail_metrics = $1 WHERE id = $2`, [
          detailMetrics,
          row.id
        ]);
      } else {
        console.log(`  would update ${row.id}: ${JSON.stringify(row.current_detail)} → ${JSON.stringify(detailMetrics)}`);
      }
    }

    console.log(
      `\n${confirm ? "Updated" : "Would update"} ${changed} row(s). ${unchanged} already up to date. ${emptyResult} had no fields to format.`
    );
    if (!confirm) {
      console.log("Dry-run only — no changes made. Pass --confirm to apply.");
    }
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error("Backfill failed:", err?.message ?? err);
  process.exit(1);
});
