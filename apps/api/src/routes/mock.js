import { Hono } from "hono";
import community from "../mocks/community.json" with { type: "json" };
import explorations from "../mocks/explorations.json" with { type: "json" };
import explorationEvidence from "../mocks/explorationEvidence.json" with { type: "json" };
import feed from "../mocks/feed.json" with { type: "json" };
import home from "../mocks/home.json" with { type: "json" };
import homeStarter from "../mocks/homeStarter.json" with { type: "json" };
import insight from "../mocks/insight.json" with { type: "json" };
import profile from "../mocks/profile.json" with { type: "json" };
import dataUsage from "../mocks/dataUsage.json" with { type: "json" };
import search from "../mocks/search.json" with { type: "json" };
import notifications from "../mocks/notifications.json" with { type: "json" };
import exploreCopy from "../mocks/exploreCopy.json" with { type: "json" };
import exploreChat from "../mocks/exploreChat.json" with { type: "json" };
import consent from "../mocks/consent.json" with { type: "json" };
import trialReports from "../data/explorationTrialReports.json" with { type: "json" };
import { ANNA_DEMO_ONBOARDING } from "../lib/meData.js";
import {
  evidenceExplorationId,
  isCatalogExploration,
  SHORT_EXPLORATION_IDS
} from "../lib/centShort/index.js";
import { isCohortStatsScience } from "../lib/feedContentLibrary.js";

const router = new Hono();

const mockSocialMeta = {
  followingExplorerIds: [...(community.socialMeta?.followingExplorerIds || [])],
  followingResearcherIds: [...(community.socialMeta?.followingResearcherIds || [])],
  followerIdsExpanded: [...(community.socialMeta?.followerIdsExpanded || [])]
};

const mockActivityNices = new Map();
const mockActivityMessages = new Map();
const mockMessageReactions = new Map();

const MOCK_MESSAGE_SEEDS = [
  "Really inspiring progress — keep it up!",
  "Love seeing this consistency.",
  "This is motivating me to stay on track too.",
  "Great milestone, well done!",
  "Thanks for sharing — helpful to see what's working."
];

function mockActId(userSlug, index) {
  return `mock-act-${userSlug}-${index}`;
}

function mockPerson(slug) {
  const cu = community.commUsers?.[slug];
  if (cu) {
    return { slug, name: cu.name, loc: cu.loc, img: cu.img, initials: cu.initials, meta: cu.meta };
  }
  const bu = [...(community.basicUsers || []), ...(community.followerOnly || [])].find((u) => u.id === slug);
  if (!bu) return null;
  return { slug, name: bu.name, loc: bu.loc, img: bu.img, initials: bu.initials, meta: bu.meta };
}

function ensureMockNices(postId, seedCount = 0) {
  if (!mockActivityNices.has(postId)) {
    const seeded = new Set();
    const pool = mockSocialMeta.followerIdsExpanded || [];
    for (let i = 0; i < Math.min(seedCount, pool.length); i += 1) {
      seeded.add(pool[i]);
    }
    mockActivityNices.set(postId, seeded);
  }
  return mockActivityNices.get(postId);
}

function ensureMockMessages(postId, seedCount = 0) {
  if (!mockActivityMessages.has(postId)) {
    const pool = mockSocialMeta.followerIdsExpanded || [];
    const seeded = [];
    for (let i = 0; i < Math.min(seedCount, pool.length); i += 1) {
      const slug = pool[i];
      const person = mockPerson(slug);
      if (!person) continue;
      seeded.push({
        id: `mock-msg-${postId}-${i}`,
        body: MOCK_MESSAGE_SEEDS[i % MOCK_MESSAGE_SEEDS.length],
        sentAt: new Date(Date.now() - (seedCount - i) * 3600000).toISOString(),
        parentMessageId: null,
        sender: {
          slug: person.slug,
          name: person.name,
          img: person.img,
          initials: person.initials
        }
      });
    }
    mockActivityMessages.set(postId, seeded);
  }
  return mockActivityMessages.get(postId);
}

