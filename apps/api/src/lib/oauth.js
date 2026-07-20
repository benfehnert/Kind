export const OAUTH_PROVIDERS = new Set(["google", "apple"]);

const ALLOWED_KIND_REDIRECTS = new Set([
  "kind://auth/callback",
  "kind://auth/reset-password"
]);

export function isAllowedOAuthRedirect(redirectTo) {
  if (!redirectTo || typeof redirectTo !== "string") return false;
  if (ALLOWED_KIND_REDIRECTS.has(redirectTo)) return true;
  if (redirectTo.startsWith("exp://")) return true;

  try {
    const url = new URL(redirectTo);
    const host = url.hostname;
    if (host === "localhost" || host === "127.0.0.1") return true;
  } catch {
    return false;
  }

  return false;
}

export function mapOAuthError(error) {
  const message = error?.message ?? "OAuth sign-in failed";
  const lower = message.toLowerCase();

  if (
    lower.includes("already registered") ||
    lower.includes("already exists") ||
    lower.includes("email address is already")
  ) {
    return { status: 409, error: "An account with this email already exists. Sign in with email and password instead." };
  }

  if (
    lower.includes("invalid") ||
    lower.includes("expired") ||
    lower.includes("code") ||
    lower.includes("grant")
  ) {
    return { status: 401, error: "OAuth sign-in expired or was invalid. Please try again." };
  }

  return { status: 500, error: message };
}
