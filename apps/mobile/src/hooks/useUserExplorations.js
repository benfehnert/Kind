import { useMemo } from "react";
import { useData } from "../context/DataContext";
import { useConsent } from "../context/ConsentContext";

/** Merge API exploration data with per-user consent and active state. */
export function useUserExplorations() {
  const { explorations } = useData();
  const { activeExplorationId, explorationConsents } = useConsent();

  return useMemo(() => {
    const merged = {};
    for (const [id, ex] of Object.entries(explorations || {})) {
      const consent = explorationConsents[id];
      merged[id] = {
        ...ex,
        active: activeExplorationId === id,
        userConsented: Boolean(consent?.granted),
        consentedAt: consent?.consentedAt ?? null
      };
    }
    return merged;
  }, [explorations, activeExplorationId, explorationConsents]);
}

export function useExplorationStart() {
  const { privacyPrefs, hasExplorationConsent, setActiveExploration } = useConsent();

  return function startExploration(navigation, explorationId, { showToast } = {}) {
    if (!privacyPrefs.globalConsent) {
      showToast?.(
        "Please enable Global consent in your profile before joining a health exploration."
      );
      return false;
    }
    if (!hasExplorationConsent(explorationId)) {
      navigation.navigate("ExplorationConsent", { id: explorationId });
      return false;
    }
    setActiveExploration(explorationId);
    showToast?.("You're now active in this exploration.");
    return true;
  };
}

export function listConsentedExplorations(explorations, explorationConsents, activeExplorationId) {
  return Object.entries(explorationConsents || {})
    .filter(([, v]) => v?.granted)
    .map(([id, v]) => {
      const ex = explorations?.[id];
      return {
        id,
        title: ex?.feedLabel || ex?.title || id,
        category: ex?.category,
        duration: ex?.duration,
        granted: true,
        consentedAt: v.consentedAt,
        active: activeExplorationId === id
      };
    });
}

export function formatConsentDate(iso) {
  if (!iso) return null;
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      month: "long",
      year: "numeric"
    });
  } catch {
    return null;
  }
}
