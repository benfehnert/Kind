#!/usr/bin/env node
/**
 * QA runner for the Short (alpha) explorations.
 *
 * Usage:
 *   node scripts/run-cent-short-analysis.mjs <exploration-id> [--pretty] [--days N]
 *
 * Example:
 *   node scripts/run-cent-short-analysis.mjs eating-short --pretty
 *
 * It generates a deterministic synthetic completion (baseline then improved
 * intervention/optimise days) and runs the separate centShort analysis
 * pipeline, printing the report types and the final mobile report tiles.
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { getCentShortModule, isShortExploration } from "../src/lib/centShort/index.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const explorationId = args.find((a) => !a.startsWith("--"));
const pretty = args.includes("--pretty");
const daysArg = args.find((a) => a.startsWith("--days="));

if (!explorationId || !isShortExploration(explorationId)) {
  console.error(
    "Provide a short exploration id: morning-rules-short | eating-short | screen-sleep-short | relaxation-short | upf-mood-short"
  );
  process.exit(1);
}

const mod = getCentShortModule(explorationId);
if (!mod) {
  console.error(`No centShort module registered for ${explorationId}`);
  process.exit(1);
}

const totalDays = daysArg ? Number(daysArg.split("=")[1]) : explorationId === "morning-rules-short" ? 8 : 6;
const START = "2026-06-01";

// `active` is true once we are past the two baseline days.
function fieldsFor(id, day) {
  const active = day >= 3;
  switch (id) {
    case "morning-rules-short":
      return {
        mr_rules: active ? ["Early sunlight exposure", "Morning stretching"] : [],
        mr_am_energy: 7,
        mr_pm_energy: active ? 7 : 5,
        mr_crash: active ? "None" : "Noticeable crash",
        mr_focus: active ? 7 : 5
      };
    case "eating-short":
      return {
        te_first: "8–9am",
        te_last: active ? "4–6pm" : "7–8pm",
        te_energy: active ? 7 : 5,
        te_hunger: active ? 7 : 6,
        te_mood: active ? 7 : 6
      };
    case "screen-sleep-short":
      return {
        ss_last: active ? "60+ min before" : "Right before bed",
        ss_bed: active ? "None" : "30+ min",
        ss_windup: active ? 60 : 0,
        ss_activities: active ? ["Reading", "Meditation"] : [],
        ss_onset: active ? "Under 10 min" : "20–40 min",
        ss_sleep: active ? 8 : 5
      };
    case "relaxation-short":
      return {
        rp_practices: active ? ["Vagal breathing", "Meditation / visualisation"] : [],
        rp_stress: active ? 3 : 6,
        rp_anxiety: active ? 3 : 6,
        rp_composure: active ? 8 : 5
      };
    case "upf-mood-short":
      return {
        upf_pct: active ? 20 : 60,
        upf_mood: active ? 8 : 5,
        upf_energy: active ? 7 : 5,
        upf_swaps: active ? ["Breakfast", "Lunch"] : []
      };
    default:
      return {};
  }
}

const useFixture = args.includes("--fixture");

let logs = [];
let startDate = START;
let participantName = "QA Tester";

if (useFixture) {
  // Load the compressed Anna fixture (build with build-anna-short-fixture.mjs).
  const name = explorationId.replace(/-short$/, "");
  const fixture = JSON.parse(
    readFileSync(path.join(__dirname, `../src/data/fixtures/anna-${name}-short-completion.json`), "utf8")
  );
  logs = (fixture.logs ?? []).map((row) => ({
    log_date: row.log_date ?? row.date,
    field_values: row.field_values ?? {}
  }));
  startDate = fixture.studyStartDate ?? START;
  participantName = fixture.participantName ?? participantName;
} else {
  for (let i = 0; i < totalDays; i += 1) {
    const date = new Date(Date.UTC(2026, 5, 1 + i)).toISOString().slice(0, 10);
    logs.push({ log_date: date, field_values: fieldsFor(explorationId, i + 1) });
  }
}

const entries = mod.loadDayEntries(logs, startDate);
const studyMeta = mod.buildStudyMeta({
  start_date: startDate,
  end_date: logs.at(-1)?.log_date ?? startDate,
  participant_name: participantName
});

let cohort = null;
try {
  cohort = JSON.parse(
    readFileSync(path.join(__dirname, `../src/data/fixtures/cohort-snapshot-${explorationId}.json`), "utf8")
  );
} catch {
  cohort = null;
}

const analysis = mod.analyze(entries, studyMeta, cohort);
const mobile = analysis.finalResult?.mobileReport;

const output = {
  explorationId,
  studyStart: startDate,
  daysLogged: entries.length,
  maxStudyDay: entries.length ? Math.max(...entries.map((e) => e.study_day)) : 0,
  validDays: entries.filter((e) => e.valid_for_analysis).length,
  analysisReports: (analysis.reports ?? []).map((r) => r.type),
  finalReportType: analysis.finalResult?.centReport?.type ?? null,
  tiles: mobile?.tiles ?? null,
  phaseChart: mobile?.phaseChart?.points ?? null,
  keepList: mobile?.keepList?.items ?? null,
  finalMobileReport: mobile ?? null
};

console.log(JSON.stringify(output, null, pretty ? 2 : 0));
