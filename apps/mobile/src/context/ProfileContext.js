import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useData } from "./DataContext";
import { useOnboarding } from "./OnboardingContext";

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
  if (!key || typeof key !== "string") return 28;
  const m = key.match(/pravatar-(\d+)/);
  return m ? parseInt(m[1], 10) : 28;
}

export function avatarToProps(avatar) {
  if (!avatar) return { img: 28 };
  if (avatar.type === "scene") return { sceneKey: avatar.key };
  return { img: avatar.id ?? 28 };
}

const ProfileContext = createContext(null);

export function ProfileProvider({ children }) {
  const { profile } = useData();
  const { answers, completed: onboardingCompleted } = useOnboarding();
  const [displayName, setDisplayName] = useState("");
  const [avatar, setAvatar] = useState({ type: "pravatar", id: 28 });
  const [hydrating, setHydrating] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(PROFILE_STORAGE_KEY);
        if (cancelled) return;

        if (raw) {
          const parsed = JSON.parse(raw);
          if (parsed.displayName) setDisplayName(parsed.displayName);
          if (parsed.avatar) setAvatar(parsed.avatar);
        } else {
          const fallbackName =
            (onboardingCompleted && answers.name?.trim()) || profile?.hero?.name || "Anna Ross";
          const fallbackAvatar = {
            type: "pravatar",
            id: pravatarNum(profile?.hero?.avatarKey ?? profile?.navProfile?.avatarKey)
          };
          setDisplayName(fallbackName);
          setAvatar(fallbackAvatar);
        }
      } catch {
        setDisplayName(profile?.hero?.name || "Anna Ross");
        setAvatar({ type: "pravatar", id: 28 });
      } finally {
        if (!cancelled) setHydrating(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [profile, onboardingCompleted, answers.name]);

  const persist = useCallback(async (next) => {
    try {
      await AsyncStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(next));
    } catch {
      // ignore
    }
  }, []);

  const updateDisplayName = useCallback(
    (name) => {
      const trimmed = name.trim();
      if (!trimmed) return;
      setDisplayName(trimmed);
      persist({ displayName: trimmed, avatar });
    },
    [avatar, persist]
  );

  const updateAvatar = useCallback(
    (nextAvatar) => {
      setAvatar(nextAvatar);
      persist({ displayName, avatar: nextAvatar });
    },
    [displayName, persist]
  );

  const initials = useMemo(() => initialsFromName(displayName), [displayName]);

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
