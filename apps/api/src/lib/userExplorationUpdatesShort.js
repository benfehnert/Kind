import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { query } from "../db.js";
import { getCentShortModule, isShortExploration } from "./centShort/index.js";
import { fetchExplorationMeta, fetchConsentedExplorationIds } from "./homeData.js";
import { getExplorationTheme } from "./explorationThemes.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function loadShortCohort(shortId) {
  try {
    return JSON.parse(
      readFileSync(path.join(__dirname, `../data/fixtures/cohort-snapshot-${shortId}.json`), "utf8")
    );
  } catch {
    return null;
  }
}

/** Short-only cohort snapshots (day-based, derived from the parent snapshots). */
const COHORT_BY_SHORT_EXPLORATION = {
  "morning-rules-short": loadShortCohort("morning-rules-short"),
  "eating-short": loadShortCohort("eating-short"),
  "screen-sleep-short": loadShortCohort("screen-sleep-short"),
  "relaxation-short": loadShortCohort("relaxation-short"),
  "upf-mood-short": loadShortCohort("upf-mood-short")
};

/**
 * Update + report orchestration for the Short (alpha) explorations. This is a
 * deliberately separate pipeline from userExplorationUpdates.js: it drives the
 * centShort analysis modules, uses day-based publication gates (one logged day
 * per full-study week), never runs the full-length feed libraries, and advances
 * week_current so the compressed timeline is visible in the app.
 */

/** Minimum study day before each Short CENT report is published to the feed. */
const SHORT_REPORT_GATES = {
  "morning-rules-short": {
    BASELINE_SUMMARY: 3,
    INTERVENTION_INTERIM: 6,
    OPTIMISE_COMPLETION: 7,
    FINAL_STUDY_COMPLETE: 8
  },
  "eating-short": {
    BASELINE_SUMMARY: 3,
    INTERVENTION_INTERIM: 5,
    OPTIMISE_COMPLETION: 6,
    FINAL_STUDY_COMPLETE: 6
  },
  "screen-sleep-short": {
    BASELINE_SUMMARY: 3,
    INTERVENTION_INTERIM: 5,
    OPTIMISE_COMPLETION: 6,
    FINAL_STUDY_COMPLETE: 6
  },
  "relaxation-short": {
    BASELINE_SUMMARY: 3,
    INTERVENTION_INTERIM: 5,
    OPTIMISE_COMPLETION: 6,
    FINAL_STUDY_COMPLETE: 6
  },
  "upf-mood-short": {
    BASELINE_SUMMARY: 3,
    INTERVENTION_INTERIM: 5,
    OPTIMISE_COMPLETION: 6,
    FINAL_STUDY_COMPLETE: 6
  }
};

const REPORT_LABELS = {
  BASELINE_SUMMARY: "Baseline summary",
  INTERVENTION_INTERIM: "Interim analysis",
  OPTIMISE_COMPLETION: "Optimise phase complete",
  FINAL_STUDY_COMPLETE: "Personalised trial final report"
};

