import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, View } from "react-native";
import { get } from "../lib/api";

const DataContext = createContext(null);

export function DataProvider({ children }) {
  const [data, setData] = useState(null);

  const loadAll = useCallback(async () => {
    const [
      home,
      feed,
      explorationsRes,
      explorationEvidence,
      communityIndividuals,
      communityResearchers,
      insight,
      profile,
      consent,
      socialFollows,
      explorePage,
      notificationsRes,
      search
    ] = await Promise.all([
      get("/home"),
      get("/feed"),
      get("/explorations"),
      get("/explorations/evidence"),
      get("/community/individuals"),
      get("/community/researchers"),
      get("/insights"),
      get("/profile"),
      get("/consent"),
      get("/social/follows"),
      get("/explore"),
      get("/notifications"),
      get("/search")
    ]);

    const explorations = {};
    for (const e of explorationsRes.items || []) {
      const { id, ...rest } = e;
      explorations[id] = rest;
    }

    const commUsers = {};
    const basicUsers = [];
    const followerOnly = [];
    for (const u of communityIndividuals.items || []) {
      const { tier, id, ...rest } = u;
      if (tier === "comm") commUsers[id] = { ...rest };
      else if (tier === "basic") basicUsers.push({ id, ...rest });
      else followerOnly.push({ id, ...rest });
    }
    const community = {
      commUsers,
      basicUsers,
      followerOnly,
      researchers: communityResearchers.items || [],
      socialMeta: socialFollows,
      explorationFollowers: communityIndividuals.explorationFollowers || {}
    };

    return {
      home,
      feed,
      explorations,
      explorationEvidence,
      community,
      insight,
      profile,
      consent,
      exploreCopy: explorePage.copy,
      explorePage,
      notifications: notificationsRes.items || notificationsRes,
      search
    };
  }, []);

  useEffect(() => {
    loadAll()
      .then(setData)
      .catch((err) => console.error("[DataContext] failed to load:", err));
  }, [loadAll]);

  const refetchHome = useCallback(async () => {
    const home = await get("/home");
    setData((prev) => (prev ? { ...prev, home } : prev));
    return home;
  }, []);

  const refetchExplore = useCallback(async () => {
    const explorePage = await get("/explore");
    setData((prev) =>
      prev
        ? { ...prev, explorePage, exploreCopy: explorePage.copy }
        : prev
    );
    return explorePage;
  }, []);

  const refetchInsight = useCallback(async (explorationId) => {
    const query = explorationId ? `?explorationId=${encodeURIComponent(explorationId)}` : "";
    const insight = await get(`/insights${query}`);
    setData((prev) => (prev ? { ...prev, insight } : prev));
    return insight;
  }, []);

  const refetchProfile = useCallback(async () => {
    const profile = await get("/profile");
    setData((prev) => (prev ? { ...prev, profile } : prev));
    return profile;
  }, []);

  const applySocialFollows = useCallback((socialFollows) => {
    setData((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        community: {
          ...prev.community,
          socialMeta: socialFollows
        }
      };
    });
  }, []);

  const refetchSocialFollows = useCallback(async () => {
    const socialFollows = await get("/social/follows");
    applySocialFollows(socialFollows);
    return socialFollows;
  }, [applySocialFollows]);

  const updateSocialFollows = useCallback(
    ({ followSlug, unfollowSlug, followResearcherId, unfollowResearcherId } = {}) => {
      setData((prev) => {
        if (!prev) return prev;

        const meta = prev.community?.socialMeta || {};
        let followingExplorerIds = [...(meta.followingExplorerIds || [])];
        let followingResearcherIds = [...(meta.followingResearcherIds || [])];

        if (followSlug && !followingExplorerIds.includes(followSlug)) {
          followingExplorerIds.push(followSlug);
        }
        if (unfollowSlug) {
          followingExplorerIds = followingExplorerIds.filter((id) => id !== unfollowSlug);
        }
        if (followResearcherId && !followingResearcherIds.includes(followResearcherId)) {
          followingResearcherIds.push(followResearcherId);
        }
        if (unfollowResearcherId) {
          followingResearcherIds = followingResearcherIds.filter((id) => id !== unfollowResearcherId);
        }

        const next = {
          ...prev,
          community: {
            ...prev.community,
            socialMeta: {
              ...meta,
              followingExplorerIds,
              followingResearcherIds
            }
          }
        };

        if (prev.profile?.followStats && (followSlug || unfollowSlug)) {
          next.profile = {
            ...prev.profile,
            followStats: {
              ...prev.profile.followStats,
              following: followingExplorerIds.length
            }
          };
        }

        return next;
      });
    },
    []
  );

  const value = useMemo(
    () =>
      data
        ? {
            ...data,
            refetchHome,
            refetchExplore,
            refetchInsight,
            refetchProfile,
            refetchSocialFollows,
            updateSocialFollows,
            applySocialFollows
          }
        : null,
    [
      data,
      refetchHome,
      refetchExplore,
      refetchInsight,
      refetchProfile,
      refetchSocialFollows,
      updateSocialFollows,
      applySocialFollows
    ]
  );

  if (!value) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#F7F8F2" }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

export function useData() {
  return useContext(DataContext);
}
