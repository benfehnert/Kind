#!/usr/bin/env node
/**
 * Compresses the full-length Anna completion fixtures into Short (alpha)
 * fixtures: one representative logged day per full-study week. A six-week
 * fixture becomes six consecutive days; the eight-week morning-rules fixture
 * becomes eight. Useful for QA/parity of the centShort pipeline.
 *
 * Usage: node scripts/build-anna-short-fixture.mjs
 */
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const fixturesDir = path.join(__dirname, "../src/data/fixtures");

const EXPLORATIONS = [
  { name: "morning-rules", shortId: "morning-rules-short", weeks: 8 },
  { name: "eating", shortId: "eating-short", weeks: 6 },
  { name: "screen-sleep", shortId: "screen-sleep-short", weeks: 6 },
  { name: "relaxation", shortId: "relaxation-short", weeks: 6 },
  { name: "upf-mood", shortId: "upf-mood-short", weeks: 6 }
];

const SHORT_START = "2026-06-01";

function toDate(value) {
  return value ? String(value).slice(0, 10) : null;
}

function daysBetween(start, end) {
  const a = new Date(`${start}T00:00:00Z`);
  const b = new Date(`${end}T00:00:00Z`);
  return Math.round((b - a) / (1000 * 60 * 60 * 24));
}

function isoAddDays(start, days) {
  const d = new Date(`${start}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

for (const { name, shortId, weeks } of EXPLORATIONS) {
  const src = JSON.parse(readFileSync(path.join(fixturesDir, `anna-${name}-completion.json`), "utf8"));
  const start = toDate(src.studyStartDate ?? src.started_at);
  const logs = (src.logs ?? []).map((row) => ({
    log_date: toDate(row.log_date ?? row.date),
    field_values: row.field_values ?? {}
  }));

  // Bucket logs by full-study week, then take the last log in each week as the
  // representative day for that week.
  const byWeek = new Map();
  for (const log of logs) {
    if (!log.log_date) continue;
    const week = Math.floor(daysBetween(start, log.log_date) / 7) + 1;
    if (week < 1 || week > weeks) continue;
    byWeek.set(week, log); // later logs overwrite earlier, keeping the last
  }

  const shortLogs = [];
  for (let week = 1; week <= weeks; week += 1) {
    const rep = byWeek.get(week);
    if (!rep) continue;
    shortLogs.push({
      log_date: isoAddDays(SHORT_START, week - 1),
      field_values: rep.field_values
    });
  }

  const out = {
    participantName: src.participantName ?? "Anna",
    studyStartDate: SHORT_START,
    endDate: shortLogs.at(-1)?.log_date ?? SHORT_START,
    explorationId: shortId,
    derivedFrom: `anna-${name}-completion.json`,
    logs: shortLogs
  };

  const outPath = path.join(fixturesDir, `anna-${name}-short-completion.json`);
  writeFileSync(outPath, `${JSON.stringify(out, null, 2)}\n`);
  console.log(`  ✓ ${path.basename(outPath)} — ${shortLogs.length}/${weeks} days`);
}

console.log("Anna short fixtures built.");
