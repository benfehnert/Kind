import { Hono } from "hono";
import { query } from "../db.js";
import {
  buildConsentPayload,
  ensureUserExploration,
  fetchConsentChoices,
  fetchExplorationConsents,
  fetchOnboardingRow,
  fetchPrivacyPrefs,
  fetchUserExplorations,
  fetchUserReport,
  generateUserReport,
  getIndividualId,
  getTrialReportTemplate,
  privacyFromOnboardingAnswers,
  setActiveExploration,
  upsertIndividualConsents,
  upsertPrivacyFromOnboarding
} from "../lib/meData.js";
import { recordActivityFromLog } from "../lib/homeData.js";
import { syncExplorationUpdates } from "../lib/userExplorationUpdates.js";
import { syncShortExplorationUpdates } from "../lib/userExplorationUpdatesShort.js";
import { isShortExploration, isCatalogExploration } from "../lib/centShort/index.js";

const router = new Hono();

// ---------------------------------------------------------------------------
// Onboarding
// ---------------------------------------------------------------------------

router.get("/onboarding", async (c) => {
  const individualId = await getIndividualId(c.get("user").sub);
  if (!individualId) return c.json({ error: "Individual not found" }, 404);

  const row = await fetchOnboardingRow(individualId);
  return c.json({
    completed: Boolean(row?.completed_at),
    completedAt: row?.completed_at ?? null,
    answers: row?.answers ?? {},
    updatedAt: row?.updated_at ?? null
  });
});

router.put("/onboarding", async (c) => {
  const individualId = await getIndividualId(c.get("user").sub);
  if (!individualId) return c.json({ error: "Individual not found" }, 404);

  const body = await c.req.json().catch(() => ({}));
  const answers = body.answers ?? body;
  const completed = Boolean(body.completed);

  const { rows } = await query(
    `INSERT INTO individual_onboarding (individual_id, answers, completed_at)
     VALUES ($1, $2::jsonb, CASE WHEN $3 THEN NOW() ELSE NULL END)
     ON CONFLICT (individual_id) DO UPDATE SET
       answers = EXCLUDED.answers,
       completed_at = CASE
         WHEN $3 THEN COALESCE(individual_onboarding.completed_at, NOW())
         ELSE individual_onboarding.completed_at
       END,
       updated_at = NOW()
     RETURNING completed_at, answers, updated_at`,
    [individualId, JSON.stringify(answers), completed]
  );

  if (answers?.name) {
    await query(
      `UPDATE individuals SET display_name = $2, updated_at = NOW() WHERE id = $1`,
      [individualId, String(answers.name).trim()]
    );
  }

  if (completed || answers.consentPrivacy !== undefined) {
    await upsertPrivacyFromOnboarding(individualId, answers);
  }

  const row = rows[0];
  return c.json({
    ok: true,
    completed: Boolean(row.completed_at),
    completedAt: row.completed_at,
    answers: row.answers,
    updatedAt: row.updated_at
  });
});

router.post("/onboarding/complete", async (c) => {
  const individualId = await getIndividualId(c.get("user").sub);
  if (!individualId) return c.json({ error: "Individual not found" }, 404);

  const body = await c.req.json().catch(() => ({}));
  const answers = body.answers ?? body;

  const { rows } = await query(
    `INSERT INTO individual_onboarding (individual_id, answers, completed_at)
     VALUES ($1, $2::jsonb, NOW())
     ON CONFLICT (individual_id) DO UPDATE SET
       answers = EXCLUDED.answers,
       completed_at = NOW(),
       updated_at = NOW()
     RETURNING completed_at, answers`,
    [individualId, JSON.stringify(answers)]
  );

  const privacyPrefs = await upsertPrivacyFromOnboarding(individualId, answers);

  if (answers.name) {
    await query(`UPDATE individuals SET display_name = $2, updated_at = NOW() WHERE id = $1`, [
      individualId,
      String(answers.name).trim()
    ]);
  }

  const platformChoices = {
    platform_participation: privacyPrefs.globalConsent,
    research_contribution: privacyPrefs.science,
    result_sharing: privacyPrefs.visible
  };
  await upsertIndividualConsents(individualId, platformChoices);

  return c.json({
    ok: true,
    completed: true,
    completedAt: rows[0].completed_at,
    answers: rows[0].answers,
    privacyPrefs
  });
});

// ---------------------------------------------------------------------------
// Consent (persisted)
// ---------------------------------------------------------------------------

router.get("/consent/state", async (c) => {
  const individualId = await getIndividualId(c.get("user").sub);
  if (!individualId) return c.json({ error: "Individual not found" }, 404);

  const [choices, privacyPrefs, { map, activeExplorationId }] = await Promise.all([
    fetchConsentChoices(individualId),
    fetchPrivacyPrefs(individualId),
    fetchExplorationConsents(individualId)
  ]);

  return c.json({
    ...buildConsentPayload(choices, privacyPrefs),
    explorationConsents: map,
    activeExplorationId
  });
});

