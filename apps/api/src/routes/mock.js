import { Hono } from "hono";
import community from "../mocks/community.json";
import explorations from "../mocks/explorations.json";
import explorationEvidence from "../mocks/explorationEvidence.json";
import feed from "../mocks/feed.json";
import home from "../mocks/home.json";
import insight from "../mocks/insight.json";
import profile from "../mocks/profile.json";
import search from "../mocks/search.json";
import notifications from "../mocks/notifications.json";
import exploreCopy from "../mocks/exploreCopy.json";
import exploreChat from "../mocks/exploreChat.json";
import consent from "../mocks/consent.json";

const router = new Hono();

// ---------------------------------------------------------------------------
// Explorations
// ---------------------------------------------------------------------------

const EXPLORATION_ORDER = ["morning-rules", "eating", "screen-sleep", "relaxation", "upf-mood"];

router.get("/explorations", (c) => {
  const items = EXPLORATION_ORDER.filter((id) => explorations[id]).map((id) => ({
    id,
    ...explorations[id]
  }));
  return c.json({ items });
});

router.get("/explorations/evidence", (c) => {
  return c.json(explorationEvidence);
});

router.get("/explorations/:id", (c) => {
  const id = c.req.param("id");
  const data = explorations[id];
  if (!data) return c.json({ error: "Exploration not found" }, 404);
  return c.json({ id, ...data });
});

router.get("/explorations/:id/evidence", (c) => {
  const id = c.req.param("id");
  const data = explorationEvidence[id];
  if (!data) return c.json({ error: "Evidence not found" }, 404);
  return c.json(data);
});

// ---------------------------------------------------------------------------
// Community
// ---------------------------------------------------------------------------

router.get("/community/individuals", (c) => {
  const commUsers = Object.entries(community.commUsers || {}).map(([id, u]) => ({
    id,
    tier: "comm",
    ...u
  }));
  const basicUsers = (community.basicUsers || []).map((u) => ({ ...u, tier: "basic" }));
  const followerOnly = (community.followerOnly || []).map((u) => ({ ...u, tier: "follower" }));
  return c.json({
    items: [...commUsers, ...basicUsers, ...followerOnly],
    explorationFollowers: community.explorationFollowers || {}
  });
});

router.get("/community/researchers", (c) => {
  return c.json({ items: community.researchers || [] });
});

router.get("/community/individuals/:id", (c) => {
  const id = c.req.param("id");
  const cu = community.commUsers?.[id];
  if (cu) return c.json({ id, tier: "comm", ...cu });

  const bu = [...(community.basicUsers || []), ...(community.followerOnly || [])].find(
    (u) => u.id === id
  );
  if (bu) return c.json({ tier: "basic", ...bu });

  return c.json({ error: "Individual not found" }, 404);
});

// ---------------------------------------------------------------------------
// Feed
// ---------------------------------------------------------------------------

function buildFeedItems() {
  const items = [];

  (feed.staticItems || []).forEach((item) => items.push(item));

  (feed.feedExpIds || []).forEach((expId, i) => {
    const tips = feed.feedTips?.[expId] || [];
    const sciences = feed.feedScience?.[expId] || [];
    const tipTime = feed.feedTipTimes?.[i] || "";
    const sciTime = feed.feedScienceTimes?.[i] || "";

    tips.forEach((tip) => {
      items.push({ type: "tip", explorationId: expId, time: tipTime, ...tip });
    });
    sciences.forEach((sci) => {
      items.push({ type: "science", explorationId: expId, time: sciTime, ...sci });
    });
  });

  return items;
}

const feedItems = buildFeedItems();

router.get("/feed", (c) => {
  const type = c.req.query("type");
  const items =
    type && type !== "all" ? feedItems.filter((item) => item.type === type) : feedItems;
  return c.json({ chips: feed.chips, items });
});

// ---------------------------------------------------------------------------
// Notifications
// ---------------------------------------------------------------------------

router.get("/notifications", (c) => {
  return c.json({ items: notifications.items || notifications });
});

// ---------------------------------------------------------------------------
// Search
// ---------------------------------------------------------------------------

router.get("/search", (c) => {
  const q = (c.req.query("q") || "").toLowerCase();
  if (!q) return c.json(search);

  const explorationResults = (search.explorations || []).filter(
    (e) =>
      e.title?.toLowerCase().includes(q) ||
      e.description?.toLowerCase().includes(q) ||
      e.id?.toLowerCase().includes(q)
  );
  const communityResults = (search.community || []).filter(
    (u) =>
      u.name?.toLowerCase().includes(q) ||
      u.meta?.toLowerCase().includes(q)
  );
  return c.json({ explorations: explorationResults, community: communityResults });
});

// ---------------------------------------------------------------------------
// Insights
// ---------------------------------------------------------------------------

router.get("/insights", (c) => {
  return c.json(insight);
});

// ---------------------------------------------------------------------------
// Home
// ---------------------------------------------------------------------------

router.get("/home", (c) => {
  return c.json(home);
});

// ---------------------------------------------------------------------------
// Profile
// ---------------------------------------------------------------------------

router.get("/profile", (c) => {
  return c.json(profile);
});

router.patch("/profile/privacy", async (c) => {
  const body = await c.req.json().catch(() => ({}));
  return c.json({ ok: true, privacy: body });
});

// ---------------------------------------------------------------------------
// Consent
// ---------------------------------------------------------------------------

router.get("/consent", (c) => {
  return c.json(consent);
});

router.post("/consent", (c) => {
  return c.json({ ok: true });
});

// ---------------------------------------------------------------------------
// Social follows
// ---------------------------------------------------------------------------

router.get("/social/follows", (c) => {
  return c.json(community.socialMeta || {});
});

router.patch("/social/follows", async (c) => {
  const body = await c.req.json().catch(() => ({}));
  return c.json({ ok: true, ...body });
});

// ---------------------------------------------------------------------------
// Explore copy & chat
// ---------------------------------------------------------------------------

router.get("/explore/copy", (c) => {
  return c.json(exploreCopy);
});

router.post("/explore/chat", async (c) => {
  const body = await c.req.json().catch(() => ({}));
  const { query: q = "", explorers = {} } = body;
  const norm = q.trim().toLowerCase();

  const participantCount = (id) => explorers[id]?.participants ?? "";

  if (!norm) {
    const d = exploreChat.defaultRule;
    return c.json({
      msg: "",
      explorationIds: (d.explorationIds || []).slice(0, d.maxIds || d.explorationIds.length)
    });
  }

  for (const rule of exploreChat.rules || []) {
    try {
      if (new RegExp(rule.pattern, "i").test(norm)) {
        const msg = rule.message.replace(
          /\{\{participants\.([^}]+)\}\}/g,
          (_, id) => participantCount(id.trim())
        );
        return c.json({ msg, explorationIds: rule.explorationIds || [] });
      }
    } catch {
      // skip bad regex patterns
    }
  }

  const def = exploreChat.defaultRule;
  const sliceLen = def.maxQueryLen || 30;
  const msg = def.message
    .replace(/\{\{querySnippet\}\}/g, def.sliceQuery ? norm.slice(0, sliceLen) : norm)
    .replace(/\{\{participants\.([^}]+)\}\}/g, (_, id) => participantCount(id.trim()));

  return c.json({
    msg,
    explorationIds: (def.explorationIds || []).slice(0, def.maxIds || def.explorationIds?.length || 99)
  });
});

export default router;
