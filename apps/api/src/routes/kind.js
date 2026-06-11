import { Hono } from "hono";
import { query } from "../db.js";
import { requireAuth } from "../middleware.js";
import exploreCopyMock from "../mocks/exploreCopy.json" with { type: "json" };
import exploreChat from "../mocks/exploreChat.json" with { type: "json" };
import feedMock from "../mocks/feed.json" with { type: "json" };
import insightMock from "../mocks/insight.json" with { type: "json" };
import profileMock from "../mocks/profile.json" with { type: "json" };

const router = new Hono();

// All Kind routes require auth
router.use("*", requireAuth);

// ---------------------------------------------------------------------------
// Helper — get individual UUID from auth JWT sub
// ---------------------------------------------------------------------------

async function getIndividualId(authUserId) {
  if (authUserId === "__mock__") {
    const { rows } = await query(
      "SELECT id FROM individuals WHERE slug = 'anna-ross' LIMIT 1"
    );
    return rows[0]?.id ?? null;
  }
  const { rows } = await query(
    "SELECT id FROM individuals WHERE auth_user_id = $1 LIMIT 1",
    [authUserId]
  );
  return rows[0]?.id ?? null;
}

// ---------------------------------------------------------------------------
// Explorations
// ---------------------------------------------------------------------------

const EXPLORATION_CATEGORY = {
  "morning-rules": "Energy & Focus",
  "eating": "Metabolic Health",
  "screen-sleep": "Rest & Sleep",
  "relaxation": "Stress & Composure",
  "upf-mood": "Mood & Nutrition"
};

async function fetchExploration(id) {
  const { rows } = await query(
    `SELECT
       e.id,
       e.title,
       e.icon,
       e.theme_bg        AS bg,
       e.theme_text      AS text,
       e.duration_label  AS duration,
       e.description     AS desc,
       e.participant_count AS participants,
       e.is_new          AS "isNew",
       e.catalog_active  AS active,
       e.status_badge    AS "statusBadge",
       e.progress_percent AS progress,
       e.streak_days     AS streak,
       e.chart_label     AS "chartLabel",
       (SELECT COALESCE(json_agg(
          json_build_object('name', ep.name, 'desc', ep.description, 'status', ep.status)
          ORDER BY ep.sort_order
        ), '[]'::json)
        FROM exploration_phases ep WHERE ep.exploration_id = e.id) AS phases,
       (SELECT COALESCE(json_agg(
          json_build_object('icon', eo.icon, 'label', eo.label)
          ORDER BY eo.sort_order
        ), '[]'::json)
        FROM exploration_expected_outcomes eo WHERE eo.exploration_id = e.id) AS outcomes,
       (SELECT COALESCE(json_agg(
          json_build_object('label', ek.label, 'val', ek.value_text, 'unit', ek.unit,
                            'change', ek.change_text, 'up', ek.is_positive)
          ORDER BY ek.sort_order
        ), '[]'::json)
        FROM exploration_kpis ek WHERE ek.exploration_id = e.id) AS kpis,
       (SELECT COALESCE(json_agg(
          json_build_object('day', ec.day_label, 'h', ec.height_percent, 'v', ec.value_label,
                            'hi', ec.is_highlight, 'empty', ec.is_empty)
          ORDER BY ec.sort_order
        ), '[]'::json)
        FROM exploration_chart_points ec WHERE ec.exploration_id = e.id) AS chart,
       (SELECT COALESCE(json_agg(
          json_build_object('type', lf.field_type::text, 'id', lf.field_key, 'label', lf.label,
                            'min', lf.min_value, 'max', lf.max_value, 'val', lf.default_value,
                            'hints', lf.hints, 'opts', lf.options, 'multi', lf.allows_multiple)
          ORDER BY lf.sort_order
        ), '[]'::json)
        FROM log_field_defs lf WHERE lf.exploration_id = e.id) AS fields
     FROM explorations e
     WHERE e.id = $1`,
    [id]
  );
  if (!rows[0]) return null;
  return { ...rows[0], category: EXPLORATION_CATEGORY[rows[0].id] ?? null };
}

