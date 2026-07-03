/**
 * Remove real development signups while keeping Anna and seeded demo community profiles.
 *
 * Usage:
 *   node apps/api/scripts/purge-dev-users.mjs [local|staging|production|all] [--confirm]
 *
 * Defaults to dry-run (prints what would be deleted). Pass --confirm to execute.
 *
 * Connection strings from apps/api/.env:
 *   local      → DATABASE_URL
 *   staging    → SUPABASE_DB_URL_STAGING
 *   production → SUPABASE_DB_URL_PRODUCTION
 */

import pg from "pg";
import { createClient } from "@supabase/supabase-js";
import { createRequire } from "module";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { config } from "dotenv";
import {
  ANNA_DEMO_EMAIL,
  ANNA_DEMO_SLUG,
  DEMO_INDIVIDUAL_SLUGS
} from "./lib/demoAllowlist.mjs";

const __dir = dirname(fileURLToPath(import.meta.url));
config({ path: join(__dir, "../.env") });
const require = createRequire(import.meta.url);
const community = require(join(__dir, "../src/mocks/community.json"));

const ANNA_DEMO_PASSWORD = "demo1234";

const TARGETS = {
  local: "DATABASE_URL",
  staging: "SUPABASE_DB_URL_STAGING",
  production: "SUPABASE_DB_URL_PRODUCTION"
};

const AUTH_ENV = {
  local: { url: "SUPABASE_URL", key: "SUPABASE_SERVICE_ROLE_KEY" },
  staging: { url: "SUPABASE_URL_STAGING", key: "SUPABASE_SERVICE_ROLE_KEY_STAGING" },
  production: { url: "SUPABASE_URL_PRODUCTION", key: "SUPABASE_SERVICE_ROLE_KEY_PRODUCTION" }
};

function die(label, error) {
  console.error(`✗ ${label}:`, error?.message ?? error);
  process.exit(1);
}

function parseArgs(argv) {
  const flags = argv.filter((a) => a.startsWith("--"));
  const positional = argv.filter((a) => !a.startsWith("--"));
  const target = (positional[0] ?? "").toLowerCase();
  const confirm = flags.includes("--confirm");
  return { target, dryRun: !confirm };
}

function demoIndividualRows() {
  const rows = [];

  for (const [slug, u] of Object.entries(community.commUsers ?? {})) {
    rows.push({
      slug,
      display_name: u.name,
      location: u.loc ?? null,
      avatar_image_id: u.img ?? null,
      avatar_initials: u.initials,
      bio: u.bio ?? null,
      profile_meta: u.meta ?? null
    });
  }

  for (const u of community.basicUsers ?? []) {
    rows.push({
      slug: u.id,
      display_name: u.name,
      location: u.loc ?? null,
      avatar_image_id: u.img ?? null,
      avatar_initials: u.initials,
      bio: null,
      profile_meta: u.meta ?? null
    });
  }

  for (const u of community.followerOnly ?? []) {
    rows.push({
      slug: u.id,
      display_name: u.name,
      location: u.loc ?? null,
      avatar_image_id: u.img ?? null,
      avatar_initials: u.initials,
      bio: null,
      profile_meta: u.meta ?? null
    });
  }

  return rows;
}

async function seedMissingDemoProfiles(client) {
  const rows = demoIndividualRows();
  let inserted = 0;

  for (const row of rows) {
    const { rowCount } = await client.query(
      `INSERT INTO individuals
         (slug, display_name, location, avatar_image_id, avatar_initials, bio, profile_meta)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT (slug) DO NOTHING`,
      [
        row.slug,
        row.display_name,
        row.location,
        row.avatar_image_id,
        row.avatar_initials,
        row.bio,
        row.profile_meta
      ]
    );
    inserted += rowCount ?? 0;
  }

  return inserted;
}

async function ensureAnnaDemoAuth(client, target) {
  const { rows } = await client.query(
    `SELECT id, auth_user_id FROM individuals WHERE slug = $1 LIMIT 1`,
    [ANNA_DEMO_SLUG]
  );
  if (!rows.length) {
    console.warn("  ⚠ Anna individual row not found — skipping auth repair");
    return;
  }
  if (rows[0].auth_user_id) return;

  const authEnv = AUTH_ENV[target];
  const supabaseUrl = process.env[authEnv.url];
  const serviceKey = process.env[authEnv.key];
  if (!supabaseUrl || !serviceKey) {
    console.warn(
      `  ⚠ Anna auth is unlinked and ${authEnv.url}/${authEnv.key} are not set — recreate auth manually`
    );
    return;
  }

  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false }
  });

  const { data: listData } = await supabase.auth.admin.listUsers();
  let authUserId = listData?.users?.find((u) => u.email === ANNA_DEMO_EMAIL)?.id;

  if (!authUserId) {
    const { data: created, error } = await supabase.auth.admin.createUser({
      email: ANNA_DEMO_EMAIL,
      password: ANNA_DEMO_PASSWORD,
      email_confirm: true
    });
    if (error) die("create Anna auth user", error);
    authUserId = created.user.id;
    console.log("  ✓ Anna auth user recreated");
  }

  await client.query(
    `UPDATE individuals
     SET auth_user_id = $1, email = $2
     WHERE slug = $3`,
    [authUserId, ANNA_DEMO_EMAIL, ANNA_DEMO_SLUG]
  );
  console.log("  ✓ Anna auth_user_id linked");
}

