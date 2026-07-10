import { query } from "../db.js";
import {
  filterStaticFeedRows,
  isCohortStatsScience
} from "./feedContentLibrary.js";
import {
  buildPersonalizationContext,
  fetchOnboardingAnswers,
  rankExplorations
} from "./onboardingRecommendations.js";
import {
  syncAllExplorationUpdates,
  fetchUpdateFeedItems
} from "./userExplorationUpdates.js";
import { syncAllShortExplorationUpdates } from "./userExplorationUpdatesShort.js";
import {
  feedContentExplorationId,
  isShortExploration,
  SHORT_EXPLORATION_IDS
} from "./centShort/index.js";
import { formatFullLogDetail } from "./logDetailFormat.js";

export const FEED_CHIPS = [
  { key: "all", label: "All" },
  { key: "milestone", label: "Milestones" },
  { key: "insight", label: "Insights" },
  { key: "activity", label: "Activity" },
  { key: "science", label: "Science" },
  { key: "tip", label: "Tips" }
];

export const EXPLORATION_FEED_LABELS = {
  "morning-rules": "morning rules",
  eating: "time-restricted eating",
  "screen-sleep": "screen time before bed",
  relaxation: "relaxation practices",
  "upf-mood": "ultra-processed food",
  "morning-rules-short": "morning rules (short)",
  "eating-short": "time-restricted eating (short)",
  "screen-sleep-short": "screen time before bed (short)",
  "relaxation-short": "relaxation practices (short)",
  "upf-mood-short": "ultra-processed food (short)"
};

const BADGE_MAP = {
  milestone: "amber",
  insight: "blue",
  activity: "purple",
  tip: "teal",
  science: "teal"
};

const LABEL_MAP = {
  milestone: "Milestone",
  insight: "Insight",
  activity: "Activity",
  tip: "Tip",
  science: "Science"
};

function todayDateString() {
  return new Date().toISOString().slice(0, 10);
}

