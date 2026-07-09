import { query } from "../db.js";

export const REPORT_LABELS = {
  BASELINE_SUMMARY: "Baseline summary",
  INTERVENTION_INTERIM: "Interim analysis",
  OPTIMISE_COMPLETION: "Optimise phase complete",
  FINAL_STUDY_COMPLETE: "Personalised trial final report",
  COHORT_COMPARISON: "Community comparison",
  KIND_COMPARISON: "Community comparison"
};

const FINAL_REPORT_TYPE = "FINAL_STUDY_COMPLETE";

function parseReportType(updateKey) {
  if (!updateKey?.startsWith("cent:")) return null;
  return updateKey.slice("cent:".length);
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
    report: rows[0].report_content,
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