router.get("/explorations", async (c) => {
  const { rows } = await query(
    `SELECT id FROM explorations ORDER BY
       CASE id
         WHEN 'morning-rules' THEN 1 WHEN 'eating' THEN 2
         WHEN 'screen-sleep' THEN 3  WHEN 'relaxation' THEN 4
         WHEN 'upf-mood' THEN 5      ELSE 6
       END`
  );

  const items = await Promise.all(rows.map((r) => fetchExploration(r.id)));
  return c.json({ items: items.filter(Boolean) });
});

router.get("/explorations/evidence", (c) => {
  return c.json({});
});

router.get("/explorations/:id", async (c) => {
  const data = await fetchExploration(c.req.param("id"));
  if (!data) return c.json({ error: "Exploration not found" }, 404);
  return c.json(data);
});

router.get("/explorations/:id/evidence", (c) => {
  return c.json({});
});

// ---------------------------------------------------------------------------
// Community
// ---------------------------------------------------------------------------

router.get("/community/individuals", async (c) => {
  const { rows: individuals } = await query(
    `SELECT
       i.id,
       i.slug,
       i.display_name  AS name,
       i.location      AS loc,
       i.avatar_image_id AS img,
       i.avatar_initials AS initials,
       i.bio,
       i.profile_meta  AS meta,
       (SELECT COALESCE(json_agg(
          json_build_object('t', ib.label, 's', ib.style::text)
          ORDER BY ib.sort_order
        ), '[]'::json)
        FROM individual_badges ib WHERE ib.individual_id = i.id) AS badges,
       (SELECT COALESCE(json_agg(
          json_build_object(
            'id', ue.exploration_id,
            'name', e.title,
            'icon', e.icon,
            'bg', e.theme_bg,
            'w', ue.week_current,
            'of', ue.weeks_total,
            'active', (ue.status = 'active')
          ) ORDER BY ue.created_at
        ), '[]'::json)
        FROM user_explorations ue
        JOIN explorations e ON e.id = ue.exploration_id
        WHERE ue.individual_id = i.id) AS exps,
       (SELECT COALESCE(json_agg(
          json_build_object('t', ap.summary, 'time', ap.posted_at, 'exp', ap.exploration_label,
                            'detail', ap.detail_metrics, 'nc', ap.nice_count_base)
          ORDER BY ap.sort_order
        ), '[]'::json)
        FROM activity_posts ap WHERE ap.individual_id = i.id) AS acts
     FROM individuals i
     ORDER BY i.display_name`
  );

  const individualsWithTier = individuals.map((ind) => ({
    ...ind,
    id: ind.slug,
    tier: ind.bio ? "comm" : "basic"
  }));

  const { rows: expFollowers } = await query(
    `SELECT ue.exploration_id, i.slug
     FROM user_explorations ue
     JOIN individuals i ON i.id = ue.individual_id`
  );
  const explorationFollowers = {};
  for (const row of expFollowers) {
    if (!explorationFollowers[row.exploration_id]) {
      explorationFollowers[row.exploration_id] = [];
    }
    explorationFollowers[row.exploration_id].push(row.slug);
  }

  return c.json({ items: individualsWithTier, explorationFollowers });
});

router.get("/community/researchers", async (c) => {
  const { rows } = await query(
    `SELECT
       r.id,
       r.display_name  AS name,
       r.title,
       r.organisation  AS org,
       r.avatar_image_id AS img,
       r.avatar_initials AS initials,
       r.verified,
       (SELECT COALESCE(json_agg(ra.area_label ORDER BY ra.sort_order), '[]'::json)
        FROM researcher_areas ra WHERE ra.researcher_id = r.id) AS areas,
       (SELECT COALESCE(json_agg(
          json_build_object('expId', re.exploration_id, 'note', re.collaboration_note)
        ), '[]'::json)
        FROM researcher_explorations re WHERE re.researcher_id = r.id) AS explorations
     FROM researchers r
     ORDER BY r.display_name`
  );
  return c.json({ items: rows });
});

