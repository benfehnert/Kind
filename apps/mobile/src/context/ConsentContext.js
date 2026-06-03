import React, { createContext, useCallback, useContext, useMemo, useState } from "react";
import { consent } from "../data/mock";

const ConsentContext = createContext(null);

/**
 * Stores the consent choices the explorer (Anna) has agreed to.
 * `completed` is false until the onboarding & consent flow is finished at least once;
 * before then the summary screen shows the demo profile defaults.
 */
export function ConsentProvider({ children }) {
  const [choices, setChoices] = useState(() => ({ ...(consent.annaDefaults || {}) }));
  const [completed, setCompleted] = useState(false);

  const saveConsent = useCallback((next) => {
    setChoices((prev) => ({ ...prev, ...next }));
    setCompleted(true);
  }, []);

  const value = useMemo(
    () => ({
      choices,
      completed,
      saveConsent,
      isGranted: (key) => Boolean(choices[key])
    }),
    [choices, completed, saveConsent]
  );

  return <ConsentContext.Provider value={value}>{children}</ConsentContext.Provider>;
}

export function useConsent() {
  const v = useContext(ConsentContext);
  if (!v) throw new Error("useConsent needs ConsentProvider");
  return v;
}
