export const PHASE_BASELINE = { start: 1, end: 14, key: "BASELINE" };
export const PHASE_INTERVENTION = { start: 15, end: 35, key: "INTERVENTION" };
export const PHASE_OPTIMISE = { start: 36, end: 49, key: "OPTIMISE" };
export const PHASE_OUTPUT = { start: 50, end: 56, key: "OUTPUT" };

export const PHASES = [PHASE_BASELINE, PHASE_INTERVENTION, PHASE_OPTIMISE, PHASE_OUTPUT];

export const PRIMARY_OUTCOME = "afternoon_crash_severity";
export const SECONDARY_OUTCOMES = ["afternoon_energy", "afternoon_focus", "morning_energy"];

export const RULES = ["sunlight", "stretching", "caffeine_offset", "meditation"];

export const RULE_LABELS = {
  sunlight: "Morning sunlight",
  stretching: "Morning movement",
  caffeine_offset: "Caffeine offsetting",
  meditation: "Morning meditation"
};

export const RULE_ICONS = {
  sunlight: "☀️",
  stretching: "🤸",
  caffeine_offset: "☕",
  meditation: "🧘"
};

export const MIN_BASELINE_DAYS = 7;
export const MIN_INTERVENTION_DAYS = 10;
export const MIN_ENDOFSTUDY_ACTIVE_DAYS = 14;
export const MIN_RULE_OBSERVATIONS = 5;
export const MIN_STACKING_GROUP = 3;
export const ADHERENCE_WARNING_THRESHOLD = 0.7;
export const SIGNIFICANCE_LEVEL = 0.05;
export const ADVERSE_MORNING_DROP = 2.0;
export const MIN_COHORT_SIZE = 10;

export const CRASH_COLORS = {
  none: "#5DCAA5",
  mild_dip: "#FAC775",
  noticeable: "#EF9F27",
  severe: "#E24B4A"
};

export const CRASH_LABELS = ["None", "Mild dip", "Noticeable crash", "Severe crash"];

/** User-facing phase names (not Phase A / B / B+ / C). */
export const PHASE_DISPLAY_NAMES = {
  BASELINE: "Baseline",
  INTERVENTION: "Morning rules",
  OPTIMISE: "Optimise",
  OUTPUT: "Personalised trial report"
};

export const HEALTH_EXPLORATION_LABEL = "Health exploration";

export const USER_DISCLAIMER = {
  title: "Hold this lightly",
  body:
    "This reflects your experience over eight weeks — not a medical diagnosis. Sleep, stress, and everyday life shape afternoons too. Treat these findings as a personal hint about what may help you, not proof."
};

export function phaseDisplayName(phaseKey) {
  return PHASE_DISPLAY_NAMES[phaseKey] ?? phaseKey;
}

export function assignPhase(studyDay) {
  if (studyDay >= PHASE_BASELINE.start && studyDay <= PHASE_BASELINE.end) return PHASE_BASELINE.key;
  if (studyDay >= PHASE_INTERVENTION.start && studyDay <= PHASE_INTERVENTION.end) return PHASE_INTERVENTION.key;
  if (studyDay >= PHASE_OPTIMISE.start && studyDay <= PHASE_OPTIMISE.end) return PHASE_OPTIMISE.key;
  if (studyDay >= PHASE_OUTPUT.start && studyDay <= PHASE_OUTPUT.end) return PHASE_OUTPUT.key;
  throw new Error(`study_day out of range 1–56: ${studyDay}`);
}

export function studyWeek(studyDay) {
  return Math.ceil(studyDay / 7);
}