function formatFeedTime(publishedAt) {
  if (!publishedAt) return "Recently";
  const then = new Date(publishedAt);
  const now = new Date();
  const diffMs = now - then;
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays <= 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays} days ago`;
  return then.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function toneForDelta(delta, invert = false) {
  if (delta === null || Number.isNaN(delta)) return "green";
  const positive = invert ? delta < 0 : delta > 0;
  if (Math.abs(delta) < 0.05) return "green";
  return positive ? "green" : "amber";
}

function formatDelta(delta, unit = "") {
  if (delta === null || Number.isNaN(delta)) return "";
  const sign = delta > 0 ? "+" : "";
  const formatted = Number.isInteger(delta) ? `${sign}${delta}` : `${sign}${delta.toFixed(1)}`;
  return `${formatted}${unit} from baseline`;
}

function modeValue(values) {
  const counts = new Map();
  for (const v of values) {
    counts.set(v, (counts.get(v) ?? 0) + 1);
  }
  let best = null;
  let bestCount = 0;
  for (const [value, count] of counts) {
    if (count > bestCount) {
      best = value;
      bestCount = count;
    }
  }
  return best;
}

export async function fetchActiveRun(individualId) {
  const { rows } = await query(
    `SELECT ue.exploration_id, ue.week_current, ue.weeks_total, ue.streak_days,
            e.title, e.icon, e.theme_bg AS bg, e.theme_text AS text
     FROM user_explorations ue
     JOIN explorations e ON e.id = ue.exploration_id
     WHERE ue.individual_id = $1 AND ue.is_active = TRUE
     LIMIT 1`,
    [individualId]
  );
  return rows[0] ?? null;
}

/**
 * The exploration(s) the individual is actively participating in today — i.e.
 * every exploration they're consented to and still working through (not yet
 * completed). This mirrors the "Your health explorations" list on Home,
 * where every entry carries an "Active" badge, rather than the single
 * `is_active` flag used to pick which exploration's daily check-in shortcut
 * to feature.
 */
export async function fetchActiveRunsForOutcomeCards(individualId) {
  const { rows } = await query(
    `SELECT ue.exploration_id, ue.week_current, ue.weeks_total, ue.streak_days
     FROM user_explorations ue
     JOIN exploration_consents ec
       ON ec.individual_id = ue.individual_id AND ec.exploration_id = ue.exploration_id
     WHERE ue.individual_id = $1 AND ec.granted = TRUE AND ue.status != 'complete'
     ORDER BY ec.consented_at ASC NULLS LAST`,
    [individualId]
  );
  return rows;
}

export async function fetchFallbackExplorationId(individualId) {
  const { rows } = await query(
    `SELECT ec.exploration_id
     FROM exploration_consents ec
     WHERE ec.individual_id = $1 AND ec.granted = TRUE
     ORDER BY ec.consented_at ASC NULLS LAST
     LIMIT 1`,
    [individualId]
  );
  return rows[0]?.exploration_id ?? null;
}

export async function fetchHomeMetricFields(explorationId) {
  const { rows } = await query(
    `SELECT field_key AS id, field_type::text AS type, label,
            min_value AS min, max_value AS max, default_value AS val,
            hints, options AS opts, allows_multiple AS multi, home_sort_order
     FROM log_field_defs
     WHERE exploration_id = $1 AND show_on_home = TRUE
     ORDER BY home_sort_order NULLS LAST, sort_order`,
    [explorationId]
  );
  return rows;
}

async function fetchLogsForBaseline(individualId, explorationId, fieldKey) {
  const { rows } = await query(
    `SELECT field_values, log_date
     FROM daily_logs
     WHERE individual_id = $1 AND exploration_id = $2
     ORDER BY log_date ASC
     LIMIT 7`,
    [individualId, explorationId]
  );
  return rows.map((r) => r.field_values?.[fieldKey]).filter((v) => v !== undefined && v !== null);
}

function metricFromField(field, todayValues, baselineValues) {
  const todayRaw = todayValues;
  const label = field.label;

  if (field.type === "range") {
    const todayNum = todayRaw !== undefined && todayRaw !== null ? Number(todayRaw) : null;
    const baselineNums = baselineValues.map(Number).filter((n) => !Number.isNaN(n));
    const baselineAvg =
      baselineNums.length > 0
        ? baselineNums.reduce((a, b) => a + b, 0) / baselineNums.length
        : null;

    if (todayNum === null) {
      return {
        label,
        value: "—",
        unit: "/10",
        sub: "Log today to track progress",
        subTone: "green"
      };
    }

    const delta = baselineAvg !== null ? todayNum - baselineAvg : null;
    return {
      label,
      value: Number.isInteger(todayNum) ? String(todayNum) : todayNum.toFixed(1),
      unit: "/10",
      sub: delta !== null ? formatDelta(Number(delta.toFixed(1))) : "Building your baseline",
      subTone: toneForDelta(delta)
    };
  }

  if (field.type === "checks") {
    const opts = Array.isArray(field.opts) ? field.opts : [];
    const todayChecked = Array.isArray(todayRaw) ? todayRaw : [];
    const total = opts.length || 1;

    if (!todayRaw) {
      return {
        label,
        value: "—",
        unit: `/${total}`,
        sub: "Log today to track progress",
        subTone: "green"
      };
    }

    const sub = todayChecked.length > 0 ? todayChecked.join(" · ") : "None logged";
    return {
      label,
      value: String(todayChecked.length),
      unit: `/${total}`,
      sub,
      subTone: "green"
    };
  }

  if (field.type === "select") {
    const opts = Array.isArray(field.opts) ? field.opts : [];
    const todayLabel = todayRaw ?? null;
    const baselineLabels = baselineValues.filter(Boolean);
    const baselineMode = baselineLabels.length > 0 ? modeValue(baselineLabels) : null;

    if (!todayLabel) {
      return {
        label,
        value: "—",
        unit: "",
        sub: "Log today to track progress",
        subTone: "green"
      };
    }

    let sub = "Building your baseline";
    if (baselineMode && todayLabel !== baselineMode) {
      sub = `down from ${baselineMode.toLowerCase()}`;
    } else if (baselineMode) {
      sub = "consistent with baseline";
    }

    return {
      label,
      value: todayLabel.replace(/\s+(dip|crash)$/i, "").split(" ")[0] || todayLabel,
      unit: "",
      sub,
      subTone: baselineMode && todayLabel !== baselineMode ? "amber" : "green"
    };
  }

  return {
    label,
    value: "—",
    unit: "",
    sub: "Log today to track progress",
    subTone: "green"
  };
}

/** The single highest-priority home metric field for an exploration (its "key outcome metric"). */
export async function computeKeyOutcomeMetric(individualId, explorationId) {
  const fields = await fetchHomeMetricFields(explorationId);
  const keyField = fields[0];
  if (!keyField) return null;

  const today = todayDateString();
  const { rows: todayRows } = await query(
    `SELECT field_values FROM daily_logs
     WHERE individual_id = $1 AND exploration_id = $2 AND log_date = $3
     LIMIT 1`,
    [individualId, explorationId, today]
  );
  const todayValues = todayRows[0]?.field_values ?? {};
  const baselineRaw = await fetchLogsForBaseline(individualId, explorationId, keyField.id);
  return metricFromField(keyField, todayValues[keyField.id], baselineRaw);
}

/**
 * Home "your active exploration" outcome cards: an Active streak card plus the
 * key outcome metric for the exploration(s) the individual is currently active
 * in. Nothing is returned if the individual isn't active in any exploration.
 * If active in two explorations at once, both cards become key outcome metrics
 * (one per exploration) instead of a shared streak card.
 */
export async function buildOutcomeCards(individualId, activeRuns) {
  if (!activeRuns.length) return [];

  if (activeRuns.length === 1) {
    const run = activeRuns[0];
    const streakDays = run.streak_days ?? 0;
    const unitLabel = isShortExploration(run.exploration_id) ? "day" : "week";
    const cards = [
      {
        label: "Active streak",
        value: String(streakDays),
        unit: "days",
        sub:
          streakDays >= 7
            ? "personal best!"
            : `${unitLabel} ${run.week_current ?? 1} of ${run.weeks_total ?? 8}`,
        subTone: "green",
        explorationId: run.exploration_id
      }
    ];
    const keyMetric = await computeKeyOutcomeMetric(individualId, run.exploration_id);
    if (keyMetric) cards.push({ ...keyMetric, explorationId: run.exploration_id });
    return cards;
  }

  const cards = [];
  for (const run of activeRuns.slice(0, 2)) {
    const keyMetric = await computeKeyOutcomeMetric(individualId, run.exploration_id);
    if (keyMetric) cards.push({ ...keyMetric, explorationId: run.exploration_id });
  }
  return cards;
}

export function buildGreeting(firstName, now = new Date()) {
  const hour = now.getHours();
  if (hour < 12) return `Hello, ${firstName}`;
  if (hour < 18) return `Good afternoon, ${firstName}`;
  return `Good evening, ${firstName}`;
}

export async function fetchConsentedExplorationIds(individualId) {
  const { rows } = await query(
    `SELECT exploration_id FROM exploration_consents
     WHERE individual_id = $1 AND granted = TRUE`,
    [individualId]
  );
  return rows.map((r) => r.exploration_id);
}

function mapFeedRow(row, explorationMeta = {}) {
  const expLabel = explorationMeta.feedLabel || explorationMeta.title || row.exploration_id || "";
  const timeSuffix = row.exploration_id && expLabel ? ` · ${expLabel}` : "";

  if (row.type === "tip") {
    return {
      id: row.id,
      type: "tip",
      explorationId: row.exploration_id ?? undefined,
      displayName: "Wellbeing tip",
      badgeLabel: "Tip",
      badge: "teal",
      time: `${formatFeedTime(row.published_at)}${timeSuffix}`,
      body: row.body ?? row.headline ?? "",
      avatarKind: "kind"
    };
  }

  if (row.type === "science") {
    return {
      id: row.id,
      type: "science",
      explorationId: row.exploration_id ?? undefined,
      displayName: "kind science",
      badgeLabel: "Science",
      badge: "teal",
      time: `${formatFeedTime(row.published_at)}${timeSuffix}`,
      body: row.body ?? row.headline ?? "",
      highlight: row.highlight ?? "",
      avatarKind: "kind"
    };
  }

  return {
    id: row.id,
    type: row.type,
    explorationId: row.exploration_id ?? undefined,
    userId: row.actor_slug ?? undefined,
    displayName: row.actor_name ?? (row.type === "insight" ? "Your insight" : "Kind"),
    badge: BADGE_MAP[row.type] ?? "teal",
    badgeLabel: LABEL_MAP[row.type] ?? row.type,
    time: formatFeedTime(row.published_at),
    body: row.body ?? row.headline ?? "",
    highlight: row.highlight ?? "",
    avatarKind: row.actor_img ? "image" : "initials",
    initials: row.actor_initials ?? "K",
    avatarKey: row.actor_img ? `pravatar-${row.actor_img}` : undefined
  };
}

export async function fetchExplorationMeta(explorationIds) {
  if (!explorationIds.length) return {};
  const { rows } = await query(
    `SELECT id, title, theme_bg AS bg, theme_text AS text
     FROM explorations WHERE id = ANY($1::text[])`,
    [explorationIds]
  );
  const meta = {};
  for (const row of rows) {
    meta[row.id] = {
      ...row,
      feedLabel: EXPLORATION_FEED_LABELS[row.id] || row.title
    };
  }
  return meta;
}

async function fetchStarterExplorationIds() {
  return SHORT_EXPLORATION_IDS;
}

function remapFeedRowsToCatalogIds(rows, catalogIds) {
  const contentToCatalog = Object.fromEntries(
    catalogIds.map((id) => [feedContentExplorationId(id), id])
  );
  return rows.map((row) => ({
    ...row,
    exploration_id: row.exploration_id
      ? contentToCatalog[row.exploration_id] ?? row.exploration_id
      : row.exploration_id
  }));
}

async function fetchFeedRows(explorationIds) {
  const catalogIds = explorationIds.length ? explorationIds : SHORT_EXPLORATION_IDS;
  const feedContentIds = [...new Set(catalogIds.map(feedContentExplorationId))];
  const { rows } = await query(
    `SELECT fi.id, fi.feed_type::text AS type, fi.exploration_id, fi.headline,
            fi.body, fi.highlight, fi.published_at, fi.sort_order,
            i.slug AS actor_slug, i.display_name AS actor_name,
            i.avatar_image_id AS actor_img, i.avatar_initials AS actor_initials
     FROM feed_items fi
     LEFT JOIN individuals i ON i.id = fi.actor_individual_id
     WHERE fi.feed_type IN ('tip', 'science')
       AND (fi.exploration_id IS NULL OR fi.exploration_id = ANY($1::text[]))
     ORDER BY fi.sort_order, fi.published_at DESC`,
    [feedContentIds]
  );
  if (rows.length) return remapFeedRowsToCatalogIds(rows, catalogIds);
  return remapFeedRowsToCatalogIds(filterStaticFeedRows(feedContentIds), catalogIds);
}

function shortDisplayName(name) {
  if (!name) return "Explorer";
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0];
  return `${parts[0]} ${parts[1][0]}.`;
}

function inferActivityType(summary) {
  if (/completed|streak|week \d+|personal best|finished/i.test(summary ?? "")) {
    return "milestone";
  }
  return "activity";
}

function mapActivityPost(row) {
  const type = inferActivityType(row.summary);
  const expSuffix = row.exploration_label ? ` · ${row.exploration_label}` : "";
  return {
    id: `post-${row.id}`,
    activityPostId: row.id,
    type,
    explorationId: row.exploration_id ?? undefined,
    userId: row.actor_slug ?? undefined,
    displayName: shortDisplayName(row.actor_name),
    badge: BADGE_MAP[type] ?? "purple",
    badgeLabel: LABEL_MAP[type] ?? "Activity",
    time: `${formatFeedTime(row.posted_at)}${expSuffix}`,
    body: row.summary,
    highlight: row.detail_metrics ?? "",
    avatarKind: row.actor_img ? "image" : "initials",
    initials: row.actor_initials ?? "?",
    avatarKey: row.actor_img ? `pravatar-${row.actor_img}` : undefined,
    nc: Number(row.nice_count) || 0,
    viewerNiced: !!row.viewer_niced,
    _sortAt: new Date(row.posted_at).getTime()
  };
}

async function fetchNetworkActivityPosts(individualId, consentedIds) {
  const { rows } = await query(
    `SELECT ap.id, ap.individual_id, ap.exploration_id, ap.summary, ap.detail_metrics,
            ap.exploration_label, ap.posted_at,
            COALESCE(anc.nice_count, ap.nice_count_base, 0)::int AS nice_count,
            EXISTS(
              SELECT 1 FROM activity_nices n
              WHERE n.activity_post_id = ap.id AND n.individual_id = $1
            ) AS viewer_niced,
            i.slug AS actor_slug, i.display_name AS actor_name,
            i.avatar_image_id AS actor_img, i.avatar_initials AS actor_initials
     FROM activity_posts ap
     JOIN individuals i ON i.id = ap.individual_id
     LEFT JOIN activity_nice_counts anc ON anc.activity_post_id = ap.id
     WHERE ap.individual_id != $1
       AND ap.individual_id IN (
          SELECT followee_id FROM individual_follows WHERE follower_id = $1
        )
     ORDER BY ap.posted_at DESC
     LIMIT 30`,
    [individualId]
  );

  return rows.filter(
    (row) =>
      !row.exploration_id ||
      consentedIds.length === 0 ||
      consentedIds.includes(row.exploration_id)
  );
}

function formatLogSummary(explorationId, fieldValues, feedLabel) {
  const fv = fieldValues ?? {};
  const label = feedLabel || explorationId;

  if (explorationId === "morning-rules") {
    const rules = Array.isArray(fv.mr_rules) ? fv.mr_rules : [];
    const energy = fv.mr_pm_energy != null ? `<strong>${fv.mr_pm_energy}/10</strong>` : null;
    const crash = fv.mr_crash ? String(fv.mr_crash) : null;
    const parts = [];
    if (rules.length) {
      const shortRules = rules
        .map((r) => r.replace(/\s*\([^)]*\)/g, "").trim().toLowerCase())
        .join(" · ");
      parts.push(
        `Logged ${rules.length} morning rule${rules.length === 1 ? "" : "s"} — ${shortRules}.`
      );
    }
    if (energy) parts.push(`Afternoon energy ${energy}`);
    if (crash && !/^none$/i.test(crash)) parts.push(String(crash));
    if (parts.length) return parts.join(" ");
  }

  const numericFields = Object.entries(fv).filter(([, v]) => typeof v === "number");
  if (numericFields.length) {
    const [key, val] = numericFields[0];
    return `Logged today's check-in for ${label}. Key score: <strong>${val}</strong>.`;
  }

  return `Logged today's check-in for ${label}.`;
}

