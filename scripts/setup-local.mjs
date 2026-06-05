#!/usr/bin/env node
/**
 * Kind local setup.
 *
 * npm run setup
 *
 * Installs dependencies, creates .env files, starts Supabase, resets the
 * database, and seeds demo data. Safe to re-run — each step is idempotent.
 *
 * Flags:
 *   --skip-install   Skip npm install for all apps
 */

import fs from "node:fs";
import path from "node:path";
import net from "node:net";
import { execSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const args = new Set(process.argv.slice(2));

// ── Output helpers ─────────────────────────────────────────────────────────────

const R = "\x1b[0m";
const BOLD = "\x1b[1m";
const GREEN = "\x1b[32m";
const YELLOW = "\x1b[33m";
const RED = "\x1b[31m";

function step(label) {
  console.log(`\n${BOLD}${label}${R}`);
}

function ok(msg) {
  console.log(`  ${GREEN}✓${R}  ${msg}`);
}

function warn(msg) {
  console.log(`  ${YELLOW}⚠${R}  ${msg}`);
}

function fail(msg) {
  console.error(`  ${RED}✗${R}  ${msg}`);
}

function run(cmd, opts = {}) {
  execSync(cmd, { stdio: "inherit", cwd: ROOT, ...opts });
}

// ── Port probe ────────────────────────────────────────────────────────────────

function isPortInUse(port) {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    socket.setTimeout(500);
    socket.once("connect", () => { socket.destroy(); resolve(true); });
    socket.once("error", () => { socket.destroy(); resolve(false); });
    socket.once("timeout", () => { socket.destroy(); resolve(false); });
    socket.connect(port, "127.0.0.1");
  });
}

// ── 1. Prerequisite check ─────────────────────────────────────────────────────

step("Checking prerequisites...");

function checkCmd(cmd, label, hint) {
  try {
    execSync(cmd, { stdio: "ignore" });
    ok(label);
  } catch {
    fail(`${label} not found. ${hint}`);
    process.exit(1);
  }
}

checkCmd("node --version", "Node.js");
checkCmd("npm --version", "npm");
checkCmd(
  "npx supabase --version",
  "Supabase CLI",
  "Install with: npm install -g supabase"
);

// ── 2. Install dependencies ───────────────────────────────────────────────────

if (!args.has("--skip-install")) {
  step("Installing dependencies...");
  run("npm --prefix apps/api install");
  ok("apps/api");
  run("npm --prefix apps/mobile install");
  ok("apps/mobile");
  run("npm --prefix apps/kind-website install");
  ok("apps/kind-website");
}

// ── 3. Create .env files ──────────────────────────────────────────────────────

step("Setting up environment files...");

function ensureEnv(exampleRel, destRel) {
  const src = path.resolve(ROOT, exampleRel);
  const dest = path.resolve(ROOT, destRel);
  if (fs.existsSync(dest)) {
    ok(`${destRel} already exists`);
    return;
  }
  if (!fs.existsSync(src)) {
    warn(`${exampleRel} not found — skipping`);
    return;
  }
  fs.copyFileSync(src, dest);
  ok(`Created ${destRel}`);
}

ensureEnv("apps/api/.env.example", "apps/api/.env");
ensureEnv("apps/mobile/.env.example", "apps/mobile/.env");

// ── 4. Start Supabase ─────────────────────────────────────────────────────────

step("Starting Supabase...");

if (await isPortInUse(54321)) {
  ok("Supabase already running");
} else {
  run("npx supabase start");
  ok("Supabase started");
}

// ── 5. Auto-populate API .env with Supabase keys ──────────────────────────────

step("Configuring API environment...");

try {
  const status = execSync("npx supabase status", { encoding: "utf8", cwd: ROOT });

  const anonKey = status.match(/anon key:\s*(\S+)/i)?.[1];
  const serviceKey = status.match(/service_role key:\s*(\S+)/i)?.[1];
  const apiUrl = status.match(/API URL:\s*(\S+)/i)?.[1];

  const envPath = path.resolve(ROOT, "apps/api/.env");
  let env = fs.readFileSync(envPath, "utf8");

  if (apiUrl) {
    env = env.replace(/^SUPABASE_URL=.*/m, `SUPABASE_URL=${apiUrl}`);
    ok(`SUPABASE_URL  →  ${apiUrl}`);
  }
  if (anonKey) {
    env = env.replace(/^SUPABASE_ANON_KEY=.*/m, `SUPABASE_ANON_KEY=${anonKey}`);
    ok(`SUPABASE_ANON_KEY  →  ${anonKey.slice(0, 24)}…`);
  }
  if (serviceKey) {
    env = env.replace(/^SUPABASE_SERVICE_ROLE_KEY=.*/m, `SUPABASE_SERVICE_ROLE_KEY=${serviceKey}`);
    ok(`SUPABASE_SERVICE_ROLE_KEY  →  ${serviceKey.slice(0, 24)}…`);
  }

  fs.writeFileSync(envPath, env, "utf8");
} catch (e) {
  warn(`Could not auto-populate Supabase keys: ${e.message}`);
  warn("Update apps/api/.env manually — run: npx supabase status");
}

// ── 6. Reset DB + seed ────────────────────────────────────────────────────────

step("Resetting database...");
run("npx supabase db reset");
ok("Schema applied");

step("Seeding demo data...");
run("node apps/api/scripts/seed-kind.mjs");
ok("Demo data loaded");

// ── Done ──────────────────────────────────────────────────────────────────────

console.log(`
${BOLD}${GREEN}
┌──────────────────────────────────────────────────────┐
│  Setup complete!                                      │
├──────────────────────────────────────────────────────┤
│  DB Studio    →  http://localhost:54323               │
│  Demo login   →  anna@kind.example  /  demo1234      │
│                                                      │
│  Next:  npm run dev                                  │
└──────────────────────────────────────────────────────┘${R}
`);
