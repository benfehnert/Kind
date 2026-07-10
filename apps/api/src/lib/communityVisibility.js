import { query } from "../db.js";
import { isAnnaDemoIndividual } from "./demoAccount.js";
import { isHiddenFromCommunity } from "./demoProfiles.js";

/** Matches DB default when no privacy_settings row exists. */
export function coalesceVisibleInCommunity(value) {
  return value === null || value === undefined ? true : Boolean(value);
}

export async function fetchVisibleInCommunity(individualId) {
  if (!individualId) return false;
  const { rows } = await query(
    `SELECT visible_in_community FROM privacy_settings WHERE individual_id = $1`,
    [individualId]
  );
  if (!rows.length) return true;
  return Boolean(rows[0].visible_in_community);
}

export async function getCommunityAccessContext(viewerId) {
  if (!viewerId) {
    return {
      viewerId: null,
      viewerSlug: null,
      canViewIndividuals: false,
      canBeViewedByOthers: false
    };
  }

  const { rows } = await query(
    `SELECT i.slug, ps.visible_in_community
     FROM individuals i
     LEFT JOIN privacy_settings ps ON ps.individual_id = i.id
     WHERE i.id = $1`,
    [viewerId]
  );
  const row = rows[0];
  const canViewIndividuals = row ? coalesceVisibleInCommunity(row.visible_in_community) : false;
  return {
    viewerId,
    viewerSlug: row?.slug ?? null,
    canViewIndividuals,
    canBeViewedByOthers: canViewIndividuals
  };
}

async function fetchVisibleSlugSet() {
  const { rows } = await query(
    `SELECT i.slug
     FROM individuals i
     LEFT JOIN privacy_settings ps ON ps.individual_id = i.id
     WHERE COALESCE(ps.visible_in_community, TRUE) = TRUE`
  );
  return new Set(rows.map((r) => r.slug));
}

/**
 * Per-request community visibility filters for social/community surfaces.
 */
export async function buildCommunityVisibilityFilters(viewerId) {
  const viewerIsAnna = await isAnnaDemoIndividual(viewerId);
  const ctx = await getCommunityAccessContext(viewerId);
  const visibleSlugSet = await fetchVisibleSlugSet();

  const shouldHideSlug = (targetSlug) => {
    if (!targetSlug) return true;
    if (isHiddenFromCommunity(viewerIsAnna, targetSlug)) return true;
    if (!visibleSlugSet.has(targetSlug)) return true;
    if (!ctx.canViewIndividuals && targetSlug !== ctx.viewerSlug) return true;
    return false;
  };

  return { viewerIsAnna, ctx, visibleSlugSet, shouldHideSlug };
}

export const COMMUNITY_INDIVIDUALS_HIDDEN_COPY = {
  title: "Individuals not available",
  body: "You have turned off community visibility. You cannot view other Individuals while this setting is off. When you log back in after changing this preference, you will not be visible to other Individuals either."
};