async function fetchViewerMilestones(individualId, consentedIds, explorationMeta) {
  if (!consentedIds.length) return [];

  const { rows } = await query(
    `SELECT ue.exploration_id, ue.week_current, ue.weeks_total, ue.streak_days,
            ue.status::text AS status, ue.updated_at, ue.completed_at,
            e.title
     FROM user_explorations ue
     JOIN explorations e ON e.id = ue.exploration_id
     WHERE ue.individual_id = $1
       AND ue.exploration_id = ANY($2::text[])`,
    [individualId, consentedIds]
  );

  const items = [];
  for (const row of rows) {
    const feedLabel = explorationMeta[row.exploration_id]?.feedLabel || row.title;
    const sortAt = new Date(row.completed_at ?? row.updated_at).getTime();
    const isShort = isShortExploration(row.exploration_id);
    const unitLabel = isShort ? "day" : "week";
    const UnitLabel = isShort ? "Day" : "Week";

    if (row.status === "complete") {
      items.push({
        id: `milestone-complete-${row.exploration_id}`,
        type: "milestone",
        explorationId: row.exploration_id,
        displayName: "You",
        badge: "amber",
        badgeLabel: "Milestone",
        time: `${formatFeedTime(row.completed_at ?? row.updated_at)} · ${feedLabel}`,
        body: `Completed your ${feedLabel.toLowerCase()} exploration — ${row.weeks_total}-${unitLabel} run finished.`,
        highlight: `${row.streak_days}-day logging streak`,
        avatarKind: "glyph",
        glyph: "★",
        avatarBg: "#FDF0E4",
        glyphColor: "#8A4A1A",
        _sortAt: sortAt
      });
      continue;
    }

    if (row.streak_days >= 7) {
      items.push({
        id: `milestone-streak-${row.exploration_id}`,
        type: "milestone",
        explorationId: row.exploration_id,
        displayName: "You",
        badge: "amber",
        badgeLabel: "Milestone",
        time: `${formatFeedTime(row.updated_at)} · ${feedLabel}`,
        body: `<strong>${row.streak_days}-day streak</strong> on your ${feedLabel.toLowerCase()} exploration. Keep it up!`,
        highlight: `${UnitLabel} ${row.week_current} of ${row.weeks_total}`,
        avatarKind: "glyph",
        glyph: "★",
        avatarBg: "#E6ECD0",
        glyphColor: "#22401F",
        _sortAt: sortAt
      });
    } else if (row.week_current > 1) {
      items.push({
        id: `milestone-week-${row.exploration_id}-${row.week_current}`,
        type: "milestone",
        explorationId: row.exploration_id,
        displayName: "You",
        badge: "amber",
        badgeLabel: "Milestone",
        time: `${formatFeedTime(row.updated_at)} · ${feedLabel}`,
        body: `Reached ${unitLabel} ${row.week_current} of ${row.weeks_total} on your ${feedLabel.toLowerCase()} exploration.`,
        highlight: row.streak_days ? `${row.streak_days}-day streak` : "",
        avatarKind: "glyph",
        glyph: "★",
        avatarBg: "#E6ECD0",
        glyphColor: "#22401F",
        _sortAt: sortAt
      });
    }
  }

  return items;
}

