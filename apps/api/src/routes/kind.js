import { Hono } from "hono";
import { query } from "../db.js";
import { requireAuth } from "../middleware.js";
import exploreCopyMock from "../mocks/exploreCopy.json" with { type: "json" };
import exploreChat from "../mocks/exploreChat.json" with { type: "json" };
import consentMock from "../mocks/consent.json" with { type: "json" };
import feedMock from "../mocks/feed.json" with { type: "json" };
import explorationEvidence from "../mocks/explorationEvidence.json" with { type: "json" };
import {
  buildConsentPayload,
  fetchConsentChoices,
  fetchExplorationConsents,
  fetchOnboardingRow,
  fetchPrivacyPrefs,
  upsertIndividualConsents
} from "../lib/meData.js";
import { buildHomePayload, fetchHomeFeedExtras } from "../lib/homeData.js";
import { buildExplorePayload } from "../lib/exploreData.js";
import { stripCatalogProgressFields } from "../lib/explorationCatalog.js";
import { buildInsightPayload } from "../lib/insightData.js";
import { buildCommunityPayload } from "../lib/communityData.js";
import { buildProfilePayload, updateProfile } from "../lib/profileData.js";
import { buildDataUsagePayload } from "../lib/dataUsageData.js";
import { submitDataExportRequest } from "../lib/dataExportRequest.js";
import {
  buildActsForIndividual,
  fetchActivityNiceSupporters,
  toggleActivityNice
} from "../lib/activityNiceData.js";
import {
  createActivityMessage,
  fetchActivityMessages,
  fetchActivityMessageSummary,
  toggleActivityMessageReaction
} from "../lib/activityMessageData.js";
import meRouter from "./me.js";
import {
  isAnnaDemoIndividual,
  isHiddenFromCommunity
} from "../lib/demoAccount.js";
import { EXPLORATION_CATEGORY } from "../lib/onboardingRecommendations.js";
import { isCatalogExploration, SHORT_EXPLORATION_IDS } from "../lib/centShort/index.js";

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
       e.is_new          AS "isNew",
       e.catalog_active  AS "catalogActive",
       e.status_badge    AS "statusBadge",
       e.chart_label     AS "chartLabel",
       (SELECT COUNT(DISTINCT ue.individual_id)::int
        FROM user_explorations ue WHERE ue.exploration_id = e.id) AS participants,
       (SELECT re.researcher_id FROM researcher_explorations re
        WHERE re.exploration_id = e.id LIMIT 1) AS "researcherId",
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
  return stripCatalogProgressFields({
    ...rows[0],
    category: EXPLORATION_CATEGORY[rows[0].id] ?? null
  });
}

router.get("/explorations", async (c) => {
  const items = await Promise.all(SHORT_EXPLORATION_IDS.map((id) => fetchExploration(id)));
  return c.json({ items: items.filter(Boolean) });
});

router.get("/explorations/evidence", (c) => {
  return c.json(explorationEvidence);
});

router.get("/explorations/:id", async (c) => {
  const id = c.req.param("id");
  if (!isCatalogExploration(id)) {
    return c.json({ error: "Exploration not found" }, 404);
  }
  const data = await fetchExploration(id);
  if (!data) return c.json({ error: "Exploration not found" }, 404);
  return c.json(data);
});

router.get("/explorations/:id/evidence", (c) => {
  const data = explorationEvidence[c.req.param("id")];
  if (!data) return c.json({ error: "Evidence not found" }, 404);
  return c.json(data);
});

// ---------------------------------------------------------------------------
// Community
// ---------------------------------------------------------------------------

router.get("/community/individuals", async (c) => {
  const viewerId = await getIndividualId(c.get("user").sub);
  const viewerIsAnna = await isAnnaDemoIndividual(viewerId);

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
          json_build_object(
            'id', ap.id,
            't', ap.summary,
            'time', ap.posted_at,
            'exp', ap.exploration_label,
            'detail', ap.detail_metrics,
            'nc', COALESCE(anc.nice_count, ap.nice_count_base, 0)
          ) ORDER BY ap.sort_order
        ), '[]'::json)
        FROM activity_posts ap
        LEFT JOIN activity_nice_counts anc ON anc.activity_post_id = ap.id
        WHERE ap.individual_id = i.id) AS acts
     FROM individuals i
     ORDER BY i.display_name`
  );

  const individualsWithTier = individuals
    .filter((ind) => !isHiddenFromCommunity(viewerIsAnna, ind.slug))
    .map((ind) => ({
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
    if (isHiddenFromCommunity(viewerIsAnna, row.slug)) continue;
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
  const viewerId = await getIndividualId(c.get("user").sub);
  const viewerIsAnna = await isAnnaDemoIndividual(viewerId);
  const slug = c.req.param("slug");

  if (isHiddenFromCommunity(viewerIsAnna, slug)) {
    return c.json({ error: "Individual not found" }, 404);
  }

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
        WHERE ue.individual_id = i.id) AS exps
     FROM individuals i
     WHERE i.slug = $1`,
    [slug]
  );
  if (!rows.length) return c.json({ error: "Individual not found" }, 404);

  const profile = rows[0];
  const acts = await buildActsForIndividual(profile.id, viewerId);

  return c.json({
    ...profile,
    id: profile.slug,
    acts
  });
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

  const payload = await buildHomePayload(individualId);
  return c.json(payload);
});

