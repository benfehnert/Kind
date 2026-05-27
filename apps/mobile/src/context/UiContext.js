import React, { createContext, useContext, useMemo, useState, useCallback } from "react";

const UiContext = createContext(null);

export function UiProvider({ children }) {
  const [searchOpen, setSearchOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [toast, setToast] = useState(null);

  const showToast = useCallback((msg, ms = 2800) => {
    setToast(msg);
    setTimeout(() => setToast(null), ms);
  }, []);

  const value = useMemo(
    () => ({
      searchOpen,
      setSearchOpen,
      notificationsOpen,
      setNotificationsOpen,
      toast,
      showToast
    }),
    [searchOpen, notificationsOpen, toast, showToast]
  );

  return <UiContext.Provider value={value}>{children}</UiContext.Provider>;
}

export function useUiShell() {
  const v = useContext(UiContext);
  if (!v) throw new Error("useUiShell needs UiProvider");
  return v;
}
