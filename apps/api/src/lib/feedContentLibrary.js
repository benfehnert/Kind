import feedMock from "../mocks/feed.json" with { type: "json" };

export const STATIC_FEED_EXPLORATION_IDS = feedMock.feedExpIds ?? [];

function stripHtml(text) {
  return String(text ?? "").replace(/<[^>]+>/g, "");
}

/** Dummy cohort statistics (e.g. "51 explorers", "n=28") — hidden from new users. */
export function isCohortStatsScience({ body, highlight, cohortStats } = {}) {
  if (cohortStats === true) return true;
  if (cohortStats === false) return false;

  const text = `${stripHtml(body)} ${stripHtml(highlight)}`;
  return (
    /\b\d+\s+explorers\b/i.test(text) ||
    /\b\d+\s+(?:active\s+)?participants\b/i.test(text) ||
    /\bacross\s+\d+\s+active\s+participants\b/i.test(text) ||
    /\bamong\s+\d+\s+explorers\b/i.test(text) ||
    /\bcohort\s*\(\s*n\s*=\s*\d+\s*\)/i.test(text) ||
    /\bacross\s+\d+\s+matched\s+participants\b/i.test(text) ||
    /\bn\s*=\s*\d+\b/i.test(text)
  );
}

export function buildStaticFeedRows() {
  const rows = [];
  let order = 0;

  for (const expId of STATIC_FEED_EXPLORATION_IDS) {
    for (const tip of feedMock.feedTips?.[expId] ?? []) {
      rows.push({
        id: `static-tip-${expId}-${order}`,
        type: "tip",
        exploration_id: expId,
        headline: `Tip for ${expId}`,
        body: tip.body ?? null,
        highlight: null,
        published_at: new Date(Date.now() - order * 3600000).toISOString(),
        sort_order: order++
      });
    }
  }

  for (const expId of STATIC_FEED_EXPLORATION_IDS) {
    for (const sci of feedMock.feedScience?.[expId] ?? []) {
      rows.push({
        id: `static-science-${expId}-${order}`,
        type: "science",
        exploration_id: expId,
        headline: sci.headline ?? `Science: ${expId}`,
        body: sci.body ?? null,
        highlight: sci.highlight ?? null,
        cohortStats: sci.cohortStats ?? isCohortStatsScience(sci),
        published_at: new Date(Date.now() - order * 3600000).toISOString(),
        sort_order: order++
      });
    }
  }

  return rows;
}

export function filterStaticFeedRows(explorationIds) {
  const allowed = new Set(explorationIds?.length ? explorationIds : STATIC_FEED_EXPLORATION_IDS);
  return buildStaticFeedRows().filter((row) => allowed.has(row.exploration_id));
}
