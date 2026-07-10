import test from "node:test";
import assert from "node:assert/strict";
import { buildSlug, buildInitials, oauthDisplayName } from "../src/lib/authProfile.js";
import { isAllowedOAuthRedirect, mapOAuthError } from "../src/lib/oauth.js";

test("buildSlug normalizes names and emails", () => {
  assert.equal(buildSlug("Anna Ross"), "anna-ross");
  assert.equal(buildSlug("anna@kind.example"), "anna");
  assert.equal(buildSlug("  Hello!! World  "), "hello-world");
});

test("buildInitials derives up to two characters", () => {
  assert.equal(buildInitials("Anna Ross"), "AR");
  assert.equal(buildInitials("solo"), "S");
  assert.equal(buildInitials(""), "U");
});

test("oauthDisplayName prefers provider metadata", () => {
  assert.equal(
    oauthDisplayName({
      id: "abc-123",
      email: "anna@kind.example",
      user_metadata: { full_name: "Anna Ross" }
    }),
    "Anna Ross"
  );
  assert.equal(
    oauthDisplayName({ id: "abc-123", email: "anna@kind.example", user_metadata: {} }),
    "anna"
  );
  assert.equal(oauthDisplayName({ id: "abc-123-def", user_metadata: {} }), "user-abc123de");
});

test("isAllowedOAuthRedirect accepts app and local dev URLs", () => {
  assert.equal(isAllowedOAuthRedirect("kind://auth/callback"), true);
  assert.equal(isAllowedOAuthRedirect("exp://127.0.0.1:8081/--/auth/callback"), true);
  assert.equal(isAllowedOAuthRedirect("http://localhost:8081/auth/callback"), true);
  assert.equal(isAllowedOAuthRedirect("http://127.0.0.1:3000/auth/callback"), true);
  assert.equal(isAllowedOAuthRedirect("https://evil.example/callback"), false);
  assert.equal(isAllowedOAuthRedirect(""), false);
});

test("mapOAuthError maps known provider conflicts to 409", () => {
  const mapped = mapOAuthError({ message: "User already registered" });
  assert.equal(mapped.status, 409);
  assert.match(mapped.error, /email and password/i);
});

test("mapOAuthError maps invalid codes to 401", () => {
  const mapped = mapOAuthError({ message: "Invalid grant code" });
  assert.equal(mapped.status, 401);
});
