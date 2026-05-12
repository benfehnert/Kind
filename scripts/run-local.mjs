#!/usr/bin/env node

import { spawn } from 'node:child_process';

const includeWebsite = process.argv.includes('--with-website');
const children = [];
let shuttingDown = false;

function start(name, command, args) {
  const child = spawn(command, args, {
    stdio: 'inherit',
    shell: true,
    env: process.env
  });

  child.on('exit', (code) => {
    if (!shuttingDown && code !== 0) {
      console.error(`${name} exited with code ${code}. Stopping local stack.`);
      shutdown(code || 1);
    }
  });

  children.push(child);
}

function shutdown(exitCode = 0) {
  shuttingDown = true;
  for (const child of children) {
    if (!child.killed) {
      child.kill('SIGINT');
    }
  }
  process.exit(exitCode);
}

process.on('SIGINT', () => shutdown(0));
process.on('SIGTERM', () => shutdown(0));

console.log('Starting local services...');
console.log('- API: npm --prefix apps/api run dev');
console.log('- Mobile web: npm --prefix apps/mobile run web');
if (includeWebsite) {
  console.log('- Website: npm --prefix apps/kind-website run serve');
}

start('API', 'npm', ['--prefix', 'apps/api', 'run', 'dev']);
start('Mobile', 'npm', ['--prefix', 'apps/mobile', 'run', 'web']);
if (includeWebsite) {
  start('Website', 'npm', ['--prefix', 'apps/kind-website', 'run', 'serve']);
}