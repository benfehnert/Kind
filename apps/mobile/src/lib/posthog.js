export const POSTHOG_API_KEY = process.env.EXPO_PUBLIC_POSTHOG_API_KEY ?? "";
export const POSTHOG_HOST = process.env.EXPO_PUBLIC_POSTHOG_HOST ?? "https://eu.i.posthog.com";
export const POSTHOG_ENABLED = Boolean(POSTHOG_API_KEY);

export const POSTHOG_FEEDBACK_EVENTS = {
  dailyFeedbackOpened: "daily feedback opened",
  reportIssueOpened: "report issue opened"
};

export function identifyPostHogUser(posthog, email) {
  const normalized = email?.trim().toLowerCase();
  if (!posthog || !normalized) return;
  posthog.identify(normalized, { email: normalized });
}
