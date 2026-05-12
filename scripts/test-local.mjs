#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';

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

function run(command) {
  execSync(command, { stdio: 'ignore' });
}

check('Node.js is available', () => run('node --version'));
check('npm is available', () => run('npm --version'));

check('API dependencies installed', () => {
  const p = path.resolve('apps/api/node_modules');
  if (!fs.existsSync(p)) {
    throw new Error('Missing apps/api/node_modules. Run npm run setup:local');
  }
});

check('Mobile dependencies installed', () => {
  const p = path.resolve('apps/mobile/node_modules');
  if (!fs.existsSync(p)) {
    throw new Error('Missing apps/mobile/node_modules. Run npm run setup:local');
  }
});

check('API env file exists', () => {
  const p = path.resolve('apps/api/.env');
  if (!fs.existsSync(p)) {
    throw new Error('Missing apps/api/.env. Run npm run setup:local');
  }
});

check('Docker Compose project is reachable', () => run('docker compose ps'));

if (process.exitCode) {
  console.error('\nLocal validation failed.');
  process.exit(process.exitCode);
}

console.log('\nLocal validation passed.');