import React from "react";
import { Pressable, StyleSheet, Text } from "react-native";
import { colors, fontFamily, radius, spacing } from "../../theme/colors";
import { type } from "../../theme/typography";

export function OnboardingContinueButton({ label, onPress, disabled, variant = "primary" }) {
  const isPrimary = variant === "primary";
  return (
    <Pressable
      style={[
        styles.btn,
        isPrimary ? styles.primary : styles.social,
        disabled && styles.disabled
      ]}
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityState={{ disabled }}
    >
      <Text style={[styles.txt, isPrimary ? styles.primaryTxt : styles.socialTxt]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  btn: {
    borderRadius: radius.lg,
    paddingVertical: spacing.xxl,
    minHeight: 48,
    alignItems: "center",
    justifyContent: "center",
    width: "100%"
  },
  primary: {
    backgroundColor: colors.greenDark
  },
  social: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderMed
  },
  disabled: {
    opacity: 0.45
  },
  txt: {
    ...type.button,
    fontSize: 15
  },
  primaryTxt: {
    color: "#FFFFFF"
  },
  socialTxt: {
    color: colors.text
  }
});
