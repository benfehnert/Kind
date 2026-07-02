import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { configureApiAuth, publicPost } from "../lib/api";

const STORAGE_KEY = "@kind/auth";
const EXPLORATION_CONSENTS_KEY = "@kind/exploration_consents";
const ACTIVE_EXPLORATION_KEY = "@kind/active_exploration";
const FEED_EXPANSION_KEY = "@kind/home_feed_expansion";

async function clearExplorationStorage() {
  await AsyncStorage.multiRemove([
    EXPLORATION_CONSENTS_KEY,
    ACTIVE_EXPLORATION_KEY,
    FEED_EXPANSION_KEY
  ]);
}

const AuthContext = createContext(null);

async function persistSession(session) {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(session));
}

async function clearStoredSession() {
  await AsyncStorage.removeItem(STORAGE_KEY);
}

export function AuthProvider({ children }) {
  const [token, setToken] = useState(null);
  const [refreshToken, setRefreshToken] = useState(null);
  const [individualId, setIndividualId] = useState(null);
  const [email, setEmail] = useState("");
  const [hydrating, setHydrating] = useState(true);

  const saveSession = useCallback(async ({ token: nextToken, refreshToken: nextRefresh, individualId: nextId, email: nextEmail }) => {
    setToken(nextToken);
    setRefreshToken(nextRefresh);
    setIndividualId(nextId ?? null);
    if (nextEmail) setEmail(nextEmail);
    await persistSession({
      token: nextToken,
      refreshToken: nextRefresh,
      individualId: nextId ?? null,
      email: nextEmail || email
    });
  }, [email]);

  const clearSession = useCallback(async () => {
    setToken(null);
    setRefreshToken(null);
    setIndividualId(null);
    setEmail("");
    await clearStoredSession();
  }, []);

  const refreshSession = useCallback(async () => {
    if (!refreshToken) return false;
    try {
      const data = await publicPost("/auth/refresh", { refreshToken });
      await saveSession({
        token: data.token,
        refreshToken: data.refreshToken,
        individualId,
        email
      });
      return true;
    } catch {
      await clearSession();
      return false;
    }
  }, [refreshToken, saveSession, individualId, email, clearSession]);

  useEffect(() => {
    configureApiAuth({
      getToken: () => token,
      onRefresh: refreshSession,
      onUnauthorized: clearSession
    });
  }, [token, refreshSession, clearSession]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (!raw || cancelled) return;

        const parsed = JSON.parse(raw);
        if (parsed.refreshToken) {
          try {
            const data = await publicPost("/auth/refresh", { refreshToken: parsed.refreshToken });
            if (cancelled) return;
            await saveSession({
              token: data.token,
              refreshToken: data.refreshToken,
              individualId: parsed.individualId ?? null,
              email: parsed.email || ""
            });
            return;
          } catch {
            if (!cancelled) await clearSession();
            return;
          }
        }

        if (parsed.token) {
          setToken(parsed.token);
          setRefreshToken(parsed.refreshToken ?? null);
          setIndividualId(parsed.individualId ?? null);
          setEmail(parsed.email || "");
        }
      } catch {
        if (!cancelled) await clearSession();
      } finally {
        if (!cancelled) setHydrating(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [saveSession, clearSession]);

  const login = useCallback(
    async (loginEmail, password) => {
      const data = await publicPost("/auth/login", { email: loginEmail.trim(), password });
      await clearExplorationStorage();
      await saveSession({
        token: data.token,
        refreshToken: data.refreshToken,
        individualId: data.individualId,
        email: loginEmail.trim()
      });
    },
    [saveSession]
  );

  const signup = useCallback(
    async (signupEmail, name, password) => {
      const data = await publicPost("/auth/signup", {
        email: signupEmail.trim(),
        name: name.trim(),
        password
      });
      await clearExplorationStorage();
      await saveSession({
        token: data.token,
        refreshToken: data.refreshToken,
        individualId: data.individualId ?? null,
        email: signupEmail.trim()
      });
    },
    [saveSession]
  );

  const logout = useCallback(async () => {
    if (token) {
      try {
        await fetch(`${process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:4000"}/auth/logout`, {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` }
        });
      } catch {
        // ignore network errors on logout
      }
    }
    await clearSession();
    await clearExplorationStorage();
    await AsyncStorage.removeItem("@kind/user_profile");
  }, [token, clearSession]);

  const value = useMemo(
    () => ({
      token,
      refreshToken,
      individualId,
      email,
      hydrating,
      isAuthenticated: Boolean(token),
      login,
      signup,
      logout
    }),
    [token, refreshToken, individualId, email, hydrating, login, signup, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const v = useContext(AuthContext);
  if (!v) throw new Error("useAuth needs AuthProvider");
  return v;
}
