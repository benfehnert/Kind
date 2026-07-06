import feedMock from "../mocks/feed.json" with { type: "json" };

export const STATIC_FEED_EXPLORATION_IDS = feedMock.feedExpIds ?? [];

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
