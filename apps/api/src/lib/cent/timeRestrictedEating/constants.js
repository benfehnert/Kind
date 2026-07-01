export const PHASE_BASELINE = { start: 1, end: 14, key: "BASELINE" };
export const PHASE_TEN_HOUR = { start: 15, end: 28, key: "INTERVENTION" };
export const PHASE_EIGHT_HOUR = { start: 29, end: 35, key: "OPTIMISE" };
export const PHASE_OUTPUT = { start: 36, end: 42, key: "OUTPUT" };

export const PHASES = [PHASE_BASELINE, PHASE_TEN_HOUR, PHASE_EIGHT_HOUR, PHASE_OUTPUT];

export const PRIMARY_OUTCOME = "daily_energy";
export const SECONDARY_OUTCOMES = ["hunger_comfort", "mood", "eating_window_hours"];

export const HABITS = ["window_10h_or_less", "first_meal_around_8am", "last_meal_before_6pm"];

export const HABIT_LABELS = {
  window_10h_or_less: "Consistent 10-hour window",
  first_meal_around_8am: "Fixed first meal (~8am)",
  last_meal_before_6pm: "Last meal before 6pm"
};

export const HABIT_ICONS = {
  window_10h_or_less: "🕐",
  first_meal_around_8am: "🌅",
  last_meal_before_6pm: "🌙"
};

export const FIRST_MEAL_OPTS = ["Before 7am", "7–8am", "8–9am", "9–10am", "After 10am"];
export const LAST_MEAL_OPTS = ["Before 4pm", "4–6pm", "6–7pm", "7–8pm", "After 8pm"];

export const FIRST_MEAL_HOUR = {
  "Before 7am": 6.5,
  "7–8am": 7.5,
  "8–9am": 8.5,
  "9–10am": 9.5,
  "After 10am": 10.5
};

export const LAST_MEAL_HOUR = {
  "Before 4pm": 15,
  "4–6pm": 17,
  "6–7pm": 18.5,
  "7–8pm": 19.5,
  "After 8pm": 20.5
};

export const MIN_BASELINE_DAYS = 7;
export const MIN_INTERVENTION_DAYS = 10;
export const MIN_ACTIVE_DAYS = 14;
export const MIN_HABIT_OBSERVATIONS = 5;
export const MIN_STACKING_GROUP = 3;
export const ADHERENCE_WARNING_THRESHOLD = 0.7;
export const SIGNIFICANCE_LEVEL = 0.05;
export const MIN_COHORT_SIZE = 10;

export const HUNGER_COLORS = {
  very_hungry: "#E24B4A",
  hungry: "#EF9F27",
  manageable: "#FAC775",
  comfortable: "#5DCAA5"
};

export const HUNGER_LABELS = ["Very hungry", "Hungry", "Manageable", "Comfortable"];

export const PHASE_DISPLAY_NAMES = {
  BASELINE: "Baseline",
  INTERVENTION: "10-hour window",
  OPTIMISE: "8-hour window",
  OUTPUT: "Personalised trial report"
};

export const HEALTH_EXPLORATION_LABEL = "Health exploration";

export const USER_DISCLAIMER = {
  title: "Hold this lightly",
  body:
    "This reflects your experience over six weeks — not a medical diagnosis. Sleep, stress, and everyday life shape energy too. Treat these findings as a personal hint about what may help you, not proof."
};

export const WINDOW_BUCKETS = [
  { key: "gt12", label: "More than 12 hours", match: (h) => h > 12 },
  { key: "11_12", label: "11–12 hours", match: (h) => h > 11 && h <= 12 },
  { key: "10", label: "10 hours", match: (h) => h > 9 && h <= 10 },
  { key: "9", label: "9 hours", match: (h) => h > 8 && h <= 9 },
  { key: "lt9", label: "Less than 9 hours", match: (h) => h <= 8 }
];

export function phaseDisplayName(phaseKey) {
  return PHASE_DISPLAY_NAMES[phaseKey] ?? phaseKey;
}

export function assignPhase(studyDay) {
  if (studyDay >= PHASE_BASELINE.start && studyDay <= PHASE_BASELINE.end) return PHASE_BASELINE.key;
  if (studyDay >= PHASE_TEN_HOUR.start && studyDay <= PHASE_TEN_HOUR.end) return PHASE_TEN_HOUR.key;
  if (studyDay >= PHASE_EIGHT_HOUR.start && studyDay <= PHASE_EIGHT_HOUR.end) return PHASE_EIGHT_HOUR.key;
  if (studyDay >= PHASE_OUTPUT.start && studyDay <= PHASE_OUTPUT.end) return PHASE_OUTPUT.key;
  throw new Error(`study_day out of range 1–42: ${studyDay}`);
}

export function studyWeek(studyDay) {
  return Math.ceil(studyDay / 7);
}

export function hungerBand(value) {
  if (value === null || value === undefined) return null;
  if (value <= 2.5) return "very_hungry";
  if (value <= 4.5) return "hungry";
  if (value <= 7) return "manageable";
  return "comfortable";
}
