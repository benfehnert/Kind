import React from "react";
import { View, Text, ActivityIndicator, StyleSheet } from "react-native";
import { colors, spacing } from "../../theme/colors";
import { type } from "../../theme/typography";
import { IS_WEB, WEB_PULL_THRESHOLD } from "../../hooks/usePullToRefresh";

// Web-only visual for the simulated pull-to-refresh gesture driven by
// usePullToRefresh. Renders nothing on native, where RefreshControl already
// draws its own spinner.
export function PullToRefreshIndicator({ refreshing, webPullDistance }) {
  if (!IS_WEB) return null;
  if (!(webPullDistance > 0 || refreshing)) return null;
  return (
    <View style={[styles.wrap, { height: refreshing ? 44 : webPullDistance }]}>
      {refreshing || webPullDistance >= WEB_PULL_THRESHOLD ? (
        <ActivityIndicator size="small" color={colors.greenDark} />
      ) : (
        <Text style={styles.text}>Pull to refresh</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    marginBottom: spacing.sm
  },
  text: { ...type.exploreDesc, color: colors.textMuted }
});
