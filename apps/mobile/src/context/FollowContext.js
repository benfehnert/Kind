import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useData } from "./DataContext";

const FollowContext = createContext(null);

export function FollowProvider({ children }) {
  const data = useData();
  const [following, setFollowing] = useState(() => new Set());
  const [followingResearchers, setFollowingResearchers] = useState(() => new Set());
  const [followerIdSet, setFollowerIdSet] = useState(() => new Set());

  useEffect(() => {
    if (!data?.community?.socialMeta) return;
    const { socialMeta } = data.community;
    setFollowing(new Set(socialMeta.followingExplorerIds || []));
    setFollowingResearchers(new Set(socialMeta.followingResearcherIds || []));
    setFollowerIdSet(new Set(socialMeta.followerIdsExpanded || []));
  }, [data]);

  const toggleFollow = useCallback((userId) => {
    setFollowing((prev) => {
      const n = new Set(prev);
      if (n.has(userId)) n.delete(userId);
      else n.add(userId);
      return n;
    });
  }, []);

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
      following,
      followingCount: following.size,
      toggleFollow,
      isFollowing,
      followerIdSet,
      followingResearchers,
      isFollowingResearcher: (rid) => followingResearchers.has(rid),
      toggleResearcherFollow,
    }),
    [following, toggleFollow, isFollowing, followerIdSet, followingResearchers, toggleResearcherFollow]
  );

  return <FollowContext.Provider value={value}>{children}</FollowContext.Provider>;
}

export function useFollow() {
  const v = useContext(FollowContext);
  if (!v) throw new Error("useFollow needs FollowProvider");
  return v;
}
