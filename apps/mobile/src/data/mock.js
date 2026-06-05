// Pure client-side utility functions.
// JSON data is no longer imported here — it is loaded from the API via DataContext.

import { getSceneKeyFromAvatarUrl } from "../assets/sceneAvatars";

export { getSceneKeyFromAvatarUrl };

/** Explorer profile resolution — merges commUser/basicUser with fallback defaults. */
export function getUserProfile(userId, community, followerIdSet) {
  const cu = community.commUsers?.[userId];
  if (cu) {
    const follower = !!(cu.follower || followerIdSet?.has(userId));
    return { id: userId, ...cu, follower };
  }
  const bu = [...(community.basicUsers || []), ...(community.followerOnly || [])].find(
    (u) => u.id === userId
  );
  if (!bu) return null;
  const followerIdList = followerIdSet ?? new Set(community.socialMeta?.followerIdsExpanded || []);
  return {
    id: userId,
    name: bu.name,
    loc: bu.loc,
    img: bu.img,
    initials: bu.initials,
    meta: bu.meta,
    sceneKey: bu.avatarUrl ? getSceneKeyFromAvatarUrl(bu.avatarUrl) : null,
    bio: "Explorer on kind — building their personal health story.",
    exps: [
      {
        id: "eating",
        name: "Does time restricted eating improve my energy levels?",
        icon: "🕐",
        bg: "#FDF0E4",
        w: 3,
        of: 6,
        active: true,
      },
    ],
    acts: [
      {
        t: "Sharing progress with the kind community.",
        time: "Recently",
        exp: "Health exploration",
        detail: "Logs and milestones when they choose to share.",
        nc: 0,
      },
    ],
    badges: [],
    follower: followerIdList.has(userId),
  };
}

/** Look up a researcher by id from the researchers array. */
export function getResearcher(id, researchers = []) {
  return researchers.find((r) => r.id === id) || null;
}

/** Ordered exploration IDs, filtered to those present in the data. */
export function explorationOrderUi(explorations = {}) {
  const ids = ["morning-rules", "eating", "screen-sleep", "relaxation", "upf-mood"];
  return ids.filter((id) => explorations[id]);
}
