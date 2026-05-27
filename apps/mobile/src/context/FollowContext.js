import React, { createContext, useCallback, useContext, useMemo, useState } from "react";
import { community } from "../data/mock";

const FollowContext = createContext(null);

export function FollowProvider({ children }) {
  const [following, setFollowing] = useState(
    () => new Set(community.socialMeta?.followingExplorerIds || [])
  );
  const [followingResearchers, setFollowingResearchers] = useState(
    () => new Set(community.socialMeta?.followingResearcherIds || [])
  );

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
  const followerIdSet = useMemo(() => new Set(community.socialMeta?.followerIdsExpanded || []), []);

  const value = useMemo(
    () => ({
      following,
      followingCount: following.size,
      toggleFollow,
      isFollowing,
      followerIdSet,
      followingResearchers,
      isFollowingResearcher: (rid) => followingResearchers.has(rid),
      toggleResearcherFollow
    }),
    [
      following,
      toggleFollow,
      isFollowing,
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