router.get("/community/individuals/:slug", async (c) => {
  const { rows } = await query(
    `SELECT
       i.id,
       i.slug,
       i.display_name  AS name,
       i.location      AS loc,
       i.avatar_image_id AS img,
       i.avatar_initials AS initials,
       i.bio,
       i.profile_meta  AS meta,
       (SELECT COALESCE(json_agg(
          json_build_object('t', ib.label, 's', ib.style::text)
          ORDER BY ib.sort_order
        ), '[]'::json)
        FROM individual_badges ib WHERE ib.individual_id = i.id) AS badges,
       (SELECT COALESCE(json_agg(
          json_build_object(
            'id', ue.exploration_id,
            'name', e.title,
            'icon', e.icon,
            'bg', e.theme_bg,
            'w', ue.week_current,
            'of', ue.weeks_total,
            'active', (ue.status = 'active')
          ) ORDER BY ue.created_at
        ), '[]'::json)
        FROM user_explorations ue
        JOIN explorations e ON e.id = ue.exploration_id
        WHERE ue.individual_id = i.id) AS exps,
       (SELECT COALESCE(json_agg(
          json_build_object('t', ap.summary, 'time', ap.posted_at, 'exp', ap.exploration_label,
                            'detail', ap.detail_metrics, 'nc', ap.nice_count_base)
          ORDER BY ap.sort_order
        ), '[]'::json)
        FROM activity_posts ap WHERE ap.individual_id = i.id) AS acts
     FROM individuals i
     WHERE i.slug = $1`,
    [c.req.param("slug")]
  );
  if (!rows.length) return c.json({ error: "Individual not found" }, 404);
  return c.json(rows[0]);
});

// ---------------------------------------------------------------------------
// Feed
// ---------------------------------------------------------------------------

const FEED_CHIPS = [
  { key: "all", label: "All" },
  { key: "milestone", label: "Milestones" },
  { key: "insight", label: "Insights" },
  { key: "activity", label: "Activity" },
  { key: "science", label: "Science" },
  { key: "tip", label: "Tips" }
];

const TIME_LABELS = ["Yesterday", "2 days ago", "3 days ago", "4 days ago", "5 days ago"];

router.get("/feed", async (c) => {
  const { rows } = await query(
    `SELECT fi.id, fi.feed_type::text AS type, fi.exploration_id, fi.headline,
            fi.body, fi.highlight, fi.published_at, fi.sort_order,
            i.slug AS actor_slug, i.display_name AS actor_name,
            i.avatar_image_id AS actor_img, i.avatar_initials AS actor_initials
     FROM feed_items fi
     LEFT JOIN individuals i ON i.id = fi.actor_individual_id
     ORDER BY fi.sort_order, fi.published_at DESC`
  );

  const feedExpIds = [];
  const feedTips = {};
  const feedScience = {};
  const staticItems = [];

  for (const row of rows) {
    if (row.type === "tip" && row.exploration_id) {
      if (!feedTips[row.exploration_id]) {
        feedTips[row.exploration_id] = [];
        if (!feedExpIds.includes(row.exploration_id)) feedExpIds.push(row.exploration_id);
      }
      feedTips[row.exploration_id].push({ body: row.body ?? row.headline });
    } else if (row.type === "science" && row.exploration_id) {
      if (!feedScience[row.exploration_id]) {
        feedScience[row.exploration_id] = [];
        if (!feedExpIds.includes(row.exploration_id)) feedExpIds.push(row.exploration_id);
      }
      feedScience[row.exploration_id].push({
        body: row.body ?? row.headline,
        highlight: row.highlight ?? ""
      });
    } else {
      const badgeMap = { milestone: "amber", insight: "blue", activity: "purple", tip: "teal", science: "teal" };
      const labelMap = { milestone: "Milestone", insight: "Insight", activity: "Activity", tip: "Tip", science: "Science" };
      staticItems.push({
        id: row.id,
        type: row.type,
        explorationId: row.exploration_id ?? undefined,
        userId: row.actor_slug ?? undefined,
        displayName: row.actor_name ?? (row.type === "insight" ? "Your insight" : "Kind"),
        badge: badgeMap[row.type] ?? "teal",
        badgeLabel: labelMap[row.type] ?? row.type,
        time: row.published_at
          ? new Date(row.published_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })
          : "Recently",
        body: row.body ?? row.headline ?? "",
        highlight: row.highlight ?? "",
        avatarKind: row.actor_img ? "image" : "initials",
        initials: row.actor_initials ?? "K",
        avatarKey: row.actor_img ? `pravatar-${row.actor_img}` : undefined
      });
    }
  }

  return c.json({
    chips: FEED_CHIPS,
    feedExpIds,
    feedTips,
    feedScience,
    staticItems,
    demoReportItems: feedMock.demoReportItems ?? [],
    feedTipTimes: TIME_LABELS,
    feedScienceTimes: TIME_LABELS
  });
});

