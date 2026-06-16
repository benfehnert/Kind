import { Hono } from "hono";
import community from "../mocks/community.json" with { type: "json" };
import explorations from "../mocks/explorations.json" with { type: "json" };
import explorationEvidence from "../mocks/explorationEvidence.json" with { type: "json" };
import feed from "../mocks/feed.json" with { type: "json" };
import home from "../mocks/home.json" with { type: "json" };
import insight from "../mocks/insight.json" with { type: "json" };
import profile from "../mocks/profile.json" with { type: "json" };
import search from "../mocks/search.json" with { type: "json" };
import notifications from "../mocks/notifications.json" with { type: "json" };
import exploreCopy from "../mocks/exploreCopy.json" with { type: "json" };
import exploreChat from "../mocks/exploreChat.json" with { type: "json" };
import consent from "../mocks/consent.json" with { type: "json" };
import trialReports from "../data/explorationTrialReports.json" with { type: "json" };
import { ANNA_DEMO_ONBOARDING } from "../lib/meData.js";

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
    items: EXPLORATION_ORDER.map((explorationId) => {
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
