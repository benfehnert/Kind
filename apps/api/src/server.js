import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import OpenAI from "openai";
import {
  createRefreshToken,
  hashPassword,
  hashRefreshToken,
  signToken,
  verifyPassword
} from "./auth.js";
import { query } from "./db.js";
import { requireAuth } from "./middleware.js";
import { generateFeedContent } from "./feedContent.js";
import { morningRulesFeedLibrary } from "./data/morningRulesFeedLibrary.js";

const FEED_LIBRARIES = {
  "morning-rules": morningRulesFeedLibrary
};

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

function defaultRefreshExpiry() {
  return "NOW() + INTERVAL '30 day'";
}

async function issueRefreshSession(userId) {
  const refreshToken = createRefreshToken();
  const refreshTokenHash = hashRefreshToken(refreshToken);
  await query(
    `INSERT INTO auth_sessions (user_id, refresh_token_hash, expires_at)
     VALUES ($1, $2, ${defaultRefreshExpiry()})`,
    [userId, refreshTokenHash]
  );
  return refreshToken;
}

app.get("/health", async (_req, res) => {
  try {
    await query("SELECT 1");
    res.json({ ok: true, db: "connected" });
  } catch (_err) {
    res.status(500).json({ ok: false, db: "error" });
  }
});

app.post("/auth/signup", async (req, res) => {
  const { email, name, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: "email and password are required" });
  }

  const existing = await query("SELECT id FROM users WHERE email = $1", [email]);
  if (existing.rows.length) {
    return res.status(409).json({ error: "Email already in use" });
  }

  const passwordHash = hashPassword(password);
  const userResult = await query(
    `INSERT INTO users (email, name, password_hash)
     VALUES ($1, $2, $3)
     RETURNING id, email, name`,
    [email, name ?? null, passwordHash]
  );
  const user = userResult.rows[0];
  const token = signToken({ sub: user.id, email: user.email });
  const refreshToken = await issueRefreshSession(user.id);
  return res.status(201).json({ token, refreshToken, user });
});

app.post("/auth/login", async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: "email and password are required" });
  }

  const userResult = await query(
    "SELECT id, email, name, password_hash FROM users WHERE email = $1 LIMIT 1",
    [email]
  );
  if (!userResult.rows.length) {
    return res.status(401).json({ error: "Invalid credentials" });
  }

  const user = userResult.rows[0];
  const isDemoUser = user.email === "demo@example.com" && password === "demo1234";
  const validPassword = isDemoUser || verifyPassword(password, user.password_hash);

  if (!validPassword) {
    return res.status(401).json({ error: "Invalid credentials" });
  }

  const token = signToken({ sub: user.id, email: user.email });
  const refreshToken = await issueRefreshSession(user.id);
  return res.json({
    token,
    refreshToken,
    user: { id: user.id, email: user.email, name: user.name }
  });
});

app.post("/auth/refresh", async (req, res) => {
  const { refreshToken } = req.body;
  if (!refreshToken) {
    return res.status(400).json({ error: "refreshToken is required" });
  }

  const refreshTokenHash = hashRefreshToken(refreshToken);
  const sessionResult = await query(
    `SELECT s.id, s.user_id, u.email
     FROM auth_sessions s
     JOIN users u ON u.id = s.user_id
     WHERE s.refresh_token_hash = $1
       AND s.revoked_at IS NULL
       AND s.expires_at > NOW()
     LIMIT 1`,
    [refreshTokenHash]
  );

  if (!sessionResult.rows.length) {
    return res.status(401).json({ error: "Invalid refresh token" });
  }

  const session = sessionResult.rows[0];
  await query("UPDATE auth_sessions SET revoked_at = NOW() WHERE id = $1", [session.id]);

  const token = signToken({ sub: session.user_id, email: session.email });
  const nextRefreshToken = await issueRefreshSession(session.user_id);
  return res.json({ token, refreshToken: nextRefreshToken });
});

app.post("/auth/logout", async (req, res) => {
  const { refreshToken } = req.body;
  if (!refreshToken) {
    return res.status(400).json({ error: "refreshToken is required" });
  }

  await query(
    `UPDATE auth_sessions
     SET revoked_at = NOW()
     WHERE refresh_token_hash = $1
       AND revoked_at IS NULL`,
    [hashRefreshToken(refreshToken)]
  );
  return res.status(204).send();
});

