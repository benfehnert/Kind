#!/usr/bin/env node
/**
 * Renders docs/kind-data-model-print.html to PDF and copies to ~/Downloads.
 * Usage: node docs/scripts/generate-kind-data-model-pdf.mjs
 */
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { homedir } from 'node:os';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '../..');
const htmlPath = path.join(repoRoot, 'docs/kind-data-model-print.html');
const outInRepo = path.join(repoRoot, 'docs/kind-data-model.pdf');
const outDownloads = path.join(homedir(), 'Downloads', 'kind-data-model.pdf');

function run(cmd, args, opts = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, { stdio: 'inherit', shell: false, ...opts });
    child.on('error', reject);
    child.on('close', (code) => (code === 0 ? resolve() : reject(new Error(`${cmd} exited ${code}`))));
  });
}

async function main() {
  if (!fs.existsSync(htmlPath)) {
    console.error('Missing:', htmlPath);
    process.exit(1);
  }

  const script = `
const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');
(async () => {
  const htmlPath = ${JSON.stringify(htmlPath)};
  const outPath = ${JSON.stringify(outInRepo)};
  const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
  const page = await browser.newPage();
  await page.goto('file://' + htmlPath, { waitUntil: 'networkidle0', timeout: 60000 });
  await page.waitForFunction(() => document.body.getAttribute('data-mermaid-ready') === '1', { timeout: 45000 });
  await page.pdf({
    path: outPath,
    format: 'A4',
    printBackground: true,
    margin: { top: '16mm', right: '14mm', bottom: '16mm', left: '14mm' }
  });
  await browser.close();
  console.log('Wrote', outPath);
})().catch((e) => { console.error(e); process.exit(1); });
`;

  const tmpDir = path.join(repoRoot, 'docs/.pdf-gen-tmp');
  fs.mkdirSync(tmpDir, { recursive: true });
  const tmpPkg = path.join(tmpDir, 'package.json');
  if (!fs.existsSync(tmpPkg)) {
    fs.writeFileSync(tmpPkg, JSON.stringify({ name: 'kind-pdf-gen', private: true, type: 'commonjs' }, null, 2));
  }

  console.log('Installing puppeteer (one-time)...');
  await run('npm', ['install', 'puppeteer@24', '--prefix', tmpDir], { cwd: repoRoot });

  const runner = path.join(tmpDir, 'run-pdf.cjs');
  fs.writeFileSync(runner, script);
  process.env.NODE_PATH = path.join(tmpDir, 'node_modules');
  await run('node', [runner], { cwd: tmpDir, env: { ...process.env, NODE_PATH: path.join(tmpDir, 'node_modules') } });

  fs.copyFileSync(outInRepo, outDownloads);
  console.log('Copied to', outDownloads);
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
