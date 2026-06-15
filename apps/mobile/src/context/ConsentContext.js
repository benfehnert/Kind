import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useData } from "./DataContext";
import { useOnboarding } from "./OnboardingContext";

const PREFS_STORAGE_KEY = "@kind/profile_privacy_prefs";
const EXPLORATION_CONSENTS_KEY = "@kind/exploration_consents";
const ACTIVE_EXPLORATION_KEY = "@kind/active_exploration";

export const DEFAULT_PRIVACY_PREFS = {
  globalConsent: false,
  science: false,
  visible: false,
  reminders: false
};

function normalizePrefs(raw) {
  const parsed = { ...DEFAULT_PRIVACY_PREFS, ...raw };
  if (raw?.consent !== undefined && raw?.globalConsent === undefined) {
    parsed.globalConsent = Boolean(raw.consent);
  }
  delete parsed.consent;
  return parsed;
}

const ConsentContext = createContext(null);

export function privacyFromAnswers(answers) {
  return {
    globalConsent: Boolean(answers?.consentPrivacy),
    science: Boolean(answers?.consentCitizenScience),
    visible: Boolean(answers?.consentDiscoverable),
    reminders: Boolean(answers?.remindersEnabled)
  };
}

function choicesFromPrefs(prefs) {
  return {
    platform_participation: Boolean(prefs.globalConsent),
    research_contribution: Boolean(prefs.science),
    result_sharing: Boolean(prefs.visible)
  };
}