async function fetchViewerInsights(individualId, consentedIds) {
  if (!consentedIds.includes("morning-rules")) return [];

  const { rows } = await query(
    `SELECT field_values, log_date
     FROM daily_logs
     WHERE individual_id = $1 AND exploration_id = 'morning-rules'
     ORDER BY log_date ASC`,
    [individualId]
  );

  if (rows.length < 5) return [];

  const highRuleDays = [];
  const lowRuleDays = [];
  for (const row of rows) {
    const rules = row.field_values?.mr_rules;
    const energy = Number(row.field_values?.mr_pm_energy);
    if (!Array.isArray(rules) || Number.isNaN(energy)) continue;
    if (rules.length >= 3) highRuleDays.push(energy);
    else if (rules.length <= 1) lowRuleDays.push(energy);
  }

  if (highRuleDays.length < 2 || lowRuleDays.length < 2) return [];

  const avg = (arr) => arr.reduce((a, b) => a + b, 0) / arr.length;
  const highAvg = avg(highRuleDays);
  const lowAvg = avg(lowRuleDays);
  const delta = highAvg - lowAvg;
  if (delta < 0.5) return [];

  return [
    {
      id: "insight-morning-rules-energy",
      type: "insight",
      explorationId: "morning-rules",
      insightTab: "your",
      avatarKind: "icon",
      icon: "✦",
      avatarBg: "#E6F1FB",
      iconColor: "#185FA5",
      displayName: "Your insight",
      badge: "blue",
      badgeLabel: "Insight",
      time: `Today · morning rules`,
      body: `On days you logged <strong>3+ morning rules</strong>, afternoon energy averaged <strong>${delta.toFixed(1)} points higher</strong> than on lighter-rule days.`,
      highlight: "Try stacking sunlight + stretching before 9am this week to confirm the pattern.",
      _sortAt: Date.now()
    }
  ];
}

