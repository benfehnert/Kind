export const PHASE_BASELINE = { start: 1, end: 2, key: "BASELINE" };
export const PHASE_THIRTY_MIN = { start: 3, end: 4, key: "INTERVENTION" };
export const PHASE_SIXTY_MIN = { start: 5, end: 5, key: "OPTIMISE" };
export const PHASE_OUTPUT = { start: 6, end: 6, key: "OUTPUT" };

export const PHASES = [PHASE_BASELINE, PHASE_THIRTY_MIN, PHASE_SIXTY_MIN, PHASE_OUTPUT];

export const PRIMARY_OUTCOME = "sleep_quality";
export const SECONDARY_OUTCOMES = ["sleep_onset_ordinal", "winddown_minutes"];

export const HABITS = [
  "screen_free_60min",
  "no_screens_in_bed",
  "reading_winddown",
  "stretching_before_bed"
];

export const HABIT_LABELS = {
  screen_free_60min: "60-min screen-free before bed",
  no_screens_in_bed: "No screens in bed",
  reading_winddown: "Reading wind-down",
  stretching_before_bed: "Stretching before bed"
};

export const HABIT_ICONS = {
  screen_free_60min: "📵",
  no_screens_in_bed: "🛏️",
  reading_winddown: "📖",
  stretching_before_bed: "🧘"
};

export const LAST_SCREEN_OPTS = [
  "60+ min before",
  "30–60 min before",
  "15–30 min before",
  "Right before bed"
];

export const BED_SCREEN_OPTS = ["None", "Under 15 min", "15–30 min", "30+ min"];

export const ONSET_OPTS = ["Under 10 min", "10–20 min", "20–40 min", "Over 40 min"];

export const ONSET_ORDINAL = {
  "Under 10 min": 0,
  "10–20 min": 1,
  "20–40 min": 2,
  "Over 40 min": 3
};

export const MIN_BASELINE_DAYS = 1;
export const MIN_INTERVENTION_DAYS = 1;
export const MIN_ACTIVE_DAYS = 3;
export const MIN_HABIT_OBSERVATIONS = 1;
export const MIN_STACKING_GROUP = 1;
export const ADHERENCE_WARNING_THRESHOLD = 0.7;
export const SIGNIFICANCE_LEVEL = 0.05;
export const MIN_COHORT_SIZE = 10;

export const SLEEP_QUALITY_COLORS = {
  unrested: "#E24B4A",
  ok: "#EF9F27",
  rested: "#FAC775",
  fully_restored: "#5DCAA5"
};

export const SLEEP_QUALITY_LABELS = ["Unrested", "OK", "Rested", "Fully restored"];

import { getExplorationTheme } from "../../explorationThemes.js";

const _theme = getExplorationTheme("screen-sleep");
export const THEME_BAR = _theme.accent;
export const THEME_BADGE_BG = _theme.surface;
export const THEME_BADGE_TEXT = _theme.accent;

export const PHASE_DISPLAY_NAMES = {
  BASELINE: "Baseline",
  INTERVENTION: "30-min free",
  OPTIMISE: "60-min free",
  OUTPUT: "Personalised trial report"
};

export const HEALTH_EXPLORATION_LABEL = "Health exploration";

export const USER_DISCLAIMER = {
  title: "Hold this lightly",
  body:
    "Sleep is sensitive to stress, caffeine and illness. This report reflects your logs over a short six-day alpha exploration — an early personal pattern, not a clinical assessment."
};

export const WINDDOWN_BUCKETS = [
  { key: "lt15", label: "Under 15 min", match: (m) => m < 15 },
  { key: "15_29", label: "15–29 min", match: (m) => m >= 15 && m < 30 },
  { key: "30_44", label: "30–44 min", match: (m) => m >= 30 && m < 45 },
  { key: "45_59", label: "45–59 min", match: (m) => m >= 45 && m < 60 },
  { key: "60plus", label: "60+ min", match: (m) => m >= 60 }
];

export function phaseDisplayName(phaseKey) {
  return PHASE_DISPLAY_NAMES[phaseKey] ?? phaseKey;
}

export function assignPhase(studyDay) {
  if (studyDay >= PHASE_BASELINE.start && studyDay <= PHASE_BASELINE.end) return PHASE_BASELINE.key;
  if (studyDay >= PHASE_THIRTY_MIN.start && studyDay <= PHASE_THIRTY_MIN.end) return PHASE_THIRTY_MIN.key;
  if (studyDay >= PHASE_SIXTY_MIN.start && studyDay <= PHASE_SIXTY_MIN.end) return PHASE_SIXTY_MIN.key;
  if (studyDay >= PHASE_OUTPUT.start && studyDay <= PHASE_OUTPUT.end) return PHASE_OUTPUT.key;
  throw new Error(`study_day out of range 1–6: ${studyDay}`);
}

// Short alpha explorations compress one full-study week into a single logged day.
export function studyWeek(studyDay) {
  return studyDay;
}

export function sleepQualityBand(value) {
  if (value === null || value === undefined) return null;
  if (value <= 4) return "unrested";
  if (value <= 6) return "ok";
  if (value <= 8) return "rested";
  return "fully_restored";
}

export function onsetLabel(ordinal) {
  if (ordinal === null || ordinal === undefined) return null;
  return ONSET_OPTS[ordinal] ?? null;
}
