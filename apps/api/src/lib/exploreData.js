import { query } from "../db.js";
import exploreCopyMock from "../mocks/exploreCopy.json" with { type: "json" };
import { buildActivityFeedItems, EXPLORATION_FEED_LABELS } from "./homeData.js";
import { buildCommunityCopy } from "./communityData.js";

const EXPLORATION_CATEGORY = {
  "morning-rules": "Energy & Focus",
  eating: "Metabolic Health",
  "screen-sleep": "Rest & Sleep",
  relaxation: "Stress & Composure",
  "upf-mood": "Mood & Nutrition"
};

const EXPLORATION_ORDER = ["morning-rules", "eating", "screen-sleep", "relaxation", "upf-mood"];

function applyUserPhaseStatus(phases, weekCurrent, weeksTotal) {
  if (!phases?.length || !weekCurrent || !weeksTotal) return phases ?? [];
  const activePhaseIdx = Math.min(
    Math.floor(((weekCurrent - 1) / weeksTotal) * phases.length),
    phases.length - 1
  );
  return phases.map((p, i) => ({
    ...p,
    status: i < activePhaseIdx ? "complete" : i === activePhaseIdx ? "active" : "upcoming"
  }));
}

function computeProgress(weekCurrent, weeksTotal) {
  if (!weeksTotal) return 0;
  return Math.round((weekCurrent / weeksTotal) * 100);
}

async function fetchCatalogExploration(id) {
  const { rows } = await query(
    `SELECT
       e.id,
       e.title,
       e.icon,
       e.theme_bg        AS bg,
       e.theme_text      AS text,
       e.duration_label  AS duration,
       e.description     AS desc,
       e.is_new          AS "isNew",
       e.catalog_active  AS "catalogActive",
       e.status_badge    AS "statusBadge",
       e.chart_label     AS "chartLabel",
       (SELECT COUNT(DISTINCT ue.individual_id)::int
        FROM user_explorations ue WHERE ue.exploration_id = e.id) AS participants,
       (SELECT re.researcher_id FROM researcher_explorations re
        WHERE re.exploration_id = e.id LIMIT 1) AS "researcherId",
       (SELECT COALESCE(json_agg(
          json_build_object('name', ep.name, 'desc', ep.description, 'status', ep.status::text)
          ORDER BY ep.sort_order
        ), '[]'::json)
        FROM exploration_phases ep WHERE ep.exploration_id = e.id) AS phases,
       (SELECT COALESCE(json_agg(
          json_build_object('icon', eo.icon, 'label', eo.label)
          ORDER BY eo.sort_order
        ), '[]'::json)
        FROM exploration_expected_outcomes eo WHERE eo.exploration_id = e.id) AS outcomes
     FROM explorations e
     WHERE e.id = $1`,
    [id]
  );
  if (!rows[0]) return null;
  return {
    ...rows[0],
    category: EXPLORATION_CATEGORY[rows[0].id] ?? null,
    feedLabel: EXPLORATION_FEED_LABELS[rows[0].id] || rows[0].title
  };
}

async function fetchUserExplorationState(individualId) {
  const [{ rows: runs }, { rows: consents }] = await Promise.all([
    query(
      `SELECT exploration_id, week_current, weeks_total, streak_days, status::text AS status, is_active
       FROM user_explorations WHERE individual_id = $1`,
      [individualId]
    ),
    query(
      `SELECT exploration_id, granted, is_active
       FROM exploration_consents WHERE individual_id = $1 AND granted = TRUE`,
      [individualId]
    )
  ]);

  const runsById = Object.fromEntries(runs.map((r) => [r.exploration_id, r]));
  const consentedIds = new Set(consents.map((c) => c.exploration_id));
  let activeExplorationId =
    consents.find((c) => c.is_active)?.exploration_id ??
    runs.find((r) => r.is_active)?.exploration_id ??
    null;

  return { runsById, consentedIds, activeExplorationId };
}

function mergeExploration(catalog, run, isActive, userConsented) {
  const weekCurrent = run?.week_current ?? (userConsented ? 1 : null);
  const weeksTotal =
    run?.weeks_total ?? Number(catalog.duration?.match(/\d+/)?.[0]) ?? null;
  const streakDays = run?.streak_days ?? (userConsented ? 0 : 0);
  const progress = userConsented ? computeProgress(weekCurrent, weeksTotal) : catalog.progress ?? 0;

  const phases =
    isActive && userConsented
      ? applyUserPhaseStatus(catalog.phases, weekCurrent, weeksTotal)
      : catalog.phases;

  return {
    ...catalog,
    active: isActive,
    userConsented,
    weekCurrent,
    weeksTotal,
    streakDays,
    streak: streakDays,
    progress,
    phases,
    statusBadge:
      userConsented && weekCurrent && weeksTotal
        ? `Week ${weekCurrent} of ${weeksTotal}`
        : catalog.statusBadge
  };
}

async function buildExploreCopy(activeExploration, individualId) {
  const feedLabel = activeExploration?.feedLabel || activeExploration?.title;
  const community = await buildCommunityCopy(activeExploration, individualId);
  return {
    ...exploreCopyMock,
    timelineCardTitle: feedLabel
      ? `Exploration — ${feedLabel}`
      : exploreCopyMock.timelineCardTitle,
    community
  };
}

export async function buildExplorePayload(individualId) {
  const { runsById, consentedIds, activeExplorationId } =
    await fetchUserExplorationState(individualId);

  const catalogs = await Promise.all(
    EXPLORATION_ORDER.map((id) => fetchCatalogExploration(id))
  );

  const merged = catalogs.filter(Boolean).map((catalog) => {
    const run = runsById[catalog.id];
    const userConsented = consentedIds.has(catalog.id);
    const isActive = catalog.id === activeExplorationId;
    return mergeExploration(catalog, run, isActive, userConsented);
  });

  const activeExploration = merged.find((e) => e.active) ?? null;
  const availableExplorations = merged.filter((e) => !e.active);
  const activity = await buildActivityFeedItems(individualId);
  const copy = await buildExploreCopy(activeExploration, individualId);

  return {
    copy,
    activeExploration,
    availableExplorations,
    explorationOrder: merged.map((e) => e.id),
    activeExplorationId,
    activity
  };
}
