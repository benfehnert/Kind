import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useData } from "./DataContext";

const ConsentContext = createContext(null);

export function ConsentProvider({ children }) {
  const data = useData();
  const [choices, setChoices] = useState({});
  const [completed, setCompleted] = useState(false);

  useEffect(() => {
    if (data?.consent?.annaDefaults) {
      setChoices({ ...data.consent.annaDefaults });
    }
  }, [data]);

  const saveConsent = useCallback((next) => {
    setChoices((prev) => ({ ...prev, ...next }));
    setCompleted(true);
  }, []);

  const value = useMemo(
    () => ({
      choices,
      completed,
      saveConsent,
      isGranted: (key) => Boolean(choices[key]),
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