router.get("/home/feed", async (c) => {
  const individualId = await getIndividualId(c.get("user").sub);
  if (!individualId) return c.json({ error: "Individual not found" }, 404);

  const type = c.req.query("type");
  if (type !== "tip" && type !== "science") {
    return c.json({ error: "type must be tip or science" }, 400);
  }

  const explorationId = c.req.query("explorationId") || undefined;
  const offset = parseInt(c.req.query("offset") ?? "1", 10);

  const items = await fetchHomeFeedExtras(individualId, { type, explorationId, offset });
  return c.json({ items });
});

// ---------------------------------------------------------------------------
// Profile
// ---------------------------------------------------------------------------

router.get("/profile", async (c) => {
  const individualId = await getIndividualId(c.get("user").sub);
  if (!individualId) return c.json({ error: "Individual not found" }, 404);

  const payload = await buildProfilePayload(individualId);
  if (!payload) return c.json({ error: "Profile not found" }, 404);
  return c.json(payload);
});

router.get("/profile/data-usage", async (c) => {
  const individualId = await getIndividualId(c.get("user").sub);
  if (!individualId) return c.json({ error: "Individual not found" }, 404);

  const payload = await buildDataUsagePayload(individualId);
  return c.json(payload);
});

router.post("/profile/data-export-request", async (c) => {
  const individualId = await getIndividualId(c.get("user").sub);
  if (!individualId) return c.json({ error: "Individual not found" }, 404);

  const body = await c.req.json().catch(() => ({}));
  const result = await submitDataExportRequest(individualId, body.email, c.env);

  if (!result.ok) {
    return c.json({ error: result.error }, result.status);
  }

  return c.json({ ok: true, requestedAt: result.requestedAt });
});

router.patch("/profile", async (c) => {
  const individualId = await getIndividualId(c.get("user").sub);
  if (!individualId) return c.json({ error: "Individual not found" }, 404);

  const body = await c.req.json().catch(() => ({}));
  try {
    const payload = await updateProfile(individualId, {
      displayName: body.displayName,
      avatarImageId: body.avatarImageId
    });
    if (!payload) return c.json({ error: "Nothing to update" }, 400);
    return c.json(payload);
  } catch (err) {
    return c.json({ error: err.message || "Update failed" }, 400);
  }
});

router.patch("/profile/privacy", async (c) => {
  const individualId = await getIndividualId(c.get("user").sub);
  if (!individualId) return c.json({ error: "Individual not found" }, 404);

  const body = await c.req.json();
  const { science, visible, reminders, globalConsent } = body;
  await query(
    `INSERT INTO privacy_settings (
       individual_id, platform_consent, contribute_to_citizen_science,
       visible_in_community, daily_reminders
     ) VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT (individual_id) DO UPDATE SET
       platform_consent = COALESCE(EXCLUDED.platform_consent, privacy_settings.platform_consent),
       contribute_to_citizen_science = EXCLUDED.contribute_to_citizen_science,
       visible_in_community = EXCLUDED.visible_in_community,
       daily_reminders = EXCLUDED.daily_reminders,
       updated_at = NOW()`,
    [
      individualId,
      globalConsent ?? false,
      science ?? true,
      visible ?? true,
      reminders ?? true
    ]
  );
  return c.json({ ok: true, privacy: body });
});

// ---------------------------------------------------------------------------
// Consent (mostly static)
// ---------------------------------------------------------------------------

router.get("/consent", async (c) => {
  const individualId = await getIndividualId(c.get("user").sub);
  if (!individualId) return c.json(consentMock);

  const [choices, privacyPrefs, onboarding, { map, activeExplorationId }] = await Promise.all([
    fetchConsentChoices(individualId),
    fetchPrivacyPrefs(individualId),
    fetchOnboardingRow(individualId),
    fetchExplorationConsents(individualId)
  ]);

  const mergedChoices = {
    ...choices,
    platform_participation: privacyPrefs.globalConsent,
    research_contribution: privacyPrefs.science,
    result_sharing: privacyPrefs.visible
  };

  return c.json({
    ...consentMock,
    ...buildConsentPayload(mergedChoices, privacyPrefs),
    choices: mergedChoices,
    onboarding: {
      completed: Boolean(onboarding?.completed_at),
      answers: onboarding?.answers ?? {}
    },
    explorationConsents: map,
    activeExplorationId
  });
});

