import { Hono } from "hono";
import { cors } from "hono/cors";
import { initDb, query } from "./db.js";
import { requireAuth } from "./middleware.js";
import { ensureIndividualProfile, oauthDisplayName } from "./lib/authProfile.js";
import { isAllowedOAuthRedirect, mapOAuthError, OAUTH_PROVIDERS } from "./lib/oauth.js";
import { makeAdminClient, makeAnonClient, createOAuthStorage, makeOAuthClient, readOAuthCodeVerifier, seedOAuthCodeVerifier } from "./supabase.js";
import { generateFeedContent } from "./feedContent.js";
import { morningRulesFeedLibrary } from "./data/morningRulesFeedLibrary.js";
import kindRouter from "./routes/kind.js";
import mockRouter from "./routes/mock.js";

const FEED_LIBRARIES = {
  "morning-rules": morningRulesFeedLibrary
};

const app = new Hono();

app.use("*", cors());

app.onError((err, c) => {
  c.header("Access-Control-Allow-Origin", "*");
  c.header("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS");
  c.header("Access-Control-Allow-Headers", "Content-Type, Authorization");
  console.error(err);
  return c.json({ error: "Internal Server Error" }, 500);
});

// Init DB connection string from Workers binding (or process.env for local dev)
app.use("*", async (c, next) => {
  initDb(c.env);
  return next();
});

// ---------------------------------------------------------------------------
// Health (unauthenticated)
// ---------------------------------------------------------------------------

app.get("/health", async (c) => {
  try {
    await query("SELECT 1");
    return c.json({ ok: true, db: "connected" });
  } catch {
    return c.json({ ok: false, db: "error" }, 500);
  }
});

// ---------------------------------------------------------------------------
// Auth (Supabase-backed)
// ---------------------------------------------------------------------------

app.post("/auth/signup", async (c) => {
  const { email, name, password } = await c.req.json();
  if (!email || !password) {
    return c.json({ error: "email and password are required" }, 400);
  }

  const admin = makeAdminClient(c.env);
  const anon = makeAnonClient(c.env);

  const { data: authData, error: authError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true
  });

  if (authError) {
    const status = authError.status === 422 ? 409 : 500;
    return c.json({ error: authError.message }, status);
  }

  let profile;
  try {
    profile = await ensureIndividualProfile({
      authUserId: authData.user.id,
      email,
      displayName: name || email
    });
  } catch {
    await admin.auth.admin.deleteUser(authData.user.id);
    return c.json({ error: "Failed to create profile" }, 500);
  }

  const { data: sessionData, error: signInError } = await anon.auth.signInWithPassword({
    email,
    password
  });

  if (signInError) {
    return c.json({ error: signInError.message }, 500);
  }

  return c.json(
    {
      token: sessionData.session.access_token,
      refreshToken: sessionData.session.refresh_token,
      individualId: profile.individualId
    },
    201
  );
});

app.post("/auth/oauth/url", async (c) => {
  const { provider, redirectTo } = await c.req.json();
  if (!provider || !OAUTH_PROVIDERS.has(provider)) {
    return c.json({ error: "provider must be google or apple" }, 400);
  }
  if (!isAllowedOAuthRedirect(redirectTo)) {
    return c.json({ error: "redirectTo is not allowed" }, 400);
  }

  const storage = createOAuthStorage();
  const anon = makeOAuthClient(c.env, storage);
  const { data, error } = await anon.auth.signInWithOAuth({
    provider,
    options: {
      redirectTo,
      skipBrowserRedirect: true
    }
  });

  if (error || !data?.url) {
    const mapped = mapOAuthError(error ?? { message: "Failed to start OAuth sign-in" });
    return c.json({ error: mapped.error }, mapped.status);
  }

  const codeVerifier = await readOAuthCodeVerifier(storage);
  if (!codeVerifier) {
    return c.json({ error: "Failed to start OAuth sign-in" }, 500);
  }

  return c.json({ url: data.url, codeVerifier });
});

