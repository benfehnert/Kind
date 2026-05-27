import React from "react";
import { ScrollView, StyleSheet, Text, TouchableOpacity } from "react-native";
import { colors, radius, spacing } from "../../theme/colors";
import { type } from "../../theme/typography";

export function ChipRow({ chips, value, onChange }) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.row}
      style={styles.scroll}
    >
      {chips.map((c) => {
        const active = value === c.key;
        return (
          <TouchableOpacity
            key={c.key}
            style={[styles.chip, active && styles.chipOn]}
            onPress={() => onChange(c.key)}
          >
            <Text style={[styles.text, active && styles.textOn]}>{c.label}</Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { marginBottom: spacing.sectionGap },
  row: { gap: spacing.sm, paddingBottom: spacing.xs },
  chip: {
    borderWidth: 1,
    borderColor: colors.borderMed,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.chipPadX,
    paddingVertical: spacing.chipPadY,
    backgroundColor: colors.surface,
    minHeight: 32,
    justifyContent: "center"
  },
  chipOn: { backgroundColor: colors.greenDark, borderColor: colors.greenDark },
  text: { ...type.chip, color: colors.textMuted },
  textOn: { ...type.chip, color: "#fff" }
});
