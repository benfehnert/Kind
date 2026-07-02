/**
 * Additively seed the "Short" (alpha) explorations into a Kind database.
 *
 * The full seed script (seed-kind.mjs) wipes and rebuilds every table, which is
 * fine for local resets but unsafe for shared environments. This script only
 * upserts the short exploration catalog rows (and their children) so they become
 * available to start, without touching any existing data.
 *
 * Source of truth: apps/api/src/mocks/explorations.json
 *
 * Usage:
 *   node apps/api/scripts/seed-short-explorations.mjs [local|staging|production]
 *
 * Connection strings are read from apps/api/.env:
 *   local      → DATABASE_URL
 *   staging    → SUPABASE_DB_URL_STAGING
 *   production → SUPABASE_DB_URL_PRODUCTION
 */

import pg from "pg";
import { createRequire } from "module";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { config } from "dotenv";

const __dir = dirname(fileURLToPath(import.meta.url));
config({ path: join(__dir, "../.env") });

const require = createRequire(import.meta.url);
const explorations = require(join(__dir, "../src/mocks/explorations.json"));

const SHORT_EXPLORATION_IDS = [
  "morning-rules-short",
  "eating-short",
  "screen-sleep-short",
  "relaxation-short",
  "upf-mood-short"
];

/** field_key → home_sort_order per exploration (matches seed-kind.mjs) */
const HOME_METRIC_FIELDS = {
  "morning-rules-short": ["mr_pm_energy", "mr_rules", "mr_crash"],
  "eating-short": ["te_energy", "te_hunger"],
  "screen-sleep-short": ["ss_sleep", "ss_windup"],
  "relaxation-short": ["rp_stress", "rp_composure"],
  "upf-mood-short": ["upf_mood", "upf_energy"]
};

const FIELD_TYPE_MAP = { range: "range", select: "select", checks: "checks", number: "number" };

const TARGETS = {
  local: "DATABASE_URL",
  staging: "SUPABASE_DB_URL_STAGING",
  production: "SUPABASE_DB_URL_PRODUCTION"
};

function die(label, error) {
  console.error(`✗ ${label}:`, error?.message ?? error);
  process.exit(1);
}

async function seedExploration(client, id) {
  const e = explorations[id];
  if (!e) {
    console.warn(`  – skipping ${id}: not found in explorations.json`);
    return;
  }

  await client.query(
    `INSERT INTO explorations
       (id, title, icon, theme_bg, theme_text, duration_label, description,
        participant_count, is_new, catalog_active, status_badge,
        progress_percent, streak_days, chart_label)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
     ON CONFLICT (id) DO UPDATE SET
       title = EXCLUDED.title,
       icon = EXCLUDED.icon,
       theme_bg = EXCLUDED.theme_bg,
       theme_text = EXCLUDED.theme_text,
       duration_label = EXCLUDED.duration_label,
       description = EXCLUDED.description,
       is_new = EXCLUDED.is_new,
       catalog_active = EXCLUDED.catalog_active,
       status_badge = EXCLUDED.status_badge,
       progress_percent = EXCLUDED.progress_percent,
       streak_days = EXCLUDED.streak_days,
       chart_label = EXCLUDED.chart_label,
       updated_at = NOW()`,
    [
      id,
      e.title,
      e.icon,
      e.bg ?? null,
      e.text ?? null,
      e.duration,
      e.desc,
      e.participants ?? 0,
      e.isNew ?? false,
      e.active ?? false,
      null,
      null,
      null,
      null
    ]
  );

  for (const [i, p] of (e.phases ?? []).entries()) {
    await client.query(
      `INSERT INTO exploration_phases (exploration_id, sort_order, name, description, status)
       VALUES ($1,$2,$3,$4,$5)
       ON CONFLICT (exploration_id, sort_order) DO UPDATE SET
         name = EXCLUDED.name, description = EXCLUDED.description, status = EXCLUDED.status`,
      [id, i, p.name, p.desc, "upcoming"]
    );
  }

  for (const [i, o] of (e.outcomes ?? []).entries()) {
    await client.query(
      `INSERT INTO exploration_expected_outcomes (exploration_id, sort_order, icon, label)
       VALUES ($1,$2,$3,$4)
       ON CONFLICT (exploration_id, sort_order) DO UPDATE SET
         icon = EXCLUDED.icon, label = EXCLUDED.label`,
      [id, i, o.icon, o.label]
    );
  }

  const homeKeys = HOME_METRIC_FIELDS[id] ?? [];
  for (const [i, f] of (e.fields ?? []).entries()) {
    const homeIdx = homeKeys.indexOf(f.id);
    const defaultValue = f.val != null ? f.val : f.sel != null ? f.sel : null;
    await client.query(
      `INSERT INTO log_field_defs
         (exploration_id, field_key, field_type, label, sort_order, min_value, max_value,
          default_value, hints, options, allows_multiple, show_on_home, home_sort_order)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8::jsonb,$9::jsonb,$10::jsonb,$11,$12,$13)
       ON CONFLICT (exploration_id, field_key) DO UPDATE SET
         field_type = EXCLUDED.field_type, label = EXCLUDED.label, sort_order = EXCLUDED.sort_order,
         min_value = EXCLUDED.min_value, max_value = EXCLUDED.max_value,
         default_value = EXCLUDED.default_value, hints = EXCLUDED.hints, options = EXCLUDED.options,
         allows_multiple = EXCLUDED.allows_multiple, show_on_home = EXCLUDED.show_on_home,
         home_sort_order = EXCLUDED.home_sort_order`,
      [
        id,
        f.id,
        FIELD_TYPE_MAP[f.type] ?? "range",
        f.label,
        i,
        f.min ?? null,
        f.max ?? null,
        defaultValue != null ? JSON.stringify(defaultValue) : null,
        JSON.stringify(f.hints ?? []),
        JSON.stringify(f.opts ?? []),
        f.multi ?? false,
        homeIdx >= 0,
        homeIdx >= 0 ? homeIdx : null
      ]
    );
  }

  // Link the researcher listed in the mock, if that researcher exists.
  if (e.researcherId) {
    await client.query(
      `INSERT INTO researcher_explorations (researcher_id, exploration_id)
       SELECT $1, $2 WHERE EXISTS (SELECT 1 FROM researchers WHERE id = $1)
       ON CONFLICT (researcher_id, exploration_id) DO NOTHING`,
      [e.researcherId, id]
    );
  }

  console.log(`  ✓ ${id}`);
}

async function main() {
  const target = (process.argv[2] ?? "local").toLowerCase();
  const envKey = TARGETS[target];
  if (!envKey) die("target", `unknown target "${target}" (use local|staging|production)`);

  const connectionString = process.env[envKey];
  if (!connectionString) die("config", `${envKey} is not set in apps/api/.env`);

  const client = new pg.Client({
    connectionString,
    ssl: target === "local" ? false : { rejectUnauthorized: false }
  });

  console.log(`Seeding short explorations → ${target}`);
  await client.connect().catch((err) => die("connect", err));

  try {
    await client.query("BEGIN");
    for (const id of SHORT_EXPLORATION_IDS) {
      await seedExploration(client, id);
    }
    await client.query("COMMIT");
  } catch (err) {
    await client.query("ROLLBACK").catch(() => {});
    die("seed", err);
  } finally {
    await client.end();
  }

  console.log("Done. Short explorations are available to start.");
}

main();
