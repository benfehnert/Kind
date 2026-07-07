import { getCentModule } from "../../src/lib/cent/index.js";
import { getCentShortModule } from "../../src/lib/centShort/index.js";

const FULL_IDS = ["morning-rules", "eating", "screen-sleep", "relaxation", "upf-mood"];
const SHORT_IDS = FULL_IDS.map((id) => `${id}-short`);

function isoAddDays(startDate, dayOffset) {
  const d = new Date(`${startDate}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + dayOffset);
  return d.toISOString().slice(0, 10);
}

function defaultTotalDays(explorationId, short) {
  if (short) return explorationId === "morning-rules-short" ? 8 : 6;
  return explorationId === "morning-rules" ? 56 : 42;
}

function baseId(explorationId) {
  return explorationId.replace(/-short$/, "");
}

function fieldValuesFor(explorationId, active) {
  switch (baseId(explorationId)) {
    case "morning-rules":
      return {
        mr_rules: active ? ["Early sunlight exposure", "Morning stretching"] : [],
        mr_am_energy: active ? 7 : 6,
        mr_pm_energy: active ? 7 : 5,
        mr_crash: active ? "None" : "Severe crash",
        mr_focus: active ? 7 : 5
      };
    case "eating":
      return {
        te_first: "8–9am",
        te_last: active ? "4–6pm" : "7–8pm",
        te_energy: active ? 8 : 5,
        te_hunger: active ? 7 : 4,
        te_mood: active ? 8 : 5
      };
    case "screen-sleep":
      return {
        ss_last: active ? "60+ min before" : "Right before bed",
        ss_bed: active ? "None" : "30+ min",
        ss_windup: active ? 60 : 0,
        ss_activities: active ? ["Reading", "Stretching"] : [],
        ss_onset: active ? "Under 10 min" : "Over 40 min",
        ss_sleep: active ? 8 : 4
      };
    case "relaxation":
      return {
        rp_practices: active ? ["Vagal breathing", "Meditation / visualisation"] : [],
        rp_stress: active ? 3 : 7,
        rp_anxiety: active ? 3 : 7,
        rp_composure: active ? 8 : 4
      };
    case "upf-mood":
      return {
        upf_pct: active ? 20 : 60,
        upf_mood: active ? 8 : 4,
        upf_energy: active ? 8 : 4,
        upf_swaps: active ? ["Breakfast", "Lunch"] : []
      };
    default:
      return {};
  }
}

function applyScenarioOverrides(explorationId, day, scenario, fields) {
  if (scenario === "missingPrimary" && day === 1) {
    switch (baseId(explorationId)) {
      case "morning-rules":
        return { ...fields, mr_crash: null };
      case "eating":
        return { ...fields, te_energy: null };
      case "screen-sleep":
        return { ...fields, ss_sleep: null };
      case "relaxation":
        return { ...fields, rp_composure: null };
      case "upf-mood":
        return { ...fields, upf_mood: null };
      default:
        return fields;
    }
  }
  return fields;
}

function buildLogs(explorationId, { short = false, scenario = "improved", startDate = "2026-01-01" } = {}) {
  const totalDays =
    scenario === "insufficient"
      ? (short ? 3 : 12)
      : defaultTotalDays(explorationId, short);
  const baselineEnd = short ? 2 : 14;
  const logs = [];

  for (let day = 1; day <= totalDays; day += 1) {
    const active = day > baselineEnd;
    const fields = fieldValuesFor(explorationId, active);
    logs.push({
      log_date: isoAddDays(startDate, day - 1),
      field_values: applyScenarioOverrides(explorationId, day, scenario, fields)
    });
  }
  return logs;
}

export function listExplorationIds(short = false) {
  return short ? SHORT_IDS : FULL_IDS;
}

export function runSyntheticAnalysis(explorationId, { short = false, scenario = "improved" } = {}) {
  const mod = short ? getCentShortModule(explorationId) : getCentModule(explorationId);
  if (!mod) throw new Error(`Unknown exploration module: ${explorationId}`);

  const startDate = short ? "2026-06-01" : "2026-01-01";
  const logs = buildLogs(explorationId, { short, scenario, startDate });
  const entries = mod.loadDayEntries(logs, startDate);
  const studyMeta = mod.buildStudyMeta({
    start_date: startDate,
    end_date: logs.at(-1)?.log_date,
    participant_name: "Test User"
  });
  const analysis = mod.analyze(entries, studyMeta, null);
  return { entries, studyMeta, analysis };
}
