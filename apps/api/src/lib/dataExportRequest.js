import { query } from "../db.js";
import { sendEmail } from "./sendEmail.js";

function readEnv(env, key, fallback = "") {
  return env?.[key] ?? process.env[key] ?? fallback;
}

function normalizeEmail(value) {
  return String(value || "")
    .trim()
    .toLowerCase();
}

function isValidEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || "").trim());
}

export async function submitDataExportRequest(individualId, submittedEmail, env = {}) {
  const email = String(submittedEmail || "").trim();
  if (!email) {
    return { ok: false, status: 400, error: "email is required" };
  }
  if (!isValidEmail(email)) {
    return { ok: false, status: 400, error: "Invalid email address" };
  }

  const { rows } = await query(
    `SELECT display_name, email, slug FROM individuals WHERE id = $1`,
    [individualId]
  );

  if (!rows.length) {
    return { ok: false, status: 404, error: "Individual not found" };
  }

  const { display_name: displayName, email: accountEmail, slug } = rows[0];

  if (normalizeEmail(email) !== normalizeEmail(accountEmail)) {
    return { ok: false, status: 403, error: "Email does not match your Kind account" };
  }

  const notifyTo = readEnv(env, "DATA_EXPORT_NOTIFY_TO", "hello@kind-health.app");
  const requestedAt = new Date().toISOString();
  const subject = `Data export request — ${displayName || "Kind user"}`;
  const text = [
    "A Kind user has requested a download of their data.",
    "",
    `Name: ${displayName || "Unknown"}`,
    `Email: ${email}`,
    `Account slug: ${slug || "unknown"}`,
    `Requested at: ${requestedAt}`
  ].join("\n");

  await sendEmail({ to: notifyTo, subject, text }, env);

  return { ok: true, requestedAt };
}