function formatFeedTime(date) {
  if (!date) return "Today";
  const then = new Date(date);
  const now = new Date();
  const diffDays = Math.floor((now - then) / (1000 * 60 * 60 * 24));
  if (diffDays <= 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays} days ago`;
  return then.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function centReportToFeedItem(report, explorationMeta, explorationId, generatedAt) {
  const meta = explorationMeta[explorationId] ?? {};
  const theme = getExplorationTheme(explorationId);
  const feedLabel = meta.feedLabel || meta.title || explorationId;
  const type = report.type;
  const isFinal = type === "FINAL_STUDY_COMPLETE";

  const body =
    report.headline ||
    report.lede ||
    report.summary ||
    (isFinal
      ? `Your <strong>${meta.title || feedLabel}</strong> short exploration final report is ready to view.`
      : `Your latest ${feedLabel} analysis is ready.`);

  const item = {
    id: `update-${explorationId}-${type}`,
    type: "insight",
    explorationId,
    avatarKind: "icon",
    icon: "✦",
    avatarBg: meta.bg || theme.surface,
    iconColor: meta.text || theme.accent,
    displayName: REPORT_LABELS[type] || "Exploration update",
    badge: "blue",
    badgeLabel: isFinal ? "Report" : "Update",
    time: `${feedLabel} · ${formatFeedTime(generatedAt)}`,
    body,
    highlight: report.phase_b_guidance || report.optimise_guidance || (isFinal ? "Tap to view your full personalised analysis." : ""),
    insightTab: "your",
    _sortAt: generatedAt ? new Date(generatedAt).getTime() : Date.now()
  };

  if (isFinal) {
    item.route = "ExplorationReport";
    item.routeParams = { explorationId };
  }

  return item;
}

async function fetchExistingUpdateKeys(individualId, explorationId) {
  const { rows } = await query(
    `SELECT update_key FROM user_exploration_updates
     WHERE individual_id = $1 AND exploration_id = $2`,
    [individualId, explorationId]
  );
  return new Set(rows.map((r) => r.update_key));
}

async function persistUpdate(individualId, explorationId, updateKey, feedItem, reportContent = null) {
  const { rows } = await query(
    `INSERT INTO user_exploration_updates
       (individual_id, exploration_id, update_key, feed_item, report_content)
     VALUES ($1, $2, $3, $4::jsonb, $5::jsonb)
     ON CONFLICT (individual_id, exploration_id, update_key) DO NOTHING
     RETURNING generated_at`,
    [
      individualId,
      explorationId,
      updateKey,
      JSON.stringify(feedItem),
      reportContent ? JSON.stringify(reportContent) : null
    ]
  );
  return rows[0]?.generated_at ?? null;
}

async function persistFinalReport(individualId, explorationId, userExplorationId, mobileReport) {
  if (!mobileReport) return;
  const { _cent, ...content } = mobileReport;
  await query(
    `INSERT INTO user_exploration_reports
       (individual_id, exploration_id, user_exploration_id, content)
     VALUES ($1, $2, $3, $4::jsonb)
     ON CONFLICT (individual_id, exploration_id) DO UPDATE SET
       content = EXCLUDED.content,
       user_exploration_id = EXCLUDED.user_exploration_id,
       generated_at = NOW()`,
    [individualId, explorationId, userExplorationId, JSON.stringify(content)]
  );
}

export async function syncShortExplorationUpdates(individualId, explorationId, explorationMeta = {}) {
  const centModule = getCentShortModule(explorationId);
  if (!centModule) return [];

  if (!explorationMeta[explorationId]) {
    const fetched = await fetchExplorationMeta([explorationId]);
    explorationMeta = { ...explorationMeta, ...fetched };
  }

  const { rows: ueRows } = await query(
    `SELECT id, started_at, weeks_total FROM user_explorations
     WHERE individual_id = $1 AND exploration_id = $2`,
    [individualId, explorationId]
  );
  const userExplorationId = ueRows[0]?.id;
  const startedAt = ueRows[0]?.started_at;
  const weeksTotal = ueRows[0]?.weeks_total ?? null;
  if (!userExplorationId || !startedAt) return [];

  const { rows: logRows } = await query(
    `SELECT log_date, field_values FROM daily_logs
     WHERE individual_id = $1 AND exploration_id = $2
     ORDER BY log_date ASC`,
    [individualId, explorationId]
  );
  if (!logRows.length) return [];

  const meta = explorationMeta[explorationId] ?? {};
  const existingKeys = await fetchExistingUpdateKeys(individualId, explorationId);
  const newItems = [];

  const { rows: profileRows } = await query(
    `SELECT display_name FROM individuals WHERE id = $1`,
    [individualId]
  );

  const entries = centModule.loadDayEntries(logRows, startedAt);
  const maxStudyDay = entries.length ? Math.max(...entries.map((e) => e.study_day ?? 0)) : 0;

  // One logged study day maps to one full-study week for the short timeline.
  if (weeksTotal && maxStudyDay > 0) {
    await query(
      `UPDATE user_explorations
       SET week_current = LEAST($1::int, weeks_total), updated_at = NOW()
       WHERE id = $2`,
      [maxStudyDay, userExplorationId]
    );
  }

  const studyMeta = centModule.buildStudyMeta({
    start_date: startedAt,
    end_date: logRows.at(-1)?.log_date,
    participant_name: profileRows[0]?.display_name ?? "You"
  });

  const cohort = COHORT_BY_SHORT_EXPLORATION[explorationId] ?? null;
  const analysis = centModule.analyze(entries, studyMeta, cohort);
  const reportsByType = new Map((analysis.reports ?? []).map((r) => [r.type, r]));
  const gates = SHORT_REPORT_GATES[explorationId] ?? {};

  for (const [reportType, minDay] of Object.entries(gates)) {
    const updateKey = `cent:${reportType}`;
    if (existingKeys.has(updateKey) || maxStudyDay < minDay) continue;

    const report = reportsByType.get(reportType);
    if (!report) continue;

    if (reportType === "FINAL_STUDY_COMPLETE") {
      const mobileReport = analysis.finalResult?.mobileReport;
      if (mobileReport) {
        await persistFinalReport(individualId, explorationId, userExplorationId, mobileReport);
      }
    }

    const generatedAt = new Date().toISOString();
    const feedItem = centReportToFeedItem(report, explorationMeta, explorationId, generatedAt);
    const savedAt = await persistUpdate(
      individualId,
      explorationId,
      updateKey,
      feedItem,
      reportType === "FINAL_STUDY_COMPLETE" ? analysis.finalResult?.mobileReport : report
    );
    if (savedAt) {
      feedItem.time = `${meta.feedLabel || meta.title || explorationId} · ${formatFeedTime(savedAt)}`;
      feedItem._sortAt = new Date(savedAt).getTime();
      newItems.push(feedItem);
      existingKeys.add(updateKey);
    }
  }

  return newItems;
}

export async function syncAllShortExplorationUpdates(individualId) {
  const consentedIds = (await fetchConsentedExplorationIds(individualId)).filter(isShortExploration);
  if (!consentedIds.length) return [];

  const explorationMeta = await fetchExplorationMeta(consentedIds);
  const allNew = [];
  for (const explorationId of consentedIds) {
    const items = await syncShortExplorationUpdates(individualId, explorationId, explorationMeta);
    allNew.push(...items);
  }
  return allNew;
}
