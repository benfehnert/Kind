#!/usr/bin/env node
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  logsFromFixture,
  buildStudyMeta,
  analyzeUpfReduction,
  evaluateTriggers
} from "../src/lib/cent/upfReduction/index.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const pretty = args.includes("--pretty");

const fixturePath = path.join(__dirname, "../src/data/fixtures/anna-upf-mood-completion.json");
const cohortPath = path.join(__dirname, "../src/data/fixtures/cohort-snapshot-upf-mood.json");

const fixture = JSON.parse(readFileSync(fixturePath, "utf8"));
const cohort = JSON.parse(readFileSync(cohortPath, "utf8"));
const entries = logsFromFixture(fixture);
const studyMeta = buildStudyMeta(fixture);

const analysis = analyzeUpfReduction(entries, studyMeta, cohort);
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
        moodDelta: mobile.tiles?.[0]?.delta,
        upfDelta: mobile.tiles?.[1]?.delta,
        phaseChart: mobile.phaseChart?.points,
        keepList: mobile.keepList?.items,
        distributionBefore: mobile.distribution?.before,
        distributionAfter: mobile.distribution?.after
      }
    : null,
  finalMobileReport: mobile,
  reports: analysis.reports
};

console.log(JSON.stringify(output, null, pretty ? 2 : 0));
