import React from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { colors, radius, spacing } from "../../theme/colors";
import { type } from "../../theme/typography";

const PROVIDERS = [
  { id: "google", label: "Continue with Google" },
  { id: "apple", label: "Continue with Apple" }
];

export function OAuthButtons({
  onProviderPress,
  disabled = false,
  loadingProvider = null,
  comingSoon = true
}) {
  const handlePress = (providerId) => {
    if (comingSoon) return;
    onProviderPress?.(providerId);
  };

  return (
    <View style={styles.section}>
      {PROVIDERS.map((provider) => {
        const loading = !comingSoon && loadingProvider === provider.id;
        const isInactive = comingSoon || disabled || Boolean(loadingProvider);
        return (
          <Pressable
            key={provider.id}
            style={[styles.btn, isInactive && styles.btnDisabled, comingSoon && styles.btnComingSoon]}
            onPress={() => handlePress(provider.id)}
            disabled={isInactive}
            accessibilityState={{ disabled: isInactive }}
          >
            <Text style={[styles.btnTxt, isInactive && styles.btnTxtDisabled]}>
              {loading ? "Continuing…" : provider.label}
            </Text>
          </Pressable>
        );
      })}
      {comingSoon ? <Text style={styles.caption}>OAuth coming soon</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  section: { gap: 8 },
  btn: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderMed,
    borderRadius: radius.lg,
    paddingVertical: spacing.xxl,
    minHeight: 48,
    alignItems: "center",
    justifyContent: "center"
  },
  btnDisabled: { opacity: 0.55 },
  btnComingSoon: {
    backgroundColor: colors.bg,
    borderColor: colors.border
  },
  btnTxt: {
    ...type.buttonMd,
    color: colors.text
  },
  btnTxtDisabled: {
    color: colors.textMuted
  },
  caption: {
    ...type.caption,
    color: colors.textMuted,
    textAlign: "center",
    marginTop: 4
  }
});
