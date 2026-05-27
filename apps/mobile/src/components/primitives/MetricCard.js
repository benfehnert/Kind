import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { colors, radius, spacing } from "../../theme/colors";
import { rem } from "../../theme/tokens";
import { type } from "../../theme/typography";

export function MetricGrid({ children }) {
  return <View style={styles.grid}>{children}</View>;
}

export function MetricCard({ label, value, unit, sub, subTone }) {
  const subC =
    subTone === "amber" ? colors.amberText : subTone === "green" ? colors.greenDark : colors.textMuted;
  return (
    <View style={styles.cell}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value}>
        {value}
        {unit ? <Text style={styles.unit}> {unit}</Text> : null}
      </Text>
      {sub ? (
        <Text style={[styles.sub, { color: subC }]} numberOfLines={2}>
          {sub}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.lg,
    marginBottom: spacing.blockMb
  },
  cell: {
    width: "48%",
    backgroundColor: colors.greenLight,
    borderRadius: radius.md,
    padding: rem(0.85)
  },
  label: { ...type.metricLabel, color: colors.textMuted, marginBottom: spacing.xs },
  value: { ...type.metricValue, color: colors.text },
  unit: { ...type.metricUnit, color: colors.textMuted },
  sub: { ...type.metricLabel, marginTop: spacing.xs }
});
