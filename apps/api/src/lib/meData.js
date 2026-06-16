import { query } from "../db.js";
import trialReports from "../data/explorationTrialReports.json" with { type: "json" };
import consentMock from "../mocks/consent.json" with { type: "json" };

const EXPLORATION_WEEKS = {
  "morning-rules": 8,
  eating: 6,
  "screen-sleep": 6,
  relaxation: 6,
  "upf-mood": 6
};

export async function getIndividualId(authUserId) {
  if (authUserId === "__mock__") {
    const { rows } = await query(
      "SELECT id FROM individuals WHERE slug = 'anna-ross' LIMIT 1"
    );
    return rows[0]?.id ?? null;
  }
  const { rows } = await query(
    "SELECT id FROM individuals WHERE auth_user_id = $1 LIMIT 1",
    [authUserId]
  );
  return rows[0]?.id ?? null;
}

export function privacyFromOnboardingAnswers(answers = {}) {
  return {
    globalConsent: Boolean(answers.consentPrivacy),
    science: Boolean(answers.consentCitizenScience),
    visible: Boolean(answers.consentDiscoverable),
    reminders: Boolean(answers.remindersEnabled)
  };
}

export async function fetchOnboardingRow(individualId) {
  const { rows } = await query(
    `SELECT completed_at, answers, created_at, updated_at
     FROM individual_onboarding WHERE individual_id = $1`,
    [individualId]
  );
  return rows[0] ?? null;
}

export async function fetchConsentChoices(individualId) {
  const { rows } = await query(
    `SELECT consent_key, granted, consented_at
     FROM individual_consents WHERE individual_id = $1`,
    [individualId]
  );
  const choices = {};
  for (const row of rows) {
    choices[row.consent_key] = row.granted;
  }
  return choices;
}

export async function fetchPrivacyPrefs(individualId) {
  const { rows } = await query(
    `SELECT platform_consent, contribute_to_citizen_science, visible_in_community, daily_reminders
     FROM privacy_settings WHERE individual_id = $1`,
    [individualId]
  );
  const ps = rows[0];
  if (!ps) {
    return {
      globalConsent: false,
      science: false,
      visible: false,
      reminders: false
    };
  }
  return {
    globalConsent: ps.platform_consent,
    science: ps.contribute_to_citizen_science,
    visible: ps.visible_in_community,
    reminders: ps.daily_reminders
  };
}

export async function fetchExplorationConsents(individualId) {
  const { rows } = await query(
    `SELECT exploration_id, granted, consented_at, is_active
     FROM exploration_consents WHERE individual_id = $1`,
    [individualId]
  );
  const map = {};
  let activeExplorationId = null;
  for (const row of rows) {
    if (row.granted) {
      map[row.exploration_id] = {
        granted: true,
        consentedAt: row.consented_at?.toISOString?.() ?? row.consented_at
      };
    }
    if (row.is_active) activeExplorationId = row.exploration_id;
  }
  return { map, activeExplorationId };
}

export async function fetchUserExplorations(individualId) {
  const { rows } = await query(
    `SELECT ue.id, ue.exploration_id, ue.week_current, ue.weeks_total, ue.status::text AS status,
            ue.streak_days, ue.started_at, ue.completed_at, ue.is_active,
            e.title, e.duration_label
     FROM user_explorations ue
     JOIN explorations e ON e.id = ue.exploration_id
     WHERE ue.individual_id = $1
     ORDER BY ue.started_at DESC`,
    [individualId]
  );
  return rows;
}

export async function upsertPrivacyFromOnboarding(individualId, answers) {
  const prefs = privacyFromOnboardingAnswers(answers);
  await query(
    `INSERT INTO privacy_settings (
       individual_id, platform_consent, contribute_to_citizen_science,
       visible_in_community, daily_reminders
     ) VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT (individual_id) DO UPDATE SET
       platform_consent = EXCLUDED.platform_consent,
       contribute_to_citizen_science = EXCLUDED.contribute_to_citizen_science,
       visible_in_community = EXCLUDED.visible_in_community,
       daily_reminders = EXCLUDED.daily_reminders,
       updated_at = NOW()`,
    [individualId, prefs.globalConsent, prefs.science, prefs.visible, prefs.reminders]
  );
  return prefs;
}

