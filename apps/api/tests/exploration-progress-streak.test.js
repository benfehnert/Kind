import test from "node:test";
import assert from "node:assert/strict";
import {
  computeExplorationStreak,
  consecutiveDaysEndingOnDate
} from "../src/lib/explorationStreak.js";
import {
  maxStudyDayFromLogRows,
  weekCurrentFromMaxStudyDay
} from "../src/lib/explorationMetrics.js";

test("consecutiveDaysEndingOnDate counts backward from anchor", () => {
  const dates = ["2026-06-01", "2026-06-02", "2026-06-03", "2026-06-05"];
  assert.equal(consecutiveDaysEndingOnDate(dates, "2026-06-03"), 3);
  assert.equal(consecutiveDaysEndingOnDate(dates, "2026-06-05"), 1);
});

test("computeExplorationStreak ends on most recent log date", () => {
  const logs = [
    { log_date: "2026-06-01" },
    { log_date: "2026-06-02" },
    { log_date: "2026-06-03" },
    { log_date: "2026-06-05" }
  ];
  assert.equal(computeExplorationStreak(logs), 1);
});

test("computeExplorationStreak ignores duplicate saves on the same day", () => {
  const logs = [
    { log_date: "2026-06-01" },
    { log_date: "2026-06-02" },
    { log_date: "2026-06-03" },
    { log_date: "2026-06-04" },
    { log_date: "2026-06-05" }
  ];
  assert.equal(computeExplorationStreak(logs), 5);
});

test("computeExplorationStreak breaks at a gap in the middle", () => {
  const logs = [
    { log_date: "2026-06-01" },
    { log_date: "2026-06-02" },
    { log_date: "2026-06-04" },
    { log_date: "2026-06-05" }
  ];
  assert.equal(computeExplorationStreak(logs), 2);
});

test("maxStudyDayFromLogRows uses raw calendar dates beyond short phase range", () => {
  const startedAt = "2026-06-01";
  const logs = [
    { log_date: "2026-06-01" },
    { log_date: "2026-06-02" },
    { log_date: "2026-06-03" },
    { log_date: "2026-06-04" },
    { log_date: "2026-06-05" },
    { log_date: "2026-06-07" },
    { log_date: "2026-06-08" }
  ];
  assert.equal(maxStudyDayFromLogRows(logs, startedAt), 8);
});

test("weekCurrentFromMaxStudyDay caps short explorations at weeks_total", () => {
  assert.equal(weekCurrentFromMaxStudyDay(8, 6, true), 6);
  assert.equal(weekCurrentFromMaxStudyDay(5, 6, true), 5);
});

test("weekCurrentFromMaxStudyDay maps full exploration study days to weeks", () => {
  assert.equal(weekCurrentFromMaxStudyDay(15, 6, false), 3);
  assert.equal(weekCurrentFromMaxStudyDay(7, 6, false), 1);
  assert.equal(weekCurrentFromMaxStudyDay(42, 6, false), 6);
});

test("relaxation-short scenario: gap on day 6 still reaches day 6 of 6", () => {
  const startedAt = "2026-06-01";
  const logs = [
    { log_date: "2026-06-01" },
    { log_date: "2026-06-02" },
    { log_date: "2026-06-03" },
    { log_date: "2026-06-04" },
    { log_date: "2026-06-05" },
    { log_date: "2026-06-07" },
    { log_date: "2026-06-08" }
  ];
  const maxStudyDay = maxStudyDayFromLogRows(logs, startedAt);
  const weekCurrent = weekCurrentFromMaxStudyDay(maxStudyDay, 6, true);
  const streak = computeExplorationStreak(logs);

  assert.equal(weekCurrent, 6);
  assert.equal(streak, 2);
});