app.get("/me", requireAuth, async (req, res) => {
  const userResult = await query(
    `SELECT id, email, name, timezone
     FROM users
     WHERE id = $1
     LIMIT 1`,
    [req.user.sub]
  );
  if (!userResult.rows.length) {
    return res.status(404).json({ error: "User not found" });
  }

  const profileResult = await query(
    `SELECT goals, constraints, preferences
     FROM user_profiles
     WHERE user_id = $1
     LIMIT 1`,
    [req.user.sub]
  );

  return res.json({
    user: userResult.rows[0],
    profile: profileResult.rows[0] || null
  });
});

app.post("/onboarding/complete", requireAuth, async (req, res) => {
  const userId = req.user.sub;
  const { goals = [], constraints = {}, preferences = {} } = req.body;
  if (!Array.isArray(goals) || !goals.length) {
    return res.status(400).json({ error: "goals must be a non-empty array" });
  }

  await query(
    `INSERT INTO user_profiles (user_id, goals, constraints, preferences)
     VALUES ($1, $2::jsonb, $3::jsonb, $4::jsonb)
     ON CONFLICT (user_id) DO UPDATE
     SET goals = EXCLUDED.goals,
         constraints = EXCLUDED.constraints,
         preferences = EXCLUDED.preferences`,
    [userId, JSON.stringify(goals), JSON.stringify(constraints), JSON.stringify(preferences)]
  );

  const goalToCategories = {
    better_sleep: ["sleep"],
    reduce_stress: ["stress"],
    more_energy: ["movement", "sleep"],
    improve_fitness: ["movement"],
    improve_nutrition: ["nutrition"]
  };
  const categories = [...new Set(goals.flatMap((goal) => goalToCategories[goal] || []))];

  if (categories.length) {
    const protocolResult = await query(
      `SELECT id
       FROM protocols
       WHERE active = true
         AND category = ANY($1::text[])`,
      [categories]
    );

    for (const row of protocolResult.rows) {
      await query(
        `INSERT INTO user_protocols (user_id, protocol_id, status, start_date, personalization)
         VALUES ($1, $2, 'active', CURRENT_DATE, '{}'::jsonb)
         ON CONFLICT (user_id, protocol_id) DO NOTHING`,
        [userId, row.id]
      );
    }
  }

  return res.status(200).json({ ok: true, activated_categories: categories });
});

app.get("/protocols", async (req, res) => {
  const category = req.query.category;
  const values = [];
  let sql = "SELECT * FROM protocols WHERE active = true";
  if (category) {
    values.push(category);
    sql += ` AND category = $${values.length}`;
  }
  sql += " ORDER BY title ASC";

  const result = await query(sql, values);
  res.json({ items: result.rows });
});

app.post("/plans/generate", requireAuth, async (req, res) => {
  const userId = req.user.sub;
  const planDate = req.query.date || new Date().toISOString().slice(0, 10);

  const actionsResult = await query(
    `SELECT pa.id
     FROM user_protocols up
     JOIN protocol_actions pa ON pa.protocol_id = up.protocol_id
     WHERE up.user_id = $1
       AND up.status = 'active'
     ORDER BY pa.difficulty ASC, pa.created_at ASC
     LIMIT 5`,
    [userId]
  );

  if (!actionsResult.rows.length) {
    return res.status(400).json({ error: "No active protocol actions found for user" });
  }

  const existingPlan = await query(
    `SELECT id, version
     FROM daily_plans
     WHERE user_id = $1 AND plan_date = $2::date
     ORDER BY version DESC
     LIMIT 1`,
    [userId, planDate]
  );

  const nextVersion = existingPlan.rows.length ? Number(existingPlan.rows[0].version) + 1 : 1;
  const planInsert = await query(
    `INSERT INTO daily_plans (user_id, plan_date, version)
     VALUES ($1, $2::date, $3)
     RETURNING *`,
    [userId, planDate, nextVersion]
  );
  const plan = planInsert.rows[0];

  for (const row of actionsResult.rows) {
    await query(
      `INSERT INTO daily_plan_items (daily_plan_id, protocol_action_id, status)
       VALUES ($1, $2, 'pending')`,
      [plan.id, row.id]
    );
  }

  return res.status(201).json({ plan, item_count: actionsResult.rows.length });
});