function mockMessageSummary(postId) {
  const messages = ensureMockMessages(postId, 0);
  const seen = new Set();
  const preview = [];
  for (let i = messages.length - 1; i >= 0; i -= 1) {
    const slug = messages[i].sender.slug;
    if (seen.has(slug)) continue;
    seen.add(slug);
    preview.unshift({
      slug: messages[i].sender.slug,
      name: messages[i].sender.name,
      img: messages[i].sender.img,
      initials: messages[i].sender.initials
    });
  }
  return { mc: messages.length, messagePreview: preview.slice(-5) };
}

function formatMockMessageTime(sentAt) {
  const then = new Date(sentAt);
  const diffHours = Math.floor((Date.now() - then) / (1000 * 60 * 60));
  if (diffHours < 1) return "Just now";
  if (diffHours < 24) return `${diffHours} hour${diffHours === 1 ? "" : "s"} ago`;
  return "Yesterday";
}

function emptyMockReactions() {
  return {
    heart: { count: 0, viewerReacted: false },
    clap: { count: 0, viewerReacted: false }
  };
}

function ensureMockMessageReactions(messageId, message) {
  if (!mockMessageReactions.has(messageId)) {
    const seeded = { heart: new Set(), clap: new Set() };
    const pool = (mockSocialMeta.followerIdsExpanded || []).filter(
      (slug) => slug !== message?.sender?.slug
    );
    if (pool[0]) seeded.heart.add(pool[0]);
    if (pool[1]) seeded.clap.add(pool[1]);
    mockMessageReactions.set(messageId, seeded);
  }
  return mockMessageReactions.get(messageId);
}

function mockMessageReactionsPayload(messageId, message) {
  const store = ensureMockMessageReactions(messageId, message);
  const viewer = profile.viewerSlug;
  return {
    heart: { count: store.heart.size, viewerReacted: store.heart.has(viewer) },
    clap: { count: store.clap.size, viewerReacted: store.clap.has(viewer) }
  };
}

function mapMockMessage(msg) {
  return {
    ...msg,
    time: formatMockMessageTime(msg.sentAt),
    reactions: mockMessageReactionsPayload(msg.id, msg)
  };
}

function enrichMockActs(userSlug, acts = []) {
  return acts.map((act, index) => {
    const id = act.id || mockActId(userSlug, index);
    const nicedSlugs = ensureMockNices(id, Number(act.nc ?? 0));
    const supporters = [...nicedSlugs].map((slug) => mockPerson(slug)).filter(Boolean);
    const seedMessages = Math.min(3, Math.max(0, Math.floor(Number(act.nc ?? 0) / 2)));
    if (!mockActivityMessages.has(id) && seedMessages) {
      ensureMockMessages(id, seedMessages);
    } else {
      ensureMockMessages(id, 0);
    }
    const { mc, messagePreview } = mockMessageSummary(id);

    return {
      ...act,
      id,
      nc: supporters.length,
      viewerNiced: nicedSlugs.has(profile.viewerSlug),
      supporterPreview: supporters.slice(0, 5).map(({ slug, name, img, initials }) => ({
        slug,
        name,
        img,
        initials
      })),
      mc,
      messagePreview
    };
  });
}

function mockSupportersPayload(postId) {
  const nicedSlugs = ensureMockNices(postId, 0);
  const supporters = [...nicedSlugs].map((slug) => mockPerson(slug)).filter(Boolean);
  const followingSet = new Set(mockSocialMeta.followingExplorerIds || []);

  return {
    count: supporters.length,
    following: supporters.filter((person) => followingSet.has(person.slug)),
    others: supporters.filter((person) => !followingSet.has(person.slug))
  };
}

const EXPLORATION_FEED_LABELS = {
  "morning-rules": "morning rules",
  eating: "time-restricted eating",
  "screen-sleep": "screen time before bed",
  relaxation: "relaxation practices",
  "upf-mood": "ultra-processed food"
};

function mapMockFeedExtra(type, expId, row, index) {
  const exp = explorations[expId];
  const feedLabel = EXPLORATION_FEED_LABELS[expId] || exp?.title || expId;
  const base = {
    id: `mock-${type}-${expId}-${index}`,
    type,
    explorationId: expId,
    badge: "teal",
    badgeLabel: type === "tip" ? "Tip" : "Science",
    time: `Yesterday · ${feedLabel}`,
    body: row.body ?? "",
    highlight: row.highlight ?? "",
    avatarKind: "kind"
  };
  base.displayName = type === "tip" ? "Wellbeing tip" : "kind science";
  return base;
}

