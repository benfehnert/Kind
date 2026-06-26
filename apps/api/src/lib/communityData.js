import { query } from "../db.js";
import exploreCopyMock from "../mocks/exploreCopy.json" with { type: "json" };
import { EXPLORATION_FEED_LABELS } from "./homeData.js";

function stripHtml(text) {
  return String(text ?? "").replace(/<[^>]+>/g, "");
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

async function fetchPendingPublicationCount(explorationId) {
  const { rows } = await query(
    `SELECT COUNT(*)::int AS count
     FROM feed_items
     WHERE feed_type = 'science'
       AND (exploration_id = $1 OR exploration_id IS NULL)
       AND (
         COALESCE(highlight, '') ILIKE '%pre-print%'
         OR COALESCE(highlight, '') ILIKE '%publication%'
         OR COALESCE(highlight, '') ILIKE '%in preparation%'
       )`,
    [explorationId]
  );
  return rows[0]?.count ?? 0;
}

async function userHasLogs(individualId, explorationId) {
  if (!individualId || !explorationId) return false;
  const { rows } = await query(
    `SELECT 1 FROM daily_logs
     WHERE individual_id = $1 AND exploration_id = $2
     LIMIT 1`,
    [individualId, explorationId]
  );
  return rows.length > 0;
}

async function fetchCommunityInsightBody(explorationId, individualId, feedLabel) {
  const { rows } = await query(
    `SELECT body
     FROM feed_items
     WHERE exploration_id = $1 AND feed_type = 'science'
     ORDER BY sort_order, published_at DESC
     LIMIT 1`,
    [explorationId]
  );

  const body = rows[0]?.body;
  if (!body) {
    return `Explorers in the ${feedLabel} study are building a shared picture of what works. Join in and log daily to compare your results with the community.`;
  }

  const contributing = await userHasLogs(individualId, explorationId);
  if (contributing) return body;

  return body
    .replace(/\s*Your data is contributing to this finding\.?/gi, ".")
    .replace(/\s*You're on the same track\.?/gi, ".");
}

export async function buildCommunityCopy(activeExploration, individualId) {
  const explorationId = activeExploration?.id ?? null;
  const feedLabel =
    activeExploration?.feedLabel ||
    (explorationId ? EXPLORATION_FEED_LABELS[explorationId] : null) ||
    activeExploration?.title ||
    "health explorations";

  const participantCount = explorationId
    ? await fetchParticipantCount(explorationId)
    : 0;
  const paperCount = explorationId ? await fetchPendingPublicationCount(explorationId) : 0;

  const bannerBadges = [];
  if (participantCount > 0) {
    bannerBadges.push({
      variant: "teal",
      label: `${participantCount} participant${participantCount === 1 ? "" : "s"}`
    });
  }
  if (paperCount > 0) {
    bannerBadges.push({
      variant: "teal",
      label: `${paperCount} paper${paperCount === 1 ? "" : "s"} pending`
    });
  }

  const bannerBody = explorationId
    ? `With your consent, your anonymised data joins a growing dataset. Combined across participants, this supports open publications on how ${feedLabel} affect wellbeing — science that belongs to everyone.`
    : "With your consent, your anonymised data joins a growing dataset. Combined across participants, this supports open publications from everyday health exploration — science that belongs to everyone.";

  const insightCardBody = explorationId
    ? await fetchCommunityInsightBody(explorationId, individualId, feedLabel)
    : "Join an exploration to see community findings from others on similar health journeys.";

  return {
    title: exploreCopyMock.community.title,
    subtitle: exploreCopyMock.community.subtitle,
    bannerTitle: exploreCopyMock.community.bannerTitle,
    bannerBody,
    bannerBadges,
    subTabs: exploreCopyMock.community.subTabs,
    nearYouTitle: exploreCopyMock.community.nearYouTitle,
    insightCardTitle: exploreCopyMock.community.insightCardTitle,
    insightCardBody
  };
}

export async function buildCommunityPayload(individualId, activeExploration, activeExplorationId) {
  const copy = await buildCommunityCopy(activeExploration, individualId);

  return {
    copy,
    activeExplorationId: activeExplorationId ?? null,
    communitySearchPlaceholder: exploreCopyMock.communitySearchPlaceholder
  };
}