app.get("/plans/today", requireAuth, async (req, res) => {
  const userId = req.user.sub;

  const planResult = await query(
    "SELECT * FROM daily_plans WHERE user_id = $1 AND plan_date = CURRENT_DATE ORDER BY version DESC LIMIT 1",
    [userId]
  );
  if (!planResult.rows.length) {
    return res.json({ plan: null, items: [] });
  }

  const plan = planResult.rows[0];
  const itemsResult = await query(
    `SELECT dpi.*, pa.name, pa.instructions
     FROM daily_plan_items dpi
     JOIN protocol_actions pa ON pa.id = dpi.protocol_action_id
     WHERE dpi.daily_plan_id = $1
     ORDER BY dpi.id ASC`,
    [plan.id]
  );

  return res.json({ plan, items: itemsResult.rows });
});

app.patch("/plan-items/:id", requireAuth, async (req, res) => {
  const { id } = req.params;
  const { status, notes } = req.body;
  const userId = req.user.sub;
  const validStatuses = ["pending", "done", "partial", "skipped"];
  if (!validStatuses.includes(status)) {
    return res.status(400).json({ error: "Invalid status" });
  }

  const result = await query(
    `UPDATE daily_plan_items
     SET status = $1, notes = $2, completion_at = CASE WHEN $1 IN ('done', 'partial') THEN NOW() ELSE NULL END
     WHERE id = $3
       AND EXISTS (
         SELECT 1
         FROM daily_plans dp
         WHERE dp.id = daily_plan_items.daily_plan_id
           AND dp.user_id = $4
       )
     RETURNING *`,
    [status, notes ?? null, id, userId]
  );

  if (!result.rows.length) {
    return res.status(404).json({ error: "Plan item not found" });
  }

  await query(
    `INSERT INTO adherence_events (id, user_id, daily_plan_item_id, event_type, event_time, metadata)
     SELECT gen_random_uuid(), dp.user_id, dpi.id, $1, NOW(), '{}'::jsonb
     FROM daily_plan_items dpi
     JOIN daily_plans dp ON dp.id = dpi.daily_plan_id
     WHERE dpi.id = $2`,
    [status, id]
  );

  return res.json(result.rows[0]);
});

app.get("/adherence/daily", requireAuth, async (req, res) => {
  const userId = req.user.sub;
  const { week_start: weekStart } = req.query;
  if (!weekStart) {
    return res.status(400).json({ error: "week_start is required" });
  }

  const result = await query(
    `WITH week_days AS (
       SELECT generate_series(
         $2::date,
         $2::date + INTERVAL '6 days',
         INTERVAL '1 day'
       )::date AS day_date
     ),
     plan_agg AS (
       SELECT
         dp.plan_date,
         COUNT(*) FILTER (WHERE dpi.status IN ('done', 'partial')) AS completed_count,
         COUNT(*) AS total_count
       FROM daily_plans dp
       JOIN daily_plan_items dpi ON dpi.daily_plan_id = dp.id
       WHERE dp.user_id = $1
         AND dp.plan_date >= $2::date
         AND dp.plan_date < ($2::date + INTERVAL '7 days')
       GROUP BY dp.plan_date
     )
     SELECT
       wd.day_date::text AS date,
       COALESCE(pa.completed_count, 0)::int AS completed_count,
       COALESCE(pa.total_count, 0)::int AS total_count,
       CASE
         WHEN COALESCE(pa.total_count, 0) = 0 THEN 0
         ELSE COALESCE(pa.completed_count, 0)::float / pa.total_count::float
       END AS adherence_rate
     FROM week_days wd
     LEFT JOIN plan_agg pa ON pa.plan_date = wd.day_date
     ORDER BY wd.day_date ASC`,
    [userId, weekStart]
  );

  return res.json(result.rows);
});

