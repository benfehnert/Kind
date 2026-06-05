#!/usr/bin/env node

import { execSync } from 'node:child_process';
import readline from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
// Load apps/api/.env so SUPABASE_PROJECT_REF_* vars are available without
// requiring devs to export them in their shell profile.
try {
  const { default: dotenv } = await import('dotenv');
  dotenv.config({ path: path.join(ROOT, 'apps/api/.env') });
} catch { /* dotenv optional */ }

const target = process.argv[2];
const dryRun = process.argv.includes('--dry-run');

const releaseMap = {
  staging: { from: 'dev', to: 'staging' },
  main: { from: 'staging', to: 'main' }
};

function exec(command, stdio = 'pipe') {
  return execSync(command, {
    stdio,
    encoding: 'utf8'
  });
}

function run(command) {
  exec(command, 'inherit');
}

function text(command) {
  return (exec(command, 'pipe') || '').toString().trim();
}

function fail(message) {
  console.error(`\nERROR: ${message}`);
  process.exit(1);
}

function hasConflicts() {
  const conflicts = text('git diff --name-only --diff-filter=U');
  return conflicts.length > 0;
}

function ensureCleanTree() {
  const status = text('git status --porcelain');
  if (status) {
    fail('Working tree is not clean. Commit, stash, or discard changes before release.');
  }
}

function ensureRemoteBranch(remote, branch) {
  const matches = text(`git ls-remote --heads ${remote} ${branch}`);
  if (!matches) {
    fail(`Branch ${branch} was not found on ${remote}.`);
  }
}

function localBranchExists(branch) {
  try {
    exec(`git show-ref --verify --quiet refs/heads/${branch}`);
    return true;
  } catch {
    return false;
  }
}

function checkoutAndSync(remote, branch) {
  if (localBranchExists(branch)) {
    run(`git checkout ${branch}`);
  } else {
    run(`git checkout -b ${branch} --track ${remote}/${branch}`);
  }

  run(`git pull --ff-only ${remote} ${branch}`);
}

async function pushMigrations(target) {
  const env = target === "main" ? "PRODUCTION" : "STAGING";
  const ref = process.env[`SUPABASE_PROJECT_REF_${env}`];
  const password = process.env[`SUPABASE_DB_PASSWORD_${env}`];

  console.log(`\nPushing DB migrations to ${env.toLowerCase()}...`);
  try {
    if (ref && password) {
      run(`npx supabase link --project-ref ${ref} --password ${password}`);
    }
    run("npx supabase db push");
    console.log(`  ✓  Migrations pushed`);
  } catch {
    console.warn(`  ⚠  Could not push migrations automatically.`);
    console.warn(`     Run manually: npx supabase link --project-ref <ref> && npx supabase db push`);
  }
}

async function confirm(promptText) {
  const rl = readline.createInterface({ input, output });
  try {
    const answer = (await rl.question(`${promptText} Type "yes" to continue: `)).trim().toLowerCase();
    return answer === 'yes';
  } finally {
    rl.close();
  }
}

async function main() {
  if (!releaseMap[target]) {
    fail('Usage: node scripts/release.mjs <staging|main> [--dry-run]');
  }

  const { from, to } = releaseMap[target];
  const remote = 'origin';

  ensureCleanTree();

  console.log(`Preparing release: ${from} -> ${to}`);
  console.log(`Remote: ${remote}`);

  run(`git fetch ${remote} --prune`);
  ensureRemoteBranch(remote, from);
  ensureRemoteBranch(remote, to);

  checkoutAndSync(remote, from);
  checkoutAndSync(remote, to);

  console.log(`\nMerging ${from} into ${to}...`);
  try {
    run(`git merge --quiet ${from}`);
  } catch {
    if (hasConflicts()) {
      console.error('\nMerge conflict detected.');
      console.error(`Resolve conflicts manually, then run:`);
      console.error(`  git add <resolved-files>`);
      console.error(`  git commit`);
      console.error(`  git push ${remote} ${to}`);
      process.exit(1);
    }
    throw new Error('Merge failed for an unknown reason.');
  }

  if (dryRun) {
    console.log('\nDry run enabled. Merge complete, push skipped.');
    return;
  }

  const okToPush = await confirm(`\nAbout to push ${to} to ${remote}.`);
  if (!okToPush) {
    console.log('Push canceled by user. Local merge remains on current branch.');
    return;
  }

  run(`git push ${remote} ${to}`);
  await pushMigrations(target);
  console.log(`\nRelease complete: ${from} -> ${to} pushed to ${remote}.`);
}

main().catch((error) => {
  fail(error.message || String(error));
});