import { query } from "../db.js";
import dataUsageMock from "../mocks/dataUsage.json" with { type: "json" };
import { EXPLORATION_FEED_LABELS } from "./homeData.js";

const HEALTH_EXPLORATION_CONFIRMATION =
  "Your check-in data has been used to generate personalised analysis reports and support your health journey in this exploration.";

const RESEARCHER_PUBLICATIONS = {
  "morning-rules": {
    title: "Morning light and movement routines: a naturalistic N-of-1 cohort study",
    meta: "Marsh et al. · Pre-print expected 2026 · Open access"
  },
  eating: {
    title: "Time-restricted eating and daily energy: an exploratory cohort analysis",
    meta: "Fyfe et al. · Pre-print expected Q3 2026 · Open access"
  },
  "screen-sleep": {
    title: "Evening screen exposure and sleep quality in working adults",
    meta: "Williams et al. · Pre-print in preparation · Open access"
  },
  relaxation: {
    title: "Low-cost relaxation practices for daily stress: a citizen science cohort study",
    meta: "Hassan et al. · Pre-print expected 2026 · Open access"
  },
  "upf-mood": {
    title: "Ultra-processed food reduction and mood variability: an exploratory analysis",
    meta: "Nair et al. · Pre-print in preparation · Open access"
  }
};

async function fetchParticipantCount(explorationId) {
  const { rows } = await query(
    `SELECT COUNT(DISTINCT individual_id)::int AS count
     FROM user_explorations
     WHERE exploration_id = $1`,
    [explorationId]
  );
  return rows[0]?.count ?? 0;
}

async function fetchConsentedExplorations(individualId) {
  const { rows } = await query(
    `SELECT
       ec.exploration_id,
       ec.consented_at,
       e.title,
       (SELECT COUNT(*)::int
        FROM daily_logs dl
        WHERE dl.individual_id = ec.individual_id
          AND dl.exploration_id = ec.exploration_id) AS log_count,
       r.display_name AS researcher_name,
       r.organisation AS researcher_org
     FROM exploration_consents ec
     JOIN explorations e ON e.id = ec.exploration_id
     LEFT JOIN researcher_explorations re ON re.exploration_id = e.id
     LEFT JOIN researchers r ON r.id = re.researcher_id
     WHERE ec.individual_id = $1 AND ec.granted = TRUE
     ORDER BY ec.consented_at DESC NULLS LAST`,
    [individualId]
  );
  return rows;
}

async function fetchScienceConsent(individualId) {
  const { rows } = await query(
    `SELECT contribute_to_citizen_science
     FROM privacy_settings
     WHERE individual_id = $1`,
    [individualId]
  );
  return Boolean(rows[0]?.contribute_to_citizen_science);
}

function buildKindAnalysisItem(explorationId, title, participantCount) {
  const feedLabel = EXPLORATION_FEED_LABELS[explorationId] || title;
  return {
    explorationId,
    source: "kind · In preparation",
    title: `${title}: a personalised trial cohort study across ${participantCount} participant${participantCount === 1 ? "" : "s"}`,
    meta: "kind research team & contributors · Expected June 2026 · Open access",
    status: "In preparation"
  };
}

function buildResearcherAnalysisItem(row) {
  const publication = RESEARCHER_PUBLICATIONS[row.exploration_id];
  if (!publication || !row.researcher_name) return null;

  return {
    explorationId: row.exploration_id,
    researcherName: row.researcher_name,
    researcherOrg: row.researcher_org,
    title: publication.title,
    meta: publication.meta,
    status: "In preparation"
  };
}

export async function buildDataUsagePayload(individualId) {
  const [rows, scienceConsent] = await Promise.all([
    fetchConsentedExplorations(individualId),
    fetchScienceConsent(individualId)
  ]);

  const healthItems = rows.map((row) => ({
    explorationId: row.exploration_id,
    title: row.title,
    feedLabel: EXPLORATION_FEED_LABELS[row.exploration_id] || row.title,
    consentedAt: row.consented_at,
    logCount: Number(row.log_count ?? 0),
    confirmation: HEALTH_EXPLORATION_CONFIRMATION
  }));

  const kindItems = [];
  const researcherItems = [];
  const seenResearchers = new Set();

  if (scienceConsent) {
    for (const row of rows) {
      if (Number(row.log_count ?? 0) < 1) continue;

      const participantCount = await fetchParticipantCount(row.exploration_id);
      kindItems.push(buildKindAnalysisItem(row.exploration_id, row.title, participantCount));

      const researcherItem = buildResearcherAnalysisItem(row);
      if (researcherItem && !seenResearchers.has(row.exploration_id)) {
        seenResearchers.add(row.exploration_id);
        researcherItems.push(researcherItem);
      }
    }
  }

  return {
    title: dataUsageMock.title,
    intro: dataUsageMock.intro,
    healthExplorations: {
      heading: dataUsageMock.healthExplorations.heading,
      body: dataUsageMock.healthExplorations.body,
      items: healthItems
    },
    kindAnalyses: {
      heading: dataUsageMock.kindAnalyses.heading,
      body: scienceConsent
        ? dataUsageMock.kindAnalyses.body
        : "You have not opted in to citizen science. Turn on “Contribute to citizen science” in your profile to allow de-identified data to support wider Kind analyses.",
      items: kindItems
    },
    researcherAnalyses: {
      heading: dataUsageMock.researcherAnalyses.heading,
      body: scienceConsent
        ? dataUsageMock.researcherAnalyses.body
        : "You have not opted in to citizen science. Turn on “Contribute to citizen science” in your profile to allow de-identified data to support researcher-led analyses.",
      items: researcherItems
    }
  };
}

export function buildMockDataUsagePayload() {
  return dataUsageMock;
}