function truncate(text, max = 140) {
  const value = String(text || "").trim();
  return value.length > max ? `${value.slice(0, max - 1).trimEnd()}…` : value;
}

async function fetchIncomingActivityMessages(individualId) {
  const { rows } = await query(
    `SELECT am.id AS message_id, am.body, am.sent_at, am.activity_post_id,
            ap.summary, ap.exploration_label,
            i.slug AS sender_slug, i.display_name AS sender_name,
            i.avatar_image_id AS sender_img, i.avatar_initials AS sender_initials
     FROM activity_messages am
     JOIN activity_posts ap ON ap.id = am.activity_post_id
     JOIN individuals i ON i.id = am.sender_id
     WHERE ap.individual_id = $1 AND am.sender_id != $1
     ORDER BY am.sent_at DESC
     LIMIT 20`,
    [individualId]
  );

  return rows.map((row) => {
    const senderName = shortDisplayName(row.sender_name);
    const expSuffix = row.exploration_label ? ` · ${row.exploration_label}` : "";
    return {
      id: `activity-message-${row.message_id}`,
      type: "activity",
      userId: row.sender_slug ?? undefined,
      displayName: senderName,
      badge: "purple",
      badgeLabel: "Message",
      time: `${formatFeedTime(row.sent_at)}${expSuffix}`,
      body: `<strong>${senderName}</strong> left a message on your activity: "${truncate(row.body)}"`,
      highlight: row.summary ? `Re: ${row.summary}` : "",
      avatarKind: row.sender_img ? "image" : "initials",
      initials: row.sender_initials ?? "?",
      avatarKey: row.sender_img ? `pravatar-${row.sender_img}` : undefined,
      route: "ActivityDetail",
      routeParams: { activityPostId: row.activity_post_id },
      _sortAt: new Date(row.sent_at).getTime()
    };
  });
}

