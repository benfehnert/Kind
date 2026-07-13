import { query } from "../db.js";
import { getCentShortModule, isShortExploration } from "./centShort/index.js";
import {
  maxStudyDayFromLogRows,
  updateUserExplorationMetrics
} from "./explorationMetrics.js";
import { fetchExplorationMeta, fetchConsentedExplorationIds } from "./homeData.js";
import { REPORT_LABELS, centReportFeedRoute } from "./explorationReportsData.js";
import { getExplorationTheme } from "./explorationThemes.js";
import cohortSnapshotMorningRulesShort from "../data/fixtures/cohort-snapshot-morning-rules-short.json" with { type: "json" };
import cohortSnapshotEatingShort from "../data/fixtures/cohort-snapshot-eating-short.json" with { type: "json" };
import cohortSnapshotScreenSleepShort from "../data/fixtures/cohort-snapshot-screen-sleep-short.json" with { type: "json" };
import cohortSnapshotRelaxationShort from "../data/fixtures/cohort-snapshot-relaxation-short.json" with { type: "json" };
import cohortSnapshotUpfMoodShort from "../data/fixtures/cohort-snapshot-upf-mood-short.json" with { type: "json" };

/** Short-only cohort snapshots (day-based, derived from the parent snapshots). */
const COHORT_BY_SHORT_EXPLORATION = {
  "morning-rules-short": cohortSnapshotMorningRulesShort,
  "eating-short": cohortSnapshotEatingShort,
  "screen-sleep-short": cohortSnapshotScreenSleepShort,
  "relaxation-short": cohortSnapshotRelaxationShort,
  "upf-mood-short": cohortSnapshotUpfMoodShort
};

/**
 * Update + report orchestration for the Short (alpha) explorations. This is a
 * deliberately separate pipeline from userExplorationUpdates.js: it drives the
 * centShort analysis modules, uses study-day publication gates (one logged day
 * per full-study week), never runs the full-length feed libraries, and advances
 * week_current so the compressed timeline is visible in the app.
 */

const BASELINE_END_DAY = 2;
const INTERIM_PUBLISH_HOUR = 18;

/** Short exploration length and midpoint day for the timed interim report. */
const SHORT_EXPLORATION_SCHEDULE = {
  "morning-rules-short": { durationDays: 8, interimDay: 4 },
  "eating-short": { durationDays: 6, interimDay: 3 },
  "screen-sleep-short": { durationDays: 6, interimDay: 3 },
  "relaxation-short": { durationDays: 6, interimDay: 3 },
  "upf-mood-short": { durationDays: 6, interimDay: 3 }
};

const SHORT_PUBLISHED_REPORT_TYPES = [
  "BASELINE_SUMMARY",
  "INTERVENTION_INTERIM",
  "FINAL_STUDY_COMPLETE"
];

function parseStartedAt(startedAt) {
  if (!startedAt) return null;
  if (typeof startedAt === "string") return startedAt.slice(0, 10);
  return new Date(startedAt).toISOString().slice(0, 10);
}

function studyDayInstant(startedAt, studyDay, hour = 0) {
  const dateStr = parseStartedAt(startedAt);
  if (!dateStr) return null;
  const instant = new Date(`${dateStr}T00:00:00Z`);
  instant.setUTCDate(instant.getUTCDate() + (studyDay - 1));
  instant.setUTCHours(hour, 0, 0, 0);
  return instant;
}

function countValidInterventionEntries(entries) {
  return entries.filter((e) => e.phase === "INTERVENTION" && e.valid_for_analysis).length;
}

function canPublishShortReport(
  reportType,
  explorationId,
  { startedAt, maxStudyDay, interventionValidCount = 0, now = new Date() }
) {
  const schedule = SHORT_EXPLORATION_SCHEDULE[explorationId];
  if (!schedule) return false;

  switch (reportType) {
    case "BASELINE_SUMMARY":
      return maxStudyDay >= BASELINE_END_DAY;
    case "INTERVENTION_INTERIM": {
      const cutoff = studyDayInstant(startedAt, schedule.interimDay, INTERIM_PUBLISH_HOUR);
      return (
        cutoff !== null &&
        now >= cutoff &&
        maxStudyDay >= BASELINE_END_DAY &&
        interventionValidCount >= 1
      );
    }
    case "FINAL_STUDY_COMPLETE":
      return maxStudyDay >= schedule.durationDays;
    default:
      return false;
  }
}

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
    badgeLabel: "Report",
    time: `${feedLabel} · ${formatFeedTime(generatedAt)}`,
    body,
    highlight:
      report.phase_b_guidance ||
      report.optimise_guidance ||
      (isFinal ? "Tap to view your full personalised analysis." : "Tap to view your report."),
    insightTab: "your",
    _sortAt: generatedAt ? new Date(generatedAt).getTime() : Date.now()
  };

  const { route, routeParams } = centReportFeedRoute(explorationId, type);
  if (route) {
    item.route = route;
    item.routeParams = routeParams;
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

const UPSERTABLE_REPORT_KEYS = new Set(["cent:BASELINE_SUMMARY", "cent:INTERVENTION_INTERIM"]);

async function persistUpdate(individualId, explorationId, updateKey, feedItem, reportContent = null) {
  const upsert = UPSERTABLE_REPORT_KEYS.has(updateKey);
  const { rows } = await query(
    upsert
      ? `INSERT INTO user_exploration_updates
           (individual_id, exploration_id, update_key, feed_item, report_content)
         VALUES ($1, $2, $3, $4::jsonb, $5::jsonb)
         ON CONFLICT (individual_id, exploration_id, update_key) DO UPDATE SET
           feed_item = EXCLUDED.feed_item,
           report_content = EXCLUDED.report_content,
           generated_at = NOW()
         RETURNING generated_at`
      : `INSERT INTO user_exploration_updates
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
  const maxStudyDay = maxStudyDayFromLogRows(logRows, startedAt);

  await updateUserExplorationMetrics(individualId, explorationId);

  const studyMeta = centModule.buildStudyMeta({
    start_date: startedAt,
    end_date: logRows.at(-1)?.log_date,
    participant_name: profileRows[0]?.display_name ?? "You"
  });

  const cohort = COHORT_BY_SHORT_EXPLORATION[explorationId] ?? null;
  const analysis = centModule.analyze(entries, studyMeta, cohort);
  const reportsByType = new Map((analysis.reports ?? []).map((r) => [r.type, r]));
  const interventionValidCount = countValidInterventionEntries(entries);
  const publishContext = { startedAt, maxStudyDay, interventionValidCount };

  for (const reportType of SHORT_PUBLISHED_REPORT_TYPES) {
    const updateKey = `cent:${reportType}`;
    const upsertable = UPSERTABLE_REPORT_KEYS.has(updateKey);
    const alreadyStored = existingKeys.has(updateKey);

    if (!canPublishShortReport(reportType, explorationId, publishContext)) {
      continue;
    }
    if (alreadyStored && !upsertable) {
      continue;
    }

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
      if (!alreadyStored) {
        newItems.push(feedItem);
        existingKeys.add(updateKey);
      }
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