function buildMockHomeFeedExtras(type, offset = 1, { starterMode = false } = {}) {
  const items = [];
  for (const expId of feed.feedExpIds ?? []) {
    let rows = type === "tip" ? feed.feedTips?.[expId] ?? [] : feed.feedScience?.[expId] ?? [];
    if (starterMode && type === "science") {
      rows = rows.filter((row) => !isCohortStatsScience(row));
    }
    for (const [i, row] of rows.slice(offset).entries()) {
      items.push(mapMockFeedExtra(type, expId, row, i + offset));
    }
  }
  return items;
}

// ---------------------------------------------------------------------------
// Explorations
// ---------------------------------------------------------------------------

router.get("/explorations", (c) => {
  const items = SHORT_EXPLORATION_IDS.filter((id) => explorations[id]).map((id) => ({
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
  if (!isCatalogExploration(id)) {
    return c.json({ error: "Exploration not found" }, 404);
  }
  const data = explorations[id];
  if (!data) return c.json({ error: "Exploration not found" }, 404);
  return c.json({ id, ...data });
});

router.get("/explorations/:id/evidence", (c) => {
  const evidenceKey = evidenceExplorationId(c.req.param("id"));
  const data = explorationEvidence[evidenceKey];
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
    ...u,
    acts: enrichMockActs(id, u.acts || [])
  }));
  const basicUsers = (community.basicUsers || []).map((u) => ({
    ...u,
    tier: "basic",
    acts: enrichMockActs(u.id, u.acts || [])
  }));
  const followerOnly = (community.followerOnly || []).map((u) => ({
    ...u,
    tier: "follower",
    acts: enrichMockActs(u.id, u.acts || [])
  }));
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
  if (cu) {
    return c.json({ id, tier: "comm", ...cu, acts: enrichMockActs(id, cu.acts || []) });
  }

  const bu = [...(community.basicUsers || []), ...(community.followerOnly || [])].find(
    (u) => u.id === id
  );
  if (bu) return c.json({ tier: "basic", ...bu, acts: enrichMockActs(id, bu.acts || []) });

  return c.json({ error: "Individual not found" }, 404);
});

// ---------------------------------------------------------------------------
// Feed
// ---------------------------------------------------------------------------

router.get("/feed", (c) => {
  return c.json(feed);
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
      isCatalogExploration(e.id) &&
      (e.title?.toLowerCase().includes(q) ||
        e.description?.toLowerCase().includes(q) ||
        e.id?.toLowerCase().includes(q))
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
  if (c.req.query("starter") === "1") return c.json(homeStarter);
  return c.json(home);
});

router.get("/home/feed", (c) => {
  const type = c.req.query("type");
  if (type !== "tip" && type !== "science") {
    return c.json({ error: "type must be tip or science" }, 400);
  }
  const offset = parseInt(c.req.query("offset") ?? "1", 10);
  const starterMode = c.req.query("starter") === "1";
  return c.json({ items: buildMockHomeFeedExtras(type, offset, { starterMode }) });
});

// ---------------------------------------------------------------------------
// Profile
// ---------------------------------------------------------------------------

router.get("/profile", (c) => {
  return c.json(profile);
});

router.get("/profile/data-usage", (c) => {
  return c.json(dataUsage);
});

