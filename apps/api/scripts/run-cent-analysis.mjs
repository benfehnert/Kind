#!/usr/bin/env node
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  logsFromFixture,
  buildStudyMeta,
  analyzeMorningRules,
  evaluateTriggers
} from "../src/lib/cent/morningRules/index.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const pretty = args.includes("--pretty");
const fixtureArg = args.find((a) => a.startsWith("--fixture="))?.split("=")[1] ?? "anna-completion";

const fixturePath =
  fixtureArg === "anna-completion"
    ? path.join(__dirname, "../src/data/fixtures/anna-morning-rules-completion.json")
    : fixtureArg;

const cohortPath = path.join(__dirname, "../src/data/fixtures/cohort-snapshot-morning-rules.json");

const fixture = JSON.parse(readFileSync(fixturePath, "utf8"));
const cohort = JSON.parse(readFileSync(cohortPath, "utf8"));
const entries = logsFromFixture(fixture);
const studyMeta = buildStudyMeta(fixture);

const analysis = analyzeMorningRules(entries, studyMeta, cohort);
const lastEntry = entries.at(-1);
const triggered = evaluateTriggers(lastEntry, entries, { ...studyMeta }, cohort);

const output = {
  participant: fixture.participantName,
  studyStart: studyMeta.start_date,
  daysLogged: entries.length,
  validDays: entries.filter((e) => e.valid_for_analysis).length,
  analysisReports: analysis.reports.map((r) => r.type),
  triggeredReports: triggered.map((r) => r.type),
  finalMobileReport: analysis.finalResult?.mobileReport ?? null,
  reports: analysis.reports
};

console.log(JSON.stringify(output, null, pretty ? 2 : 0));
