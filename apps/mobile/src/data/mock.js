import community from "../../mock-data/community.json";
import explorations from "../../mock-data/explorations.json";
import explorationEvidence from "../../mock-data/explorationEvidence.json";
import feed from "../../mock-data/feed.json";
import home from "../../mock-data/home.json";
import insight from "../../mock-data/insight.json";
import profile from "../../mock-data/profile.json";
import search from "../../mock-data/search.json";
import notifications from "../../mock-data/notifications.json";
import exploreCopy from "../../mock-data/exploreCopy.json";
import exploreChat from "../../mock-data/exploreChat.json";
import consent from "../../mock-data/consent.json";

export {
  community,
  explorations,
  explorationEvidence,
  feed,
  home,
  insight,
  profile,
  search,
  notifications,
  exploreCopy,
  exploreChat,
  consent
};

/** Map legacy Unsplash URL → scene key (matches community.sceneAvatars base path). */
export function getSceneKeyFromAvatarUrl(url) {
  if (!url) return null;
  const normalized = url.split("?")[0];
  for (const [key, u] of Object.entries(community.sceneAvatars || {})) {
    if (u.split("?")[0] === normalized) return key;
  }
  return null;
}

/** Explorer row resolution (prototype getUserForProfile) */
export function getUserProfile(userId, followerIdSet) {
  const cu = community.commUsers[userId];
  if (cu) {
    const follower = !!(cu.follower || followerIdSet?.has(userId));
    return {
      id: userId,
      ...cu,
      sceneKey: cu.sceneKey || (cu.avatarUrl ? getSceneKeyFromAvatarUrl(cu.avatarUrl) : null),
      follower
    };
  }
  const bu = [...(community.basicUsers || []), ...(community.followerOnly || [])].find((u) => u.id === userId);
  if (!bu) return null;
  const followerIdList = followerIdSet ?? new Set(community.socialMeta?.followerIdsExpanded || []);
  return {
    id: userId,
    name: bu.name,
    loc: bu.loc,
    img: bu.img,
    initials: bu.initials,
    meta: bu.meta,
    avatarUrlKey: null,
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
        active: true
      }
    ],
    acts: [
      {
        t: "Sharing progress with the kind community.",
        time: "Recently",
        exp: "Health exploration",
        detail: "Logs and milestones when they choose to share.",
        nc: 0
      }
    ],
    badges: [],
    follower: followerIdList.has(userId)
  };
}

/** Map researcher id → object */
export function getResearcher(id) {
  return (community.researchers || []).find((r) => r.id === id) || null;
}

export function exploreResponseFor(query, explorers) {
  const q = (query || "").trim().toLowerCase();
  const part = (k) =>
    explorers[k]?.participants ??
    explorers[k.replace(/^"|"$/g, "")]?.participants ??
    "";
  if (!q) {
    const d = exploreChat.defaultRule;
    return {
      msg: "",
      explorationIds: d.explorationIds.slice(0, d.maxIds || d.explorationIds.length)
    };
  }
  for (const rule of exploreChat.rules || []) {
    try {
      if (new RegExp(rule.pattern, "i").test(q)) {
        let msg = rule.message;
        msg = msg.replace(/\{\{participants\.([^}]+)\}\}/g, (_, id) => part(id.trim()));
        return { msg, explorationIds: rule.explorationIds || [] };
      }
    } catch {
      // ignore bad regex
    }
  }
  const def = exploreChat.defaultRule;
  let msg = def.message;
  const sliceLen = def.maxQueryLen || 30;
  msg = msg.replace(
    /\{\{querySnippet\}\}/g,
    def.sliceQuery ? q.slice(0, sliceLen) : q
  );
  msg = msg.replace(/\{\{participants\.([^}]+)\}\}/g, (_, id) => part(id.trim()));
  return {
    msg,
    explorationIds: (def.explorationIds || []).slice(0, def.maxIds || def.explorationIds?.length || 99)
  };
}

export function explorationOrderUi() {
  const ids = ["morning-rules", "eating", "screen-sleep", "relaxation", "upf-mood"];
  return ids.filter((id) => explorations[id]);
}