router.post("/profile/data-export-request", async (c) => {
  const body = await c.req.json().catch(() => ({}));
  if (!body.email?.trim()) {
    return c.json({ error: "email is required" }, 400);
  }
  return c.json({ ok: true, requestedAt: new Date().toISOString() });
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
// Onboarding, user explorations, reports, logs (mock parity)
// ---------------------------------------------------------------------------

const MOCK_EXPLORATION_CONSENTS = {
  "morning-rules": { granted: true, consentedAt: "2026-05-15T09:00:00.000Z" },
  eating: { granted: true, consentedAt: "2026-03-03T09:00:00.000Z" },
  "screen-sleep": { granted: true, consentedAt: "2026-01-10T09:00:00.000Z" },
  relaxation: { granted: true, consentedAt: "2025-11-05T09:00:00.000Z" },
  "upf-mood": { granted: true, consentedAt: "2026-02-01T09:00:00.000Z" }
};

router.get("/onboarding", (c) =>
  c.json({ completed: true, completedAt: "2026-05-01T12:00:00.000Z", answers: ANNA_DEMO_ONBOARDING })
);

router.put("/onboarding", async (c) => {
  const body = await c.req.json().catch(() => ({}));
  return c.json({ ok: true, completed: Boolean(body.completed), answers: body.answers ?? body });
});

router.post("/onboarding/complete", async (c) => {
  const body = await c.req.json().catch(() => ({}));
  return c.json({
    ok: true,
    completed: true,
    answers: { ...ANNA_DEMO_ONBOARDING, ...(body.answers ?? body) }
  });
});

router.get("/consent/state", (c) =>
  c.json({
    ...consent,
    choices: consent.annaDefaults,
    privacyPrefs: {
      globalConsent: true,
      science: true,
      visible: true,
      reminders: true
    },
    explorationConsents: MOCK_EXPLORATION_CONSENTS,
    activeExplorationId: "morning-rules"
  })
);

router.get("/me/explorations", (c) =>
  c.json({
    activeExplorationId: "morning-rules",
    items: SHORT_EXPLORATION_IDS.map((explorationId) => {
      const exp = explorations[explorationId];
      const complete = explorationId !== "morning-rules";
      return {
        explorationId,
        title: exp?.title,
        durationLabel: exp?.duration,
        weekCurrent: complete ? 6 : 3,
        weeksTotal: explorationId === "morning-rules" ? 8 : 6,
        status: complete ? "complete" : "active",
        streakDays: complete ? 40 : 9,
        isActive: explorationId === "morning-rules",
        consented: true,
        hasReport: true
      };
    })
  })
);

router.get("/me/explorations/:id/report", (c) => {
  const explorationId = c.req.param("id");
  const report = trialReports[explorationId];
  if (!report) return c.json({ error: "Report not found" }, 404);
  return c.json({ explorationId, report, generatedAt: new Date().toISOString() });
});

router.get("/explorations/:id/report-template", (c) => {
  const explorationId = c.req.param("id");
  const report = trialReports[explorationId];
  if (!report) return c.json({ error: "Report template not found" }, 404);
  return c.json({ explorationId, report });
});

router.post("/me/explorations/:id/consent", (c) =>
  c.json({ ok: true, explorationId: c.req.param("id"), granted: true, isActive: true })
);

router.patch("/me/explorations/:id/active", (c) =>
  c.json({ ok: true, activeExplorationId: c.req.param("id") })
);

router.post("/me/explorations/:id/complete", (c) => {
  const explorationId = c.req.param("id");
  const report = trialReports[explorationId];
  if (!report) return c.json({ error: "Report template not found" }, 404);
  return c.json({ ok: true, explorationId, report, generatedAt: new Date().toISOString() });
});

router.get("/me/logs", (c) => c.json({ explorationId: c.req.query("explorationId"), items: [] }));

router.post("/me/logs", async (c) => {
  const body = await c.req.json().catch(() => ({}));
  return c.json({
    ok: true,
    logDate: body.logDate ?? new Date().toISOString().slice(0, 10),
    fieldValues: body.fieldValues ?? {}
  });
});

// ---------------------------------------------------------------------------
// Social follows
// ---------------------------------------------------------------------------

router.get("/social/follows", (c) => {
  return c.json(mockSocialMeta);
});

router.patch("/social/follows", async (c) => {
  const body = await c.req.json().catch(() => ({}));
  if (body.followSlug === profile.viewerSlug) {
    return c.json({ error: "Cannot follow yourself" }, 400);
  }

  if (body.followSlug && !mockSocialMeta.followingExplorerIds.includes(body.followSlug)) {
    mockSocialMeta.followingExplorerIds.push(body.followSlug);
  }
  if (body.unfollowSlug) {
    mockSocialMeta.followingExplorerIds = mockSocialMeta.followingExplorerIds.filter(
      (id) => id !== body.unfollowSlug
    );
  }
  if (body.followResearcherId && !mockSocialMeta.followingResearcherIds.includes(body.followResearcherId)) {
    mockSocialMeta.followingResearcherIds.push(body.followResearcherId);
  }
  if (body.unfollowResearcherId) {
    mockSocialMeta.followingResearcherIds = mockSocialMeta.followingResearcherIds.filter(
      (id) => id !== body.unfollowResearcherId
    );
  }

  return c.json({
    ok: true,
    followingExplorerIds: [...mockSocialMeta.followingExplorerIds],
    followingResearcherIds: [...mockSocialMeta.followingResearcherIds]
  });
});

// ---------------------------------------------------------------------------
// Activity nices
// ---------------------------------------------------------------------------

router.patch("/activity-posts/:id/nice", (c) => {
  const postId = c.req.param("id");
  const nicedSlugs = ensureMockNices(postId, 0);
  const viewerSlug = profile.viewerSlug;

  if (nicedSlugs.has(viewerSlug)) nicedSlugs.delete(viewerSlug);
  else nicedSlugs.add(viewerSlug);

  const supporters = [...nicedSlugs].map((slug) => mockPerson(slug)).filter(Boolean);

  return c.json({
    viewerNiced: nicedSlugs.has(viewerSlug),
    nc: supporters.length,
    supporterPreview: supporters.slice(0, 5).map(({ slug, name, img, initials }) => ({
      slug,
      name,
      img,
      initials
    }))
  });
});

router.get("/activity-posts/:id/nices", (c) => {
  const postId = c.req.param("id");
  return c.json(mockSupportersPayload(postId));
});

router.get("/activity-posts/:id/messages", (c) => {
  const postId = c.req.param("id");
  const messages = ensureMockMessages(postId, 0).map(mapMockMessage);
  return c.json({ ...mockMessageSummary(postId), messages });
});

router.post("/activity-posts/:id/messages", async (c) => {
  const postId = c.req.param("id");
  const body = await c.req.json().catch(() => ({}));
  const trimmed = String(body.body || "").trim();
  if (!trimmed) return c.json({ error: "Message body required" }, 400);

  const messages = ensureMockMessages(postId, 0);
  const viewer = mockPerson(profile.viewerSlug);
  const parent = body.parentMessageId
    ? messages.find((msg) => msg.id === body.parentMessageId)
    : null;

  if (body.parentMessageId && !parent) {
    return c.json({ error: "Parent message not found" }, 404);
  }

  const message = {
    id: `mock-msg-${postId}-${messages.length}`,
    body: trimmed,
    sentAt: new Date().toISOString(),
    parentMessageId: parent?.id ?? null,
    sender: {
      slug: viewer.slug,
      name: viewer.name,
      img: viewer.img,
      initials: viewer.initials
    }
  };
  messages.push(message);

  const mapped = messages.map(mapMockMessage);

  return c.json(
    {
      ...mockMessageSummary(postId),
      messages: mapped,
      message: mapped[mapped.length - 1]
    },
    201
  );
});

router.patch("/activity-posts/:id/messages/:messageId/reactions", async (c) => {
  const messageId = c.req.param("messageId");
  const body = await c.req.json().catch(() => ({}));
  const reactionType = body.reactionType;

  if (!["heart", "clap"].includes(reactionType)) {
    return c.json({ error: "Invalid reaction type" }, 400);
  }

  let message = null;
  for (const messages of mockActivityMessages.values()) {
    message = messages.find((msg) => msg.id === messageId);
    if (message) break;
  }
  if (!message) return c.json({ error: "Message not found" }, 404);
  if (message.sender.slug === profile.viewerSlug) {
    return c.json({ error: "Cannot react to your own message" }, 400);
  }

  const store = ensureMockMessageReactions(messageId, message);
  const bucket = store[reactionType];
  if (bucket.has(profile.viewerSlug)) bucket.delete(profile.viewerSlug);
  else bucket.add(profile.viewerSlug);

  return c.json({ reactions: mockMessageReactionsPayload(messageId, message) });
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
