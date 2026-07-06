import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { colors, fontFamily, radius } from "../../theme/colors";
import { KindBlob } from "./KindBlob";
import { OnboardingContinueButton } from "./OnboardingContinueButton";
import { DEMO_ACCOUNT } from "../../data/demoAccount";

export function AuthChoiceStep({ onCreateAccount, onLogin }) {
  return (
    <View style={styles.wrap}>
      <Text style={styles.title}>
        Let's get you <Text style={styles.accent}>started.</Text>
      </Text>
      <Text style={styles.body}>
        Create a new account to begin your own health explorations, or log in if you already have one.
      </Text>

      <View style={styles.blobWrap}>
        <KindBlob size={140} />
      </View>

      <View style={styles.actions}>
        <OnboardingContinueButton label="Create an account" onPress={onCreateAccount} />
        <OnboardingContinueButton label="Log in" variant="social" onPress={onLogin} />
      </View>

      <View style={styles.demoCard}>
        <Text style={styles.demoHeading}>Want to see a live account?</Text>
        <Text style={styles.demoBody}>
          Log in with Anna's demo account to explore a fully populated Kind experience.
        </Text>
        <View style={styles.demoRow}>
          <Text style={styles.demoLabel}>Email</Text>
          <Text style={styles.demoValue}>{DEMO_ACCOUNT.email}</Text>
        </View>
        <View style={styles.demoRow}>
          <Text style={styles.demoLabel}>Password</Text>
          <Text style={styles.demoValue}>{DEMO_ACCOUNT.password}</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1 },
  title: {
    fontFamily: fontFamily.semibold,
    fontSize: 28,
    color: colors.text,
    lineHeight: 36,
    marginBottom: 12
  },
  accent: { color: colors.orange },
  body: {
    fontFamily: fontFamily.regular,
    fontSize: 15,
    color: colors.textMuted,
    lineHeight: 24,
    marginBottom: 8
  },
  blobWrap: { alignItems: "center", marginVertical: 16 },
  actions: { gap: 12, marginTop: 8 },
  demoCard: {
    marginTop: 28,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16
  },
  demoHeading: {
    fontFamily: fontFamily.semibold,
    fontSize: 15,
    color: colors.text,
    marginBottom: 4
  },
  demoBody: {
    fontFamily: fontFamily.regular,
    fontSize: 13,
    color: colors.textMuted,
    lineHeight: 20,
    marginBottom: 12
  },
  demoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 4
  },
  demoLabel: {
    fontFamily: fontFamily.regular,
    fontSize: 13,
    color: colors.textMuted
  },
  demoValue: {
    fontFamily: fontFamily.medium,
    fontSize: 14,
    color: colors.text
  }
});
