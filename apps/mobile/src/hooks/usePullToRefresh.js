import { useCallback, useRef, useState } from "react";
import { Platform, RefreshControl } from "react-native";
import { colors } from "../theme/colors";

export const IS_WEB = Platform.OS === "web";
export const WEB_PULL_THRESHOLD = 70;
const WEB_PULL_MAX = 100;

// Native platforms get RN's built-in RefreshControl. Expo web has no native
// pull-to-refresh gesture, so we simulate one from raw touch events and
// expose the same `refreshing` / `webPullDistance` state for a custom
// indicator (see PullToRefreshIndicator).
export function usePullToRefresh(onRefresh) {
  const [refreshing, setRefreshing] = useState(false);
  const [webPullDistance, setWebPullDistance] = useState(0);
  const webPullRef = useRef({ tracking: false, startY: 0, scrollY: 0 });

  const handleRefresh = useCallback(async () => {
    if (refreshing) return;
    setRefreshing(true);
    try {
      await onRefresh?.();
    } catch (err) {
      console.log("[usePullToRefresh] refresh failed:", err);
    } finally {
      setRefreshing(false);
      setWebPullDistance(0);
    }
  }, [refreshing, onRefresh]);

  const handleWebScroll = useCallback((e) => {
    webPullRef.current.scrollY = e.nativeEvent?.contentOffset?.y ?? 0;
  }, []);

  const handleWebTouchStart = useCallback(
    (e) => {
      if (refreshing) return;
      if (webPullRef.current.scrollY > 0) return;
      const touch = e.nativeEvent?.touches?.[0];
      if (!touch) return;
      webPullRef.current.tracking = true;
      webPullRef.current.startY = touch.pageY;
    },
    [refreshing]
  );

  const handleWebTouchMove = useCallback((e) => {
    if (!webPullRef.current.tracking) return;
    const touch = e.nativeEvent?.touches?.[0];
    if (!touch) return;
    const delta = touch.pageY - webPullRef.current.startY;
    if (delta <= 0) {
      setWebPullDistance(0);
      return;
    }
    setWebPullDistance(Math.min(delta / 1.6, WEB_PULL_MAX));
  }, []);

  const handleWebTouchEnd = useCallback(() => {
    if (!webPullRef.current.tracking) return;
    webPullRef.current.tracking = false;
    setWebPullDistance((distance) => {
      if (distance >= WEB_PULL_THRESHOLD) {
        handleRefresh();
        return distance;
      }
      return 0;
    });
  }, [handleRefresh]);

  const scrollViewProps = IS_WEB
    ? {
        onScroll: handleWebScroll,
        scrollEventThrottle: 16,
        onTouchStart: handleWebTouchStart,
        onTouchMove: handleWebTouchMove,
        onTouchEnd: handleWebTouchEnd,
        onTouchCancel: handleWebTouchEnd
      }
    : {
        refreshControl: (
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={colors.greenDark}
            colors={[colors.greenDark]}
          />
        )
      };

  return { refreshing, webPullDistance, scrollViewProps };
}
