import test from "node:test";
import assert from "node:assert/strict";
import { parsePasswordResetUrl } from "../src/lib/parsePasswordResetUrl.js";

test("parsePasswordResetUrl reads recovery tokens from hash", () => {
  const parsed = parsePasswordResetUrl(
    "kind://auth/reset-password#access_token=abc&refresh_token=def&type=recovery"
  );
  assert.equal(parsed.accessToken, "abc");
  assert.equal(parsed.refreshToken, "def");
  assert.equal(parsed.type, "recovery");
});

test("parsePasswordResetUrl reads token_hash from query", () => {
  const parsed = parsePasswordResetUrl(
    "http://localhost:8081/auth/reset-password?token_hash=xyz&type=recovery"
  );
  assert.equal(parsed.tokenHash, "xyz");
  assert.equal(parsed.type, "recovery");
});

test("parsePasswordResetUrl ignores non-recovery types", () => {
  assert.equal(
    parsePasswordResetUrl("kind://auth/reset-password#access_token=abc&type=signup"),
    null
  );
});

test("parsePasswordResetUrl surfaces errors", () => {
  const parsed = parsePasswordResetUrl(
    "kind://auth/reset-password#error=access_denied&error_description=Link+expired"
  );
  assert.equal(parsed.error, "Link expired");
});