router.post("/consent", async (c) => {
  const individualId = await getIndividualId(c.get("user").sub);
  if (!individualId) return c.json({ ok: true });

  const body = await c.req.json().catch(() => ({}));
  const choices = body.choices ?? body;
  await upsertIndividualConsents(individualId, choices);

  if (
    choices.platform_participation !== undefined ||
    choices.research_contribution !== undefined ||
    choices.result_sharing !== undefined ||
    choices.us_collect !== undefined ||
    choices.us_share !== undefined
  ) {
    await query(
      `INSERT INTO privacy_settings (
         individual_id, platform_consent, contribute_to_citizen_science, visible_in_community
       ) VALUES ($1, $2, $3, $4)
       ON CONFLICT (individual_id) DO UPDATE SET
         platform_consent = COALESCE($2, privacy_settings.platform_consent),
         contribute_to_citizen_science = COALESCE($3, privacy_settings.contribute_to_citizen_science),
         visible_in_community = COALESCE($4, privacy_settings.visible_in_community),
         updated_at = NOW()`,
      [
        individualId,
        choices.platform_participation ?? null,
        choices.research_contribution ?? null,
        choices.result_sharing ?? null
      ]
    );
  }

  return c.json({ ok: true, choices });
});

// ---------------------------------------------------------------------------
// Social follows
// ---------------------------------------------------------------------------

router.get("/social/follows", async (c) => {
  const individualId = await getIndividualId(c.get("user").sub);
  if (!individualId) return c.json({ followingExplorerIds: [], followingResearcherIds: [] });

  const viewerIsAnna = await isAnnaDemoIndividual(individualId);

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
    followingExplorerIds: individuals
      .map((r) => r.slug)
      .filter((slug) => !isHiddenFromCommunity(viewerIsAnna, slug)),
    followingResearcherIds: researchers.map((r) => r.researcher_id)
  });
});