function stripSortKey(item) {
  const { _sortAt, ...rest } = item;
  return rest;
}

export async function fetchAllLogFieldDefs(explorationId) {
  const { rows } = await query(
    `SELECT field_key AS id, field_type::text AS type, label,
            min_value AS min, max_value AS max, unit, options AS opts
     FROM log_field_defs
     WHERE exploration_id = $1
     ORDER BY sort_order`,
    [explorationId]
  );
  return rows;
}

export async function recordActivityFromLog(individualId, explorationId, fieldValues, userExplorationId) {
  const { rows: expRows } = await query(
    `SELECT title FROM explorations WHERE id = $1`,
    [explorationId]
  );
  const feedLabel = EXPLORATION_FEED_LABELS[explorationId] || expRows[0]?.title || explorationId;
  const summary = formatLogSummary(explorationId, fieldValues, feedLabel);
  const fields = await fetchAllLogFieldDefs(explorationId);
  const detailMetrics = formatFullLogDetail(fields, fieldValues);
  const today = todayDateString();

  await query(
    `DELETE FROM activity_posts
     WHERE individual_id = $1 AND exploration_id = $2 AND posted_at::date = $3::date`,
    [individualId, explorationId, today]
  );

  await query(
    `INSERT INTO activity_posts
       (individual_id, exploration_id, user_exploration_id, summary, detail_metrics, exploration_label, posted_at)
     VALUES ($1, $2, $3, $4, $5, $6, NOW())`,
    [
      individualId,
      explorationId,
      userExplorationId,
      summary.replace(/<[^>]+>/g, ""),
      detailMetrics || null,
      feedLabel
    ]
  );
}

