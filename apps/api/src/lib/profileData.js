import { query } from "../db.js";
import profileMock from "../mocks/profile.json" with { type: "json" };
import { fetchActiveRun } from "./homeData.js";

function avatarKeyFromImageId(imageId) {
  return imageId != null ? `pravatar-${imageId}` : null;
}

function avg(values) {
  if (!values.length) return null;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

function formatEnergy(value) {
  if (value === null || Number.isNaN(value)) return null;
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

async function fetchAvailableExplorationCount() {
  const { rows } = await query(`SELECT COUNT(*)::int AS count FROM explorations`);
  return rows[0]?.count ?? 0;
}

async function fetchUserActiveExplorationCount(individualId) {
  const { rows } = await query(
    `SELECT COUNT(*)::int AS count
     FROM user_explorations
     WHERE individual_id = $1 AND is_active = TRUE`,
    [individualId]
  );
  return rows[0]?.count ?? 0;
}

async function fetchTotalLogCount(individualId) {
  const { rows } = await query(
    `SELECT COUNT(*)::int AS count FROM daily_logs WHERE individual_id = $1`,
    [individualId]
  );
  return rows[0]?.count ?? 0;
}

async function fetchMorningRulesEnergySummary(individualId) {
  const { rows } = await query(
    `SELECT field_values, log_date
     FROM daily_logs
     WHERE individual_id = $1 AND exploration_id = 'morning-rules'
     ORDER BY log_date ASC`,
    [individualId]
  );

  const energies = rows
    .map((row) => Number(row.field_values?.mr_pm_energy))
    .filter((n) => !Number.isNaN(n));

  if (!energies.length) return null;

  const baselineSlice = energies.slice(0, Math.min(7, Math.max(3, Math.floor(energies.length / 2))));
  const recentSlice = energies.slice(-Math.min(7, Math.ceil(energies.length / 2)));
  const baseline = avg(baselineSlice);
  const current = avg(recentSlice);

  return {
    baseline: formatEnergy(baseline),
    current: formatEnergy(current),
    improved: current != null && baseline != null && current > baseline + 0.05
  };
}

async function buildSummaryRows(individualId) {
  const [catalogCount, activeCount, totalLogs, energy] = await Promise.all([
    fetchAvailableExplorationCount(),
    fetchUserActiveExplorationCount(individualId),
    fetchTotalLogCount(individualId),
    fetchMorningRulesEnergySummary(individualId)
  ]);

  const rows = [
    {
      label: "Active explorations",
      value: `${activeCount} of ${catalogCount} available`
    }
  ];

  if (energy?.baseline) {
    rows.push({
      label: "Baseline afternoon energy",
      value: `${energy.baseline} / 10`
    });
  }

  if (energy?.current) {
    rows.push({
      label: "Current afternoon energy",
      value: `${energy.current} / 10`,
      valueTone: energy.improved ? "green" : undefined
    });
  }

  rows.push({
    label: "Total logs submitted",
    value: String(totalLogs)
  });

  const hasSummaryData = activeCount > 0 || totalLogs > 0 || Boolean(energy?.baseline);

  return {
    summaryRows: rows,
    hasSummaryData,
    emptySummaryMessage:
      "Join an exploration and log daily check-ins to build your personal summary."
  };
}

export async function buildProfilePayload(individualId) {
  const { rows } = await query(
    `SELECT
       i.display_name,
       i.location,
       i.avatar_initials AS "avatarInitials",
       i.avatar_image_id AS "avatarImageId",
       i.joined_at,
       (SELECT COUNT(*)::int FROM individual_follows WHERE follower_id = i.id) AS following,
       (SELECT COUNT(*)::int FROM individual_follows WHERE followee_id = i.id) AS followers,
       (SELECT COALESCE(json_agg(json_build_object('variant', ib.style::text, 'label', ib.label)
                                 ORDER BY ib.sort_order), '[]'::json)
        FROM individual_badges ib WHERE ib.individual_id = i.id) AS badges,
       ps.platform_consent AS "globalConsent",
       ps.contribute_to_citizen_science AS "science",
       ps.visible_in_community AS "visible",
       ps.daily_reminders AS "reminders"
     FROM individuals i
     LEFT JOIN privacy_settings ps ON ps.individual_id = i.id
     WHERE i.id = $1`,
    [individualId]
  );

  if (!rows.length) return null;

  const row = rows[0];
  const initials =
    row.avatarInitials ||
    row.display_name
      ?.split(" ")
      .map((w) => w[0])
      .join("")
      .toUpperCase()
      .slice(0, 2) ||
    "?";
  const joinedDate = new Date(row.joined_at).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric"
  });
  const avatarKey = avatarKeyFromImageId(row.avatarImageId);
  const locationLine = row.location
    ? `${row.location} · Joined ${joinedDate}`
    : `Joined ${joinedDate}`;

  const summary = await buildSummaryRows(individualId);
  const activeRun = await fetchActiveRun(individualId);

  const badges = Array.isArray(row.badges) ? row.badges : [];
  const dynamicBadges = [...badges];

  if (!dynamicBadges.length && activeRun) {
    dynamicBadges.push({
      variant: "amber",
      label: `Week ${activeRun.week_current} of ${activeRun.weeks_total}`
    });
    if (activeRun.streak_days > 0) {
      dynamicBadges.push({
        variant: "green",
        label: `${activeRun.streak_days}-day streak`
      });
    }
  }

  return {
    navProfile: {
      initials,
      avatarKey
    },
    hero: {
      name: row.display_name,
      locationLine,
      badges: dynamicBadges,
      avatarKey
    },
    followStats: {
      following: Number(row.following ?? 0),
      followers: Number(row.followers ?? 0)
    },
    summaryTitle: profileMock.summaryTitle,
    ...summary,
    privacy: {
      ...profileMock.privacy,
      toggles: profileMock.privacy.toggles.map((toggle) => ({
        ...toggle,
        defaultOn: Boolean(row[toggle.key] ?? toggle.defaultOn ?? false)
      }))
    },
    contributionBanner: profileMock.contributionBanner
  };
}

export async function updateProfile(individualId, { displayName, avatarImageId }) {
  const fields = [];
  const values = [];
  let idx = 1;

  if (displayName != null) {
    const trimmed = String(displayName).trim();
    if (!trimmed) throw new Error("displayName required");
    fields.push(`display_name = $${idx++}`);
    values.push(trimmed);
    fields.push(
      `avatar_initials = $${idx++}`
    );
    values.push(
      trimmed
        .split(/\s+/)
        .map((w) => w[0] || "")
        .join("")
        .toUpperCase()
        .slice(0, 2)
    );
  }

  if (avatarImageId !== undefined) {
    fields.push(`avatar_image_id = $${idx++}`);
    values.push(avatarImageId);
  }

  if (!fields.length) return null;

  fields.push("updated_at = NOW()");
  values.push(individualId);

  await query(
    `UPDATE individuals SET ${fields.join(", ")} WHERE id = $${idx}`,
    values
  );

  return buildProfilePayload(individualId);
}
