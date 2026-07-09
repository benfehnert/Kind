import { useCallback, useState } from "react";
import { patch } from "../lib/api";

/**
 * Optimistic Nice-toggle state for a list of activity feed items, keyed by
 * `activityPostId`. Lets feed screens (Home, Explore) support tapping the
 * Nice icon directly on a card without waiting on a full feed refetch.
 */
export function useActivityNice() {
  const [overrides, setOverrides] = useState({});
  const [pending, setPending] = useState({});

  const getState = useCallback(
    (item) => {
      const override = item?.activityPostId ? overrides[item.activityPostId] : null;
      return override ?? { nc: item?.nc || 0, viewerNiced: !!item?.viewerNiced };
    },
    [overrides]
  );

  const toggle = useCallback(
    async (item) => {
      const activityPostId = item?.activityPostId;
      if (!activityPostId || pending[activityPostId]) return;

      const current = getState(item);
      const optimistic = {
        nc: Math.max(0, current.nc + (current.viewerNiced ? -1 : 1)),
        viewerNiced: !current.viewerNiced
      };

      setOverrides((prev) => ({ ...prev, [activityPostId]: optimistic }));
      setPending((prev) => ({ ...prev, [activityPostId]: true }));
      try {
        const result = await patch(`/activity-posts/${activityPostId}/nice`, {});
        setOverrides((prev) => ({
          ...prev,
          [activityPostId]: { nc: result.nc, viewerNiced: result.viewerNiced }
        }));
      } catch (err) {
        console.error("[useActivityNice] toggle nice failed:", err);
        setOverrides((prev) => ({ ...prev, [activityPostId]: current }));
      } finally {
        setPending((prev) => ({ ...prev, [activityPostId]: false }));
      }
    },
    [getState, pending]
  );

  return { getState, toggle, pending };
}
