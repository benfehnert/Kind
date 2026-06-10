#!/usr/bin/env node
/**
 * Kind dev orchestrator.
 *
 * npm run dev              — start all 4 services
 * npm run dev:api          — start API only
 * npm run dev:mobile       — start mobile only
 * npm run dev:website      — start website only
 * npm run dev:db           — start Supabase only
 * npm run reset:db         — reset + reseed database, then exit
 */

import net from "node:net";
import { spawn, execSync } from "node:child_process";
import { createInterface } from "node:readline";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const DIRS = {
  api: path.join(ROOT, "apps/api"),
  mobile: path.join(ROOT, "apps/mobile"),
  website: path.join(ROOT, "apps/kind-website"),
  ad_prototype: path.join(ROOT, "apps/ad-prototype"),
};

const argv = process.argv.slice(2);
const serviceFlag = argv.includes("--service") ? argv[argv.indexOf("--service") + 1] : null;
const resetDb = argv.includes("--reset-db");

// ── reset-db shortcut ─────────────────────────────────────────────────────────

if (resetDb) {
  if (!(await isPortInUse(54321))) {
    console.error("Supabase is not running. Start it first with: npm run dev:db");
    process.exit(1);
  }
  try {
    execSync("npx supabase db reset", { stdio: "inherit", cwd: ROOT });
    execSync("node apps/api/scripts/seed-kind.mjs", { stdio: "inherit", cwd: ROOT });
  } catch {
    process.exit(1);
  }
  process.exit(0);
}

// ── Service definitions ────────────────────────────────────────────────────────

const R = "\x1b[0m";
const BOLD = "\x1b[1m";
const GREEN = "\x1b[32m";
const YELLOW = "\x1b[33m";
const C = { db: "\x1b[35m", api: "\x1b[36m", mobile: "\x1b[33m", website: "\x1b[32m", ad_prototype: "\x1b[34m" };

const DEFS = {
  db: {
    port: 54321,
    fixedPort: true,
    buildCmd: () => ({ cmd: "npx", args: ["supabase", "start"], cwd: ROOT }),
    displayUrls: [
      { label: "Supabase API", url: "http://localhost:54321" },
      { label: "DB Studio   ", url: "http://localhost:54323" },
    ],
  },
  api: {
    port: 4000,
    fixedPort: false,
    buildCmd: (port) => ({
      cmd: "npm",
      args: ["run", "dev"],
      cwd: DIRS.api,
      env: { ...process.env, PORT: String(port) },
    }),
    healthUrl: (port) => `http://localhost:${port}/health`,
    displayUrls: (port) => [{ label: "API         ", url: `http://localhost:${port}` }],
  },
  mobile: {
    port: 19006,
    fixedPort: false,
    buildCmd: () => ({
      cmd: "npx",
      args: ["expo", "start", "--web"],
      cwd: DIRS.mobile,
    }),
    // Expo SDK 53 (Metro web) prints its actual URL to stdout; parse it rather
    // than polling a fixed port which may differ across SDK versions.
    stdoutReady: /http:\/\/localhost:(\d+)/i,
    displayUrls: (port) => [{ label: "Mobile      ", url: `http://localhost:${port}` }],
  },
  website: {
    port: 3333,
    fixedPort: false,
    buildCmd: (port) => ({
      cmd: "npx",
      args: ["--yes", "serve", "-l", String(port), "--no-clipboard", "."],
      cwd: DIRS.website,
    }),
    displayUrls: (port) => [{ label: "Website     ", url: `http://localhost:${port}` }],
  },
  ad_prototype: {
    port: 3334,
    fixedPort: false,
    buildCmd: (port) => ({
      cmd: "npm",
      args: ["run", "dev", "--", "--port", String(port)],
      cwd: DIRS.ad_prototype,
    }),
    displayUrls: (port) => [{ label: "Ad Prototype", url: `http://localhost:${port}` }],
  },
};

// ── Helpers ───────────────────────────────────────────────────────────────────

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

async function nextFreePort(from) {
  let p = from;
  while (await isPortInUse(p)) p++;
  return p;
}

