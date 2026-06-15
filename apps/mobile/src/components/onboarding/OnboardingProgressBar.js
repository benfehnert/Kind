import React from "react";
import { View, StyleSheet } from "react-native";
import { colors } from "../../theme/colors";

export function OnboardingProgressBar({ current, total }) {
  const pct = total > 0 ? Math.min(100, (current / total) * 100) : 0;
  return (
    <View style={styles.wrap}>
      <View style={styles.track}>
        <View style={[styles.fill, { width: `${pct}%` }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, justifyContent: "center", paddingHorizontal: 8 },
  track: {
    height: 6,
    borderRadius: 999,
    backgroundColor: colors.border,
    overflow: "hidden"
  },
  fill: {
    height: 6,
    borderRadius: 999,
    backgroundColor: colors.greenDark
  }
});
