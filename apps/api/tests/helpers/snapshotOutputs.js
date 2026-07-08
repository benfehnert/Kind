import { listExplorationIds, runSyntheticAnalysis } from "./syntheticExplorationData.js";

const SNAPSHOT_SCENARIO = "improved";

// Reports embed a wall-clock `generated` timestamp; drop volatile keys so
// snapshots stay byte-stable across runs.
const VOLATILE_KEYS = new Set(["generated", "generated_at", "generatedAt"]);

function stripVolatileKeys(value) {
  if (Array.isArray(value)) return value.map(stripVolatileKeys);
  if (value && typeof value === "object") {
    const out = {};
    for (const [key, v] of Object.entries(value)) {
      if (VOLATILE_KEYS.has(key)) continue;
      out[key] = stripVolatileKeys(v);
    }
    return out;
  }
  return value;
}

export function listSnapshotIds() {
  return [...listExplorationIds(false), ...listExplorationIds(true)];
}

export function buildSnapshot(explorationId) {
  const short = explorationId.endsWith("-short");
  const { entries, studyMeta, analysis } = runSyntheticAnalysis(explorationId, {
    short,
    scenario: SNAPSHOT_SCENARIO
  });
  const mobile = analysis.finalResult?.mobileReport ?? null;

  return stripVolatileKeys({
    explorationId,
    scenario: SNAPSHOT_SCENARIO,
    studyStart: studyMeta.start_date,
    daysLogged: entries.length,
    maxStudyDay: entries.length ? Math.max(...entries.map((e) => e.study_day ?? 0)) : 0,
    validDays: entries.filter((e) => e.valid_for_analysis).length,
    analysisReports: (analysis.reports ?? []).map((r) => r.type),
    finalReportType: analysis.finalResult?.centReport?.type ?? analysis.finalResult?.type ?? null,
    tiles: mobile?.tiles ?? null,
    phaseChart: mobile?.phaseChart?.points ?? mobile?.phaseChart ?? null,
    keepList: mobile?.keepList?.items ?? mobile?.keepList ?? null
  });
}
