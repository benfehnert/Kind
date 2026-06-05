#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import net from "node:net";
import { execSync } from "node:child_process";

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

function check(label, fn) {
  try {
    fn();
    console.log(`[PASS] ${label}`);
  } catch (error) {
    console.error(`[FAIL] ${label}`);
    console.error(`       ${error.message || error}`);
    process.exitCode = 1;
  }
}

async function checkAsync(label, fn) {
  try {
    await fn();
    console.log(`[PASS] ${label}`);
  } catch (error) {
    console.error(`[FAIL] ${label}`);
    console.error(`       ${error.message || error}`);
    process.exitCode = 1;
  }
}

function run(cmd) {
  execSync(cmd, { stdio: "ignore" });
}

check("Node.js is available", () => run("node --version"));
check("npm is available", () => run("npm --version"));

check("API dependencies installed", () => {
  if (!fs.existsSync(path.resolve("apps/api/node_modules"))) {
    throw new Error("Missing apps/api/node_modules. Run: npm run setup");
  }
});

check("Mobile dependencies installed", () => {
  if (!fs.existsSync(path.resolve("apps/mobile/node_modules"))) {
    throw new Error("Missing apps/mobile/node_modules. Run: npm run setup");
  }
});

check("API env file exists", () => {
  if (!fs.existsSync(path.resolve("apps/api/.env"))) {
    throw new Error("Missing apps/api/.env. Run: npm run setup");
  }
});

await checkAsync("Supabase is running", async () => {
  const running = await isPortInUse(54321);
  if (!running) {
    throw new Error("Supabase not reachable on port 54321. Run: npm run dev:db");
  }
});

if (process.exitCode) {
  console.error("\nLocal validation failed.");
  process.exit(process.exitCode);
}

console.log("\nLocal validation passed.");
