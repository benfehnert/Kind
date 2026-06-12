import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

const STORAGE_KEY = "@kind/explorer_onboarding";

export const defaultAnswers = {
  consentPrivacy: null,
  consentCitizenScience: null,
  consentDiscoverable: null,
  name: "",
  birthYear: "",
  sexAssignedAtBirth: null,
  healthGoals: [],
  kindHelp: [],
  longevityImportance: null,
  remindersEnabled: null
};

const OnboardingContext = createContext(null);

export function OnboardingProvider({ children }) {
  const [completed, setCompleted] = useState(false);
  const [answers, setAnswers] = useState(defaultAnswers);
  const [hydrating, setHydrating] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (raw && !cancelled) {
          const parsed = JSON.parse(raw);
          if (parsed.answers) setAnswers({ ...defaultAnswers, ...parsed.answers });
          if (parsed.completed) setCompleted(Boolean(parsed.completed));
        }
      } catch {
        // ignore corrupt storage
      } finally {
        if (!cancelled) setHydrating(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const persist = useCallback(async (nextAnswers, nextCompleted) => {
    try {
      await AsyncStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ answers: nextAnswers, completed: nextCompleted })
      );
    } catch {
      // storage write failed silently in prototype
    }
  }, []);

  const updateAnswers = useCallback(
    (patch) => {
      setAnswers((prev) => {
        const next = { ...prev, ...patch };
        persist(next, completed);
        return next;
      });
    },
    [completed, persist]
  );

  const completeOnboarding = useCallback(
    (finalAnswers) => {
      const merged = finalAnswers ? { ...answers, ...finalAnswers } : answers;
      setAnswers(merged);
      setCompleted(true);
      persist(merged, true);
    },
    [answers, persist]
  );

  const resetOnboarding = useCallback(async () => {
    setAnswers(defaultAnswers);
    setCompleted(false);
    try {
      await AsyncStorage.removeItem(STORAGE_KEY);
    } catch {
      // ignore
    }
  }, []);

  const value = useMemo(
    () => ({
      completed,
      answers,
      hydrating,
      updateAnswers,
      completeOnboarding,
      resetOnboarding
    }),
    [completed, answers, hydrating, updateAnswers, completeOnboarding, resetOnboarding]
  );

  return <OnboardingContext.Provider value={value}>{children}</OnboardingContext.Provider>;
}

export function useOnboarding() {
  const v = useContext(OnboardingContext);
  if (!v) throw new Error("useOnboarding needs OnboardingProvider");
  return v;
}
