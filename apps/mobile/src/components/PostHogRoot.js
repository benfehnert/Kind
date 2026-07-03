import React, { useEffect } from "react";
import { PostHogProvider, PostHogSurveyProvider, usePostHog } from "posthog-react-native";
import { POSTHOG_API_KEY, POSTHOG_HOST, POSTHOG_ENABLED, identifyPostHogUser } from "../lib/posthog";
import { useAuth } from "../context/AuthContext";

function PostHogIdentity() {
  const posthog = usePostHog();
  const { isAuthenticated, email, hydrating } = useAuth();

  useEffect(() => {
    if (!posthog || hydrating) return;

    if (isAuthenticated && email) {
      identifyPostHogUser(posthog, email);
      return;
    }

    if (!isAuthenticated) {
      posthog.reset();
    }
  }, [posthog, isAuthenticated, email, hydrating]);

  return null;
}

export function PostHogRoot({ children }) {
  useEffect(() => {
    if (__DEV__ && !POSTHOG_ENABLED) {
      console.warn(
        "[PostHog] Disabled — set EXPO_PUBLIC_POSTHOG_API_KEY in apps/mobile/.env and restart the dev server."
      );
    }
  }, []);

  if (!POSTHOG_ENABLED) {
    return children;
  }

  return (
    <PostHogProvider
      apiKey={POSTHOG_API_KEY}
      options={{
        host: POSTHOG_HOST,
        debug: __DEV__
      }}
      autocapture
    >
      <PostHogSurveyProvider>
        <PostHogIdentity />
        {children}
      </PostHogSurveyProvider>
    </PostHogProvider>
  );
}