router.patch("/social/follows", async (c) => {
  const individualId = await getIndividualId(c.get("user").sub);
  if (!individualId) return c.json({ error: "Individual not found" }, 404);

  const viewerIsAnna = await isAnnaDemoIndividual(individualId);
  const { followSlug, unfollowSlug, followResearcherId, unfollowResearcherId } = await c.req.json();

  if (followSlug) {
    if (isHiddenFromCommunity(viewerIsAnna, followSlug)) {
      return c.json({ error: "Individual not found" }, 404);
    }
    const { rows: selfRows } = await query("SELECT slug FROM individuals WHERE id = $1", [individualId]);
    if (selfRows[0]?.slug === followSlug) {
      return c.json({ error: "Cannot follow yourself" }, 400);
    }
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

  const { rows: followingIndividuals } = await query(
    `SELECT i.slug FROM individual_follows f
     JOIN individuals i ON i.id = f.followee_id
     WHERE f.follower_id = $1`,
    [individualId]
  );
  const { rows: followingResearchers } = await query(
    "SELECT researcher_id FROM researcher_follows WHERE individual_id = $1",
    [individualId]
  );

  return c.json({
    ok: true,
    followingExplorerIds: followingIndividuals
      .map((r) => r.slug)
      .filter((slug) => !isHiddenFromCommunity(viewerIsAnna, slug)),
    followingResearcherIds: followingResearchers.map((r) => r.researcher_id)
  });
});

// ---------------------------------------------------------------------------
// Activity nices
// ---------------------------------------------------------------------------

router.patch("/activity-posts/:id/nice", async (c) => {
  const viewerId = await getIndividualId(c.get("user").sub);
  if (!viewerId) return c.json({ error: "Individual not found" }, 404);

  const postId = c.req.param("id");
  const { rows } = await query("SELECT id FROM activity_posts WHERE id = $1", [postId]);
  if (!rows.length) return c.json({ error: "Activity not found" }, 404);

  const result = await toggleActivityNice(postId, viewerId);
  return c.json(result);
});

router.get("/activity-posts/:id/nices", async (c) => {
  const viewerId = await getIndividualId(c.get("user").sub);
  if (!viewerId) return c.json({ error: "Individual not found" }, 404);

  const postId = c.req.param("id");
  const { rows } = await query("SELECT id FROM activity_posts WHERE id = $1", [postId]);
  if (!rows.length) return c.json({ error: "Activity not found" }, 404);

  const supporters = await fetchActivityNiceSupporters(postId, viewerId);
  return c.json(supporters);
});

router.get("/activity-posts/:id/messages", async (c) => {
  const viewerId = await getIndividualId(c.get("user").sub);
  if (!viewerId) return c.json({ error: "Individual not found" }, 404);

  const postId = c.req.param("id");
  const { rows } = await query("SELECT id FROM activity_posts WHERE id = $1", [postId]);
  if (!rows.length) return c.json({ error: "Activity not found" }, 404);

  const [messages, summary] = await Promise.all([
    fetchActivityMessages(postId, viewerId),
    fetchActivityMessageSummary(postId)
  ]);

  return c.json({ ...summary, messages });
});

router.post("/activity-posts/:id/messages", async (c) => {
  const viewerId = await getIndividualId(c.get("user").sub);
  if (!viewerId) return c.json({ error: "Individual not found" }, 404);

  const postId = c.req.param("id");
  const { rows } = await query("SELECT id FROM activity_posts WHERE id = $1", [postId]);
  if (!rows.length) return c.json({ error: "Activity not found" }, 404);

  const body = await c.req.json().catch(() => ({}));

  try {
    const result = await createActivityMessage(postId, viewerId, {
      body: body.body,
      parentMessageId: body.parentMessageId
    });
    return c.json(result, 201);
  } catch (err) {
    const status = err.status || 400;
    return c.json({ error: err.message || "Could not send message" }, status);
  }
});

router.patch("/activity-posts/:id/messages/:messageId/reactions", async (c) => {
  const viewerId = await getIndividualId(c.get("user").sub);
  if (!viewerId) return c.json({ error: "Individual not found" }, 404);

  const postId = c.req.param("id");
  const messageId = c.req.param("messageId");
  const body = await c.req.json().catch(() => ({}));

  try {
    const reactions = await toggleActivityMessageReaction(
      postId,
      messageId,
      viewerId,
      body.reactionType
    );
    return c.json({ reactions });
  } catch (err) {
    const status = err.status || 400;
    return c.json({ error: err.message || "Could not update reaction" }, status);
  }
});

// ---------------------------------------------------------------------------
// Insights
// ---------------------------------------------------------------------------

router.get("/insights", async (c) => {
  const individualId = await getIndividualId(c.get("user").sub);
  if (!individualId) return c.json({ error: "Individual not found" }, 404);

  const communityExplorationId = c.req.query("explorationId") || undefined;
  const payload = await buildInsightPayload(individualId, { communityExplorationId });
  return c.json(payload);
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
  const viewerId = await getIndividualId(c.get("user").sub);
  const viewerIsAnna = await isAnnaDemoIndividual(viewerId);
  const q = (c.req.query("q") || "").toLowerCase().trim();
  if (!q) return c.json({ explorations: [], community: [] });

  const pattern = `%${q}%`;
  const { rows: explorations } = await query(
    `SELECT id, title AS title, description
     FROM explorations
     WHERE id = ANY($2::text[])
       AND (LOWER(title) LIKE $1 OR LOWER(description) LIKE $1)`,
    [pattern, SHORT_EXPLORATION_IDS]
  );
  const { rows: communityRows } = await query(
    `SELECT slug AS id, display_name AS name, profile_meta AS meta, slug
     FROM individuals
     WHERE LOWER(display_name) LIKE $1`,
    [pattern]
  );
  const community = communityRows.filter(
    (row) => !isHiddenFromCommunity(viewerIsAnna, row.slug)
  ).map(({ slug: _slug, ...row }) => row);

  return c.json({ explorations, community });
});

// ---------------------------------------------------------------------------
// Explore copy & chat (static / mock-backed)
// ---------------------------------------------------------------------------

router.get("/explore/copy", (c) => {
  return c.json(exploreCopyMock);
});

router.get("/explore", async (c) => {
  const individualId = await getIndividualId(c.get("user").sub);
  if (!individualId) return c.json({ error: "Individual not found" }, 404);

  const payload = await buildExplorePayload(individualId);
  return c.json(payload);
});

router.get("/community", async (c) => {
  const individualId = await getIndividualId(c.get("user").sub);
  if (!individualId) return c.json({ error: "Individual not found" }, 404);

  const explore = await buildExplorePayload(individualId);
  const payload = await buildCommunityPayload(
    individualId,
    explore.activeExploration,
    explore.activeExplorationId
  );
  return c.json(payload);
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

router.route("/", meRouter);

export default router;
