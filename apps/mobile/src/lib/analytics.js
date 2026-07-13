import { useCallback, useRef } from "react";
import { useFocusEffect } from "@react-navigation/native";

/** Fire a PostHog event once each time the screen gains focus. */
export function useCaptureOnFocus(posthog, eventName, properties = {}) {
  const propsRef = useRef(properties);
  propsRef.current = properties;

  useFocusEffect(
    useCallback(() => {
      if (!posthog || !eventName) return;
      posthog.capture(eventName, propsRef.current);
    }, [posthog, eventName])
  );
}

/** Returns true when the user is engaged on this exploration (consented or active). */
export function isExplorationEngaged(exploration, { activeExplorationId, explorePage } = {}) {
  if (!exploration) return false;
  if (exploration.userConsented) return true;
  if (exploration.active) return true;
  if (activeExplorationId === exploration.id) return true;
  if (explorePage?.activeExplorations?.some((entry) => entry.id === exploration.id)) return true;
  return false;
}
