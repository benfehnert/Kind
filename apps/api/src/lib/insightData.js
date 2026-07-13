import { query } from "../db.js";
import explorationEvidence from "../mocks/explorationEvidence.json" with { type: "json" };
import {
  fetchActiveRun,
  fetchFallbackExplorationId,
  fetchActiveRunsForOutcomeCards,
  EXPLORATION_FEED_LABELS
} from "./homeData.js";
import { buildInsightViewsFromLogs } from "./cent/morningRules/insightAdapter.js";
import { buildEatingInsights } from "./cent/timeRestrictedEating/insightAdapter.js";
import { loadDayEntries as loadEatingEntries } from "./cent/timeRestrictedEating/normalize.js";
import { SHORT_EXPLORATION_IDS, evidenceExplorationId, isShortExploration } from "./centShort/index.js";
import { fetchExplorationReportsList } from "./explorationReportsData.js";

const ICON_TONES = ["amber", "green", "purple"];

const PLACEHOLDER_OBSERVATION_TITLES = new Set([
  "Keep logging",
  "Get started",
  "Patterns forming",
  "Building your picture"
]);

const RULES_CHART_LEGEND = [
  { label: "3+ morning rules", crash: false },
  { label: "Fewer rules", crash: true }
];

const STATIC_COPY = {
  header: {
    title: "Insight",
    sub: "Your personal findings alongside discoveries from the wider kind community and research world."
  },
  yourSubTabs: ["Your insights", "Community insights"],
  communityFindingsTitle: "Community findings",
  contributeBanner: {
    title: "Contribute to the research",
    body: "Your anonymised data is part of the kind dataset. When research papers are published using your data, you'll be acknowledged as a citizen science contributor."
  }
};

function hasMeaningfulLogs(logs, explorationId) {
  if (!logs.length) return false;
  if (explorationId === "morning-rules") {
    return logs.some((row) => {
      const energy = Number(row.field_values?.mr_pm_energy);
      return !Number.isNaN(energy);
    });
  }
  return logs.some((row) =>
    Object.values(row.field_values ?? {}).some(
      (v) => typeof v === "number" || (Array.isArray(v) && v.length > 0)
    )
  );
}

function emptyReports() {
  return {
    cardTitle: "Reports",
    items: []
  };
}

function emptyPersonalInsights(explorationId) {
  const isMorningRules = explorationId === "morning-rules";
  return {
    hasPersonalData: false,
    energyTrend: {
      cardTitle: isMorningRules ? "Afternoon energy over time" : "Your metric over time",
      chartHint: "Log daily check-ins to build your trend",
      bars: [],
      labels: []
    },
    rulesChart: isMorningRules
      ? {
          cardTitle: "Morning rules vs afternoon energy",
          chartHint: "Log daily to compare high-rule and low-rule days",
          bars: [],
          legend: RULES_CHART_LEGEND
        }
      : {
          cardTitle: "Daily check-ins",
          chartHint: "Recent logged days will appear here",
          bars: [],
          legend: [{ label: "Logged days", crash: false }]
        },
    observations: {
      cardTitle: "Key observations",
      rows: explorationId
        ? [
            {
              tone: "!",
              title: "Keep logging",
              body: "Log a few daily check-ins to unlock personal observations."
            }
          ]
        : [
            {
              tone: "!",
              title: "Get started",
              body: "Join an exploration from the Explore tab to begin building personal insights."
            }
          ]
    },
    dailyCheckIns: buildDailyCheckInsChart(new Map()),
    adherence: {
      cardTitle: "Exploration adherence",
      explorations: []
    },
    emptyMessage: explorationId
      ? "Log daily check-ins on the Home tab to unlock your personal charts."
      : "Join an exploration and log daily check-ins to unlock personal charts and observations.",
    reports: emptyReports()
  };
}
function logDateKey(logDate) {
  if (!logDate) return "";
  if (typeof logDate === "string") return logDate.slice(0, 10);
  return new Date(logDate).toISOString().slice(0, 10);
}

function compareLogDates(a, b) {
  return logDateKey(a).localeCompare(logDateKey(b));
}

