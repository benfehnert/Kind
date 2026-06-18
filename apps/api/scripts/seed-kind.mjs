/**
 * Seed the Kind database from mock JSON files.
 *
 * Run: node apps/api/scripts/seed-kind.mjs
 *
 * Requires env vars (copy apps/api/.env.example → apps/api/.env):
 *   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 *
 * Safe to run multiple times — clears then repopulates all Kind tables.
 */

import { createClient } from "@supabase/supabase-js";
import { createRequire } from "module";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { config } from "dotenv";

const __dir = dirname(fileURLToPath(import.meta.url));
config({ path: join(__dir, "../.env") });

const require = createRequire(import.meta.url);
const mocks = join(__dir, "../src/mocks");

const explorations = require(join(mocks, "explorations.json"));
const community = require(join(mocks, "community.json"));
const feed = require(join(mocks, "feed.json"));
const consent = require(join(mocks, "consent.json"));
const trialReports = require(join(__dir, "../src/data/explorationTrialReports.json"));

// ---------------------------------------------------------------------------
// Supabase admin client (service role — bypasses RLS)
// ---------------------------------------------------------------------------

const supabase = createClient(
  process.env.SUPABASE_URL ?? "http://localhost:54321",
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

function die(label, error) {
  console.error(`✗ ${label}:`, error?.message ?? error);
  process.exit(1);
}

async function upsert(table, data, opts = {}) {
  const { error } = await supabase.from(table).upsert(data, opts);
  if (error) die(`upsert ${table}`, error);
}

async function insert(table, data) {
  if (!data?.length) return;
  const { error } = await supabase.from(table).insert(data);
  if (error) die(`insert ${table}`, error);
}

// ---------------------------------------------------------------------------
// Clear existing data (reverse FK order)
// ---------------------------------------------------------------------------

// Tables with UUID PKs use gte filter; TEXT PK tables use neq filter
const UUID_PK_TABLES = [
  "waitlist_entries",
  "feed_items",
  "activity_messages",
  "activity_nices",
  "researcher_exploration_nices",
  "activity_posts",
  "individual_badges",
  "user_exploration_reports",
  "daily_logs",
  "user_explorations",
  "individual_consents",
  "researcher_areas",
  "log_field_defs",
  "exploration_chart_points",
  "exploration_kpis",
  "exploration_expected_outcomes",
  "exploration_phases",
  "privacy_settings",
  "individuals"
];
// Tables with TEXT PKs
const TEXT_PK_TABLES = [
  "individual_follows",
  "researcher_follows",
  "researcher_explorations",
  "exploration_trial_report_templates",
  "explorations",
  "researchers"
];

async function clearAll() {
  console.log("Clearing existing data…");

  // individual_follows and researcher_follows have composite PKs — delete via always-true filter
  for (const table of ["individual_follows", "researcher_follows", "researcher_explorations"]) {
    const { error } = await supabase.from(table).delete().gte("created_at", "1970-01-01");
    if (error) console.warn(`  warn clearing ${table}: ${error.message}`);
  }

  for (const table of ["exploration_consents", "individual_onboarding"]) {
    const { error } = await supabase
      .from(table)
      .delete()
      .gte("individual_id", "00000000-0000-0000-0000-000000000000");
    if (error) console.warn(`  warn clearing ${table}: ${error.message}`);
  }

  for (const table of UUID_PK_TABLES) {
    const { error } = await supabase
      .from(table)
      .delete()
      .gte("id", "00000000-0000-0000-0000-000000000000");
    if (error) console.warn(`  warn clearing ${table}: ${error.message}`);
  }

  for (const table of TEXT_PK_TABLES) {
    const { error } = await supabase.from(table).delete().neq("id", "__never__");
    if (error) console.warn(`  warn clearing ${table}: ${error.message}`);
  }
}

// ---------------------------------------------------------------------------
// 1. Explorations catalog
// ---------------------------------------------------------------------------

const EXPLORATION_ORDER = ["morning-rules", "eating", "screen-sleep", "relaxation", "upf-mood"];

async function seedExplorations() {
  console.log("Seeding explorations…");

  const expRows = EXPLORATION_ORDER.filter((id) => explorations[id]).map((id) => {
    const e = explorations[id];
    return {
      id,
      title: e.title,
      icon: e.icon,
      theme_bg: e.bg ?? null,
      theme_text: e.text ?? null,
      duration_label: e.duration,
      description: e.desc,
      participant_count: e.participants ?? 0,
      is_new: e.isNew ?? false,
      catalog_active: e.active ?? false,
      status_badge: e.statusBadge ?? null,
      progress_percent: e.progress ?? null,
      streak_days: e.streak ?? null,
      chart_label: e.chartLabel ?? null
    };
  });
  await upsert("explorations", expRows, { onConflict: "id" });

  // Phases
  const phases = [];
  for (const id of EXPLORATION_ORDER) {
    const e = explorations[id];
    (e?.phases ?? []).forEach((p, i) => {
      phases.push({
        exploration_id: id,
        sort_order: i,
        name: p.name,
        description: p.desc,
        status: p.status
      });
    });
  }
  await insert("exploration_phases", phases);

  // Expected outcomes
  const outcomes = [];
  for (const id of EXPLORATION_ORDER) {
    const e = explorations[id];
    (e?.outcomes ?? []).forEach((o, i) => {
      outcomes.push({ exploration_id: id, sort_order: i, icon: o.icon, label: o.label });
    });
  }
  await insert("exploration_expected_outcomes", outcomes);

  // KPIs
  const kpis = [];
  for (const id of EXPLORATION_ORDER) {
    const e = explorations[id];
    (e?.kpis ?? []).forEach((k, i) => {
      kpis.push({
        exploration_id: id,
        sort_order: i,
        label: k.label,
        value_text: k.val,
        unit: k.unit ?? null,
        change_text: k.change ?? null,
        is_positive: k.up ?? true
      });
    });
  }
  await insert("exploration_kpis", kpis);

  // Chart points
  const chartPoints = [];
  for (const id of EXPLORATION_ORDER) {
    const e = explorations[id];
    (e?.chart ?? []).forEach((c, i) => {
      chartPoints.push({
        exploration_id: id,
        sort_order: i,
        day_label: c.day,
        height_percent: c.h ?? 0,
        value_label: c.v ?? null,
        is_highlight: c.hi ?? false,
        is_empty: c.empty ?? false
      });
    });
  }
  await insert("exploration_chart_points", chartPoints);

  // Log field definitions
  const fields = [];
  for (const id of EXPLORATION_ORDER) {
    const e = explorations[id];
    (e?.fields ?? []).forEach((f, i) => {
      const typeMap = { range: "range", select: "select", checks: "checks", number: "number" };
      fields.push({
        exploration_id: id,
        field_key: f.id,
        field_type: typeMap[f.type] ?? "range",
        label: f.label,
        sort_order: i,
        min_value: f.min ?? null,
        max_value: f.max ?? null,
        default_value: f.val != null ? f.val : (f.sel != null ? f.sel : null),
        hints: f.hints ?? [],
        options: f.opts ?? [],
        allows_multiple: f.multi ?? false
      });
    });
  }
  await insert("log_field_defs", fields);

  console.log("  ✓ explorations, phases, outcomes, kpis, chart points, log fields");
}

// ---------------------------------------------------------------------------
// 2. Researchers
// ---------------------------------------------------------------------------

async function seedResearchers() {
  console.log("Seeding researchers…");

  const researcherRows = community.researchers.map((r) => ({
    id: r.id,
    display_name: r.name,
    title: r.title,
    organisation: r.org,
    avatar_initials: r.initials,
    avatar_image_id: r.img ?? null,
    verified: r.verified ?? false
  }));
  await upsert("researchers", researcherRows, { onConflict: "id" });

  const areas = [];
  for (const r of community.researchers) {
    (r.areas ?? []).forEach((area, i) => {
      areas.push({ researcher_id: r.id, area_label: area, sort_order: i });
    });
  }
  await insert("researcher_areas", areas);

  const links = [];
  for (const r of community.researchers) {
    for (const e of r.explorations ?? []) {
      links.push({ researcher_id: r.id, exploration_id: e.expId, collaboration_note: e.note ?? null });
    }
  }
  await insert("researcher_explorations", links);

  console.log("  ✓ researchers, areas, exploration links");
}

// ---------------------------------------------------------------------------
// 3. Individuals (community users)
// ---------------------------------------------------------------------------

// Fixed UUIDs for named individuals so seed is reproducible
const INDIVIDUAL_IDS = {};

function toSlug(key) {
  return key.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

async function seedIndividuals() {
  console.log("Seeding individuals…");

  const rows = [];

  // commUsers
  for (const [slug, u] of Object.entries(community.commUsers)) {
    rows.push({
      slug,
      display_name: u.name,
      location: u.loc ?? null,
      avatar_image_id: u.img ?? null,
      avatar_initials: u.initials,
      bio: u.bio ?? null,
      profile_meta: u.meta ?? null
    });
  }

  // basicUsers
  for (const u of community.basicUsers ?? []) {
    rows.push({
      slug: u.id,
      display_name: u.name,
      location: u.loc ?? null,
      avatar_image_id: u.img ?? null,
      avatar_initials: u.initials,
      bio: null,
      profile_meta: u.meta ?? null
    });
  }

  // followerOnly
  for (const u of community.followerOnly ?? []) {
    rows.push({
      slug: u.id,
      display_name: u.name,
      location: u.loc ?? null,
      avatar_image_id: u.img ?? null,
      avatar_initials: u.initials,
      bio: null,
      profile_meta: u.meta ?? null
    });
  }

  await upsert("individuals", rows, { onConflict: "slug" });

  // Build slug → id map
  const { data: all, error } = await supabase.from("individuals").select("id, slug");
  if (error) die("fetch individuals", error);
  for (const row of all) INDIVIDUAL_IDS[row.slug] = row.id;

  console.log(`  ✓ ${rows.length} community individuals`);
}

// ---------------------------------------------------------------------------
// 4. Demo individual (Anna Ross) + Supabase Auth user
// ---------------------------------------------------------------------------

const DEMO_EMAIL = "anna@kind.example";
const DEMO_PASSWORD = "demo1234";
const DEMO_SLUG = "anna-ross";
const ANNA_ONBOARDING = {
  consentPrivacy: true,
  consentCitizenScience: true,
  consentDiscoverable: true,
  name: "Anna Ross",
  birthYear: "1992",
  sexAssignedAtBirth: "female",
  healthGoals: ["energy_focus", "sleep"],
  kindHelp: ["trials", "explore", "insight"],
  longevityImportance: "matters",
  remindersEnabled: true
};
const EXPLORATION_WEEKS = {
  "morning-rules": 8,
  eating: 6,
  "screen-sleep": 6,
  relaxation: 6,
  "upf-mood": 6
};

async function seedDemoUser() {
  console.log("Seeding demo user (Anna Ross)…");

  // Create or find auth user
  let authUserId;
  const { data: listData } = await supabase.auth.admin.listUsers();
  const existing = listData?.users?.find((u) => u.email === DEMO_EMAIL);

  if (existing) {
    authUserId = existing.id;
    console.log("  ✓ auth user already exists");
  } else {
    const { data: created, error } = await supabase.auth.admin.createUser({
      email: DEMO_EMAIL,
      password: DEMO_PASSWORD,
      email_confirm: true
    });
    if (error) die("create auth user", error);
    authUserId = created.user.id;
    console.log("  ✓ auth user created");
  }

  // Upsert Anna's individual row
  const { error: indErr } = await supabase
    .from("individuals")
    .upsert(
      {
        slug: DEMO_SLUG,
        auth_user_id: authUserId,
        email: DEMO_EMAIL,
        display_name: "Anna Ross",
        location: "New York",
        avatar_initials: "AR",
        profile_meta: "Week 3 · Morning rules & energy"
      },
      { onConflict: "slug" }
    );
  if (indErr) die("upsert Anna", indErr);

  // Fetch Anna's UUID
  const { data: anna } = await supabase
    .from("individuals")
    .select("id")
    .eq("slug", DEMO_SLUG)
    .single();

  INDIVIDUAL_IDS[DEMO_SLUG] = anna.id;

  // Privacy settings
  await upsert(
    "privacy_settings",
    {
      individual_id: anna.id,
      platform_consent: true,
      contribute_to_citizen_science: true,
      visible_in_community: true,
      daily_reminders: true
    },
    { onConflict: "individual_id" }
  );

  console.log(`  ✓ Anna Ross seeded (email: ${DEMO_EMAIL}, password: ${DEMO_PASSWORD})`);
  return anna.id;
}

// ---------------------------------------------------------------------------
// 5. Badges
// ---------------------------------------------------------------------------

async function seedBadges() {
  console.log("Seeding badges…");
  const rows = [];

  // Anna's badges
  const annaId = INDIVIDUAL_IDS[DEMO_SLUG];
  if (annaId) {
    rows.push(
      { individual_id: annaId, label: "Morning rules · Wk 3", style: "amber", sort_order: 0 },
      { individual_id: annaId, label: "9-day streak", style: "green", sort_order: 1 }
    );
  }

  // commUsers badges
  for (const [slug, u] of Object.entries(community.commUsers)) {
    const id = INDIVIDUAL_IDS[slug];
    if (!id) continue;
    (u.badges ?? []).forEach((b, i) => {
      const style = ["teal", "green", "amber", "blue", "purple"].includes(b.s) ? b.s : "teal";
      rows.push({ individual_id: id, label: b.t, style, sort_order: i });
    });
  }

  await insert("individual_badges", rows);
  console.log(`  ✓ ${rows.length} badges`);
}

// ---------------------------------------------------------------------------
// 6. User explorations (Anna's active morning-rules run)
// ---------------------------------------------------------------------------

async function seedUserExplorations() {
  console.log("Seeding user explorations…");
  const annaId = INDIVIDUAL_IDS[DEMO_SLUG];
  if (!annaId) return;

  const rows = [
    {
      individual_id: annaId,
      exploration_id: "morning-rules",
      week_current: 3,
      weeks_total: 8,
      status: "active",
      streak_days: 9,
      started_at: "2026-05-15",
      is_active: true
    },
    {
      individual_id: annaId,
      exploration_id: "eating",
      week_current: 6,
      weeks_total: 6,
      status: "complete",
      streak_days: 42,
      started_at: "2026-03-03",
      completed_at: "2026-04-14",
      is_active: false
    },
    {
      individual_id: annaId,
      exploration_id: "screen-sleep",
      week_current: 6,
      weeks_total: 6,
      status: "complete",
      streak_days: 38,
      started_at: "2026-01-10",
      completed_at: "2026-02-21",
      is_active: false
    },
    {
      individual_id: annaId,
      exploration_id: "relaxation",
      week_current: 6,
      weeks_total: 6,
      status: "complete",
      streak_days: 35,
      started_at: "2025-11-05",
      completed_at: "2025-12-16",
      is_active: false
    },
    {
      individual_id: annaId,
      exploration_id: "upf-mood",
      week_current: 6,
      weeks_total: 6,
      status: "complete",
      streak_days: 40,
      started_at: "2026-02-01",
      completed_at: "2026-03-14",
      is_active: false
    }
  ];

  for (const row of rows) {
    await upsert("user_explorations", row, { onConflict: "individual_id,exploration_id" });
  }

  console.log("  ✓ Anna explorations (1 active, 4 complete)");
}

async function seedOnboardingAndConsents() {
  console.log("Seeding onboarding & consents…");
  const annaId = INDIVIDUAL_IDS[DEMO_SLUG];
  if (!annaId) return;

  await upsert(
    "individual_onboarding",
    {
      individual_id: annaId,
      answers: ANNA_ONBOARDING,
      completed_at: new Date().toISOString()
    },
    { onConflict: "individual_id" }
  );

  const consentRows = Object.entries(consent.annaDefaults ?? {}).map(([consent_key, granted]) => ({
    individual_id: annaId,
    consent_key,
    granted: Boolean(granted),
    consented_at: granted ? new Date().toISOString() : null
  }));
  for (const row of consentRows) {
    await upsert("individual_consents", row, { onConflict: "individual_id,consent_key" });
  }

  const explorationIds = Object.keys(EXPLORATION_WEEKS);
  for (const explorationId of explorationIds) {
    await upsert(
      "exploration_consents",
      {
        individual_id: annaId,
        exploration_id: explorationId,
        granted: true,
        consented_at: new Date().toISOString(),
        is_active: explorationId === "morning-rules"
      },
      { onConflict: "individual_id,exploration_id" }
    );
  }

  console.log("  ✓ Anna onboarding, platform consents, and exploration consents");
}

async function seedTrialReports() {
  console.log("Seeding trial report templates & Anna reports…");
  const annaId = INDIVIDUAL_IDS[DEMO_SLUG];

  for (const [explorationId, content] of Object.entries(trialReports)) {
    await upsert(
      "exploration_trial_report_templates",
      {
        exploration_id: explorationId,
        report_title_label: content.reportTitleLabel ?? "Personalised trial final report",
        content
      },
      { onConflict: "exploration_id" }
    );

    if (!annaId) continue;

    const { data: ue } = await supabase
      .from("user_explorations")
      .select("id")
      .eq("individual_id", annaId)
      .eq("exploration_id", explorationId)
      .maybeSingle();

    await upsert(
      "user_exploration_reports",
      {
        individual_id: annaId,
        exploration_id: explorationId,
        user_exploration_id: ue?.id ?? null,
        content,
        generated_at: new Date().toISOString()
      },
      { onConflict: "individual_id,exploration_id" }
    );
  }

  console.log(`  ✓ ${Object.keys(trialReports).length} report templates and Anna demo reports`);
}

// ---------------------------------------------------------------------------
// 7. Social follows
// ---------------------------------------------------------------------------

async function seedFollows() {
  console.log("Seeding follows…");
  const annaId = INDIVIDUAL_IDS[DEMO_SLUG];
  if (!annaId) return;

  const individualFollows = [];
  for (const slug of community.socialMeta?.followingExplorerIds ?? []) {
    const followeeId = INDIVIDUAL_IDS[slug];
    if (followeeId && followeeId !== annaId) {
      individualFollows.push({ follower_id: annaId, followee_id: followeeId });
    }
  }
  await insert("individual_follows", individualFollows);

  const researcherFollows = [];
  for (const researcherId of community.socialMeta?.followingResearcherIds ?? []) {
    researcherFollows.push({ individual_id: annaId, researcher_id: researcherId });
  }
  await insert("researcher_follows", researcherFollows);

  console.log(`  ✓ ${individualFollows.length} individual follows, ${researcherFollows.length} researcher follows`);
}

// ---------------------------------------------------------------------------
// 8. Activity posts
// ---------------------------------------------------------------------------

async function seedActivityPosts() {
  console.log("Seeding activity posts…");
  const posts = [];

  for (const [slug, u] of Object.entries(community.commUsers)) {
    const individualId = INDIVIDUAL_IDS[slug];
    if (!individualId) continue;

    (u.acts ?? []).forEach((act, i) => {
      // Map exploration label to ID
      const expLabel = act.exp ?? "";
      let explorationId = null;
      if (expLabel.includes("morning") || expLabel.includes("Morning")) explorationId = "morning-rules";
      else if (expLabel.includes("eating") || expLabel.includes("eating")) explorationId = "eating";
      else if (expLabel.includes("screen") || expLabel.includes("sleep")) explorationId = "screen-sleep";
      else if (expLabel.includes("relaxation") || expLabel.includes("Relaxation")) explorationId = "relaxation";
      else if (expLabel.includes("UPF") || expLabel.includes("mood")) explorationId = "upf-mood";

      posts.push({
        individual_id: individualId,
        exploration_id: explorationId,
        summary: act.t,
        detail_metrics: act.detail ?? null,
        exploration_label: act.exp ?? null,
        posted_at: new Date(Date.now() - i * 3600000 * 24).toISOString(),
        nice_count_base: act.nc ?? 0,
        sort_order: i
      });
    });
  }

  await insert("activity_posts", posts);
  console.log(`  ✓ ${posts.length} activity posts`);
}

// ---------------------------------------------------------------------------
// 9. Feed items
// ---------------------------------------------------------------------------

async function seedFeedItems() {
  console.log("Seeding feed items…");
  const items = [];
  let order = 0;

  // Static feed items from feed.staticItems
  for (const item of feed.staticItems ?? []) {
    items.push({
      feed_type: item.type ?? "activity",
      headline: item.headline ?? item.body ?? "",
      body: item.body ?? null,
      highlight: item.highlight ?? null,
      published_at: new Date(Date.now() - order * 3600000).toISOString(),
      sort_order: order++
    });
  }

  // Tips
  for (const expId of feed.feedExpIds ?? []) {
    for (const tip of feed.feedTips?.[expId] ?? []) {
      items.push({
        feed_type: "tip",
        exploration_id: expId,
        headline: `Tip for ${expId}`,
        body: tip.body ?? null,
        published_at: new Date(Date.now() - order * 3600000).toISOString(),
        sort_order: order++
      });
    }
  }

  // Science items
  for (const expId of feed.feedExpIds ?? []) {
    for (const sci of feed.feedScience?.[expId] ?? []) {
      items.push({
        feed_type: "science",
        exploration_id: expId,
        headline: sci.headline ?? `Science: ${expId}`,
        body: sci.body ?? null,
        highlight: sci.highlight ?? null,
        published_at: new Date(Date.now() - order * 3600000).toISOString(),
        sort_order: order++
      });
    }
  }

  // Milestone from Anna's activity
  const annaId = INDIVIDUAL_IDS[DEMO_SLUG];
  if (annaId) {
    items.push({
      feed_type: "milestone",
      actor_individual_id: annaId,
      exploration_id: "morning-rules",
      headline: "Anna completed week 3 of morning rules",
      body: "9-day streak and afternoon energy averaging 6.8/10.",
      published_at: new Date(Date.now() - 2 * 3600000).toISOString(),
      sort_order: 0
    });
  }

  await insert("feed_items", items);
  console.log(`  ✓ ${items.length} feed items`);
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  console.log("Kind seed script starting…\n");

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) {
    console.error("SUPABASE_SERVICE_ROLE_KEY is not set. Copy apps/api/.env.example → apps/api/.env and fill in values.");
    process.exit(1);
  }

  const keyPrefix = serviceKey.slice(0, 20);
  if (!serviceKey.startsWith("eyJ")) {
    console.error(`SUPABASE_SERVICE_ROLE_KEY must be a JWT (starts with eyJ), got: ${keyPrefix}…`);
    console.error("If the key starts with sb_secret_, your shell env is overriding apps/api/.env.");
    console.error("Run `npx supabase status --output env` and use SERVICE_ROLE_KEY (not SECRET_KEY).");
    process.exit(1);
  }

  // Verify connection
  const { error: pingErr } = await supabase.from("explorations").select("id").limit(1);
  if (pingErr && pingErr.code !== "PGRST116") {
    if (pingErr.message?.includes("permission denied") || pingErr.code === "42501") {
      console.error("Permission denied on 'explorations'.");
      if (pingErr.hint) console.error(pingErr.hint);
      console.error("This usually means API role GRANTs are missing — run `npm run reset:db` to apply migrations.");
    } else {
      console.error("Cannot connect to Supabase. Is `npx supabase start` running?");
    }
    console.error(pingErr.message);
    process.exit(1);
  }

  await clearAll();
  await seedExplorations();
  await seedResearchers();
  await seedIndividuals();
  const annaId = await seedDemoUser();
  await seedBadges();
  await seedUserExplorations();
  await seedOnboardingAndConsents();
  await seedTrialReports();
  await seedFollows();
  await seedActivityPosts();
  await seedFeedItems();

  console.log("\n✓ Seed complete.");
  console.log(`  Demo login: ${DEMO_EMAIL} / ${DEMO_PASSWORD}`);
}

main().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
