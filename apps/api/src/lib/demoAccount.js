import { query } from "../db.js";
import { ANNA_DEMO_SLUG, isHiddenFromCommunity } from "./demoProfiles.js";

export { ANNA_DEMO_SLUG, isHiddenFromCommunity } from "./demoProfiles.js";

/** @deprecated Use isHiddenFromCommunity */
export function isAnnaHiddenFromCommunity(viewerIsAnna, targetSlug) {
  return isHiddenFromCommunity(viewerIsAnna, targetSlug);
}

export async function isAnnaDemoIndividual(individualId) {
  if (!individualId) return false;
  const { rows } = await query(
    "SELECT 1 FROM individuals WHERE id = $1 AND slug = $2 LIMIT 1",
    [individualId, ANNA_DEMO_SLUG]
  );
  return rows.length > 0;
}