async function purgeEnvironment(target, dryRun) {
  const envKey = TARGETS[target];
  if (!envKey) die("target", `unknown target "${target}" (use local|staging|production|all)`);

  const connectionString = process.env[envKey];
  if (!connectionString) {
    console.warn(`⚠  Skipping ${target} — ${envKey} is not set in apps/api/.env`);
    return;
  }

  const client = new pg.Client({
    connectionString,
    ssl: target === "local" ? false : { rejectUnauthorized: false }
  });

  console.log(`\n${"=".repeat(60)}`);
  console.log(`Purge dev users → ${target}${dryRun ? " (dry-run)" : ""}`);
  console.log(`${"=".repeat(60)}`);
  console.log(`Keeping ${DEMO_INDIVIDUAL_SLUGS.length} demo slugs (Anna + community fixtures)`);

  await client.connect().catch((err) => die("connect", err));

  try {
    const { rows: toDelete } = await client.query(
      `SELECT slug, email, auth_user_id
       FROM individuals
       WHERE NOT (slug = ANY($1::text[]))
       ORDER BY slug`,
      [DEMO_INDIVIDUAL_SLUGS]
    );

    const { rows: orphanAuthPreview } = await client.query(
      `SELECT id, email
       FROM auth.users
       WHERE email IS DISTINCT FROM $1
         AND id NOT IN (
           SELECT auth_user_id FROM individuals WHERE auth_user_id IS NOT NULL
         )
       ORDER BY email`,
      [ANNA_DEMO_EMAIL]
    );

    const { rows: nullFeedPreview } = await client.query(
      `SELECT COUNT(*)::int AS count FROM feed_items WHERE actor_individual_id IS NULL`
    );

    console.log(`\nIndividuals to delete: ${toDelete.length}`);
    for (const row of toDelete) {
      console.log(`  - ${row.slug}${row.email ? ` (${row.email})` : ""}`);
    }

    console.log(`\nAuth users to delete (after individual purge): ${orphanAuthPreview.length}`);
    for (const row of orphanAuthPreview) {
      console.log(`  - ${row.email ?? row.id}`);
    }

    console.log(`\nFeed items with null actor to delete: ${nullFeedPreview[0]?.count ?? 0}`);

    const { rows: keepCount } = await client.query(
      `SELECT COUNT(*)::int AS count FROM individuals WHERE slug = ANY($1::text[])`,
      [DEMO_INDIVIDUAL_SLUGS]
    );
    console.log(`\nDemo profiles that will remain: ${keepCount[0]?.count ?? 0}`);

    if (dryRun) {
      console.log("\nDry-run only — no changes made. Pass --confirm to execute.");
      return;
    }

    if (target === "production") {
      console.log("\n*** PRODUCTION PURGE ***");
      console.log(`Deleting ${toDelete.length} individuals and ${orphanAuthPreview.length} auth users.`);
    }

    await client.query("BEGIN");

    const { rowCount: deletedIndividuals } = await client.query(
      `DELETE FROM individuals WHERE NOT (slug = ANY($1::text[]))`,
      [DEMO_INDIVIDUAL_SLUGS]
    );

    const { rowCount: deletedAuth } = await client.query(
      `DELETE FROM auth.users
       WHERE email IS DISTINCT FROM $1
         AND id NOT IN (
           SELECT auth_user_id FROM individuals WHERE auth_user_id IS NOT NULL
         )`,
      [ANNA_DEMO_EMAIL]
    );

    // Re-link Anna auth if the demo account exists but lost its auth_user_id.
    await client.query(
      `UPDATE individuals i
       SET auth_user_id = u.id
       FROM auth.users u
       WHERE i.slug = $1
         AND u.email = $2
         AND i.auth_user_id IS DISTINCT FROM u.id`,
      [ANNA_DEMO_SLUG, ANNA_DEMO_EMAIL]
    );

    const { rowCount: deletedFeed } = await client.query(
      `DELETE FROM feed_items WHERE actor_individual_id IS NULL`
    );

    await client.query(
      `UPDATE privacy_settings
       SET visible_in_community = false
       WHERE individual_id = (SELECT id FROM individuals WHERE slug = $1 LIMIT 1)`,
      [ANNA_DEMO_SLUG]
    );

    await client.query("COMMIT");

    const seeded = await seedMissingDemoProfiles(client);
    if (seeded > 0) {
      console.log(`  Seeded ${seeded} missing demo community profiles`);
    }

    await ensureAnnaDemoAuth(client, target);

    const { rows: remaining } = await client.query(
      `SELECT COUNT(*)::int AS count FROM individuals WHERE slug = ANY($1::text[])`,
      [DEMO_INDIVIDUAL_SLUGS]
    );

    console.log("\n✓ Purge complete");
    console.log(`  Deleted individuals: ${deletedIndividuals}`);
    console.log(`  Deleted auth users: ${deletedAuth}`);
    console.log(`  Deleted orphaned feed items: ${deletedFeed}`);
    console.log(`  Demo profiles remaining: ${remaining[0]?.count ?? 0}`);
    console.log(`  Anna hidden from community (visible_in_community = false)`);
  } catch (err) {
    await client.query("ROLLBACK").catch(() => {});
    die("purge", err);
  } finally {
    await client.end();
  }
}

async function main() {
  const { target, dryRun } = parseArgs(process.argv.slice(2));

  if (!target) {
    console.error("Usage: node apps/api/scripts/purge-dev-users.mjs [local|staging|production|all] [--confirm]");
    process.exit(1);
  }

  if (target === "all") {
    for (const env of ["local", "staging", "production"]) {
      try {
        await purgeEnvironment(env, dryRun);
      } catch (err) {
        console.error(`✗ ${env} failed:`, err?.message ?? err);
      }
    }
    return;
  }

  if (!TARGETS[target]) {
    die("target", `unknown target "${target}" (use local|staging|production|all)`);
  }

  await purgeEnvironment(target, dryRun);
}

main().catch((err) => die("fatal", err));
