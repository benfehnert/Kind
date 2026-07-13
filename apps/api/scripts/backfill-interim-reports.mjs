/**
 * Regenerate stored Short exploration interim reports from current daily_logs.
 *
 * Usage:
 *   node apps/api/scripts/backfill-interim-reports.mjs           (dry-run)
 *   node apps/api/scripts/backfill-interim-reports.mjs --confirm (applies)
 */

import pg from "pg";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { config } from "dotenv";
import { isShortExploration } from "../src/lib/centShort/index.js";
import { syncShortExplorationUpdates } from "../src/lib/userExplorationUpdatesShort.js";

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
    const { rows: targets } = await client.query(
      `SELECT DISTINCT ue.individual_id, ue.exploration_id
       FROM user_explorations ue
       WHERE ue.exploration_id LIKE '%-short'
       ORDER BY ue.individual_id, ue.exploration_id`
    );

    console.log(`Found ${targets.length} short exploration run(s) to refresh.`);

    let refreshed = 0;
    for (const target of targets) {
      if (!isShortExploration(target.exploration_id)) continue;

      const { rows: beforeRows } = await client.query(
        `SELECT report_content->'mobileView'->'tiles' AS tiles
         FROM user_exploration_updates
         WHERE individual_id = $1
           AND exploration_id = $2
           AND update_key = 'cent:INTERVENTION_INTERIM'`,
        [target.individual_id, target.exploration_id]
      );
      const beforeTiles = beforeRows[0]?.tiles ?? null;

      if (!confirm) {
        console.log(
          `${target.exploration_id} (${target.individual_id.slice(0, 8)}…): ` +
            `would refresh interim report${beforeTiles ? ` (${JSON.stringify(beforeTiles).slice(0, 80)}…)` : " (none stored)"}`
        );
        refreshed += 1;
        continue;
      }

      await syncShortExplorationUpdates(target.individual_id, target.exploration_id);

      const { rows: afterRows } = await client.query(
        `SELECT report_content->'mobileView'->'tiles' AS tiles
         FROM user_exploration_updates
         WHERE individual_id = $1
           AND exploration_id = $2
           AND update_key = 'cent:INTERVENTION_INTERIM'`,
        [target.individual_id, target.exploration_id]
      );
      const afterTiles = afterRows[0]?.tiles ?? null;

      refreshed += 1;
      console.log(
        `${target.exploration_id} (${target.individual_id.slice(0, 8)}…): ` +
          `interim tiles ${beforeTiles ? "updated" : "created"} → ${JSON.stringify(afterTiles)?.slice(0, 120) ?? "none"}`
      );
    }

    console.log(
      confirm
        ? `Refreshed ${refreshed} short exploration run(s).`
        : `Would refresh ${refreshed} short exploration run(s). Re-run with --confirm to apply.`
    );
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
