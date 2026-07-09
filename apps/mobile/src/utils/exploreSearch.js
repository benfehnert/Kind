import { catalogExplorationId, evidenceExplorationId } from "./explorationIds";

const RESULTS_PAGE_SIZE = 6;

function stripHtml(value) {
  if (!value) return "";
  return String(value)
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeQuery(query) {
  return String(query || "").trim().toLowerCase();
}

function buildEvidenceSearchText(evidence) {
  if (!evidence) return "";
  const parts = [
    evidence.docTitle,
    evidence.docSubtitle,
    evidence.summaryShort,
    evidence.intro,
    evidence.note,
    evidence.bottomLine
  ];
  for (const intervention of evidence.interventions || []) {
    parts.push(
      intervention.title,
      intervention.mechanism,
      intervention.evidence,
      intervention.practical
    );
    for (const source of intervention.sources || []) {
      parts.push(source.label);
    }
  }
  return parts.filter(Boolean).join(" ").toLowerCase();
}

function explorationSubline(exploration, explorePage) {
  const active = explorePage?.activeExplorations?.find((entry) => entry.id === exploration.id);
  if (active) {
    return [active.category, active.duration, active.statusBadge].filter(Boolean).join(" · ");
  }
  const available = explorePage?.availableExplorations?.find((entry) => entry.id === exploration.id);
  if (available) {
    return [available.category, available.duration].filter(Boolean).join(" · ");
  }
  return [exploration.category, exploration.duration].filter(Boolean).join(" · ");
}

export function buildExploreSearchIndex({ explorations = {}, explorationEvidence = {}, feed = {}, explorePage }) {
  const items = [];

  for (const exploration of Object.values(explorations)) {
    if (!exploration?.id) continue;
    items.push({
      key: `exploration:${exploration.id}`,
      kind: "exploration",
      explorationId: exploration.id,
      title: exploration.title,
      sub: explorationSubline(exploration, explorePage),
      icon: exploration.icon,
      iconBg: exploration.bg,
      searchText: [
        exploration.title,
        exploration.desc,
        exploration.category,
        exploration.duration,
        exploration.feedLabel
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
    });
  }

  for (const [rawId, evidence] of Object.entries(explorationEvidence || {})) {
    if (!evidence) continue;
    const explorationId = evidenceExplorationId(rawId);
    const exploration = explorations[explorationId] || explorations[rawId];
    items.push({
      key: `evidence:${rawId}`,
      kind: "evidence",
      explorationId,
      title: evidence.docTitle,
      sub: [exploration?.category, "Evidence summary", exploration?.title].filter(Boolean).join(" · "),
      icon: "📄",
      iconBg: "#FDF0E4",
      searchText: buildEvidenceSearchText(evidence)
    });
  }

  for (const explorationId of feed.feedExpIds || []) {
    const exploration = explorations[explorationId];
    const scienceRows = feed.feedScience?.[explorationId] || [];
    scienceRows.forEach((row, index) => {
      items.push({
        key: `science:${explorationId}:${index}`,
        kind: "science",
        explorationId,
        title: stripHtml(row.body).slice(0, 120),
        sub: ["Science", exploration?.title].filter(Boolean).join(" · "),
        icon: "🔬",
        iconBg: "#E6F1FB",
        searchText: [stripHtml(row.body), stripHtml(row.highlight), exploration?.title, exploration?.category]
          .filter(Boolean)
          .join(" ")
          .toLowerCase()
      });
    });

    const tipRows = feed.feedTips?.[explorationId] || [];
    tipRows.forEach((row, index) => {
      items.push({
        key: `tip:${explorationId}:${index}`,
        kind: "tip",
        explorationId,
        title: stripHtml(row.body).slice(0, 120),
        sub: ["Tip", exploration?.title].filter(Boolean).join(" · "),
        icon: "💡",
        iconBg: "#EAF3DE",
        searchText: [stripHtml(row.body), stripHtml(row.highlight), exploration?.title, exploration?.category]
          .filter(Boolean)
          .join(" ")
          .toLowerCase()
      });
    });
  }

  return items;
}

export function filterExploreSearchResults(items, query) {
  const norm = normalizeQuery(query);
  if (!norm) return [];
  return items.filter((item) => item.searchText.includes(norm));
}

export function getExploreSearchNavigation(kind, explorationId) {
  if (kind === "evidence" || kind === "science") {
    return { screen: "Evidence", params: { id: explorationId } };
  }
  return {
    screen: "ExplorationSummary",
    params: { id: catalogExplorationId(explorationId) }
  };
}

export { RESULTS_PAGE_SIZE };
