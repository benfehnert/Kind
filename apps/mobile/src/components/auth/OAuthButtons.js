import React from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { colors, radius, spacing } from "../../theme/colors";
import { type } from "../../theme/typography";

const PROVIDERS = [
  { id: "google", label: "Continue with Google" },
  { id: "apple", label: "Continue with Apple" }
];

export function OAuthButtons({ onProviderPress, disabled = false, loadingProvider = null }) {
  return (
    <View style={styles.section}>
      {PROVIDERS.map((provider) => {
        const loading = loadingProvider === provider.id;
        const isDisabled = disabled || Boolean(loadingProvider);
        return (
          <Pressable
            key={provider.id}
            style={[styles.btn, isDisabled && styles.btnDisabled]}
            onPress={() => onProviderPress(provider.id)}
            disabled={isDisabled}
            accessibilityState={{ disabled: isDisabled }}
          >
            <Text style={styles.btnTxt}>{loading ? "Continuing…" : provider.label}</Text>
          </Pressable>
        );
      })}
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
  btnDisabled: { opacity: 0.6 },
  btnTxt: {
    ...type.buttonMd,
    color: colors.text
  }
});
