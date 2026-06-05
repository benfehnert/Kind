import { makeAdminClient } from "./supabase.js";

export async function requireAuth(c, next) {
  if ((c.env?.MOCK_AUTH ?? process.env.MOCK_AUTH) === "true") {
    c.set("user", { sub: "__mock__" });
    return next();
  }

  const authHeader = c.req.header("authorization") ?? "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;
  if (!token) return c.json({ error: "Unauthorized" }, 401);

  const admin = makeAdminClient(c.env);
  const {
    data: { user },
    error
  } = await admin.auth.getUser(token);
  if (error || !user) return c.json({ error: "Invalid token" }, 401);

  c.set("user", { sub: user.id, email: user.email });
  return next();
}
