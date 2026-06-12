export const PRIVACY_POLICY_URL = "https://kind-health.app";

export const ONBOARDING_STEPS = [
  {
    id: "welcome",
    type: "welcome",
    showProgress: false,
    continueLabel: "Continue"
  },
  {
    id: "value-trials",
    type: "message",
    showProgress: true,
    icon: "trials",
    title: "Access science-backed personalised trials",
    body: "I'll match you with structured explorations designed by researchers — so you can test what might work for you, backed by real science.",
    continueLabel: "Continue"
  },
  {
    id: "value-explore",
    type: "message",
    showProgress: true,
    icon: "explore",
    title: "Explore your health and find out what works for you",
    body: "You're your own comparison. I'll help you run small, structured experiments and see what actually moves the needle for your body.",
    continueLabel: "Continue"
  },
  {
    id: "value-community",
    type: "message",
    showProgress: true,
    icon: "community",
    title: "Have the support of a community of Individuals and Researchers",
    body: "You're not doing this alone. Connect with others on similar journeys and researchers who designed the explorations you're trying.",
    continueLabel: "Continue"
  },
  {
    id: "value-insight",
    type: "message",
    showProgress: true,
    icon: "insight",
    title: "Build insight and understanding together",
    body: "Your anonymised data can contribute to citizen science — helping everyone learn what works and for whom.",
    continueLabel: "Continue"
  },
  {
    id: "alpha",
    type: "message",
    showProgress: true,
    icon: "alpha",
    title: "You're joining our Alpha",
    body: "Kind is currently in Alpha. As an Individual Health Explorer, you'll be helping us shape the product while taking part in early explorations.",
    note: "This is research and self-experimentation, not medical care. Your feedback helps us improve Kind for everyone.",
    continueLabel: "Continue"
  },
  {
    id: "intro",
    type: "message",
    showProgress: true,
    icon: "intro",
    bubble: "Let's get to know each other! I'll ask a few questions to personalise Kind for you.",
    continueLabel: "I'm ready!"
  },
  {
    id: "consent-privacy",
    type: "yesNo",
    showProgress: true,
    answerKey: "consentPrivacy",
    title: "Your body, your data",
    body: "To provide the Kind experience and help you on your health journey, I need your consent to use information about your health and diet.",
    bullets: [
      "You can withdraw consent at any time",
      "Learn more in our Privacy Policy"
    ],
    privacyLink: true,
    requireYes: true,
    denyMessage: "Kind needs your consent to use your health data. Please select Yes to continue, or close the app if you'd prefer not to proceed.",
    continueLabel: "Continue"
  },
  {
    id: "consent-science",
    type: "yesNo",
    showProgress: true,
    answerKey: "consentCitizenScience",
    title: "Support citizen science",
    body: "With your permission, I'll use your anonymised data to support ethics-backed research — helping researchers learn what works across many people.",
    continueLabel: "Continue"
  },
  {
    id: "consent-discoverable",
    type: "yesNo",
    showProgress: true,
    answerKey: "consentDiscoverable",
    title: "Connect with others",
    body: "Would you like other people to be able to find and follow you within the Kind app?",
    continueLabel: "Continue"
  },
  {
    id: "name",
    type: "text",
    showProgress: true,
    answerKey: "name",
    title: "What's your name?",
    label: "Your name",
    placeholder: "Enter your name",
    continueLabel: "Continue"
  },
  {
    id: "birth-year",
    type: "year",
    showProgress: true,
    answerKey: "birthYear",
    title: "What year were you born?",
    label: "Birth year",
    placeholder: "e.g. 1990",
    continueLabel: "Continue"
  },
  {
    id: "sex",
    type: "singleSelect",
    showProgress: true,
    answerKey: "sexAssignedAtBirth",
    title: "What sex were you assigned at birth?",
    options: [
      { value: "female", label: "Female" },
      { value: "male", label: "Male" },
      { value: "intersex", label: "Intersex" },
      { value: "prefer_not_to_say", label: "Prefer not to say" }
    ],
    continueLabel: "Continue"
  },
  {
    id: "health-goals",
    type: "multiSelect",
    showProgress: true,
    answerKey: "healthGoals",
    title: "What short-term health goals matter to you right now?",
    options: [
      { value: "energy_focus", label: "Energy & Focus" },
      { value: "metabolic", label: "Metabolic Health" },
      { value: "sleep", label: "Rest & Sleep" },
      { value: "nutrition", label: "Diet & Nutrition" },
      { value: "mental", label: "Mental Health" },
      { value: "other", label: "Something else" }
    ],
    continueLabel: "Continue"
  },
  {
    id: "kind-help",
    type: "multiSelect",
    showProgress: true,
    answerKey: "kindHelp",
    title: "How can Kind help you succeed?",
    options: [
      { value: "trials", label: "Access science-backed personalised trials" },
      { value: "explore", label: "Explore your health and find out what works for you" },
      { value: "community", label: "Have the support of a community of Individuals and Researchers" },
      { value: "insight", label: "Build insight and understanding together" }
    ],
    continueLabel: "Continue"
  },
  {
    id: "longevity",
    type: "singleSelect",
    showProgress: true,
    answerKey: "longevityImportance",
    title: "How important is long-term health and longevity to you?",
    options: [
      { value: "not_important", label: "It's not very important to me" },
      { value: "matters", label: "It matters, but it's not a top priority" },
      { value: "top_priority", label: "It's my top priority" }
    ],
    continueLabel: "Continue"
  },
  {
    id: "reminders",
    type: "reminders",
    showProgress: true,
    answerKey: "remindersEnabled",
    title: "Set reminders",
    body: "Would you like daily reminders to help you stay on track with your explorations?",
    continueLabel: "Continue"
  },
  {
    id: "create-account",
    type: "createAccount",
    showProgress: false,
    continueLabel: "Continue with Google"
  }
];

export const PROGRESS_STEP_COUNT = ONBOARDING_STEPS.filter((s) => s.showProgress).length;

export function getProgressIndex(stepIndex) {
  let count = 0;
  for (let i = 0; i <= stepIndex; i++) {
    if (ONBOARDING_STEPS[i]?.showProgress) count++;
  }
  return count;
}

export function validateStep(step, answers) {
  if (!step) return false;

  switch (step.type) {
    case "welcome":
    case "message":
    case "createAccount":
      return true;

    case "yesNo": {
      const val = answers[step.answerKey];
      if (val === null || val === undefined) return false;
      if (step.requireYes && val !== true) return false;
      return true;
    }

    case "text": {
      const text = (answers[step.answerKey] || "").trim();
      return text.length > 0;
    }

    case "year": {
      const year = parseInt(answers[step.answerKey], 10);
      const maxYear = new Date().getFullYear() - 13;
      return !Number.isNaN(year) && year >= 1920 && year <= maxYear;
    }

    case "singleSelect":
      return answers[step.answerKey] != null;

    case "multiSelect": {
      const arr = answers[step.answerKey];
      return Array.isArray(arr) && arr.length > 0;
    }

    case "reminders":
      return answers[step.answerKey] !== null && answers[step.answerKey] !== undefined;

    default:
      return true;
  }
}