// ---------------------------------------------------------------------------
// Home (viewer-specific)
// ---------------------------------------------------------------------------

router.get("/home", async (c) => {
  const individualId = await getIndividualId(c.get("user").sub);
  if (!individualId) return c.json({ error: "Individual not found" }, 404);

  const { rows: indRows } = await query(
    "SELECT display_name FROM individuals WHERE id = $1",
    [individualId]
  );
  const displayName = indRows[0]?.display_name ?? "there";
  const firstName = displayName.split(" ")[0];

  const { rows: ueRows } = await query(
    `SELECT ue.exploration_id, ue.week_current, ue.weeks_total, ue.streak_days,
            e.title, e.icon, e.theme_bg AS bg, e.theme_text AS text
     FROM user_explorations ue
     JOIN explorations e ON e.id = ue.exploration_id
     WHERE ue.individual_id = $1 AND ue.status = 'active'
     LIMIT 1`,
    [individualId]
  );
  const activeRun = ueRows[0] ?? null;

  const explorationId = activeRun?.exploration_id ?? "morning-rules";
  const { rows: dbFields } = await query(
    `SELECT field_key AS id, field_type::text AS type, label,
            min_value AS min, max_value AS max, default_value AS val,
            hints, options AS opts, allows_multiple AS multi, sort_order
     FROM log_field_defs
     WHERE exploration_id = $1
     ORDER BY sort_order`,
    [explorationId]
  );

  const checksField = dbFields.find((f) => f.type === "checks");
  const rangeFields = dbFields.filter((f) => f.type === "range");
  const selectField = dbFields.find((f) => f.type === "select");

  const morningRules = {
    label: checksField?.label ?? "Morning rules followed today",
    options: (checksField?.opts ?? []).map((label, i) => ({
      key: `opt_${i}`,
      label,
      defaultChecked: false
    }))
  };

  const ranges = rangeFields.map((f) => ({
    id: f.id,
    label: f.label,
    min: Number(f.min ?? 1),
    max: Number(f.max ?? 10),
    default: Number(f.val ?? 5),
    hints: Array.isArray(f.hints) ? f.hints : []
  }));

  const crashSelect = {
    label: selectField?.label ?? "How do you feel today?",
    options: Array.isArray(selectField?.opts) ? selectField.opts : [],
    defaultIndex: Number(selectField?.val ?? 0)
  };

  const streak = activeRun?.streak_days ?? 0;
  const week = activeRun?.week_current ?? 1;
  const weeksTotal = activeRun?.weeks_total ?? 8;

  const metrics = [
    {
      label: "Afternoon energy",
      value: "6.8",
      unit: "/10",
      sub: "+1.4 from baseline",
      subTone: "green"
    },
    {
      label: "Morning rules today",
      value: "3",
      unit: "/4",
      sub: "sunlight · stretch · meditation",
      subTone: "green"
    },
    {
      label: "Afternoon crash",
      value: "Mild",
      unit: "",
      sub: "down from noticeable",
      subTone: "amber"
    },
    {
      label: "Active streak",
      value: String(streak),
      unit: "days",
      sub: streak >= 7 ? "personal best!" : `week ${week} of ${weeksTotal}`,
      subTone: "green"
    }
  ];

  return c.json({
    greeting: `Good morning, ${firstName}`,
    sub: activeRun
      ? `Day ${(week - 1) * 7 + 1} of your morning rules exploration. You're doing great.`
      : "Welcome to Kind.",
    metrics,
    logFormTitle: "Today's log",
    morningRules,
    ranges,
    crashSelect,
    confirm: {
      title: "Logged!",
      body: "Your data has been saved. Keep it up — consistent logs make your personalised analysis much stronger."
    }
  });
});

