import { verifyToken } from "./auth.js";

export function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;
  if (!token) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  try {
    const payload = verifyToken(token);
    req.user = payload;
    return next();
  } catch (_err) {
    return res.status(401).json({ error: "Invalid token" });
  }
}