function ask(rl, prompt) {
  return new Promise((resolve) => rl.question(prompt, resolve));
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function waitForPort(port, timeout = 120000) {
  const end = Date.now() + timeout;
  while (Date.now() < end) {
    if (await isPortInUse(port)) return true;
    await sleep(600);
  }
  return false;
}

async function waitForHttp(url, timeout = 120000) {
  const end = Date.now() + timeout;
  while (Date.now() < end) {
    try {
      const r = await fetch(url);
      if (r.status < 500) return true;
    } catch {}
    await sleep(600);
  }
  return false;
}

// ── Resolve services and ports ────────────────────────────────────────────────

const VALID = Object.keys(DEFS);
if (serviceFlag && !VALID.includes(serviceFlag)) {
  console.error(`Unknown service "${serviceFlag}". Valid: ${VALID.join(", ")}`);
  process.exit(1);
}

const keys = serviceFlag ? [serviceFlag] : VALID;
const multiService = keys.length > 1;
const resolvedPorts = {};
const skipStart = new Set(); // already-running services: don't spawn, but show URLs

const rl = createInterface({ input: process.stdin, output: process.stdout });

for (const key of keys) {
  const def = DEFS[key];

  if (def.fixedPort) {
    resolvedPorts[key] = def.port;
    if (await isPortInUse(def.port)) {
      skipStart.add(key);
      console.log(`  ${C[key]}[${key}]${R} Already running on port ${def.port} — skipping start`);
    }
    continue;
  }

  if (await isPortInUse(def.port)) {
    console.log(`\n  ${YELLOW}⚠${R}  Port ${def.port} is already in use (${key}).`);
    const ans = await ask(
      rl,
      `     (1) Stop existing process and restart on port ${def.port}\n` +
      `     (2) Use the next available port\n` +
      `     Choice [1/2]: `
    );

    if (ans.trim() === "1") {
      try {
        execSync(`lsof -ti :${def.port} | xargs kill -9`, { stdio: "ignore" });
      } catch {}
      await sleep(600);
      resolvedPorts[key] = def.port;
    } else {
      resolvedPorts[key] = await nextFreePort(def.port + 1);
      console.log(`     → Using port ${resolvedPorts[key]}`);
    }
  } else {
    resolvedPorts[key] = def.port;
  }
}

rl.close();

// ── Spawn processes ───────────────────────────────────────────────────────────

const children = [];
let shuttingDown = false;

function shutdown(code = 0) {
  if (shuttingDown) return;
  shuttingDown = true;
  for (const child of children) {
    try { if (!child.killed) child.kill("SIGINT"); } catch {}
  }
  setTimeout(() => process.exit(code), 500);
}

process.on("SIGINT", () => shutdown(0));
process.on("SIGTERM", () => shutdown(0));

console.log("\nStarting services...\n");

const readyPromises = [];

for (const key of keys) {
  if (skipStart.has(key)) continue;

  const def = DEFS[key];
  const port = resolvedPorts[key];
  const { cmd, args, cwd, env } = def.buildCmd(port);
  const color = C[key];

  // Services with stdoutReady need piped output regardless of single/multi mode
  // so we can parse the URL Expo actually starts on.
  const needsPipe = multiService || !!def.stdoutReady;

  const child = spawn(cmd, args, {
    stdio: needsPipe ? ["ignore", "pipe", "pipe"] : "inherit",
    cwd,
    env: env ?? process.env,
  });

  if (needsPipe) {
    const prefix = multiService ? `${color}[${key}]${R} ` : "";
    const emit = (data) =>
      data.toString().split("\n").forEach((l) => { if (l.trim()) process.stdout.write(prefix + l + "\n"); });
    child.stdout.on("data", emit);
    child.stderr.on("data", emit);
  }

  child.on("exit", (code) => {
    if (!shuttingDown && code !== 0 && code !== null) {
      console.error(`\n${color}[${key}]${R} exited with code ${code}. Stopping all services.`);
      shutdown(code);
    }
  });

  children.push(child);

  // Queue health check
  let readyPromise;

  if (def.stdoutReady) {
    // Resolve when the process prints a matching URL, or after 60 s fallback.
    readyPromise = new Promise((resolve) => {
      const timeout = setTimeout(() => resolve(null), 60000);
      const scan = (data) => {
        const match = data.toString().match(def.stdoutReady);
        if (match) {
          clearTimeout(timeout);
          child.stdout.off("data", scan);
          child.stderr.off("data", scan);
          resolve(parseInt(match[1], 10));
        }
      };
      child.stdout.on("data", scan);
      child.stderr.on("data", scan);
    }).then((detectedPort) => {
      if (detectedPort) {
        resolvedPorts[key] = detectedPort;
        process.stdout.write(`  ${color}✓${R} ${key} ready\n`);
      } else {
        process.stdout.write(`  ${YELLOW}~${R} ${key} may still be starting\n`);
      }
    });
  } else {
    const healthCheck = def.healthUrl
      ? waitForHttp(def.healthUrl(port))
      : waitForPort(port);
    readyPromise = healthCheck.then((ok) => {
      if (ok) process.stdout.write(`  ${color}✓${R} ${key} ready\n`);
    });
  }

  readyPromises.push(readyPromise);
}

await Promise.all(readyPromises);

// ── URL summary box ───────────────────────────────────────────────────────────

const urlRows = [];
for (const key of keys) {
  const def = DEFS[key];
  const port = resolvedPorts[key];
  const urls = typeof def.displayUrls === "function" ? def.displayUrls(port) : def.displayUrls;
  for (const { label, url } of urls) {
    urlRows.push(`  ${label}  →  ${url}`);
  }
}

const inner = Math.max(...urlRows.map((r) => r.length));
const bar = "─".repeat(inner + 2);
const pad = (s) => s + " ".repeat(inner + 2 - s.length);

const title = "  Kind — local dev";
console.log(`\n${BOLD}┌${bar}┐`);
console.log(`│${pad(title)}│`);
console.log(`├${bar}┤`);
for (const row of urlRows) console.log(`│${pad(row)}│`);
console.log(`└${bar}┘${R}`);
console.log("  Ctrl+C to stop all services\n");
