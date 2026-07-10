import { query } from "../db.js";

export const REPORT_LABELS = {
  BASELINE_SUMMARY: "Baseline report",
  INTERVENTION_INTERIM: "Interim analysis report",
  OPTIMISE_COMPLETION: "Optimise phase report",
  FINAL_STUDY_COMPLETE: "Final report",
  COHORT_COMPARISON: "Community comparison",
  KIND_COMPARISON: "Community comparison"
};

export const FINAL_REPORT_TYPE = "FINAL_STUDY_COMPLETE";

const CENT_FEED_REPORT_TYPES = new Set([
  "BASELINE_SUMMARY",
  "INTERVENTION_INTERIM",
  "OPTIMISE_COMPLETION",
  FINAL_REPORT_TYPE
]);

export function parseReportType(updateKey) {
  if (!updateKey?.startsWith("cent:")) return null;
  return updateKey.slice("cent:".length);
}

export function applyReportLabel(report, reportType) {
  const label = REPORT_LABELS[reportType];
  if (!report || !label) return report;
  const next = { ...report, reportTitle: label };
  if (next.mobileView) {
    next.mobileView = { ...next.mobileView, reportTitleLabel: label };
  }
  return next;
}

export function centReportFeedRoute(explorationId, reportType) {
  if (reportType === FINAL_REPORT_TYPE) {
    return { route: "ExplorationReport", routeParams: { explorationId } };
  }
  if (CENT_FEED_REPORT_TYPES.has(reportType)) {
    return { route: "CentPhaseReport", routeParams: { explorationId, reportType } };
  }
  return {};
}

export function enrichCentReportFeedItem(feedItem, updateKey, explorationId) {
  const reportType = parseReportType(updateKey);
  if (!reportType || !CENT_FEED_REPORT_TYPES.has(reportType)) return feedItem;

  const label = REPORT_LABELS[reportType];
  const isFinal = reportType === FINAL_REPORT_TYPE;
  const { route, routeParams } = centReportFeedRoute(explorationId, reportType);
  const guidance = feedItem.highlight;
  const hasGuidance = guidance && !String(guidance).startsWith("Tap to view");

  return {
    ...feedItem,
    displayName: label,
    badgeLabel: "Report",
    route,
    routeParams,
    highlight: hasGuidance
      ? guidance
      : isFinal
        ? "Tap to view your full personalised analysis."
        : "Tap to view your report."
  };
}

function reportHeadline(content) {
  if (!content || typeof content !== "object") return null;
  return content.headline || content.summary || content.lede || null;
}

function mapReportRow(row) {
  const reportType = parseReportType(row.update_key);
  if (!reportType) return null;
  return {
    reportType,
    label: REPORT_LABELS[reportType] || reportType.replace(/_/g, " ").toLowerCase(),
    generatedAt: row.generated_at,
    headline: reportHeadline(row.report_content),
    isFinal: reportType === FINAL_REPORT_TYPE
  };
}

export async function fetchExplorationReportsList(individualId, explorationId) {
  const { rows } = await query(
    `SELECT update_key, generated_at, report_content
     FROM user_exploration_updates
     WHERE individual_id = $1
       AND exploration_id = $2
       AND update_key LIKE 'cent:%'
       AND report_content IS NOT NULL
     ORDER BY generated_at ASC`,
    [individualId, explorationId]
  );

  return {
    explorationId,
    items: rows.map(mapReportRow).filter(Boolean)
  };
}

export async function fetchExplorationPhaseReport(individualId, explorationId, reportType) {
  const updateKey = `cent:${reportType}`;
  const { rows } = await query(
    `SELECT report_content, generated_at
     FROM user_exploration_updates
     WHERE individual_id = $1
       AND exploration_id = $2
       AND update_key = $3
       AND report_content IS NOT NULL`,
    [individualId, explorationId, updateKey]
  );

  if (!rows.length) return null;

  return {
    explorationId,
    reportType,
    report: applyReportLabel(rows[0].report_content, reportType),
    generatedAt: rows[0].generated_at
  };
}

export async function fetchCommunityExplorationRun(individualId, explorationId) {
  const { rows } = await query(
    `SELECT week_current, weeks_total, status, streak_days, started_at, completed_at, is_active
     FROM user_explorations
     WHERE individual_id = $1 AND exploration_id = $2`,
    [individualId, explorationId]
  );

  if (!rows.length) return null;

  const row = rows[0];
  return {
    explorationId,
    weekCurrent: row.week_current,
    weeksTotal: row.weeks_total,
    status: row.status,
    streakDays: row.streak_days ?? 0,
    startedAt: row.started_at,
    completedAt: row.completed_at,
    isActive: row.is_active
  };
}

export async function fetchCommunityExplorationLogs(individualId, explorationId) {
  const { rows } = await query(
    `SELECT log_date, field_values, created_at
     FROM daily_logs
     WHERE individual_id = $1 AND exploration_id = $2
     ORDER BY log_date DESC
     LIMIT 30`,
    [individualId, explorationId]
  );

  return {
    explorationId,
    items: rows.map((r) => ({
      logDate: r.log_date,
      fieldValues: r.field_values,
      createdAt: r.created_at
    }))
  };
}

export async function resolveIndividualIdBySlug(slug) {
  const { rows } = await query(`SELECT id FROM individuals WHERE slug = $1`, [slug]);
  return rows[0]?.id ?? null;
}
