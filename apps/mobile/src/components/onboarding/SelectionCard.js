import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { colors, fontFamily, radius } from "../../theme/colors";

export function SelectionCard({ label, sub, selected, onPress }) {
  return (
    <Pressable
      style={[styles.card, selected && styles.cardSelected]}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected }}
    >
      <Text style={[styles.label, selected && styles.labelSelected]}>{label}</Text>
      {selected && sub ? <Text style={styles.sub}>{sub}</Text> : null}
    </Pressable>
  );
}

export function YesNoCards({ value, onChange, yesSub, noSub }) {
  return (
    <View style={styles.stack}>
      <SelectionCard
        label="Yes"
        sub={value === true ? yesSub : undefined}
        selected={value === true}
        onPress={() => onChange(true)}
      />
      <SelectionCard
        label="No"
        sub={value === false ? noSub : undefined}
        selected={value === false}
        onPress={() => onChange(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  stack: { gap: 12 },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14
  },
  cardSelected: {
    borderWidth: 2,
    borderColor: colors.greenDark,
    backgroundColor: colors.greenLight
  },
  label: {
    fontFamily: fontFamily.medium,
    fontSize: 15,
    color: colors.text,
    lineHeight: 21
  },
  labelSelected: {
    fontFamily: fontFamily.semibold,
    color: colors.greenDark
  },
  sub: {
    marginTop: 8,
    fontFamily: fontFamily.regular,
    fontSize: 13,
    color: colors.textMuted,
    lineHeight: 19
  }
});
