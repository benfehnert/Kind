#!/usr/bin/env node
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  logsFromFixture,
  buildStudyMeta,
  analyzeRelaxationPractices,
  evaluateTriggers
} from "../src/lib/cent/relaxationPractices/index.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const pretty = args.includes("--pretty");

const fixturePath = path.join(__dirname, "../src/data/fixtures/anna-relaxation-completion.json");
const cohortPath = path.join(__dirname, "../src/data/fixtures/cohort-snapshot-relaxation.json");

const fixture = JSON.parse(readFileSync(fixturePath, "utf8"));
const cohort = JSON.parse(readFileSync(cohortPath, "utf8"));
const entries = logsFromFixture(fixture);
const studyMeta = buildStudyMeta(fixture);

const analysis = analyzeRelaxationPractices(entries, studyMeta, cohort);
const lastEntry = entries.at(-1);
const triggered = evaluateTriggers(lastEntry, entries, { ...studyMeta }, cohort);

const mobile = analysis.finalResult?.mobileReport;
const output = {
  participant: fixture.participantName,
  studyStart: studyMeta.start_date,
  daysLogged: entries.length,
  validDays: entries.filter((e) => e.valid_for_analysis).length,
  analysisReports: analysis.reports.map((r) => r.type),
  triggeredReports: triggered.map((r) => r.type),
  metrics: mobile
    ? {
        stressDelta: mobile.tiles?.[0]?.delta,
        composureDelta: mobile.tiles?.[1]?.delta,
        stressRange: mobile.tiles?.[0]?.value,
        composureRange: mobile.tiles?.[1]?.value,
        phaseChart: mobile.phaseChart?.points,
        keepList: mobile.keepList?.items,
        factorLabels: mobile.factors?.rows?.map((r) => r.label)
      }
    : null,
  finalMobileReport: mobile,
  reports: analysis.reports
};

console.log(JSON.stringify(output, null, pretty ? 2 : 0));