// ---------------------------------------------------------------------------
// Profile
// ---------------------------------------------------------------------------

router.get("/profile", async (c) => {
  const individualId = await getIndividualId(c.get("user").sub);
  if (!individualId) return c.json({ error: "Individual not found" }, 404);

  const { rows } = await query(
    `SELECT
       i.display_name,
       i.location,
       i.avatar_initials AS "avatarInitials",
       i.joined_at,
       (SELECT COUNT(*) FROM individual_follows WHERE follower_id = i.id) AS following,
       (SELECT COUNT(*) FROM individual_follows WHERE followee_id = i.id) AS followers,
       (SELECT COALESCE(json_agg(json_build_object('variant', ib.style::text, 'label', ib.label)
                                 ORDER BY ib.sort_order), '[]'::json)
        FROM individual_badges ib WHERE ib.individual_id = i.id) AS badges,
       ps.contribute_to_citizen_science AS "science",
       ps.visible_in_community          AS "visible",
       ps.daily_reminders               AS "reminders"
     FROM individuals i
     LEFT JOIN privacy_settings ps ON ps.individual_id = i.id
     WHERE i.id = $1`,
    [individualId]
  );
  if (!rows.length) return c.json({ error: "Profile not found" }, 404);

  const { following, followers, badges, science, visible, reminders, ...rest } = rows[0];
  const initials = rest.avatarInitials || rest.display_name?.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2) || "?";
  const joinedDate = new Date(rest.joined_at).toLocaleDateString("en-US", { month: "long", year: "numeric" });
  return c.json({
    ...profileMock,
    navProfile: { initials, avatarKey: profileMock.navProfile.avatarKey },
    hero: {
      name: rest.display_name,
      locationLine: `${rest.location ?? ""}${rest.location ? " · " : ""}Joined ${joinedDate}`,
      badges,
      avatarKey: profileMock.hero.avatarKey
    },
    followStats: { following: Number(following), followers: Number(followers) },
    privacy: {
      ...profileMock.privacy,
      toggles: [
        { ...profileMock.privacy.toggles[0], defaultOn: science ?? true },
        { ...profileMock.privacy.toggles[1], defaultOn: visible ?? true },
        { ...profileMock.privacy.toggles[2], defaultOn: reminders ?? true }
      ]
    }
  });
});

router.patch("/profile/privacy", async (c) => {
  const individualId = await getIndividualId(c.get("user").sub);
  if (!individualId) return c.json({ error: "Individual not found" }, 404);

  const body = await c.req.json();
  const { science, visible, reminders } = body;
  await query(
    `INSERT INTO privacy_settings (individual_id, contribute_to_citizen_science, visible_in_community, daily_reminders)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (individual_id) DO UPDATE
       SET contribute_to_citizen_science = EXCLUDED.contribute_to_citizen_science,
           visible_in_community          = EXCLUDED.visible_in_community,
           daily_reminders               = EXCLUDED.daily_reminders,
           updated_at                    = NOW()`,
    [individualId, science ?? true, visible ?? true, reminders ?? true]
  );
  return c.json({ ok: true, privacy: body });
});

// ---------------------------------------------------------------------------
// Consent (mostly static)
// ---------------------------------------------------------------------------

router.get("/consent", (c) => {
  return c.json({
    title: "Your data & consent",
    sections: [
      { heading: "What we collect", body: "Your daily logs and exploration progress — always anonymised before use." },
      { heading: "How it's used", body: "Anonymised data supports citizen science research. You can opt out at any time." },
      { heading: "Your rights", body: "Download or delete your data at any time from the Profile screen." }
    ]
  });
});

router.post("/consent", (c) => {
  return c.json({ ok: true });
});

