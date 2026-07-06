/** Map a Short catalog ID to the parent ID used for evidence documents. */
export function evidenceExplorationId(explorationId) {
  if (typeof explorationId === "string" && explorationId.endsWith("-short")) {
    return explorationId.replace(/-short$/, "");
  }
  return explorationId;
}

/** Resolve a catalog ID from a parent or short exploration ID. */
export function catalogExplorationId(explorationId) {
  if (typeof explorationId !== "string" || !explorationId) return explorationId;
  if (explorationId.endsWith("-short")) return explorationId;
  return `${explorationId}-short`;
}
