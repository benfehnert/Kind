import { query } from "../db.js";
import { getCentModule } from "./cent/index.js";
import { generateFeedContent } from "../feedContent.js";
import { morningRulesFeedLibrary } from "../data/morningRulesFeedLibrary.js";
import { buildMorningRulesContext } from "./cent/morningRules/index.js";
import { fetchExplorationMeta, fetchConsentedExplorationIds } from "./homeData.js";
import { getExplorationTheme } from "./explorationThemes.js";
import cohortSnapshotMorningRules from "../data/fixtures/cohort-snapshot-morning-rules.json" with { type: "json" };
import cohortSnapshotEating from "../data/fixtures/cohort-snapshot-eating.json" with { type: "json" };
import cohortSnapshotScreenSleep from "../data/fixtures/cohort-snapshot-screen-sleep.json" with { type: "json" };
import cohortSnapshotRelaxation from "../data/fixtures/cohort-snapshot-relaxation.json" with { type: "json" };
import cohortSnapshotUpfMood from "../data/fixtures/cohort-snapshot-upf-mood.json" with { type: "json" };

const COHORT_BY_EXPLORATION = {
  "morning-rules": cohortSnapshotMorningRules,
  eating: cohortSnapshotEating,
  "screen-sleep": cohortSnapshotScreenSleep,
  relaxation: cohortSnapshotRelaxation,
  "upf-mood": cohortSnapshotUpfMood
};

/** Minimum study day before each CENT report type is published to the feed. */
const REPORT_GATES = {
  "morning-rules": {
    BASELINE_SUMMARY: 15,
    INTERVENTION_INTERIM: 36,
    OPTIMISE_COMPLETION: 50,
    FINAL_STUDY_COMPLETE: 50
  },
  eating: {
    BASELINE_SUMMARY: 15,
    INTERVENTION_INTERIM: 29,
    OPTIMISE_COMPLETION: 36,
    FINAL_STUDY_COMPLETE: 36
  },
  "screen-sleep": {
    BASELINE_SUMMARY: 15,
    INTERVENTION_INTERIM: 29,
    OPTIMISE_COMPLETION: 36,
    FINAL_STUDY_COMPLETE: 36
  },
  relaxation: {
    BASELINE_SUMMARY: 15,
    INTERVENTION_INTERIM: 29,
    OPTIMISE_COMPLETION: 36,
    FINAL_STUDY_COMPLETE: 36
  },
  "upf-mood": {
    BASELINE_SUMMARY: 15,
    INTERVENTION_INTERIM: 29,
    OPTIMISE_COMPLETION: 36,
    FINAL_STUDY_COMPLETE: 36
  }
};