export function ConsentProvider({ children }) {
  const data = useData();
  const { answers: onboardingAnswers, completed: onboardingCompleted, hydrating } = useOnboarding();
  const [choices, setChoices] = useState({});
  const [completed, setCompleted] = useState(false);
  const [privacyPrefs, setPrivacyPrefs] = useState(DEFAULT_PRIVACY_PREFS);
  const [prefsHydrating, setPrefsHydrating] = useState(true);
  const [explorationConsents, setExplorationConsents] = useState({});
  const [activeExplorationId, setActiveExplorationId] = useState(null);
  const [explorationHydrating, setExplorationHydrating] = useState(true);

  useEffect(() => {
    if (data?.consent?.annaDefaults && !onboardingCompleted) {
      setChoices({ ...data.consent.annaDefaults });
    }
  }, [data, onboardingCompleted]);

  useEffect(() => {
    if (hydrating) return;

    let cancelled = false;
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(PREFS_STORAGE_KEY);
        if (cancelled) return;

        if (raw) {
          const parsed = normalizePrefs(JSON.parse(raw));
          setPrivacyPrefs(parsed);
          setChoices((prev) => ({ ...prev, ...choicesFromPrefs(parsed) }));
        } else if (onboardingCompleted) {
          const fromOnboarding = privacyFromAnswers(onboardingAnswers);
          setPrivacyPrefs(fromOnboarding);
          setChoices((prev) => ({ ...prev, ...choicesFromPrefs(fromOnboarding) }));
          await AsyncStorage.setItem(PREFS_STORAGE_KEY, JSON.stringify(fromOnboarding));
        }
      } catch {
        // ignore corrupt storage
      } finally {
        if (!cancelled) setPrefsHydrating(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [hydrating, onboardingCompleted, onboardingAnswers]);

  useEffect(() => {
    if (hydrating) return;

    let cancelled = false;
    (async () => {
      try {
        const consentsRaw = await AsyncStorage.getItem(EXPLORATION_CONSENTS_KEY);
        const activeRaw = await AsyncStorage.getItem(ACTIVE_EXPLORATION_KEY);
        if (cancelled) return;

        if (consentsRaw) {
          setExplorationConsents(JSON.parse(consentsRaw));
        } else if (
          !onboardingCompleted &&
          data?.consent?.annaDefaults?.exploration_participation
        ) {
          const seeded = {
            "morning-rules": { granted: true, consentedAt: new Date().toISOString() }
          };
          setExplorationConsents(seeded);
          await AsyncStorage.setItem(EXPLORATION_CONSENTS_KEY, JSON.stringify(seeded));
        }

        if (activeRaw) {
          setActiveExplorationId(activeRaw);
        } else if (
          !onboardingCompleted &&
          data?.consent?.annaDefaults?.exploration_participation
        ) {
          setActiveExplorationId("morning-rules");
          await AsyncStorage.setItem(ACTIVE_EXPLORATION_KEY, "morning-rules");
        }
      } catch {
        // ignore corrupt storage
      } finally {
        if (!cancelled) setExplorationHydrating(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [hydrating, onboardingCompleted, data]);

  const persistPrefs = useCallback(async (next) => {
    try {
      await AsyncStorage.setItem(PREFS_STORAGE_KEY, JSON.stringify(next));
    } catch {
      // ignore
    }
  }, []);

  const persistExplorationConsents = useCallback(async (next) => {
    try {
      await AsyncStorage.setItem(EXPLORATION_CONSENTS_KEY, JSON.stringify(next));
    } catch {
      // ignore
    }
  }, []);

  const persistActiveExploration = useCallback(async (id) => {
    try {
      if (id) await AsyncStorage.setItem(ACTIVE_EXPLORATION_KEY, id);
      else await AsyncStorage.removeItem(ACTIVE_EXPLORATION_KEY);
    } catch {
      // ignore
    }
  }, []);

  const saveConsent = useCallback((next) => {
    setChoices((prev) => ({ ...prev, ...next }));
    setCompleted(true);
  }, []);

  const syncFromOnboarding = useCallback(
    (answers) => {
      const prefs = privacyFromAnswers(answers);
      setPrivacyPrefs(prefs);
      setChoices((prev) => ({ ...prev, ...choicesFromPrefs(prefs) }));
      persistPrefs(prefs);
    },
    [persistPrefs]
  );

  const updatePrivacyPref = useCallback(
    (key, value) => {
      setPrivacyPrefs((prev) => {
        const next = { ...prev, [key]: value };
        persistPrefs(next);
        return next;
      });
      setChoices((prev) => {
        if (key === "globalConsent") return { ...prev, platform_participation: value };
        if (key === "science") return { ...prev, research_contribution: value };
        if (key === "visible") return { ...prev, result_sharing: value };
        return prev;
      });
    },
    [persistPrefs]
  );

  const hasExplorationConsent = useCallback(
    (explorationId) => Boolean(explorationConsents[explorationId]?.granted),
    [explorationConsents]
  );

  const grantExplorationConsent = useCallback(
    (explorationId) => {
      const entry = { granted: true, consentedAt: new Date().toISOString() };
      setExplorationConsents((prev) => {
        const next = { ...prev, [explorationId]: entry };
        persistExplorationConsents(next);
        return next;
      });
      setChoices((prev) => ({ ...prev, exploration_participation: true }));
      return entry;
    },
    [persistExplorationConsents]
  );

  const revokeExplorationConsent = useCallback(
    (explorationId) => {
      setExplorationConsents((prev) => {
        const next = { ...prev };
        delete next[explorationId];
        persistExplorationConsents(next);
        return next;
      });
      setActiveExplorationId((current) => {
        if (current === explorationId) {
          persistActiveExploration(null);
          return null;
        }
        return current;
      });
    },
    [persistExplorationConsents, persistActiveExploration]
  );

  const setActiveExploration = useCallback(
    (explorationId) => {
      setActiveExplorationId(explorationId);
      persistActiveExploration(explorationId);
    },
    [persistActiveExploration]
  );

  const value = useMemo(
    () => ({
      choices,
      completed,
      privacyPrefs,
      prefsHydrating,
      explorationConsents,
      activeExplorationId,
      explorationHydrating,
      saveConsent,
      syncFromOnboarding,
      updatePrivacyPref,
      hasExplorationConsent,
      grantExplorationConsent,
      revokeExplorationConsent,
      setActiveExploration,
      isGranted: (key) => Boolean(choices[key])
    }),
    [
      choices,
      completed,
      privacyPrefs,
      prefsHydrating,
      explorationConsents,
      activeExplorationId,
      explorationHydrating,
      saveConsent,
      syncFromOnboarding,
      updatePrivacyPref,
      hasExplorationConsent,
      grantExplorationConsent,
      revokeExplorationConsent,
      setActiveExploration
    ]
  );

  return <ConsentContext.Provider value={value}>{children}</ConsentContext.Provider>;
}

export function useConsent() {
  const v = useContext(ConsentContext);
  if (!v) throw new Error("useConsent needs ConsentProvider");
  return v;
}
