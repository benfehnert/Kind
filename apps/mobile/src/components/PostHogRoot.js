import React, { useEffect } from "react";
import { PostHogProvider, PostHogSurveyProvider, usePostHog } from "posthog-react-native";
import { POSTHOG_API_KEY, POSTHOG_HOST, POSTHOG_ENABLED } from "../lib/posthog";
import { useAuth } from "../context/AuthContext";

function PostHogIdentity() {
  const posthog = usePostHog();
  const { isAuthenticated, individualId, email, hydrating } = useAuth();

  useEffect(() => {
    if (!posthog || hydrating) return;

    if (isAuthenticated && individualId) {
      posthog.identify(String(individualId), email ? { email } : undefined);
      return;
    }

    if (!isAuthenticated) {
      posthog.reset();
    }
  }, [posthog, isAuthenticated, individualId, email, hydrating]);

  return null;
}

export function PostHogRoot({ children }) {
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
