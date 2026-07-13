import React from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import Slider from "@react-native-community/slider";
import { colors, radius, spacing } from "../../theme/colors";
import { type } from "../../theme/typography";
import { defaultRangeValue } from "../../utils/explorationLogState";

export function ExplorationLogFields({ fields, values, onChange }) {
  return (fields || []).map((field) => {
    if (field.type === "checks") {
      const checked = values[field.id] || [];
      return (
        <View key={field.id} style={styles.block}>
          <Text style={styles.label}>{field.label}</Text>
          <View style={styles.chips}>
            {(field.opts || []).map((opt, idx) => (
              <Pressable
                key={opt}
                style={[styles.check, checked[idx] && styles.checkOn]}
                onPress={() => {
                  const next = [...checked];
                  if (field.multi) {
                    next[idx] = !next[idx];
                  } else {
                    next.fill(false);
                    next[idx] = true;
                  }
                  onChange(field.id, next);
                }}
              >
                <Text style={[styles.checkTxt, !checked[idx] && styles.checkTxtOff]}>
                  {checked[idx] ? "✓ " : ""}
                  {opt}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>
      );
    }

    if (field.type === "range") {
      const val = values[field.id] ?? defaultRangeValue(field);
      const step = field.step ?? 1;
      return (
        <View key={field.id} style={styles.block}>
          <Text style={styles.label}>{field.label}</Text>
          <View style={styles.rangeRow}>
            <Slider
              style={{ flex: 1, height: 40 }}
              minimumValue={field.min}
              maximumValue={field.max}
              step={step}
              value={val}
              onValueChange={(v) => onChange(field.id, Math.round(v / step) * step)}
              minimumTrackTintColor={colors.greenDark}
              maximumTrackTintColor={colors.border}
              thumbTintColor={colors.greenDark}
            />
            <Text style={styles.rangeVal}>
              {val}
              {field.unit ? ` ${field.unit}` : ""}
            </Text>
          </View>
          {field.hints ? (
            <View style={styles.hintRow}>
              <Text style={styles.hint}>{field.hints[0]}</Text>
              <Text style={styles.hint}>{field.hints[1]}</Text>
            </View>
          ) : null}
        </View>
      );
    }

    if (field.type === "select") {
      const selectedIdx = values[field.id];
      return (
        <View key={field.id} style={styles.block}>
          <Text style={styles.label}>{field.label}</Text>
          <View style={styles.chips}>
            {(field.opts || []).map((opt, idx) => (
              <Pressable
                key={opt}
                style={[styles.selectChip, selectedIdx === idx && styles.selectChipOn]}
                onPress={() => onChange(field.id, idx)}
              >
                <Text style={[styles.selectTxt, selectedIdx === idx && styles.selectTxtOn]}>{opt}</Text>
              </Pressable>
            ))}
          </View>
        </View>
      );
    }

    return null;
  });
}

const styles = StyleSheet.create({
  block: { marginBottom: 14 },
  label: { ...type.label, color: colors.text, marginBottom: 7 },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  check: {
    borderWidth: 1,
    borderColor: colors.borderMed,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.chipPadY,
    minHeight: 32,
    justifyContent: "center"
  },
  checkOn: { backgroundColor: colors.greenLight, borderColor: colors.greenDark },
  checkTxt: { ...type.chip, color: colors.greenDark },
  checkTxtOff: { ...type.chip, color: colors.textMuted },
  rangeRow: { flexDirection: "row", alignItems: "center", gap: spacing.lg },
  rangeVal: { ...type.button, minWidth: 40, textAlign: "right", color: colors.text },
  hintRow: { flexDirection: "row", justifyContent: "space-between", marginTop: spacing.xs },
  hint: { ...type.caption, color: colors.textMuted },
  selectChip: {
    borderWidth: 1,
    borderColor: colors.borderMed,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.chipPadY,
    minHeight: 32,
    justifyContent: "center"
  },
  selectChipOn: { backgroundColor: colors.greenDark, borderColor: colors.greenDark },
  selectTxt: { ...type.chip, color: colors.textMuted },
  selectTxtOn: { ...type.chip, color: "#fff" }
});