router.post("/consent/choices", async (c) => {
  const individualId = await getIndividualId(c.get("user").sub);
  if (!individualId) return c.json({ error: "Individual not found" }, 404);

  const body = await c.req.json().catch(() => ({}));
  const choices = body.choices ?? body;

  await upsertIndividualConsents(individualId, choices);

  if (
    choices.platform_participation !== undefined ||
    choices.research_contribution !== undefined ||
    choices.result_sharing !== undefined
  ) {
    await query(
      `INSERT INTO privacy_settings (
         individual_id, platform_consent, contribute_to_citizen_science, visible_in_community
       ) VALUES ($1, $2, $3, $4)
       ON CONFLICT (individual_id) DO UPDATE SET
         platform_consent = COALESCE($2, privacy_settings.platform_consent),
         contribute_to_citizen_science = COALESCE($3, privacy_settings.contribute_to_citizen_science),
         visible_in_community = COALESCE($4, privacy_settings.visible_in_community),
         updated_at = NOW()`,
      [
        individualId,
        choices.platform_participation ?? null,
        choices.research_contribution ?? null,
        choices.result_sharing ?? null
      ]
    );
  }

  return c.json({ ok: true, choices });
});

// ---------------------------------------------------------------------------
// User explorations
// ---------------------------------------------------------------------------

router.get("/me/explorations", async (c) => {
  const individualId = await getIndividualId(c.get("user").sub);
  if (!individualId) return c.json({ error: "Individual not found" }, 404);

  const [runs, { map, activeExplorationId }] = await Promise.all([
    fetchUserExplorations(individualId),
    fetchExplorationConsents(individualId)
  ]);

  const reportIds = runs.map((r) => r.exploration_id);
  const { rows: reportRows } = await query(
    `SELECT exploration_id FROM user_exploration_reports
     WHERE individual_id = $1 AND exploration_id = ANY($2::text[])`,
    [individualId, reportIds.length ? reportIds : ["morning-rules"]]
  );
  const reportSet = new Set(reportRows.map((r) => r.exploration_id));

  return c.json({
    activeExplorationId,
    items: runs.map((r) => ({
      explorationId: r.exploration_id,
      title: r.title,
      durationLabel: r.duration_label,
      weekCurrent: r.week_current,
      weeksTotal: r.weeks_total,
      status: r.status,
      streakDays: r.streak_days,
      startedAt: r.started_at,
      completedAt: r.completed_at,
      isActive: r.is_active,
      consented: Boolean(map[r.exploration_id]?.granted),
      consentedAt: map[r.exploration_id]?.consentedAt ?? null,
      hasReport: reportSet.has(r.exploration_id)
    }))
  });
});

router.post("/me/explorations/:id/consent", async (c) => {
  const individualId = await getIndividualId(c.get("user").sub);
  if (!individualId) return c.json({ error: "Individual not found" }, 404);

  const explorationId = c.req.param("id");
  if (!isCatalogExploration(explorationId)) {
    return c.json({ error: "Exploration not available" }, 400);
  }
  const body = await c.req.json().catch(() => ({}));
  const setActive = body.setActive !== false;

  await ensureUserExploration(individualId, explorationId);
  await query(
    `INSERT INTO exploration_consents (individual_id, exploration_id, granted, consented_at, is_active)
     VALUES ($1, $2, TRUE, NOW(), $3)
     ON CONFLICT (individual_id, exploration_id) DO UPDATE SET
       granted = TRUE,
       consented_at = COALESCE(exploration_consents.consented_at, NOW()),
       is_active = EXCLUDED.is_active,
       updated_at = NOW()`,
    [individualId, explorationId, setActive]
  );

  if (setActive) {
    await setActiveExploration(individualId, explorationId);
  }

  await upsertIndividualConsents(individualId, { exploration_participation: true });

  return c.json({
    ok: true,
    explorationId,
    granted: true,
    consentedAt: new Date().toISOString(),
    isActive: setActive
  });
});

router.patch("/me/explorations/:id/active", async (c) => {
  const individualId = await getIndividualId(c.get("user").sub);
  if (!individualId) return c.json({ error: "Individual not found" }, 404);

  const explorationId = c.req.param("id");
  if (!isCatalogExploration(explorationId)) {
    return c.json({ error: "Exploration not available" }, 400);
  }
  const { rows } = await query(
    `SELECT granted FROM exploration_consents
     WHERE individual_id = $1 AND exploration_id = $2 AND granted = TRUE`,
    [individualId, explorationId]
  );
  if (!rows.length) {
    return c.json({ error: "Exploration consent required before setting active" }, 400);
  }

  await setActiveExploration(individualId, explorationId);
  return c.json({ ok: true, activeExplorationId: explorationId });
});

