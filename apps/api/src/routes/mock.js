import { createRequire } from "module";
import { Router } from "express";

const require = createRequire(import.meta.url);

const community = require("../mocks/community.json");
const explorations = require("../mocks/explorations.json");
const explorationEvidence = require("../mocks/explorationEvidence.json");
const feed = require("../mocks/feed.json");
const home = require("../mocks/home.json");
const insight = require("../mocks/insight.json");
const profile = require("../mocks/profile.json");
const search = require("../mocks/search.json");
const notifications = require("../mocks/notifications.json");
const exploreCopy = require("../mocks/exploreCopy.json");
const exploreChat = require("../mocks/exploreChat.json");
const consent = require("../mocks/consent.json");

const router = Router();

// ---------------------------------------------------------------------------
// Explorations
// ---------------------------------------------------------------------------

const EXPLORATION_ORDER = ["morning-rules", "eating", "screen-sleep", "relaxation", "upf-mood"];

router.get("/explorations", (_req, res) => {
  const items = EXPLORATION_ORDER.filter((id) => explorations[id]).map((id) => ({
    id,
    ...explorations[id]
  }));
  res.json({ items });
});

router.get("/explorations/:id", (req, res) => {
  const data = explorations[req.params.id];
  if (!data) return res.status(404).json({ error: "Exploration not found" });
  res.json({ id: req.params.id, ...data });
});

router.get("/explorations/:id/evidence", (req, res) => {
  const data = explorationEvidence[req.params.id];
  if (!data) return res.status(404).json({ error: "Evidence not found" });
  res.json(data);
});

// ---------------------------------------------------------------------------
// Community
// ---------------------------------------------------------------------------

router.get("/community/individuals", (_req, res) => {
  const commUsers = Object.entries(community.commUsers || {}).map(([id, u]) => ({
    id,
    tier: "comm",
    ...u
  }));
  const basicUsers = (community.basicUsers || []).map((u) => ({ ...u, tier: "basic" }));
  const followerOnly = (community.followerOnly || []).map((u) => ({ ...u, tier: "follower" }));
  res.json({ items: [...commUsers, ...basicUsers, ...followerOnly] });
});

router.get("/community/researchers", (_req, res) => {
  res.json({ items: community.researchers || [] });
});

router.get("/community/individuals/:id", (req, res) => {
  const id = req.params.id;
  const cu = community.commUsers?.[id];
  if (cu) return res.json({ id, tier: "comm", ...cu });

  const bu = [...(community.basicUsers || []), ...(community.followerOnly || [])].find(
    (u) => u.id === id
  );
  if (bu) return res.json({ tier: "basic", ...bu });

  res.status(404).json({ error: "Individual not found" });
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

router.get("/feed", (req, res) => {
  const type = req.query.type;
  const items =
    type && type !== "all" ? feedItems.filter((item) => item.type === type) : feedItems;
  res.json({ chips: feed.chips, items });
});

// ---------------------------------------------------------------------------
// Notifications
// ---------------------------------------------------------------------------

router.get("/notifications", (_req, res) => {
  res.json({ items: notifications.items || notifications });
});

// ---------------------------------------------------------------------------
// Search
// ---------------------------------------------------------------------------

router.get("/search", (req, res) => {
  const q = (req.query.q || "").toLowerCase();
  if (!q) return res.json(search);

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
  res.json({ explorations: explorationResults, community: communityResults });
});

// ---------------------------------------------------------------------------
// Insights
// ---------------------------------------------------------------------------

router.get("/insights", (_req, res) => {
  res.json(insight);
});

// ---------------------------------------------------------------------------
// Home
// ---------------------------------------------------------------------------

router.get("/home", (_req, res) => {
  res.json(home);
});

// ---------------------------------------------------------------------------
// Profile
// ---------------------------------------------------------------------------

router.get("/profile", (_req, res) => {
  res.json(profile);
});

router.patch("/profile/privacy", (req, res) => {
  res.json({ ok: true, privacy: req.body });
});

// ---------------------------------------------------------------------------
// Consent
// ---------------------------------------------------------------------------

router.get("/consent", (_req, res) => {
  res.json(consent);
});

router.post("/consent", (_req, res) => {
  res.json({ ok: true });
});

// ---------------------------------------------------------------------------
// Social follows
// ---------------------------------------------------------------------------

router.get("/social/follows", (_req, res) => {
  res.json(community.socialMeta || {});
});

router.patch("/social/follows", (req, res) => {
  res.json({ ok: true, ...req.body });
});

// ---------------------------------------------------------------------------
// Explore copy & chat
// ---------------------------------------------------------------------------

router.get("/explore/copy", (_req, res) => {
  res.json(exploreCopy);
});

router.post("/explore/chat", (req, res) => {
  const { query: q = "", explorers = {} } = req.body || {};
  const norm = q.trim().toLowerCase();

  const participantCount = (id) => explorers[id]?.participants ?? "";

  if (!norm) {
    const d = exploreChat.defaultRule;
    return res.json({
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
        return res.json({ msg, explorationIds: rule.explorationIds || [] });
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

  res.json({
    msg,
    explorationIds: (def.explorationIds || []).slice(0, def.maxIds || def.explorationIds?.length || 99)
  });
});

export default router;