export async function upsertIndividualConsents(individualId, choices) {
  for (const [consentKey, granted] of Object.entries(choices)) {
    if (typeof granted !== "boolean") continue;
    await query(
      `INSERT INTO individual_consents (individual_id, consent_key, granted, consented_at)
       VALUES ($1, $2, $3, CASE WHEN $3 THEN NOW() ELSE NULL END)
       ON CONFLICT (individual_id, consent_key) DO UPDATE SET
         granted = EXCLUDED.granted,
         consented_at = CASE WHEN EXCLUDED.granted THEN COALESCE(individual_consents.consented_at, NOW()) ELSE NULL END,
         updated_at = NOW()`,
      [individualId, consentKey, granted]
    );
  }
}

export async function setActiveExploration(individualId, explorationId) {
  await query(
    `UPDATE exploration_consents SET is_active = FALSE, updated_at = NOW()
     WHERE individual_id = $1`,
    [individualId]
  );
  await query(
    `UPDATE user_explorations SET is_active = FALSE, updated_at = NOW()
     WHERE individual_id = $1`,
    [individualId]
  );
  await query(
    `INSERT INTO exploration_consents (individual_id, exploration_id, granted, consented_at, is_active)
     VALUES ($1, $2, TRUE, NOW(), TRUE)
     ON CONFLICT (individual_id, exploration_id) DO UPDATE SET
       granted = TRUE,
       is_active = TRUE,
       consented_at = COALESCE(exploration_consents.consented_at, NOW()),
       updated_at = NOW()`,
    [individualId, explorationId]
  );
  await query(
    `UPDATE user_explorations SET is_active = TRUE, updated_at = NOW()
     WHERE individual_id = $1 AND exploration_id = $2`,
    [individualId, explorationId]
  );
}

export async function ensureUserExploration(individualId, explorationId) {
  const weeksTotal = EXPLORATION_WEEKS[explorationId] ?? 6;
  const { rows } = await query(
    `INSERT INTO user_explorations (
       individual_id, exploration_id, week_current, weeks_total, status, streak_days, is_active
     ) VALUES ($1, $2, 1, $3, 'active', 0, FALSE)
     ON CONFLICT (individual_id, exploration_id) DO UPDATE SET updated_at = NOW()
     RETURNING id`,
    [individualId, explorationId, weeksTotal]
  );
  return rows[0]?.id;
}

export function getTrialReportTemplate(explorationId) {
  return trialReports[explorationId] ?? null;
}

export async function fetchUserReport(individualId, explorationId) {
  const { rows } = await query(
    `SELECT content, generated_at, user_exploration_id
     FROM user_exploration_reports
     WHERE individual_id = $1 AND exploration_id = $2`,
    [individualId, explorationId]
  );
  return rows[0] ?? null;
}

export async function generateUserReport(individualId, explorationId) {
  const template = getTrialReportTemplate(explorationId);
  if (!template) return null;

  const { rows: ueRows } = await query(
    `SELECT id FROM user_explorations
     WHERE individual_id = $1 AND exploration_id = $2`,
    [individualId, explorationId]
  );
  const userExplorationId = ueRows[0]?.id ?? null;

  const { rows } = await query(
    `INSERT INTO user_exploration_reports (individual_id, exploration_id, user_exploration_id, content)
     VALUES ($1, $2, $3, $4::jsonb)
     ON CONFLICT (individual_id, exploration_id) DO UPDATE SET
       content = EXCLUDED.content,
       user_exploration_id = EXCLUDED.user_exploration_id,
       generated_at = NOW()
     RETURNING content, generated_at`,
    [individualId, explorationId, userExplorationId, JSON.stringify(template)]
  );
  return rows[0];
}

export function buildConsentPayload(choices, privacyPrefs) {
  return {
    ...consentMock,
    choices: { ...consentMock.annaDefaults, ...choices },
    privacyPrefs,
    completed: Object.keys(choices).length > 0
  };
}

export const ANNA_DEMO_ONBOARDING = {
  consentPrivacy: true,
  consentCitizenScience: true,
  consentDiscoverable: true,
  name: "Anna Ross",
  birthYear: "1992",
  sexAssignedAtBirth: "female",
  healthGoals: ["energy_focus", "sleep"],
  kindHelp: ["trials", "explore", "insight"],
  longevityImportance: "matters",
  remindersEnabled: true
};

export { trialReports, EXPLORATION_WEEKS };