router.post("/me/explorations/:id/complete", async (c) => {
  const individualId = await getIndividualId(c.get("user").sub);
  if (!individualId) return c.json({ error: "Individual not found" }, 404);

  const explorationId = c.req.param("id");
  if (!isCatalogExploration(explorationId)) {
    return c.json({ error: "Exploration not available" }, 400);
  }
  await query(
    `UPDATE user_explorations SET
       status = 'complete',
       completed_at = COALESCE(completed_at, CURRENT_DATE),
       week_current = weeks_total,
       is_active = FALSE,
       updated_at = NOW()
     WHERE individual_id = $1 AND exploration_id = $2`,
    [individualId, explorationId]
  );

  const report = await generateUserReport(individualId, explorationId);
  if (!report) return c.json({ error: "Report template not found" }, 404);

  return c.json({
    ok: true,
    explorationId,
    report: report.content,
    generatedAt: report.generated_at
  });
});

// ---------------------------------------------------------------------------
// Trial final reports
// ---------------------------------------------------------------------------

router.get("/me/explorations/:id/report", async (c) => {
  const individualId = await getIndividualId(c.get("user").sub);
  if (!individualId) return c.json({ error: "Individual not found" }, 404);

  const explorationId = c.req.param("id");
  let row = await fetchUserReport(individualId, explorationId);

  if (!row) {
    const generated = await generateUserReport(individualId, explorationId);
    if (!generated) return c.json({ error: "Report not found" }, 404);
    row = generated;
  }

  return c.json({
    explorationId,
    report: row.content,
    generatedAt: row.generated_at
  });
});

router.get("/explorations/:id/report-template", (c) => {
  const explorationId = c.req.param("id");
  const template = getTrialReportTemplate(explorationId);
  if (!template) return c.json({ error: "Report template not found" }, 404);
  return c.json({ explorationId, report: template });
});

// ---------------------------------------------------------------------------
// Daily logs
// ---------------------------------------------------------------------------

router.get("/me/logs", async (c) => {
  const individualId = await getIndividualId(c.get("user").sub);
  if (!individualId) return c.json({ error: "Individual not found" }, 404);

  const explorationId = c.req.query("explorationId");
  const logDate = c.req.query("date");
  if (!explorationId) return c.json({ error: "explorationId is required" }, 400);

  const params = [individualId, explorationId];
  let sql = `SELECT log_date, field_values, created_at
             FROM daily_logs
             WHERE individual_id = $1 AND exploration_id = $2`;
  if (logDate) {
    params.push(logDate);
    sql += ` AND log_date = $3`;
  }
  sql += ` ORDER BY log_date DESC LIMIT 30`;

  const { rows } = await query(sql, params);
  return c.json({
    explorationId,
    items: rows.map((r) => ({
      logDate: r.log_date,
      fieldValues: r.field_values,
      createdAt: r.created_at
    }))
  });
});

router.post("/me/logs", async (c) => {
  const individualId = await getIndividualId(c.get("user").sub);
  if (!individualId) return c.json({ error: "Individual not found" }, 404);

  const body = await c.req.json().catch(() => ({}));
  const explorationId = body.explorationId;
  const fieldValues = body.fieldValues ?? body.field_values ?? {};
  const logDate = body.logDate ?? body.log_date ?? new Date().toISOString().slice(0, 10);

  if (!explorationId) return c.json({ error: "explorationId is required" }, 400);

  const userExplorationId = await ensureUserExploration(individualId, explorationId);

  const { rows } = await query(
    `INSERT INTO daily_logs (individual_id, exploration_id, user_exploration_id, log_date, field_values)
     VALUES ($1, $2, $3, $4, $5::jsonb)
     ON CONFLICT (individual_id, exploration_id, log_date) DO UPDATE SET
       field_values = EXCLUDED.field_values,
       user_exploration_id = EXCLUDED.user_exploration_id
     RETURNING log_date, field_values, created_at`,
    [individualId, explorationId, userExplorationId, logDate, JSON.stringify(fieldValues)]
  );

  await query(
    `UPDATE user_explorations SET streak_days = streak_days + 1, updated_at = NOW()
     WHERE id = $1`,
    [userExplorationId]
  );

  await recordActivityFromLog(individualId, explorationId, rows[0].field_values, userExplorationId);

  const feedUpdates = isShortExploration(explorationId)
    ? await syncShortExplorationUpdates(individualId, explorationId)
    : await syncExplorationUpdates(individualId, explorationId);

  return c.json({
    ok: true,
    logDate: rows[0].log_date,
    fieldValues: rows[0].field_values,
    createdAt: rows[0].created_at,
    feedUpdates: feedUpdates.length
  });
});

export default router;