// ---------------------------------------------------------------------------
// Social follows
// ---------------------------------------------------------------------------

router.get("/social/follows", async (c) => {
  const individualId = await getIndividualId(c.get("user").sub);
  if (!individualId) return c.json({ followingExplorerIds: [], followingResearcherIds: [] });

  const { rows: individuals } = await query(
    `SELECT i.slug FROM individual_follows f
     JOIN individuals i ON i.id = f.followee_id
     WHERE f.follower_id = $1`,
    [individualId]
  );
  const { rows: researchers } = await query(
    "SELECT researcher_id FROM researcher_follows WHERE individual_id = $1",
    [individualId]
  );

  return c.json({
    followingExplorerIds: individuals.map((r) => r.slug),
    followingResearcherIds: researchers.map((r) => r.researcher_id)
  });
});

router.patch("/social/follows", async (c) => {
  const individualId = await getIndividualId(c.get("user").sub);
  if (!individualId) return c.json({ error: "Individual not found" }, 404);

  const { followSlug, unfollowSlug, followResearcherId, unfollowResearcherId } = await c.req.json();

  if (followSlug) {
    const { rows } = await query("SELECT id FROM individuals WHERE slug = $1", [followSlug]);
    if (rows[0]) {
      await query(
        "INSERT INTO individual_follows (follower_id, followee_id) VALUES ($1, $2) ON CONFLICT DO NOTHING",
        [individualId, rows[0].id]
      );
    }
  }
  if (unfollowSlug) {
    const { rows } = await query("SELECT id FROM individuals WHERE slug = $1", [unfollowSlug]);
    if (rows[0]) {
      await query(
        "DELETE FROM individual_follows WHERE follower_id = $1 AND followee_id = $2",
        [individualId, rows[0].id]
      );
    }
  }
  if (followResearcherId) {
    await query(
      "INSERT INTO researcher_follows (individual_id, researcher_id) VALUES ($1, $2) ON CONFLICT DO NOTHING",
      [individualId, followResearcherId]
    );
  }
  if (unfollowResearcherId) {
    await query(
      "DELETE FROM researcher_follows WHERE individual_id = $1 AND researcher_id = $2",
      [individualId, unfollowResearcherId]
    );
  }

  return c.json({ ok: true });
});

// ---------------------------------------------------------------------------
// Insights
// ---------------------------------------------------------------------------

router.get("/insights", async (c) => {
  const { rows: feedInsights } = await query(
    `SELECT id, headline AS title, body, published_at AS time
     FROM feed_items
     WHERE feed_type = 'science'
     ORDER BY published_at DESC
     LIMIT 10`
  );

  const communityInsights = feedInsights.length > 0
    ? feedInsights.map((r) => ({ iconTone: "blue", title: r.title, body: r.body, pillText: "" }))
    : insightMock.communityInsights;

  return c.json({ ...insightMock, communityInsights });
});

// ---------------------------------------------------------------------------
// Notifications (static for now)
// ---------------------------------------------------------------------------

router.get("/notifications", (c) => {
  return c.json({ items: [] });
});

// ---------------------------------------------------------------------------
// Search
// ---------------------------------------------------------------------------

router.get("/search", async (c) => {
  const q = (c.req.query("q") || "").toLowerCase().trim();
  if (!q) return c.json({ explorations: [], community: [] });

  const pattern = `%${q}%`;
  const { rows: explorations } = await query(
    `SELECT id, title AS title, description
     FROM explorations
     WHERE LOWER(title) LIKE $1 OR LOWER(description) LIKE $1`,
    [pattern]
  );
  const { rows: community } = await query(
    `SELECT slug AS id, display_name AS name, profile_meta AS meta
     FROM individuals
     WHERE LOWER(display_name) LIKE $1`,
    [pattern]
  );

  return c.json({ explorations, community });
});

// ---------------------------------------------------------------------------
// Explore copy & chat (static / mock-backed)
// ---------------------------------------------------------------------------

router.get("/explore/copy", (c) => {
  return c.json(exploreCopyMock);
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
      // skip bad regex
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