export async function buildActivityFeedItems(individualId) {
  const consentedIds = await fetchConsentedExplorationIds(individualId);
  const explorationMeta = await fetchExplorationMeta(consentedIds);

  const [activityPosts, viewerMilestones, viewerInsights, incomingMessages] = await Promise.all([
    fetchNetworkActivityPosts(individualId, consentedIds),
    fetchViewerMilestones(individualId, consentedIds, explorationMeta),
    fetchViewerInsights(individualId, consentedIds),
    fetchIncomingActivityMessages(individualId)
  ]);

  return [
    ...activityPosts.map(mapActivityPost),
    ...viewerMilestones,
    ...viewerInsights,
    ...incomingMessages
  ]
    .sort((a, b) => (b._sortAt ?? 0) - (a._sortAt ?? 0))
    .slice(0, 20)
    .map(stripSortKey);
}

export async function buildHomeFeed(individualId) {
  const consentedIds = await fetchConsentedExplorationIds(individualId);
  const starterMode = consentedIds.length === 0;
  const allStarterIds = await fetchStarterExplorationIds();
  const answers = await fetchOnboardingAnswers(individualId);
  const personalization = buildPersonalizationContext(answers, allStarterIds);

  // Order the user's active explorations by their onboarding health-goal
  // ranking so the feed keeps surfacing what they told us matters most,
  // rather than relying on arbitrary consent insertion order.
  const rankedConsentedIds = rankExplorations(answers, consentedIds).map((r) => r.id);

  const contentExplorationIds = starterMode
    ? personalization.starterFeedExplorationIds
    : rankedConsentedIds;
  const explorationMeta = await fetchExplorationMeta(
    starterMode ? allStarterIds : contentExplorationIds
  );

  if (!starterMode) {
    await syncAllExplorationUpdates(individualId);
    await syncAllShortExplorationUpdates(individualId);
  }

  const [activityItems, contentRows, algorithmUpdates] = await Promise.all([
    starterMode ? Promise.resolve([]) : buildActivityFeedItems(individualId),
    fetchFeedRows(starterMode ? allStarterIds : contentExplorationIds),
    starterMode ? Promise.resolve([]) : fetchUpdateFeedItems(individualId, explorationMeta)
  ]);

  const tipsByExp = {};
  const scienceByExp = {};
  let hasMoreTips = false;
  let hasMoreScience = false;

  for (const row of contentRows) {
    if (
      row.type === "tip" &&
      row.exploration_id &&
      contentExplorationIds.includes(row.exploration_id)
    ) {
      if (!tipsByExp[row.exploration_id]) tipsByExp[row.exploration_id] = [];
      tipsByExp[row.exploration_id].push(row);
    } else if (
      row.type === "science" &&
      row.exploration_id &&
      contentExplorationIds.includes(row.exploration_id) &&
      !(starterMode && isCohortStatsScience(row))
    ) {
      if (!scienceByExp[row.exploration_id]) scienceByExp[row.exploration_id] = [];
      scienceByExp[row.exploration_id].push(row);
    }
  }

  for (const list of Object.values(tipsByExp)) {
    if (list.length > 1) hasMoreTips = true;
  }
  for (const list of Object.values(scienceByExp)) {
    if (list.length > 1) hasMoreScience = true;
  }

  const scienceFirst = personalization.feedEmphasis === "science-first";
  const contentItems = [];
  for (const expId of contentExplorationIds) {
    const meta = explorationMeta[expId] ?? {};
    meta.feedLabel = meta.feedLabel || meta.title;
    const tip = tipsByExp[expId]?.[0];
    const sci = scienceByExp[expId]?.[0];
    const cards = scienceFirst ? [sci, tip] : [tip, sci];
    for (const card of cards) {
      if (card) contentItems.push(mapFeedRow(card, meta));
    }
  }

  const items = starterMode
    ? contentItems
    : [...algorithmUpdates, ...activityItems, ...contentItems];
  const reportItems = starterMode
    ? []
    : algorithmUpdates.filter((item) => item.route === "ExplorationReport");

  return {
    chips: FEED_CHIPS,
    items,
    hasMoreTips,
    hasMoreScience,
    reportItems,
    starterMode,
    personalization
  };
}

