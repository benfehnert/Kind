import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import { query } from "./db.js";
import { requireAuth } from "./middleware.js";
import { supabaseAdmin, supabaseAnon } from "./supabase.js";
import { generateFeedContent } from "./feedContent.js";
import { morningRulesFeedLibrary } from "./data/morningRulesFeedLibrary.js";
import mockRouter from "./routes/mock.js";

dotenv.config();

const FEED_LIBRARIES = {
  "morning-rules": morningRulesFeedLibrary
};

const app = express();
app.use(cors());
app.use(express.json());

// ---------------------------------------------------------------------------
// Health (unauthenticated — must be before routers)
// ---------------------------------------------------------------------------

app.get("/health", async (_req, res) => {
  try {
    await query("SELECT 1");
    res.json({ ok: true, db: "connected" });
  } catch {
    res.status(500).json({ ok: false, db: "error" });
  }
});

// ---------------------------------------------------------------------------
// Auth (Supabase-backed — must be before routers)
// ---------------------------------------------------------------------------

app.post("/auth/signup", async (req, res) => {
  const { email, name, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: "email and password are required" });
  }

  const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true
  });

  if (authError) {
    const status = authError.status === 422 ? 409 : 500;
    return res.status(status).json({ error: authError.message });
  }

  const slug = (name || email.split("@")[0])
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  const initials = (name || "U")
    .split(" ")
    .map((w) => w[0] || "")
    .join("")
    .toUpperCase()
    .slice(0, 2);

  try {
    await query(
      `INSERT INTO individuals (auth_user_id, slug, email, display_name, avatar_initials)
       VALUES ($1, $2, $3, $4, $5)`,
      [authData.user.id, slug, email, name || email, initials]
    );
  } catch (dbErr) {
    await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
    return res.status(500).json({ error: "Failed to create profile" });
  }

  const { data: sessionData, error: signInError } = await supabaseAnon.auth.signInWithPassword({
    email,
    password
  });

  if (signInError) {
    return res.status(500).json({ error: signInError.message });
  }

  return res.status(201).json({
    token: sessionData.session.access_token,
    refreshToken: sessionData.session.refresh_token
  });
});

app.post("/auth/login", async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: "email and password are required" });
  }

  const { data, error } = await supabaseAnon.auth.signInWithPassword({ email, password });
  if (error) {
    return res.status(401).json({ error: "Invalid credentials" });
  }

  const { rows } = await query(
    "SELECT id FROM individuals WHERE auth_user_id = $1 LIMIT 1",
    [data.user.id]
  );

  return res.json({
    token: data.session.access_token,
    refreshToken: data.session.refresh_token,
    individualId: rows[0]?.id ?? null
  });
});

app.post("/auth/refresh", async (req, res) => {
  const { refreshToken } = req.body;
  if (!refreshToken) {
    return res.status(400).json({ error: "refreshToken is required" });
  }

  const { data, error } = await supabaseAnon.auth.refreshSession({ refresh_token: refreshToken });
  if (error) {
    return res.status(401).json({ error: "Invalid refresh token" });
  }

  return res.json({
    token: data.session.access_token,
    refreshToken: data.session.refresh_token
  });
});

app.post("/auth/logout", async (req, res) => {
  const authHeader = req.headers.authorization || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;
  if (token) {
    await supabaseAdmin.auth.admin.signOut(token).catch(() => {});
  }
  return res.status(204).send();
});

// ---------------------------------------------------------------------------
// Feed content generation (AI — before kind router)
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Kind / mock routes (after direct app.* routes so auth endpoints take priority)
// ---------------------------------------------------------------------------

if (process.env.USE_MOCK_DATA === "true") {
  app.use(mockRouter);
} else {
  const { default: kindRouter } = await import("./routes/kind.js");
  app.use(kindRouter);
}

const port = Number(process.env.PORT || 4000);
app.listen(port, () => {
  console.log(`API running on http://localhost:${port}`);
});
