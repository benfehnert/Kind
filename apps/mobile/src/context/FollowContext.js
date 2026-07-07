import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { usePostHog } from "posthog-react-native";
import { patch } from "../lib/api";
import { useData } from "./DataContext";

const FollowContext = createContext(null);

export function FollowProvider({ children }) {
  const posthog = usePostHog();
  const data = useData();
  const { updateSocialFollows, applySocialFollows } = data ?? {};
  const selfSlug = data?.profile?.viewerSlug ?? null;
  const [following, setFollowing] = useState(() => new Set());
  const [followingResearchers, setFollowingResearchers] = useState(() => new Set());
  const [followerIdSet, setFollowerIdSet] = useState(() => new Set());

  const socialMeta = data?.community?.socialMeta;
  const followingKey = JSON.stringify(socialMeta?.followingExplorerIds ?? []);
  const researchersKey = JSON.stringify(socialMeta?.followingResearcherIds ?? []);
  const followersKey = JSON.stringify(socialMeta?.followerIdsExpanded ?? []);

  useEffect(() => {
    if (!socialMeta) return;
    const explorerIds = (socialMeta.followingExplorerIds || []).filter((id) => id !== selfSlug);
    setFollowing(new Set(explorerIds));
    setFollowingResearchers(new Set(socialMeta.followingResearcherIds || []));
    setFollowerIdSet(new Set(socialMeta.followerIdsExpanded || []));
  }, [followingKey, researchersKey, followersKey, selfSlug]);

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
        const result = await patch(
          "/social/follows",
          wasFollowing ? { unfollowSlug: userId } : { followSlug: userId }
        );
        if (result?.followingExplorerIds) {
          applySocialFollows?.({
            ...(socialMeta || {}),
            followingExplorerIds: result.followingExplorerIds,
            followingResearcherIds:
              result.followingResearcherIds ?? socialMeta?.followingResearcherIds ?? []
          });
        } else {
          updateSocialFollows?.(
            wasFollowing ? { unfollowSlug: userId } : { followSlug: userId }
          );
        }
        if (!wasFollowing) {
          posthog?.capture("followed a community member");
          posthog?.capture("followed an explorer");
        }
      } catch {
        setFollowing((prev) => {
          const n = new Set(prev);
          if (wasFollowing) n.add(userId);
          else n.delete(userId);
          return n;
        });
      }
    },
    [isSelf, applySocialFollows, updateSocialFollows, socialMeta, posthog]
  );

  const toggleResearcherFollow = useCallback((rid) => {
    setFollowingResearchers((prev) => {
      const n = new Set(prev);
      if (n.has(rid)) n.delete(rid);
      else {
        n.add(rid);
        posthog?.capture("followed a researcher");
      }
      return n;
    });
  }, [posthog]);

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
