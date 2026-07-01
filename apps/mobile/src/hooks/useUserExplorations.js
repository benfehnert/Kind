import { useMemo } from "react";
import { useData } from "../context/DataContext";
import { useConsent } from "../context/ConsentContext";

function computeProgress(weekCurrent, weeksTotal) {
  if (!weeksTotal) return 0;
  return Math.round((weekCurrent / weeksTotal) * 100);
}

/** Merge API exploration data with per-user consent and active state. */
export function useUserExplorations() {
  const { explorations } = useData();
  const { activeExplorationId, explorationConsents, explorationRuns } = useConsent();

  return useMemo(() => {
    const merged = {};
    for (const [id, ex] of Object.entries(explorations || {})) {
      const consent = explorationConsents[id];
      const run = explorationRuns[id];
      const userConsented = Boolean(consent?.granted);
      const weekCurrent = run?.weekCurrent ?? (userConsented ? 1 : null);
      const weeksTotal =
        run?.weeksTotal ??
        Number(ex.duration?.match(/\d+/)?.[0]) ??
        null;
      const streakDays = run?.streakDays ?? (userConsented ? 0 : ex.streak);
      const progress = userConsented
        ? computeProgress(weekCurrent, weeksTotal)
        : ex.progress;

      merged[id] = {
        ...ex,
        id,
        active: activeExplorationId === id,
        userConsented,
        consentedAt: consent?.consentedAt ?? null,
        weekCurrent,
        weeksTotal,
        streakDays,
        streak: streakDays,
        progress,
        statusBadge: userConsented && weekCurrent && weeksTotal
          ? `Week ${weekCurrent} of ${weeksTotal}`
          : ex.statusBadge
      };
    }
    return merged;
  }, [explorations, activeExplorationId, explorationConsents, explorationRuns]);
}

export function useExplorationStart() {
  const { privacyPrefs, hasExplorationConsent, activateExploration } = useConsent();

  return async function startExploration(navigation, explorationId, { showToast } = {}) {
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
    await activateExploration(explorationId);
    showToast?.("You're now active in this exploration.");
    return true;
  };
}

export function listConsentedExplorations(explorations, explorationConsents, activeExplorationId, explorationRuns = {}) {
  return Object.entries(explorationConsents || {})
    .filter(([, v]) => v?.granted)
    .map(([id, v]) => {
      const ex = explorations?.[id];
      const run = explorationRuns[id];
      const weeksTotal = run?.weeksTotal ?? Number(ex?.duration?.match(/\d+/)?.[0]) ?? null;
      const weekCurrent = run?.weekCurrent ?? 1;
      return {
        id,
        title: ex?.feedLabel || ex?.title || id,
        category: ex?.category,
        duration: ex?.duration,
        icon: ex?.icon,
        bg: ex?.bg,
        text: ex?.text,
        granted: true,
        consentedAt: v.consentedAt,
        active: activeExplorationId === id,
        weekCurrent,
        weeksTotal,
        streakDays: run?.streakDays ?? 0,
        progress: computeProgress(weekCurrent, weeksTotal)
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
