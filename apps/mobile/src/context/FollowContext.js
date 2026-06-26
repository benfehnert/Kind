import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { patch } from "../lib/api";
import { useData } from "./DataContext";

const FollowContext = createContext(null);

export function FollowProvider({ children }) {
  const data = useData();
  const selfSlug = data?.profile?.viewerSlug ?? null;
  const [following, setFollowing] = useState(() => new Set());
  const [followingResearchers, setFollowingResearchers] = useState(() => new Set());
  const [followerIdSet, setFollowerIdSet] = useState(() => new Set());

  useEffect(() => {
    if (!data?.community?.socialMeta) return;
    const { socialMeta } = data.community;
    const explorerIds = (socialMeta.followingExplorerIds || []).filter((id) => id !== selfSlug);
    setFollowing(new Set(explorerIds));
    setFollowingResearchers(new Set(socialMeta.followingResearcherIds || []));
    setFollowerIdSet(new Set(socialMeta.followerIdsExpanded || []));
  }, [data, selfSlug]);

  const isSelf = useCallback((userId) => Boolean(selfSlug && userId === selfSlug), [selfSlug]);

  const toggleFollow = useCallback(
    async (userId) => {
      if (!userId || isSelf(userId)) return;

      let wasFollowing = false;
      setFollowing((prev) => {
        wasFollowing = prev.has(userId);
        const n = new Set(prev);
        if (wasFollowing) n.delete(userId);
        else n.add(userId);
        return n;
      });

      try {
        await patch(
          "/social/follows",
          wasFollowing ? { unfollowSlug: userId } : { followSlug: userId }
        );
      } catch {
        setFollowing((prev) => {
          const n = new Set(prev);
          if (wasFollowing) n.add(userId);
          else n.delete(userId);
          return n;
        });
      }
    },
    [isSelf]
  );

  const toggleResearcherFollow = useCallback((rid) => {
    setFollowingResearchers((prev) => {
      const n = new Set(prev);
      if (n.has(rid)) n.delete(rid);
      else n.add(rid);
      return n;
    });
  }, []);

  const isFollowing = useCallback((userId) => following.has(userId), [following]);

  const value = useMemo(
    () => ({
      selfSlug,
      following,
      followingCount: following.size,
      toggleFollow,
      isFollowing,
      isSelf,
      followerIdSet,
      followingResearchers,
      isFollowingResearcher: (rid) => followingResearchers.has(rid),
      toggleResearcherFollow
    }),
    [
      selfSlug,
      following,
      toggleFollow,
      isFollowing,
      isSelf,
      followerIdSet,
      followingResearchers,
      toggleResearcherFollow
    ]
  );

  return <FollowContext.Provider value={value}>{children}</FollowContext.Provider>;
}

export function useFollow() {
  const v = useContext(FollowContext);
  if (!v) throw new Error("useFollow needs FollowProvider");
  return v;
}
