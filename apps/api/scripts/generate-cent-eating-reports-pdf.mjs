#!/usr/bin/env node
import { readFileSync, writeFileSync, mkdirSync, copyFileSync, existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { homedir } from "node:os";
import { spawn } from "node:child_process";
import {
  logsFromFixture,
  buildStudyMeta,
  analyzeTimeRestrictedEating
} from "../src/lib/cent/timeRestrictedEating/index.js";
import { applyThemeToReportHtml } from "../src/lib/explorationThemes.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "../../..");

function run(cmd, args, opts = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, { stdio: "inherit", shell: false, ...opts });
    child.on("error", reject);
    child.on("close", (code) => (code === 0 ? resolve() : reject(new Error(`${cmd} exited ${code}`))));
  });
}

async function main() {
  const fixture = JSON.parse(
    readFileSync(path.join(__dirname, "../src/data/fixtures/anna-eating-completion.json"), "utf8")
  );
  const cohort = JSON.parse(
    readFileSync(path.join(__dirname, "../src/data/fixtures/cohort-snapshot-eating.json"), "utf8")
  );
  const entries = logsFromFixture(fixture);
  const studyMeta = buildStudyMeta(fixture);
  const analysis = analyzeTimeRestrictedEating(entries, studyMeta, cohort);

  const templatePath = path.join(__dirname, "../src/templates/cent-reports/eating-report-bundle.html");
  let html = readFileSync(templatePath, "utf8");
  const payload = JSON.stringify({
    reports: analysis.reports,
    mobileReport: analysis.finalResult?.mobileReport ?? null
  });
  html = html.replace("__REPORT_DATA__", payload.replace(/</g, "\\u003c"));
  html = applyThemeToReportHtml(html, "eating");

  const outDir = path.join(__dirname, "../output/cent-eating-anna");
  mkdirSync(outDir, { recursive: true });
  const htmlOut = path.join(outDir, "reports-preview.html");
  const pdfOut = path.join(outDir, "kind-cent-eating-anna-reports.pdf");
  const pdfDownloads = path.join(homedir(), "Downloads", "kind-cent-eating-anna-reports.pdf");
  writeFileSync(htmlOut, html);

  const tmpDir = path.join(repoRoot, "docs/.pdf-gen-tmp");
  mkdirSync(tmpDir, { recursive: true });
  const tmpPkg = path.join(tmpDir, "package.json");
  const needsInstall =
    !existsSync(path.join(tmpDir, "node_modules", "puppeteer")) &&
    (!existsSync(tmpPkg) || !readFileSync(tmpPkg, "utf8").includes("puppeteer"));
  if (needsInstall) {
    writeFileSync(tmpPkg, JSON.stringify({ name: "kind-pdf-gen", private: true, type: "commonjs" }, null, 2));
    console.log("Installing puppeteer (one-time)...");
    await run("npm", ["install", "puppeteer@24", "--prefix", tmpDir], { cwd: repoRoot });
  }

  const script = `
const puppeteer = require('puppeteer');
(async () => {
  const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
  const page = await browser.newPage();
  await page.goto('file://${htmlOut}', { waitUntil: 'networkidle0', timeout: 60000 });
  await page.pdf({
    path: ${JSON.stringify(pdfOut)},
    format: 'A4',
    printBackground: true,
    margin: { top: '12mm', right: '12mm', bottom: '12mm', left: '12mm' }
  });
  await browser.close();
  console.log('Wrote PDF');
})().catch((e) => { console.error(e); process.exit(1); });
`;

  const runner = path.join(tmpDir, "run-cent-eating-pdf.cjs");
  writeFileSync(runner, script);
  await run("node", [runner], { cwd: repoRoot });
  copyFileSync(pdfOut, pdfDownloads);
  console.log(`HTML preview: ${htmlOut}`);
  console.log(`PDF: ${pdfOut}`);
  console.log(`Copied to ${pdfDownloads}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
