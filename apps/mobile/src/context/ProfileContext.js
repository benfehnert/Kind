import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { patch, uploadProfileAvatar } from "../lib/api";
import { useData } from "./DataContext";
import { useOnboarding } from "./OnboardingContext";
import { useAuth } from "./AuthContext";

const PROFILE_STORAGE_KEY = "@kind/user_profile";

function initialsFromName(name) {
  return (name || "")
    .trim()
    .split(/\s+/)
    .map((w) => w[0] || "")
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

function pravatarNum(key) {
  if (!key || typeof key !== "string") return null;
  const m = key.match(/pravatar-(\d+)/);
  return m ? parseInt(m[1], 10) : null;
}

export function avatarFromProfile(profile) {
  const avatarKey = profile?.hero?.avatarKey ?? profile?.navProfile?.avatarKey ?? null;
  const avatarUrl = profile?.hero?.avatarUrl ?? profile?.navProfile?.avatarUrl ?? null;
  if (!avatarKey) return null;
  if (avatarKey.startsWith("scene-")) {
    return { type: "scene", key: avatarKey.replace(/^scene-/, "") };
  }
  if (avatarKey === "photo" && avatarUrl) {
    return { type: "photo", uri: avatarUrl };
  }
  const id = pravatarNum(avatarKey);
  return id != null ? { type: "pravatar", id } : null;
}

export function avatarToProps(avatar) {
  if (!avatar) return {};
  if (avatar.type === "scene") return { sceneKey: avatar.key };
  if (avatar.type === "photo" && avatar.uri) {
    if (avatar.uri.startsWith("http")) return { photoUrl: avatar.uri };
    return { photoUri: avatar.uri };
  }
  if (avatar.id != null) return { img: avatar.id };
  return {};
}

const ProfileContext = createContext(null);

export function ProfileProvider({ children }) {
  const { profile, refetchProfile } = useData();
  const { answers, completed: onboardingCompleted } = useOnboarding();
  const { isAuthenticated } = useAuth();
  const [displayName, setDisplayName] = useState("");
  const [avatar, setAvatar] = useState(null);
  const [hydrating, setHydrating] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(PROFILE_STORAGE_KEY);
        if (cancelled) return;

        const apiName =
          profile?.hero?.name ||
          (onboardingCompleted && answers.name?.trim()) ||
          "";
        const apiAvatar = avatarFromProfile(profile);
        const parsed = raw ? JSON.parse(raw) : null;

        if (isAuthenticated) {
          setDisplayName(apiName || parsed?.displayName || "");
          setAvatar(apiAvatar ?? null);
        } else if (parsed) {
          setDisplayName(parsed.displayName || apiName);
          setAvatar(parsed.avatar ?? apiAvatar);
        } else {
          setDisplayName(apiName);
          setAvatar(apiAvatar);
        }
      } catch {
        setDisplayName(profile?.hero?.name || "");
        setAvatar(avatarFromProfile(profile));
      } finally {
        if (!cancelled) setHydrating(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [profile, onboardingCompleted, answers.name, isAuthenticated]);

  const persist = useCallback(async (next) => {
    try {
      await AsyncStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(next));
    } catch {
      // ignore
    }
  }, []);

  const updateDisplayName = useCallback(
    async (name) => {
      const trimmed = name.trim();
      if (!trimmed) return;
      setDisplayName(trimmed);
      persist({ displayName: trimmed, avatar });
      if (isAuthenticated) {
        try {
          await patch("/profile", { displayName: trimmed });
          await refetchProfile?.();
        } catch {
          // local state kept
        }
      }
    },
    [avatar, persist, isAuthenticated, refetchProfile]
  );

  const updateAvatar = useCallback(
    async (nextAvatar) => {
      setAvatar(nextAvatar);
      persist({ displayName, avatar: nextAvatar });
      if (!isAuthenticated) return;

      try {
        let updatedProfile = null;

        if (nextAvatar?.type === "photo" && nextAvatar.uri) {
          if (nextAvatar.uri.startsWith("http")) {
            updatedProfile = await patch("/profile", {
              avatarKey: "photo",
              avatarUrl: nextAvatar.uri
            });
          } else {
            updatedProfile = await uploadProfileAvatar(nextAvatar.uri);
          }
        } else if (nextAvatar?.type === "scene" && nextAvatar.key) {
          updatedProfile = await patch("/profile", { avatarKey: `scene-${nextAvatar.key}` });
        } else if (nextAvatar?.type === "pravatar" && nextAvatar.id != null) {
          updatedProfile = await patch("/profile", { avatarKey: `pravatar-${nextAvatar.id}` });
        } else {
          updatedProfile = await patch("/profile", { avatarKey: null });
        }

        await refetchProfile?.();
        const savedAvatar = avatarFromProfile(updatedProfile);
        if (savedAvatar) {
          setAvatar(savedAvatar);
          persist({ displayName, avatar: savedAvatar });
        }
      } catch {
        // local state kept
      }
    },
    [displayName, persist, isAuthenticated, refetchProfile]
  );

  const initials = useMemo(
    () => profile?.navProfile?.initials || initialsFromName(displayName) || "?",
    [profile?.navProfile?.initials, displayName]
  );

  const value = useMemo(
    () => ({
      displayName,
      avatar,
      initials,
      hydrating,
      updateDisplayName,
      updateAvatar,
      avatarProps: avatarToProps(avatar)
    }),
    [displayName, avatar, initials, hydrating, updateDisplayName, updateAvatar]
  );

  return <ProfileContext.Provider value={value}>{children}</ProfileContext.Provider>;
}

export function useProfile() {
  const v = useContext(ProfileContext);
  if (!v) throw new Error("useProfile needs ProfileProvider");
  return v;
}
