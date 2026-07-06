export const PHASE_BASELINE = { start: 1, end: 14, key: "BASELINE" };
export const PHASE_REDUCTION = { start: 15, end: 28, key: "INTERVENTION" };
export const PHASE_SUSTAINED = { start: 29, end: 35, key: "OPTIMISE" };
export const PHASE_OUTPUT = { start: 36, end: 42, key: "OUTPUT" };

export const PHASES = [PHASE_BASELINE, PHASE_REDUCTION, PHASE_SUSTAINED, PHASE_OUTPUT];

export const PRIMARY_OUTCOME = "daily_mood";
export const SECONDARY_OUTCOMES = ["upf_pct", "upf_energy"];

export const HABITS = ["breakfast_swap", "snack_swap", "dinner_swap", "lunch_swap"];

export const HABIT_LABELS = {
  breakfast_swap: "Whole-food breakfast swap",
  snack_swap: "Unprocessed snacks",
  dinner_swap: "Home-cooked main meals",
  lunch_swap: "Whole-food lunch swap"
};

export const HABIT_ICONS = {
  breakfast_swap: "🥣",
  snack_swap: "🥜",
  dinner_swap: "🍳",
  lunch_swap: "🥗"
};

export const SWAP_OPTS = {
  breakfast_swap: "Breakfast",
  snack_swap: "Snacks",
  dinner_swap: "Dinner",
  lunch_swap: "Lunch"
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

const _theme = getExplorationTheme("upf-mood");
export const THEME_GREEN = _theme.accent;
export const BADGE_BG = _theme.surface;

export const UPF_COLORS = {
  high: "#E24B4A",
  medium: "#EF9F27",
  low: "#5DCAA5"
};

export const UPF_BAND_LABELS = ["50%+ UPF", "30–50% UPF", "Under 30% UPF"];

export const UPF_BUCKETS = [
  { key: "high", label: "50%+ UPF", match: (pct) => pct >= 50 },
  { key: "medium", label: "30–50% UPF", match: (pct) => pct >= 30 && pct < 50 },
  { key: "low", label: "Under 30% UPF", match: (pct) => pct < 30 }
];

export const PHASE_DISPLAY_NAMES = {
  BASELINE: "Baseline",
  INTERVENTION: "Gradual reduction",
  OPTIMISE: "Sustained lower UPF",
  OUTPUT: "Personalised trial report"
};

export const HEALTH_EXPLORATION_LABEL = "Health exploration";

export const USER_DISCLAIMER = {
  title: "Hold this lightly",
  body:
    "Diet and mood interact with sleep, stress and social context. This is your personal log over six weeks — informative, not medical advice."
};

export function phaseDisplayName(phaseKey) {
  return PHASE_DISPLAY_NAMES[phaseKey] ?? phaseKey;
}

export function assignPhase(studyDay) {
  if (studyDay >= PHASE_BASELINE.start && studyDay <= PHASE_BASELINE.end) return PHASE_BASELINE.key;
  if (studyDay >= PHASE_REDUCTION.start && studyDay <= PHASE_REDUCTION.end) return PHASE_REDUCTION.key;
  if (studyDay >= PHASE_SUSTAINED.start && studyDay <= PHASE_SUSTAINED.end) return PHASE_SUSTAINED.key;
  if (studyDay >= PHASE_OUTPUT.start && studyDay <= PHASE_OUTPUT.end) return PHASE_OUTPUT.key;
  throw new Error(`study_day out of range 1–42: ${studyDay}`);
}

export function studyWeek(studyDay) {
  return Math.ceil(studyDay / 7);
}

export function upfBand(pct) {
  if (pct === null || pct === undefined) return null;
  for (const bucket of UPF_BUCKETS) {
    if (bucket.match(pct)) return bucket.key;
  }
  return null;
}