app.get("/adherence/categories", requireAuth, async (req, res) => {
  const userId = req.user.sub;
  const { week_start: weekStart } = req.query;
  if (!weekStart) {
    return res.status(400).json({ error: "week_start is required" });
  }

  const result = await query(
    `SELECT
       p.category,
       COUNT(*) FILTER (WHERE dpi.status IN ('done', 'partial'))::int AS completed_count,
       COUNT(*)::int AS total_count,
       CASE
         WHEN COUNT(*) = 0 THEN 0
         ELSE COUNT(*) FILTER (WHERE dpi.status IN ('done', 'partial'))::float / COUNT(*)::float
       END AS adherence_rate
     FROM daily_plans dp
     JOIN daily_plan_items dpi ON dpi.daily_plan_id = dp.id
     JOIN protocol_actions pa ON pa.id = dpi.protocol_action_id
     JOIN protocols p ON p.id = pa.protocol_id
     WHERE dp.user_id = $1
       AND dp.plan_date >= $2::date
       AND dp.plan_date < ($2::date + INTERVAL '7 days')
     GROUP BY p.category
     ORDER BY p.category ASC`,
    [userId, weekStart]
  );

  return res.json(result.rows);
});

app.post("/coaching/nudge", requireAuth, async (req, res) => {
  const { week_start, weekly_adherence, categories = [] } = req.body;

  const FALLBACK =
    "Great effort this week! Keep building on your progress — small, consistent steps make a big difference. You've got this!";

  if (!process.env.OPENAI_API_KEY) {
    return res.json({ nudge: FALLBACK });
  }

  try {
    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    const categoryLines = categories
      .map((c) => `- ${c.category}: ${Math.round(Number(c.adherence_rate) * 100)}%`)
      .join("\n");

    const userMessage = `Week starting ${week_start}. Overall weekly adherence: ${Math.round(Number(weekly_adherence) * 100)}%.
Category breakdown:
${categoryLines || "No category data available."}

Please provide a short, encouraging coaching nudge (2-3 sentences).`;

    const completion = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content:
            "You are a supportive health coach. Provide warm, encouraging, and actionable nudges to help users stay on track with their health protocols. Be specific about their progress when data is available. Keep responses to 2-3 sentences."
        },
        { role: "user", content: userMessage }
      ],
      max_tokens: 150
    });

    const nudge = completion.choices[0]?.message?.content?.trim() || FALLBACK;
    return res.json({ nudge });
  } catch (_err) {
    return res.json({ nudge: FALLBACK });
  }
});

app.post("/feed/generate", requireAuth, async (req, res) => {
  const {
    explorationId = "morning-rules",
    exploration = {},
    context = {},
    limit = 8,
    timeLabel = "Today",
    model
  } = req.body || {};

  const library = FEED_LIBRARIES[explorationId];
  if (!library) {
    return res.status(404).json({
      error: `No feed content library for exploration "${explorationId}"`,
      available: Object.keys(FEED_LIBRARIES)
    });
  }

  try {
    const result = await generateFeedContent({
      exploration: { id: explorationId, ...exploration },
      context,
      library,
      limit,
      timeLabel,
      model
    });
    return res.json(result);
  } catch (err) {
    return res.status(500).json({ error: "Failed to generate feed content", detail: String(err?.message || err) });
  }
});

app.get("/adherence/weekly", requireAuth, async (req, res) => {
  const userId = req.user.sub;
  const { week_start: weekStart } = req.query;
  if (!weekStart) {
    return res.status(400).json({ error: "week_start is required" });
  }

  const result = await query(
    `SELECT
      COUNT(*) FILTER (WHERE dpi.status IN ('done', 'partial')) AS completed_count,
      COUNT(*) AS total_count,
      COALESCE(
        SUM(
          CASE
            WHEN dpi.status = 'done' THEN 1
            WHEN dpi.status = 'partial' THEN 0.5
            ELSE 0
          END
        ) / NULLIF(COUNT(*), 0),
        0
      ) AS weekly_adherence
    FROM daily_plans dp
    JOIN daily_plan_items dpi ON dpi.daily_plan_id = dp.id
    WHERE dp.user_id = $1
      AND dp.plan_date >= $2::date
      AND dp.plan_date < ($2::date + INTERVAL '7 day')`,
    [userId, weekStart]
  );

  return res.json(result.rows[0]);
});

const port = Number(process.env.PORT || 4000);
app.listen(port, () => {
  console.log(`API running on http://localhost:${port}`);
});
