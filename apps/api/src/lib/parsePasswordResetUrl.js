/**
 * Parse recovery credentials from a Supabase password-reset redirect URL.
 * Supports hash fragments (implicit) and query params (token_hash).
 * Kept in sync with apps/api/src/lib/parsePasswordResetUrl.js
 */
export function parsePasswordResetUrl(url) {
  if (!url || typeof url !== "string") return null;

  let hash = "";
  let query = "";
  const hashIndex = url.indexOf("#");
  const queryIndex = url.indexOf("?");

  if (hashIndex !== -1) {
    hash = url.slice(hashIndex + 1);
  }
  if (queryIndex !== -1) {
    query = url.slice(queryIndex + 1, hashIndex === -1 ? undefined : hashIndex);
  }

  const params = new URLSearchParams(hash || query);
  if (hash && query && !params.get("access_token") && !params.get("token_hash") && !params.get("code")) {
    const queryParams = new URLSearchParams(query);
    for (const [key, value] of queryParams.entries()) {
      if (!params.has(key)) params.set(key, value);
    }
  }

  const accessToken = params.get("access_token");
  const refreshToken = params.get("refresh_token");
  const tokenHash = params.get("token_hash");
  const type = params.get("type");
  const error = params.get("error_description") || params.get("error");

  if (error) {
    return { error };
  }

  if (type && type !== "recovery") {
    return null;
  }

  if (!accessToken && !tokenHash) {
    if (url.includes("auth/reset-password")) {
      return { needsLink: true };
    }
    return null;
  }

  return {
    accessToken: accessToken || undefined,
    refreshToken: refreshToken || undefined,
    tokenHash: tokenHash || undefined,
    type: type || "recovery"
  };
}