function avg(values) {
  if (!values.length) return null;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

function energyToBarHeight(energy) {
  return Math.max(4, Math.min(100, Math.round(Number(energy) * 10)));
}

function formatEnergy(value) {
  if (value === null || Number.isNaN(value)) return "—";
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

function daysSince(dateStr) {
  const start = new Date(dateStr);
  const now = new Date();
  return Math.max(1, Math.floor((now - start) / (1000 * 60 * 60 * 24)) + 1);
}

function formatShortWeekday(date) {
  return date.toLocaleDateString("en-GB", { weekday: "short" });
}

function groupLogsByExploration(rows) {
  const byExploration = new Map();
  for (const row of rows) {
    if (!byExploration.has(row.exploration_id)) {
      byExploration.set(row.exploration_id, []);
    }
    byExploration.get(row.exploration_id).push(row);
  }
  return byExploration;
}

function buildDailyCheckInsChart(logsByExploration) {
  const loggedDates = new Set();
  for (const logs of logsByExploration.values()) {
    for (const log of logs) {
      loggedDates.add(logDateKey(log.log_date));
    }
  }

  const today = new Date();
  const bars = [];
  const labels = [];

  for (let offset = 6; offset >= 0; offset -= 1) {
    const day = new Date(today);
    day.setDate(today.getDate() - offset);
    const key = day.toISOString().slice(0, 10);
    const logged = loggedDates.has(key);
    bars.push({ logged, h: logged ? 100 : 12 });
    labels.push(formatShortWeekday(day));
  }

  return {
    cardTitle: "Daily check-ins",
    chartHint: "Days you logged over the last 7 days",
    bars,
    labels,
    legend: [
      { label: "Logged", logged: true },
      { label: "Not logged", logged: false }
    ]
  };
}

function explorationEndDate(run) {
  if (run.status === "complete" && run.completed_at) {
    return logDateKey(run.completed_at);
  }
  return new Date().toISOString().slice(0, 10);
}

function buildExplorationAdherenceRow(run, logs) {
  const startKey = logDateKey(run.started_at);
  const endKey = explorationEndDate(run);
  const logDates = new Set(logs.map((log) => logDateKey(log.log_date)));

  const days = [];
  const cursor = new Date(startKey);
  const end = new Date(endKey);

  while (cursor <= end) {
    const key = cursor.toISOString().slice(0, 10);
    days.push({ adherent: logDates.has(key) });
    cursor.setDate(cursor.getDate() + 1);
  }

  const adherentCount = days.filter((day) => day.adherent).length;
  const pct = days.length ? Math.round((adherentCount / days.length) * 100) : 0;

  return {
    explorationId: run.exploration_id,
    title: run.title,
    pct: `${pct}%`,
    days
  };
}

function buildMultiExplorationAdherence(activeRuns, logsByExploration) {
  return {
    cardTitle: "Exploration adherence",
    explorations: activeRuns.map((run) =>
      buildExplorationAdherenceRow(run, logsByExploration.get(run.exploration_id) || [])
    )
  };
}

function normalizeObservationRow(row, explorationId, explorationTitle) {
  const tone =
    row.tone ?? (row.type === "adherence" || row.title === "Keep logging" ? "!" : "+");
  return {
    tone,
    title: row.title,
    body: row.body || row.text,
    explorationId,
    explorationTitle
  };
}

function buildLatestObservations(runs, logsByExploration) {
  const candidates = [];

  for (const run of runs) {
    const logs = logsByExploration.get(run.exploration_id) || [];
    const personal = buildPersonalInsights(run.exploration_id, logs, run);
    const rows = personal.observations?.rows || [];
    const latestLogDate = logs.length ? logDateKey(logs[logs.length - 1].log_date) : "";

    for (const row of rows) {
      if (PLACEHOLDER_OBSERVATION_TITLES.has(row.title)) continue;
      candidates.push({
        ...normalizeObservationRow(row, run.exploration_id, run.title),
        latestLogDate
      });
    }
  }

  candidates.sort((a, b) => b.latestLogDate.localeCompare(a.latestLogDate));

  if (candidates.length) {
    return {
      cardTitle: "Key observations",
      rows: candidates.slice(0, 5).map(({ latestLogDate: _latestLogDate, ...row }) => row)
    };
  }

  const fallbackRun = runs[0];
  if (!fallbackRun) {
    return emptyPersonalInsights(null).observations;
  }

  const fallbackLogs = logsByExploration.get(fallbackRun.exploration_id) || [];
  const fallbackPersonal = buildPersonalInsights(
    fallbackRun.exploration_id,
    fallbackLogs,
    fallbackRun
  );
  const fallbackRows = (fallbackPersonal.observations?.rows || []).map((row) =>
    normalizeObservationRow(row, fallbackRun.exploration_id, fallbackRun.title)
  );

  return {
    cardTitle: "Key observations",
    rows: fallbackRows.length
      ? fallbackRows.slice(0, 5)
      : emptyPersonalInsights(fallbackRun.exploration_id).observations.rows
  };
}

async function fetchAllUserExplorationRuns(individualId) {
  const { rows } = await query(
    `SELECT ue.exploration_id, ue.week_current, ue.weeks_total, ue.streak_days,
            ue.started_at, ue.completed_at, ue.status, e.title
     FROM user_explorations ue
     JOIN explorations e ON e.id = ue.exploration_id
     JOIN exploration_consents ec
       ON ec.individual_id = ue.individual_id AND ec.exploration_id = ue.exploration_id
     WHERE ue.individual_id = $1 AND ec.granted = TRUE
     ORDER BY COALESCE(ue.completed_at, ue.started_at) DESC, ue.started_at DESC`,
    [individualId]
  );
  return rows;
}

async function fetchAllExplorationLogs(individualId) {
  const { rows } = await query(
    `SELECT exploration_id, field_values, log_date
     FROM daily_logs
     WHERE individual_id = $1
     ORDER BY log_date ASC`,
    [individualId]
  );
  return groupLogsByExploration(rows);
}

async function buildLatestReports(individualId, runs) {
  const lists = await Promise.all(
    runs.map((run) => fetchExplorationReportsList(individualId, run.exploration_id))
  );
  const items = [];

  for (let i = 0; i < runs.length; i += 1) {
    const run = runs[i];
    for (const item of lists[i].items || []) {
      if (!item.headline) continue;
      items.push({
        ...item,
        explorationId: run.exploration_id,
        explorationTitle: run.title
      });
    }
  }

  items.sort((a, b) => new Date(b.generatedAt || 0) - new Date(a.generatedAt || 0));

  return {
    cardTitle: "Reports",
    items
  };
}

async function fetchActiveExplorationRunsWithMeta(individualId) {
  const activeRuns = await fetchActiveRunsForOutcomeCards(individualId);
  if (!activeRuns.length) return [];

  const { rows } = await query(
    `SELECT ue.exploration_id, ue.week_current, ue.weeks_total, ue.streak_days,
            ue.started_at, ue.completed_at, ue.status, e.title
     FROM user_explorations ue
     JOIN explorations e ON e.id = ue.exploration_id
     WHERE ue.individual_id = $1
       AND ue.exploration_id = ANY($2::text[])`,
    [individualId, activeRuns.map((run) => run.exploration_id)]
  );

  const byId = new Map(rows.map((row) => [row.exploration_id, row]));
  return activeRuns
    .map((run) => byId.get(run.exploration_id))
    .filter(Boolean);
}

function stripHtml(text) {
  return String(text ?? "").replace(/<[^>]+>/g, "");
}

function titleFromFeedRow(row) {
  if (row.headline) return stripHtml(row.headline);
  const plain = stripHtml(row.body);
  const firstSentence = plain.split(/(?<=[.!?])\s+/)[0] ?? plain;
  return firstSentence.length > 72 ? `${firstSentence.slice(0, 69)}…` : firstSentence;
}

async function fetchExplorationLogs(individualId, explorationId) {
  const { rows } = await query(
    `SELECT field_values, log_date
     FROM daily_logs
     WHERE individual_id = $1 AND exploration_id = $2
     ORDER BY log_date ASC`,
    [individualId, explorationId]
  );
  return rows;
}

async function fetchParticipantCount(explorationId) {
  const { rows } = await query(
    `SELECT COUNT(DISTINCT individual_id)::int AS count
     FROM user_explorations
     WHERE exploration_id = $1`,
    [explorationId]
  );
  return rows[0]?.count ?? 0;
}

function groupLogsByWeek(logs, startedAt) {
  const start = new Date(startedAt || logs[0]?.log_date || Date.now());
  const weeks = new Map();
  for (const log of logs) {
    const diffDays = Math.floor((new Date(log.log_date) - start) / (1000 * 60 * 60 * 24));
    const weekIdx = Math.max(0, Math.floor(diffDays / 7));
    if (!weeks.has(weekIdx)) weeks.set(weekIdx, []);
    weeks.get(weekIdx).push(log);
  }
  return weeks;
}

function buildMorningRulesEnergyTrend(logs, weekCurrent) {
  if (!logs.length) {
    return {
      cardTitle: "Afternoon energy over time",
      chartHint: "Log daily check-ins to build your trend",
      bars: [],
      labels: []
    };
  }

  const startedAt = logs[0].log_date;
  const weeks = groupLogsByWeek(logs, startedAt);
  const maxWeek = Math.max(weekCurrent ?? 1, ...weeks.keys()) + 1;
  const bars = [];
  const labels = [];

  for (let w = 0; w < Math.min(maxWeek, 8); w += 1) {
    const weekLogs = weeks.get(w) ?? [];
    const energies = weekLogs
      .map((row) => Number(row.field_values?.mr_pm_energy))
      .filter((n) => !Number.isNaN(n));
    if (!energies.length) continue;
    const mean = avg(energies);
    bars.push({ h: energyToBarHeight(mean), v: formatEnergy(mean) });
    labels.push(`Wk ${w + 1}`);
  }

  if (!bars.length) {
    return {
      cardTitle: "Afternoon energy over time",
      chartHint: "Log afternoon energy to see weekly averages",
      bars: [],
      labels: []
    };
  }

  return {
    cardTitle: "Afternoon energy over time",
    chartHint: "Avg. afternoon energy by week",
    bars,
    labels
  };
}

function buildMorningRulesChart(logs) {
  const recent = [...logs].sort((a, b) => compareLogDates(b.log_date, a.log_date)).slice(0, 7).reverse();

  if (!recent.length) {
    return {
      cardTitle: "Morning rules vs afternoon energy",
      chartHint: "Log daily to compare high-rule and low-rule days",
      bars: [],
      legend: RULES_CHART_LEGEND
    };
  }

  const bars = recent.map((row) => {
    const rules = Array.isArray(row.field_values?.mr_rules) ? row.field_values.mr_rules : [];
    const energy = Number(row.field_values?.mr_pm_energy);
    const highRules = rules.length >= 3;
    return {
      h: Number.isNaN(energy) ? 4 : energyToBarHeight(energy),
      crash: !highRules
    };
  });

  return {
    cardTitle: "Morning rules vs afternoon energy",
    chartHint: "Days with 3+ rules (green) vs fewer rules (orange)",
    bars,
    legend: RULES_CHART_LEGEND
  };
}

function buildMorningRulesObservations(logs, weekCurrent) {
  if (logs.length < 3) {
    return {
      cardTitle: "Key observations",
      rows: [
        {
          tone: "!",
          title: "Keep logging",
          body: "Log a few more days to unlock personal observations."
        }
      ]
    };
  }

  const sorted = [...logs].sort((a, b) => compareLogDates(a.log_date, b.log_date));
  const split = Math.max(3, Math.floor(sorted.length / 2));
  const baseline = sorted.slice(0, split);
  const recent = sorted.slice(split);
  const rows = [];

  const avgEnergy = (days) =>
    avg(
      days
        .map((d) => Number(d.field_values?.mr_pm_energy))
        .filter((n) => !Number.isNaN(n))
    );

  const baselineAvg = avgEnergy(baseline);
  const recentAvg = avgEnergy(recent);
  if (baselineAvg != null && recentAvg != null && recentAvg > baselineAvg + 0.3) {
    rows.push({
      tone: "+",
      title: "Afternoon energy rising",
      body: `Your afternoon energy is ${(recentAvg - baselineAvg).toFixed(1)} points higher than in your baseline period.`
    });
  }

  const highRuleDays = [];
  const lowRuleDays = [];
  for (const row of sorted) {
    const rules = row.field_values?.mr_rules;
    const energy = Number(row.field_values?.mr_pm_energy);
    if (!Array.isArray(rules) || Number.isNaN(energy)) continue;
    if (rules.length >= 3) highRuleDays.push(energy);
    else lowRuleDays.push(energy);
  }
  if (highRuleDays.length >= 2 && lowRuleDays.length >= 2) {
    const delta = avg(highRuleDays) - avg(lowRuleDays);
    if (delta >= 0.5) {
      rows.push({
        tone: "+",
        title: "Rule stacking helps",
        body: `Days with 3+ morning rules show ${delta.toFixed(1)} points higher afternoon energy on average.`
      });
    }
  }

  const stackDays = [];
  const otherDays = [];
  for (const row of sorted) {
    const rules = row.field_values?.mr_rules ?? [];
    const energy = Number(row.field_values?.mr_pm_energy);
    if (Number.isNaN(energy)) continue;
    const hasSun = rules.some((r) => /sunlight/i.test(r));
    const hasStretch = rules.some((r) => /stretch/i.test(r));
    if (hasSun && hasStretch) stackDays.push(energy);
    else otherDays.push(energy);
  }
  if (stackDays.length >= 2 && otherDays.length >= 2) {
    const delta = avg(stackDays) - avg(otherDays);
    if (delta >= 0.3) {
      rows.push({
        tone: "+",
        title: "Sunlight + stretching pair well",
        body: `Days with sunlight + stretching show ${delta.toFixed(1)} points higher afternoon energy on average.`
      });
    }
  }

  const crashCount = (days) =>
    days.filter((d) => {
      const crash = d.field_values?.mr_crash;
      return crash && !/^none$/i.test(String(crash));
    }).length;

  const baselineCrashes = crashCount(baseline);
  const recentCrashes = crashCount(recent);
  if (baselineCrashes > recentCrashes) {
    rows.push({
      tone: "+",
      title: "Fewer crashes",
      body: `Noticeable afternoon crashes dropped from ${baselineCrashes} days to ${recentCrashes} in your recent logs.`
    });
  }

  const everCaffeine = sorted.some((d) =>
    (d.field_values?.mr_rules ?? []).some((r) => /caffeine/i.test(r))
  );
  if (!everCaffeine) {
    rows.push({
      tone: "!",
      title: "Caffeine offset untested",
      body: `You haven't logged delayed caffeine yet — worth trying in week ${(weekCurrent ?? 1) + 1}.`
    });
  }

  return {
    cardTitle: "Key observations",
    rows: rows.length
      ? rows.slice(0, 5)
      : [
          {
            tone: "!",
            title: "Patterns forming",
            body: "Keep logging — clearer observations appear as your check-in history grows."
          }
        ]
  };
}

function buildAdherence(logs, run) {
  const totalDays = logs.length;
  const weekCurrent = run?.week_current ?? 1;

  const today = new Date();
  const weekStart = new Date(today);
  weekStart.setDate(today.getDate() - 6);
  const weekStartStr = weekStart.toISOString().slice(0, 10);
  const weekLogs = logs.filter((l) => logDateKey(l.log_date) >= weekStartStr).length;
  const weekPct = Math.min(100, Math.round((weekLogs / 7) * 100));

  let overallPct = weekPct;
  if (run?.started_at) {
    overallPct = Math.min(100, Math.round((totalDays / daysSince(run.started_at)) * 100));
  } else if (weekCurrent > 0) {
    // Short explorations already track elapsed days directly in weekCurrent.
    const elapsedDays = isShortExploration(run?.exploration_id) ? weekCurrent : weekCurrent * 7;
    overallPct = Math.min(100, Math.round((totalDays / elapsedDays) * 100));
  }

  return {
    cardTitle: "Exploration adherence",
    weekLabel: "This week",
    weekPct: `${weekPct}%`,
    overallLabel: `Overall (${totalDays} day${totalDays === 1 ? "" : "s"})`,
    overallPct: `${overallPct}%`
  };
}

function buildShortExplorationEvidenceInsights() {
  return SHORT_EXPLORATION_IDS.flatMap((shortId, i) => {
    const evidenceKey = evidenceExplorationId(shortId);
    const doc = explorationEvidence[evidenceKey];
    if (!doc?.summaryShort) return [];

    const feedLabel = EXPLORATION_FEED_LABELS[shortId] || shortId;
    return [
      {
        id: `${shortId}:evidence-summary`,
        explorationId: shortId,
        iconTone: ICON_TONES[i % ICON_TONES.length],
        title: doc.docTitle ?? feedLabel,
        body: doc.summaryShort,
        pillText: `<strong>${feedLabel}</strong> · Evidence summary`
      }
    ];
  });
}

async function buildPublications(explorationId, explorationTitle, participantCount) {
  const feedLabel = EXPLORATION_FEED_LABELS[explorationId] || explorationTitle;
  const publications = [
    {
      source: "kind · In preparation",
      sourceColor: "amber",
      title: `${explorationTitle}: a personalised trial cohort study across ${participantCount} participant${participantCount === 1 ? "" : "s"}`,
      meta: "kind research team & contributors · Expected June 2026 · Open access",
      tags: [
        { variant: "amber", label: feedLabel },
        { variant: "blue", label: "Personalised trial" }
      ]
    }
  ];

  const { rows } = await query(
    `SELECT headline, body, highlight
     FROM feed_items
     WHERE feed_type = 'science'
       AND (exploration_id IS NULL OR exploration_id = $1)
       AND (
         highlight ILIKE '%peer reviewed%'
         OR highlight ILIKE '%journal%'
         OR body ILIKE '%Peer reviewed%'
       )
     ORDER BY sort_order
     LIMIT 3`,
    [explorationId]
  );

  for (const row of rows) {
    publications.push({
      source: stripHtml(row.highlight)?.split("·")[0]?.trim() || "Research · External",
      sourceColor: "blue",
      title: titleFromFeedRow(row),
      meta: stripHtml(row.highlight) || "Peer reviewed literature",
      tags: [{ variant: "blue", label: "Circadian" }, { variant: "amber", label: "Relevant to your data" }]
    });
  }

  return publications;
}

function buildGenericEnergyTrend(logs, rangeFieldKey, cardTitle) {
  if (!logs.length) {
    return {
      cardTitle,
      chartHint: "Log daily check-ins to build your trend",
      bars: [],
      labels: []
    };
  }

  const weeks = groupLogsByWeek(logs, logs[0].log_date);
  const bars = [];
  const labels = [];
  for (const [weekIdx, weekLogs] of [...weeks.entries()].sort((a, b) => a[0] - b[0])) {
    const values = weekLogs
      .map((row) => Number(row.field_values?.[rangeFieldKey]))
      .filter((n) => !Number.isNaN(n));
    if (!values.length) continue;
    const mean = avg(values);
    bars.push({ h: energyToBarHeight(mean), v: formatEnergy(mean) });
    labels.push(`Wk ${weekIdx + 1}`);
  }

  return {
    cardTitle,
    chartHint: "Weekly average from your check-ins",
    bars,
    labels
  };
}

function buildPersonalInsights(explorationId, logs, run) {
  const weekCurrent = run?.week_current ?? 1;
  const hasPersonalData = hasMeaningfulLogs(logs, explorationId);

  if (!hasPersonalData) {
    return {
      ...emptyPersonalInsights(explorationId),
      adherence: buildAdherence(logs, run)
    };
  }

  if (explorationId === "morning-rules") {
    const centViews = buildInsightViewsFromLogs(logs, run);
    if (centViews) {
      return {
        hasPersonalData: true,
        ...centViews
      };
    }
    return {
      hasPersonalData: true,
      energyTrend: buildMorningRulesEnergyTrend(logs, weekCurrent),
      rulesChart: buildMorningRulesChart(logs),
      observations: buildMorningRulesObservations(logs, weekCurrent),
      adherence: buildAdherence(logs, run)
    };
  }

  if (explorationId === "eating" && run?.started_at) {
    const entries = loadEatingEntries(logs, run.started_at);
    const insights = buildEatingInsights(entries);
    if (insights.length) {
      return {
        hasPersonalData: true,
        energyTrend: buildGenericEnergyTrend(logs, "te_energy", "Daily energy over time"),
        rulesChart: { title: "Timing habits", legend: [], bars: [] },
        observations: insights.map((i) => ({ icon: "💡", text: i.body, title: i.title })),
        adherence: buildAdherence(logs, run)
      };
    }
  }

  const rangeKey = Object.keys(logs[0]?.field_values ?? {}).find((k) =>
    logs.some((row) => typeof row.field_values?.[k] === "number")
  );

  return {
    hasPersonalData: true,
    energyTrend: buildGenericEnergyTrend(
      logs,
      rangeKey,
      "Your metric over time"
    ),
    rulesChart: {
      cardTitle: "Daily check-ins",
      chartHint: "Recent logged days",
      bars: logs.slice(-7).map((row) => {
        const val = rangeKey ? Number(row.field_values?.[rangeKey]) : null;
        return { h: Number.isNaN(val) ? 4 : energyToBarHeight(val), crash: false };
      }),
      legend: [{ label: "Logged days", crash: false }]
    },
    observations: {
      cardTitle: "Key observations",
      rows: logs.length >= 3
        ? [
            {
              tone: "+",
              title: "Building your picture",
              body: `You have ${logs.length} check-ins logged for this exploration — patterns will sharpen as you continue.`
            }
          ]
        : [
            {
              tone: "!",
              title: "Keep logging",
              body: "Log a few more days to unlock personal observations."
            }
          ]
    },
    adherence: buildAdherence(logs, run)
  };
}

async function buildCommunitySection(explorationId) {
  const communityInsights = buildShortExplorationEvidenceInsights();

  if (!explorationId) {
    return {
      showCommunityInsights: true,
      communityIntro: {
        title: "From the kind community",
        sub: "Evidence-backed findings from the Short explorations available on kind."
      },
      communityInsights,
      publications: []
    };
  }

  const [{ rows: expRows }, participantCount] = await Promise.all([
    query(`SELECT title FROM explorations WHERE id = $1`, [explorationId]),
    fetchParticipantCount(explorationId)
  ]);
  const explorationTitle = expRows[0]?.title ?? explorationId;
  const publications = await buildPublications(explorationId, explorationTitle, participantCount);

  return {
    showCommunityInsights: true,
    communityIntro: {
      title: "From the kind community",
      sub: "Evidence-backed findings from the Short explorations available on kind."
    },
    communityInsights,
    publications
  };
}

export async function buildInsightPayload(individualId, { communityExplorationId } = {}) {
  const allRuns = await fetchAllUserExplorationRuns(individualId);

  if (!allRuns.length) {
    const communityScopeId = communityExplorationId ?? null;
    const community = await buildCommunitySection(communityScopeId);
    return {
      ...STATIC_COPY,
      ...emptyPersonalInsights(null),
      ...community
    };
  }

  const [logsByExploration, activeRuns, reports, community] = await Promise.all([
    fetchAllExplorationLogs(individualId),
    fetchActiveExplorationRunsWithMeta(individualId),
    buildLatestReports(individualId, allRuns),
    buildCommunitySection(communityExplorationId ?? allRuns[0].exploration_id)
  ]);

  const activeRun = await fetchActiveRun(individualId);
  let explorationId = activeRun?.exploration_id ?? allRuns[0]?.exploration_id ?? null;

  if (!explorationId) {
    explorationId = await fetchFallbackExplorationId(individualId);
  }

  const observations = buildLatestObservations(allRuns, logsByExploration);
  const dailyCheckIns = buildDailyCheckInsChart(logsByExploration);
  const adherence = buildMultiExplorationAdherence(activeRuns, logsByExploration);
  const hasAnyLogs = [...logsByExploration.values()].some((logs) => logs.length > 0);
  const hasMeaningfulObservations = observations.rows.some(
    (row) => !PLACEHOLDER_OBSERVATION_TITLES.has(row.title)
  );
  const hasPersonalData = hasAnyLogs || hasMeaningfulObservations || reports.items.length > 0;

  return {
    ...STATIC_COPY,
    activeExplorationId: explorationId,
    hasPersonalData,
    observations,
    dailyCheckIns,
    adherence,
    reports,
    ...community
  };
}