async function buildReportFeedItems(individualId, explorationMeta) {
  const { rows } = await query(
    `SELECT uer.exploration_id, uer.generated_at, e.title
     FROM user_exploration_reports uer
     JOIN explorations e ON e.id = uer.exploration_id
     WHERE uer.individual_id = $1
     ORDER BY uer.generated_at DESC`,
    [individualId]
  );

  return rows.map((row) => {
    const title = row.title || row.exploration_id;
    const meta = explorationMeta[row.exploration_id] ?? {};
    return {
      id: `report-${row.exploration_id}`,
      type: "insight",
      explorationId: row.exploration_id,
      route: "ExplorationReport",
      routeParams: { explorationId: row.exploration_id },
      avatarKind: "icon",
      icon: "✦",
      avatarBg: meta.bg || "#FDF0E4",
      iconColor: meta.text || "#8A4A1A",
      displayName: "Personalised trial final report",
      badge: "blue",
      badgeLabel: "Insight",
      time: `${title} · ${formatFeedTime(row.generated_at)}`,
      body: `Your <strong>${title}</strong> personalised trial final report is ready to view.`
    };
  });
}

export async function fetchHomeFeedExtras(individualId, { type, explorationId, offset = 1 }) {
  const consentedIds = await fetchConsentedExplorationIds(individualId);
  const starterMode = consentedIds.length === 0;
  const allStarterIds = await fetchStarterExplorationIds();
  const answers = await fetchOnboardingAnswers(individualId);
  const personalization = buildPersonalizationContext(answers, allStarterIds);
  const rankedConsentedIds = rankExplorations(answers, consentedIds).map((r) => r.id);
  const sourceIds = starterMode ? allStarterIds : rankedConsentedIds;
  const visibleIds = starterMode ? personalization.starterFeedExplorationIds : sourceIds;
  const targetIds = explorationId
    ? [explorationId].filter((id) => visibleIds.includes(id))
    : visibleIds;
  const explorationMeta = await fetchExplorationMeta(targetIds);
  const rows = await fetchFeedRows(sourceIds);

  const byExp = {};
  for (const row of rows) {
    if (row.type !== type || !row.exploration_id || !targetIds.includes(row.exploration_id)) continue;
    if (starterMode && type === "science" && isCohortStatsScience(row)) continue;
    if (!byExp[row.exploration_id]) byExp[row.exploration_id] = [];
    byExp[row.exploration_id].push(row);
  }

  const items = [];
  for (const expId of targetIds) {
    const meta = explorationMeta[expId] ?? {};
    meta.feedLabel = meta.title;
    const extras = (byExp[expId] ?? []).slice(offset);
    for (const row of extras) {
      items.push(mapFeedRow(row, meta));
    }
  }

  return items;
}

export async function fetchCheckinState(individualId) {
  const today = todayDateString();
  const [{ rows: logRows }, { rows: checkinRows }] = await Promise.all([
    query(
      `SELECT exploration_id FROM daily_logs
       WHERE individual_id = $1 AND log_date = $2`,
      [individualId, today]
    ),
    query(
      `SELECT DISTINCT ec.exploration_id
       FROM exploration_consents ec
       JOIN log_field_defs lf ON lf.exploration_id = ec.exploration_id
       WHERE ec.individual_id = $1 AND ec.granted = TRUE`,
      [individualId]
    )
  ]);

  const loggedExplorationIds = logRows.map((r) => r.exploration_id);
  const checkinExplorationIds = checkinRows.map((r) => r.exploration_id);
  const loggedToday =
    checkinExplorationIds.length > 0 &&
    checkinExplorationIds.every((id) => loggedExplorationIds.includes(id));

  return { loggedExplorationIds, loggedToday };
}

export async function buildHomePayload(individualId) {
  const { rows: indRows } = await query(
    "SELECT display_name FROM individuals WHERE id = $1",
    [individualId]
  );
  const displayName = indRows[0]?.display_name ?? "there";
  const firstName = displayName.split(" ")[0];

  const activeRun = await fetchActiveRun(individualId);
  const fallbackExplorationId = activeRun ? null : await fetchFallbackExplorationId(individualId);

  const outcomeRuns = await fetchActiveRunsForOutcomeCards(individualId);
  const outcomeCards = await buildOutcomeCards(individualId, outcomeRuns);

  const { loggedExplorationIds, loggedToday } = await fetchCheckinState(individualId);
  const feed = await buildHomeFeed(individualId);
  const starterMode = feed.starterMode ?? false;

  return {
    greeting: buildGreeting(firstName),
    activeExplorationId: activeRun?.exploration_id ?? fallbackExplorationId ?? null,
    loggedToday,
    loggedExplorationIds,
    outcomeCards,
    logFormTitle: "Today's log",
    starterMode,
    personalization: feed.personalization ?? null,
    confirm: {
      title: "Logged! Great work.",
      body: "Your data has been saved. Keep going — consistency is key to seeing results."
    },
    feed
  };
}
