import { evidenceExplorationId } from "./explorationIds";

/** Resolve exploration metadata from the catalog and/or explore page payload. */
export function resolveExplorationMeta(id, { explorations, explorePage } = {}) {
  if (!id) return null;

  if (explorations?.[id]) {
    return { ...explorations[id], id };
  }

  const fromExplore = [
    ...(explorePage?.activeExplorations ?? []),
    ...(explorePage?.availableExplorations ?? []),
    ...(explorePage?.recommendedExplorations ?? [])
  ].find((entry) => entry?.id === id);

  if (fromExplore) return fromExplore;

  const shortId = id.endsWith("-short") ? id : `${id}-short`;
  if (explorations?.[shortId]) {
    return { ...explorations[shortId], id: shortId };
  }

  const parentId = evidenceExplorationId(id);
  if (parentId !== id && explorations?.[parentId]) {
    return { ...explorations[parentId], id: parentId };
  }

  return null;
}
