import community from "../mocks/community.json" with { type: "json" };

export const ANNA_DEMO_SLUG = "anna-ross";
export const ANNA_DEMO_EMAIL = "anna@kind.example";

/** Seeded community fixture profiles (visible to Anna only). */
export const DUMMY_COMMUNITY_SLUGS = [
  ...Object.keys(community.commUsers ?? {}),
  ...(community.basicUsers ?? []).map((u) => u.id),
  ...(community.followerOnly ?? []).map((u) => u.id)
];

/** Anna + all dummy community profiles — preserved during dev-user purge. */
export const DEMO_INDIVIDUAL_SLUGS = [ANNA_DEMO_SLUG, ...DUMMY_COMMUNITY_SLUGS];

export function isDummyCommunitySlug(slug) {
  return DUMMY_COMMUNITY_SLUGS.includes(slug);
}

export function isDemoIndividualSlug(slug) {
  return DEMO_INDIVIDUAL_SLUGS.includes(slug);
}

/** Hide Anna and dummy profiles from everyone except Anna. */
export function isHiddenFromCommunity(viewerIsAnna, targetSlug) {
  if (viewerIsAnna) return false;
  return targetSlug === ANNA_DEMO_SLUG || isDummyCommunitySlug(targetSlug);
}
