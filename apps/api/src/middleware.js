import { supabaseAdmin } from "./supabase.js";

export async function requireAuth(req, res, next) {
  if (process.env.MOCK_AUTH === "true") {
    req.user = { sub: "__mock__" };
    return next();
  }

  const authHeader = req.headers.authorization || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;
  if (!token) return res.status(401).json({ error: "Unauthorized" });

  const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
  if (error || !user) return res.status(401).json({ error: "Invalid token" });

  req.user = { sub: user.id, email: user.email };
  return next();
}
