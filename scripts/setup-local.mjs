#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';

const args = new Set(process.argv.slice(2));
const skipInstall = args.has('--skip-install');
const skipDb = args.has('--skip-db');
const skipMigrate = args.has('--skip-migrate');

function run(command, options = {}) {
  execSync(command, { stdio: 'inherit', ...options });
}

function ensureApiEnv() {
  const envFile = path.resolve('apps/api/.env');
  const envExampleFile = path.resolve('apps/api/.env.example');

  if (fs.existsSync(envFile)) {
    return;
  }

  if (!fs.existsSync(envExampleFile)) {
    throw new Error('apps/api/.env.example was not found.');
  }

  fs.copyFileSync(envExampleFile, envFile);
  console.log('Created apps/api/.env from apps/api/.env.example');
}

try {
  console.log('Starting local setup...');

  if (!skipInstall) {
    console.log('\nInstalling app dependencies...');
    run('npm --prefix apps/api install');
    run('npm --prefix apps/mobile install');
    run('npm --prefix apps/kind-website install');
  }

  ensureApiEnv();

  if (!skipDb) {
    console.log('\nStarting PostgreSQL via Docker Compose...');
    run('docker compose up -d');
  }

  if (!skipMigrate) {
    console.log('\nRunning API migrations...');
    run('npm --prefix apps/api run migrate');
  }

  console.log('\nLocal setup complete.');
  console.log('Run "npm run run:local" to start API + mobile web.');
} catch (error) {
  console.error('\nLocal setup failed.');
  console.error(error.message || error);
  process.exit(1);
}