app.post("/auth/oauth/callback", async (c) => {
  const { provider, code, redirectTo, codeVerifier } = await c.req.json();
  if (!provider || !OAUTH_PROVIDERS.has(provider)) {
    return c.json({ error: "provider must be google or apple" }, 400);
  }
  if (!code) {
    return c.json({ error: "code is required" }, 400);
  }
  if (!codeVerifier) {
    return c.json({ error: "codeVerifier is required" }, 400);
  }
  if (!isAllowedOAuthRedirect(redirectTo)) {
    return c.json({ error: "redirectTo is not allowed" }, 400);
  }

  const storage = createOAuthStorage();
  await seedOAuthCodeVerifier(storage, codeVerifier);
  const anon = makeOAuthClient(c.env, storage);
  const { data, error } = await anon.auth.exchangeCodeForSession(code);
  if (error || !data?.session || !data?.user) {
    const mapped = mapOAuthError(error ?? { message: "OAuth sign-in failed" });
    return c.json({ error: mapped.error }, mapped.status);
  }

  let profile;
  try {
    profile = await ensureIndividualProfile({
      authUserId: data.user.id,
      email: data.user.email ?? null,
      displayName: oauthDisplayName(data.user)
    });
  } catch {
    return c.json({ error: "Failed to create profile" }, 500);
  }

  return c.json({
    token: data.session.access_token,
    refreshToken: data.session.refresh_token,
    individualId: profile.individualId,
    isNewUser: profile.isNewUser,
    email: data.user.email ?? null
  });
});

app.post("/auth/login", async (c) => {
  const { email, password } = await c.req.json();
  if (!email || !password) {
    return c.json({ error: "email and password are required" }, 400);
  }

  const anon = makeAnonClient(c.env);
  const { data, error } = await anon.auth.signInWithPassword({ email, password });
  if (error) {
    return c.json({ error: "Invalid credentials" }, 401);
  }

  const { rows } = await query(
    "SELECT id FROM individuals WHERE auth_user_id = $1 LIMIT 1",
    [data.user.id]
  );

  return c.json({
    token: data.session.access_token,
    refreshToken: data.session.refresh_token,
    individualId: rows[0]?.id ?? null
  });
});

app.post("/auth/refresh", async (c) => {
  const { refreshToken } = await c.req.json();
  if (!refreshToken) {
    return c.json({ error: "refreshToken is required" }, 400);
  }

  const anon = makeAnonClient(c.env);
  const { data, error } = await anon.auth.refreshSession({ refresh_token: refreshToken });
  if (error) {
    return c.json({ error: "Invalid refresh token" }, 401);
  }

  return c.json({
    token: data.session.access_token,
    refreshToken: data.session.refresh_token
  });
});

app.post("/auth/logout", async (c) => {
  const authHeader = c.req.header("authorization") ?? "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;
  if (token) {
    const admin = makeAdminClient(c.env);
    await admin.auth.admin.signOut(token).catch(() => {});
  }
  return c.body(null, 204);
});

// ---------------------------------------------------------------------------
// Feed content generation (AI)
// ---------------------------------------------------------------------------

app.post("/feed/generate", requireAuth, async (c) => {
  const body = await c.req.json().catch(() => ({}));
  const {
    explorationId = "morning-rules",
    exploration = {},
    context = {},
    limit = 8,
    timeLabel = "Today",
    model
  } = body;

  const library = FEED_LIBRARIES[explorationId];
  if (!library) {
    return c.json(
      {
        error: `No feed content library for exploration "${explorationId}"`,
        available: Object.keys(FEED_LIBRARIES)
      },
      404
    );
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
    return c.json(result);
  } catch (err) {
    return c.json(
      { error: "Failed to generate feed content", detail: String(err?.message || err) },
      500
    );
  }
});

// ---------------------------------------------------------------------------
// Data routes — mock or DB-backed based on USE_MOCK_DATA env var
// ---------------------------------------------------------------------------

app.use("*", async (c, next) => {
  const useMock = (c.env?.USE_MOCK_DATA ?? process.env.USE_MOCK_DATA) === "true";
  if (useMock) return mockRouter.fetch(c.req.raw);
  return next();
});

app.route("/", kindRouter);

export default app;
