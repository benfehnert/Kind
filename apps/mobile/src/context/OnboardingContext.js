import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState
} from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { get, post, put } from "../lib/api";
import { useAuth } from "./AuthContext";

const STORAGE_KEY = "@kind/explorer_onboarding";
const SYNC_DEBOUNCE_MS = 500;

export const defaultAnswers = {
  signupEmail: "",
  signupPassword: "",
  consentPrivacy: null,
  consentCitizenScience: null,
  consentDiscoverable: null,
  name: "",
  birthYear: "",
  sexAssignedAtBirth: null,
  healthGoals: [],
  kindHelp: [],
  healthApproach: null,
  recentHealthActivities: [],
  longevityImportance: null
};

const OnboardingContext = createContext(null);

export function OnboardingProvider({ children }) {
  const { isAuthenticated } = useAuth();
  const [completed, setCompleted] = useState(false);
  const [answers, setAnswers] = useState(defaultAnswers);
  const [hydrating, setHydrating] = useState(true);
  const syncTimerRef = useRef(null);
  const answersRef = useRef(answers);

  useEffect(() => {
    answersRef.current = answers;
  }, [answers]);

  const persistLocal = useCallback(async (nextAnswers, nextCompleted) => {
    try {
      await AsyncStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ answers: nextAnswers, completed: nextCompleted })
      );
    } catch {
      // storage write failed silently
    }
  }, []);

  const syncAnswersToServer = useCallback(async (nextAnswers, { completed: markCompleted = false } = {}) => {
    if (!isAuthenticated) return;
    try {
      await put("/onboarding", { answers: nextAnswers, completed: markCompleted });
    } catch {
      // keep local state when API unavailable
    }
  }, [isAuthenticated]);

  const scheduleSync = useCallback(
    (nextAnswers) => {
      if (!isAuthenticated) return;
      if (syncTimerRef.current) clearTimeout(syncTimerRef.current);
      syncTimerRef.current = setTimeout(() => {
        syncAnswersToServer(nextAnswers);
      }, SYNC_DEBOUNCE_MS);
    },
    [isAuthenticated, syncAnswersToServer]
  );

  useEffect(() => {
    let cancelled = false;
    // Re-enter the loading state whenever auth changes so we can wait for the
    // server's onboarding status before deciding whether to show the wizard.
    // Without this, a returning user signing in on a fresh device would briefly
    // see onboarding before the server confirms they've already completed it.
    setHydrating(true);

    (async () => {
      let localAnswers = defaultAnswers;
      let localCompleted = false;

      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (raw && !cancelled) {
          const parsed = JSON.parse(raw);
          if (parsed.answers) localAnswers = { ...defaultAnswers, ...parsed.answers };
          if (parsed.completed) localCompleted = Boolean(parsed.completed);
        }
      } catch {
        // ignore corrupt storage
      }

      if (isAuthenticated && !cancelled) {
        try {
          const server = await get("/onboarding");
          // The server is the source of truth for authenticated users. This
          // guarantees a freshly created account always sees onboarding and
          // that completion state can't leak between accounts on a shared
          // device (local storage isn't cleared on logout).
          localCompleted = Boolean(server?.completed);
          if (server?.completed) {
            localAnswers = { ...defaultAnswers, ...(server.answers ?? {}) };
          } else if (server?.answers && Object.keys(server.answers).length > 0) {
            localAnswers = { ...defaultAnswers, ...server.answers, ...localAnswers };
          }
        } catch {
          // keep local state when API unavailable
        }
      }

      if (!cancelled) {
        setAnswers(localAnswers);
        setCompleted(localCompleted);
        setHydrating(false);
      }
    })();

    return () => {
      cancelled = true;
      if (syncTimerRef.current) clearTimeout(syncTimerRef.current);
    };
  }, [isAuthenticated]);

  const updateAnswers = useCallback(
    (patch) => {
      setAnswers((prev) => {
        const next = { ...prev, ...patch };
        persistLocal(next, completed);
        scheduleSync(next);
        return next;
      });
    },
    [completed, persistLocal, scheduleSync]
  );

  const completeOnboarding = useCallback(
    async (finalAnswers) => {
      const merged = finalAnswers ? { ...answersRef.current, ...finalAnswers } : answersRef.current;

      if (syncTimerRef.current) {
        clearTimeout(syncTimerRef.current);
        syncTimerRef.current = null;
      }

      if (isAuthenticated) {
        try {
          await post("/onboarding/complete", { answers: merged });
        } catch {
          try {
            await put("/onboarding", { answers: merged, completed: true });
          } catch {
            // local completion still proceeds
          }
        }
      }

      setAnswers(merged);
      setCompleted(true);
      await persistLocal(merged, true);
    },
    [isAuthenticated, persistLocal]
  );

  const resetOnboarding = useCallback(async () => {
    if (syncTimerRef.current) clearTimeout(syncTimerRef.current);
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