const REPORT_LABELS = {
  BASELINE_SUMMARY: "Baseline summary",
  INTERVENTION_INTERIM: "Interim analysis",
  OPTIMISE_COMPLETION: "Optimise phase complete",
  FINAL_STUDY_COMPLETE: "Personalised trial final report",
  COHORT_COMPARISON: "Community comparison",
  KIND_COMPARISON: "Community comparison"
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
      ? `Your <strong>${meta.title || feedLabel}</strong> personalised trial final report is ready to view.`
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

function feedContentItemToFeedItem(item, explorationMeta, explorationId, generatedAt) {
  const meta = explorationMeta[explorationId] ?? {};
  const feedLabel = meta.feedLabel || meta.title || explorationId;
  return {
    ...item,
    avatarBg: item.avatarBg || meta.bg || getExplorationTheme(explorationId).surface,
    iconColor: item.iconColor || item.glyphColor || meta.text || getExplorationTheme(explorationId).accent,
    time: item.time || `${formatFeedTime(generatedAt)} · ${feedLabel}`,
    _sortAt: generatedAt ? new Date(generatedAt).getTime() : Date.now()
  };
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

export async function syncExplorationUpdates(individualId, explorationId, explorationMeta = {}) {
  const centModule = getCentModule(explorationId);
  if (!centModule) return [];

  if (!explorationMeta[explorationId]) {
    const fetched = await fetchExplorationMeta([explorationId]);
    explorationMeta = { ...explorationMeta, ...fetched };
  }

  const { rows: ueRows } = await query(
    `SELECT id, started_at FROM user_explorations
     WHERE individual_id = $1 AND exploration_id = $2`,
    [individualId, explorationId]
  );
  const userExplorationId = ueRows[0]?.id;
  const startedAt = ueRows[0]?.started_at;
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
  const maxStudyDay = Math.max(...entries.map((e) => e.study_day ?? 0));
  const studyMeta = centModule.buildStudyMeta({
    start_date: startedAt,
    end_date: logRows.at(-1)?.log_date,
    participant_name: profileRows[0]?.display_name ?? "You"
  });
  const cohort = COHORT_BY_EXPLORATION[explorationId] ?? null;
  const analysis = centModule.analyze(entries, studyMeta, cohort);
  const reportsByType = new Map((analysis.reports ?? []).map((r) => [r.type, r]));
  const gates = REPORT_GATES[explorationId] ?? {};

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

  if (explorationId === "morning-rules") {
    const context = buildMorningRulesContext(entries, cohort);
    const { items: feedItems } = await generateFeedContent({
      exploration: {
        id: explorationId,
        title: meta.title,
        feedLabel: meta.feedLabel,
        bg: meta.bg,
        text: meta.text
      },
      context,
      library: morningRulesFeedLibrary,
      limit: 6,
      openaiApiKey: null
    });

    for (const rawItem of feedItems) {
      const updateKey = `feed:${rawItem.id}`;
      if (existingKeys.has(updateKey)) continue;

      const generatedAt = new Date().toISOString();
      const feedItem = feedContentItemToFeedItem(rawItem, explorationMeta, explorationId, generatedAt);
      const savedAt = await persistUpdate(individualId, explorationId, updateKey, feedItem);
      if (savedAt) {
        feedItem._sortAt = new Date(savedAt).getTime();
        newItems.push(feedItem);
        existingKeys.add(updateKey);
      }
    }
  }

  return newItems;
}

export async function syncAllExplorationUpdates(individualId) {
  const consentedIds = await fetchConsentedExplorationIds(individualId);
  if (!consentedIds.length) return [];

  const explorationMeta = await fetchExplorationMeta(consentedIds);
  const allNew = [];
  for (const explorationId of consentedIds) {
    const items = await syncExplorationUpdates(individualId, explorationId, explorationMeta);
    allNew.push(...items);
  }
  return allNew;
}

function stripSortKey(item) {
  const { _sortAt, _meta, ...rest } = item;
  return rest;
}

export async function fetchUpdateFeedItems(individualId, explorationMeta = {}) {
  const { rows } = await query(
    `SELECT ueu.exploration_id, ueu.update_key, ueu.feed_item, ueu.generated_at
     FROM user_exploration_updates ueu
     WHERE ueu.individual_id = $1
     ORDER BY ueu.generated_at DESC
     LIMIT 30`,
    [individualId]
  );

  return rows.map((row) => {
    const feedItem = row.feed_item ?? {};
    const meta = explorationMeta[row.exploration_id] ?? {};
    const theme = getExplorationTheme(row.exploration_id);
    return stripSortKey({
      ...feedItem,
      id: feedItem.id || `update-${row.exploration_id}-${row.update_key}`,
      explorationId: row.exploration_id,
      avatarBg: feedItem.avatarBg || meta.bg || theme.surface,
      iconColor: feedItem.iconColor || feedItem.glyphColor || meta.text || theme.accent,
      time:
        feedItem.time ||
        `${meta.feedLabel || meta.title || row.exploration_id} · ${formatFeedTime(row.generated_at)}`,
      _sortAt: new Date(row.generated_at).getTime()
    });
  });
}
