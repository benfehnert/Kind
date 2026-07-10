import { query } from "../db.js";

export function buildSlug(nameOrEmail) {
  const source = nameOrEmail || "user";
  const normalized = source.includes("@") ? source.split("@")[0] : source;
  return (
    normalized
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "") || "user"
  );
}

export function buildInitials(displayName) {
  const source = displayName || "U";
  return (
    source
      .split(" ")
      .map((w) => w[0] || "")
      .join("")
      .toUpperCase()
      .slice(0, 2) || "U"
  );
}

export function oauthDisplayName(user) {
  const meta = user?.user_metadata ?? {};
  return (
    meta.full_name ||
    meta.name ||
    (user?.email ? user.email.split("@")[0] : null) ||
    `user-${(user?.id ?? "").replace(/-/g, "").slice(0, 8) || "unknown"}`
  );
}

async function slugExists(slug) {
  const { rows } = await query("SELECT 1 FROM individuals WHERE slug = $1 LIMIT 1", [slug]);
  return rows.length > 0;
}

export async function allocateSlug(baseSlug) {
  if (!(await slugExists(baseSlug))) return baseSlug;
  for (let i = 0; i < 10; i++) {
    const suffix = Math.random().toString(36).slice(2, 6);
    const candidate = `${baseSlug}-${suffix}`;
    if (!(await slugExists(candidate))) return candidate;
  }
  throw new Error("Failed to allocate unique slug");
}

export async function ensureIndividualProfile({ authUserId, email, displayName }) {
  const { rows: existing } = await query(
    "SELECT id FROM individuals WHERE auth_user_id = $1 LIMIT 1",
    [authUserId]
  );
  if (existing[0]) {
    return { individualId: existing[0].id, isNewUser: false };
  }

  const slug = await allocateSlug(buildSlug(displayName || email || authUserId));
  const initials = buildInitials(displayName);
  const safeEmail = email || null;
  const safeName = displayName || email || "Kind user";

  const { rows } = await query(
    `INSERT INTO individuals (auth_user_id, slug, email, display_name, avatar_initials)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id`,
    [authUserId, slug, safeEmail, safeName, initials]
  );

  return { individualId: rows[0].id, isNewUser: true };
}
