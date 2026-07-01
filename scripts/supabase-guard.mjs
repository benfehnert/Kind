#!/usr/bin/env node
/**
 * Guards `npm run supabase:*` scripts against running against the wrong
 * Supabase project. staging/main are expected to be linked to the matching
 * remote project; if the current link doesn't match, this relinks
 * automatically before the underlying supabase command runs.
 *
 * Other branches (e.g. dev) have no remote project of their own, so the
 * check is skipped there — local/linked state is left as whatever the
 * developer last set up.
 */

import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const BRANCH_ENV_KEY = { staging: "STAGING", main: "PRODUCTION" };

function loadEnvFile(relPath) {
  try {
    const content = fs.readFileSync(path.join(ROOT, relPath), "utf8");
    for (const line of content.split("\n")) {
      const match = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
      if (match && !process.env[match[1]]) process.env[match[1]] = match[2];
    }
  } catch {
    /* .env optional */
  }
}

function currentBranch() {
  return execSync("git rev-parse --abbrev-ref HEAD", { encoding: "utf8" }).trim();
}

function linkedProjectRef() {
  try {
    return fs.readFileSync(path.join(ROOT, "supabase/.temp/project-ref"), "utf8").trim();
  } catch {
    return null;
  }
}

function dbPassword(dbUrl) {
  const match = dbUrl?.match(/:\/\/[^:]+:([^@]+)@/);
  return match?.[1] ?? null;
}

function main() {
  const branch = currentBranch();
  const envKey = BRANCH_ENV_KEY[branch];
  if (!envKey) return; // no remote project tied to this branch — nothing to guard

  loadEnvFile("apps/api/.env");

  const expectedRef = process.env[`SUPABASE_PROJECT_REF_${envKey}`];
  if (!expectedRef) {
    console.error(
      `\nERROR: SUPABASE_PROJECT_REF_${envKey} is not set in apps/api/.env.\n` +
        `Set it to the ${envKey.toLowerCase()} project ref before running supabase:* commands on '${branch}'.`
    );
    process.exit(1);
  }

  const currentRef = linkedProjectRef();
  if (currentRef === expectedRef) {
    console.log(`✓ Supabase linked to ${envKey.toLowerCase()} (${expectedRef}), matching branch '${branch}'.`);
    return;
  }

  console.log(
    `Branch '${branch}' expects Supabase project ${expectedRef} (${envKey.toLowerCase()}), ` +
      `but linked project is ${currentRef ?? "none"}. Relinking...`
  );

  const password = dbPassword(process.env[`SUPABASE_DB_URL_${envKey}`]);
  const passwordArg = password ? ` --password "${password}"` : "";
  try {
    execSync(`npx supabase link --project-ref ${expectedRef}${passwordArg} --yes`, {
      stdio: "inherit",
      cwd: ROOT,
    });
  } catch {
    console.error("\nERROR: Failed to relink Supabase project. Run manually:");
    console.error(`  npx supabase link --project-ref ${expectedRef}`);
    process.exit(1);
  }
}

main();
