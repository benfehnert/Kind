import { fetchOnboardingRow } from "./meData.js";

export const DEFAULT_EXPLORATION_ORDER = [
  "morning-rules",
  "eating",
  "screen-sleep",
  "relaxation",
  "upf-mood",
  "morning-rules-short",
  "eating-short",
  "screen-sleep-short",
  "relaxation-short",
  "upf-mood-short"
];

export const EXPLORATION_CATEGORY = {
  "morning-rules": "Energy & Focus",
  eating: "Metabolic Health",
  "screen-sleep": "Rest & Sleep",
  relaxation: "Stress & Composure",
  "upf-mood": "Mood & Nutrition",
  "morning-rules-short": "Energy & Focus",
  "eating-short": "Metabolic Health",
  "screen-sleep-short": "Rest & Sleep",
  "relaxation-short": "Stress & Composure",
  "upf-mood-short": "Mood & Nutrition"
};

const HEALTH_GOAL_BOOSTS = {
  energy_focus: { "morning-rules": 3 },
  metabolic: { eating: 3 },
  sleep: { "screen-sleep": 3 },
  nutrition: { "upf-mood": 2, eating: 2 },
  mental: { relaxation: 3 }
};

const HEALTH_GOAL_LABELS = {
  energy_focus: "Energy & Focus",
  metabolic: "Metabolic Health",
  sleep: "Rest & Sleep",
  nutrition: "Diet & Nutrition",
  mental: "Mental Health"
};

const LONGER_DURATION_EXPLORATIONS = new Set(["eating", "screen-sleep", "relaxation"]);

const STARTER_FEED_LIMIT = 3;

export async function fetchOnboardingAnswers(individualId) {
  const row = await fetchOnboardingRow(individualId);
  return row?.answers ?? {};
}

function scoreExploration(explorationId, answers) {
  let score = 0;
  const reasons = [];

  const healthGoals = Array.isArray(answers?.healthGoals) ? answers.healthGoals : [];
  for (const goal of healthGoals) {
    const boosts = HEALTH_GOAL_BOOSTS[goal];
    if (boosts?.[explorationId]) {
      score += boosts[explorationId];
      reasons.push(`Matches your ${HEALTH_GOAL_LABELS[goal] ?? goal} goal`);
    }
  }

  if (answers?.longevityImportance === "top_priority" && LONGER_DURATION_EXPLORATIONS.has(explorationId)) {
    score += 1;
    reasons.push("Aligned with your long-term health priority");
  }

  return { score, matchReason: reasons[0] ?? null };
}

export function rankExplorations(answers, explorationIds) {
  const ids = explorationIds?.length ? explorationIds : DEFAULT_EXPLORATION_ORDER;
  const orderIndex = Object.fromEntries(DEFAULT_EXPLORATION_ORDER.map((id, i) => [id, i]));

  const ranked = ids.map((id) => {
    const { score, matchReason } = scoreExploration(id, answers);
    return {
      id,
      score,
      matchReason,
      category: EXPLORATION_CATEGORY[id] ?? null
    };
  });

  ranked.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return (orderIndex[a.id] ?? 99) - (orderIndex[b.id] ?? 99);
  });

  return ranked;
}

export function buildPersonalizationContext(answers, explorationIds) {
  const ranked = rankExplorations(answers, explorationIds);
  const rankedExplorationIds = ranked.map((r) => r.id);
  const primaryExplorationId = rankedExplorationIds[0] ?? null;

  const kindHelp = Array.isArray(answers?.kindHelp) ? answers.kindHelp : [];
  const feedEmphasis =
    kindHelp.includes("trials") || kindHelp.includes("insight") ? "science-first" : "default";

  return {
    primaryExplorationId,
    primaryMatchReason: ranked[0]?.matchReason ?? null,
    rankedExplorationIds,
    recommendedExplorationIds: rankedExplorationIds.slice(0, 2),
    starterFeedExplorationIds: rankedExplorationIds.slice(0, STARTER_FEED_LIMIT),
    feedEmphasis,
    basedOn: {
      healthGoals: Array.isArray(answers?.healthGoals) ? answers.healthGoals : [],
      kindHelp
    },
    ranked
  };
}

export function buildRecommendedExplorations(answers, catalogsById) {
  const explorationIds = Object.keys(catalogsById);
  const ranked = rankExplorations(answers, explorationIds);

  return ranked.slice(0, 2).map((entry) => {
    const catalog = catalogsById[entry.id] ?? {};
    return {
      id: entry.id,
      title: catalog.title ?? entry.id,
      category: entry.category,
      matchReason: entry.matchReason ?? "Recommended for you",
      score: entry.score
    };
  });
}
