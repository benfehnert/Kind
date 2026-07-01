export const PHASE_BASELINE = { start: 1, end: 14, key: "BASELINE" };
export const PHASE_PRACTICES = { start: 15, end: 28, key: "INTERVENTION" };
export const PHASE_OPTIMISE = { start: 29, end: 35, key: "OPTIMISE" };
export const PHASE_OUTPUT = { start: 36, end: 42, key: "OUTPUT" };

export const PHASES = [PHASE_BASELINE, PHASE_PRACTICES, PHASE_OPTIMISE, PHASE_OUTPUT];

export const PRIMARY_OUTCOME = "composure";
export const FACTOR_OUTCOME = "stress";
export const SECONDARY_OUTCOMES = ["stress", "anxiety"];

export const HABITS = ["vagal_breathing", "pmr", "nature_walk", "meditation"];

export const HABIT_LABELS = {
  vagal_breathing: "Vagal breathing",
  pmr: "Progressive muscle relaxation",
  nature_walk: "Short nature walk",
  meditation: "Meditation / visualisation"
};

export const HABIT_ICONS = {
  vagal_breathing: "🌬️",
  pmr: "💪",
  nature_walk: "🌿",
  meditation: "🧘"
};

export const MIN_BASELINE_DAYS = 7;
export const MIN_INTERVENTION_DAYS = 10;
export const MIN_ACTIVE_DAYS = 14;
export const MIN_HABIT_OBSERVATIONS = 5;
export const MIN_STACKING_GROUP = 3;
export const ADHERENCE_WARNING_THRESHOLD = 0.7;
export const SIGNIFICANCE_LEVEL = 0.05;
export const MIN_COHORT_SIZE = 10;

import { getExplorationTheme } from "../../explorationThemes.js";

const _theme = getExplorationTheme("relaxation");
export const THEME_PRIMARY = _theme.accent;
export const THEME_BADGE_BG = _theme.surface;

export const ANXIETY_COLORS = {
  high: "#E24B4A",
  moderate: "#EF9F27",
  mild: "#FAC775",
  calm: "#5DCAA5"
};

export const ANXIETY_LABELS = ["High (7–10)", "Moderate (5–6)", "Mild (3–4)", "Calm (1–2)"];

export const PHASE_DISPLAY_NAMES = {
  BASELINE: "Baseline",
  INTERVENTION: "Practices",
  OPTIMISE: "Optimise",
  OUTPUT: "Week 6"
};

export const HEALTH_EXPLORATION_LABEL = "Health exploration";

export const USER_DISCLAIMER = {
  title: "Hold this lightly",
  body:
    "Self-reported stress and anxiety aren't clinical measures. If you're struggling, professional support matters — this report is a personal reflection, not a diagnosis."
};

export const PRACTICE_COUNT_BUCKETS = [
  { key: "none", label: "No practices", match: (n) => n === 0 },
  { key: "one", label: "1 practice", match: (n) => n === 1 },
  { key: "two", label: "2 practices", match: (n) => n === 2 },
  { key: "three_plus", label: "3+ practices", match: (n) => n >= 3 }
];

export function phaseDisplayName(phaseKey) {
  return PHASE_DISPLAY_NAMES[phaseKey] ?? phaseKey;
}

export function assignPhase(studyDay) {
  if (studyDay >= PHASE_BASELINE.start && studyDay <= PHASE_BASELINE.end) return PHASE_BASELINE.key;
  if (studyDay >= PHASE_PRACTICES.start && studyDay <= PHASE_PRACTICES.end) return PHASE_PRACTICES.key;
  if (studyDay >= PHASE_OPTIMISE.start && studyDay <= PHASE_OPTIMISE.end) return PHASE_OPTIMISE.key;
  if (studyDay >= PHASE_OUTPUT.start && studyDay <= PHASE_OUTPUT.end) return PHASE_OUTPUT.key;
  throw new Error(`study_day out of range 1–42: ${studyDay}`);
}

export function studyWeek(studyDay) {
  return Math.ceil(studyDay / 7);
}

export function anxietyBand(value) {
  if (value === null || value === undefined) return null;
  if (value >= 7) return "high";
  if (value >= 5) return "moderate";
  if (value >= 3) return "mild";
  return "calm";
}
