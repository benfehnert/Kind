import { query } from "../db.js";

export const ANNA_DEMO_SLUG = "anna-ross";

export async function isAnnaDemoIndividual(individualId) {
  if (!individualId) return false;
  const { rows } = await query(
    "SELECT 1 FROM individuals WHERE id = $1 AND slug = $2 LIMIT 1",
    [individualId, ANNA_DEMO_SLUG]
  );
  return rows.length > 0;
}
