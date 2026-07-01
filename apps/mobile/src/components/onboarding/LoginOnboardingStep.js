import React, { useState } from "react";
import { View, Text, TextInput, Pressable, StyleSheet, ActivityIndicator } from "react-native";
import { colors, fontFamily, radius } from "../../theme/colors";
import { ApiError } from "../../lib/api";
import { OnboardingContinueButton } from "./OnboardingContinueButton";
import { DEMO_ACCOUNT } from "../../data/demoAccount";

export function LoginOnboardingStep({ onSubmit, onSwitchToCreate }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const canSubmit = email.trim().length > 0 && password.length > 0 && !submitting;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setError("");
    setSubmitting(true);
    try {
      await onSubmit(email, password);
    } catch (err) {
      const message =
        err instanceof ApiError ? err.message : "Something went wrong. Please try again.";
      setError(message);
      setSubmitting(false);
    }
  };

  const fillDemo = () => {
    setEmail(DEMO_ACCOUNT.email);
    setPassword(DEMO_ACCOUNT.password);
    setError("");
  };

  return (
    <View>
      <Text style={styles.title}>Welcome back</Text>
      <Text style={styles.body}>Sign in with your email and password.</Text>

      <View style={styles.form}>
        <View style={styles.inputCard}>
          <Text style={styles.inputLabel}>Email</Text>
          <TextInput
            style={styles.input}
            value={email}
            onChangeText={setEmail}
            placeholder="you@example.com"
            placeholderTextColor={colors.textMuted}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="email-address"
            textContentType="emailAddress"
            autoComplete="email"
          />
        </View>

        <View style={styles.inputCard}>
          <Text style={styles.inputLabel}>Password</Text>
          <TextInput
            style={styles.input}
            value={password}
            onChangeText={setPassword}
            placeholder="Your password"
            placeholderTextColor={colors.textMuted}
            secureTextEntry
            textContentType="password"
            autoComplete="password"
            onSubmitEditing={handleSubmit}
          />
        </View>

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <OnboardingContinueButton
          label={submitting ? "Signing in…" : "Log in"}
          onPress={handleSubmit}
          disabled={!canSubmit}
        />

        {submitting ? <ActivityIndicator style={styles.spinner} color={colors.greenDark} /> : null}
      </View>

      <View style={styles.demoCard}>
        <Text style={styles.demoHeading}>Anna's demo account</Text>
        <View style={styles.demoRow}>
          <Text style={styles.demoLabel}>Email</Text>
          <Text style={styles.demoValue}>{DEMO_ACCOUNT.email}</Text>
        </View>
        <View style={styles.demoRow}>
          <Text style={styles.demoLabel}>Password</Text>
          <Text style={styles.demoValue}>{DEMO_ACCOUNT.password}</Text>
        </View>
        <Pressable onPress={fillDemo} hitSlop={8} style={styles.demoFillBtn}>
          <Text style={styles.demoFillTxt}>Use Anna's demo login</Text>
        </Pressable>
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerTxt}>New to Kind?</Text>
        <Pressable onPress={onSwitchToCreate} hitSlop={8}>
          <Text style={styles.footerLink}>Create an account</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  title: {
    fontFamily: fontFamily.semibold,
    fontSize: 26,
    color: colors.text,
    lineHeight: 34,
    marginBottom: 12
  },
  body: {
    fontFamily: fontFamily.regular,
    fontSize: 15,
    color: colors.textMuted,
    lineHeight: 24,
    marginBottom: 20
  },
  form: { gap: 12 },
  inputCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16
  },
  inputLabel: {
    fontFamily: fontFamily.regular,
    fontSize: 13,
    color: colors.textMuted,
    marginBottom: 6
  },
  input: {
    fontFamily: fontFamily.medium,
    fontSize: 18,
    color: colors.text,
    padding: 0
  },
  error: {
    fontFamily: fontFamily.medium,
    fontSize: 13,
    color: colors.orangeDark,
    lineHeight: 20
  },
  spinner: { marginTop: 8 },
  demoCard: {
    marginTop: 24,
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
    marginBottom: 8
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
  },
  demoFillBtn: { marginTop: 10 },
  demoFillTxt: {
    fontFamily: fontFamily.semibold,
    fontSize: 14,
    color: colors.greenDark,
    textDecorationLine: "underline"
  },
  footer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 6,
    marginTop: 24
  },
  footerTxt: {
    fontFamily: fontFamily.regular,
    fontSize: 15,
    color: colors.textMuted
  },
  footerLink: {
    fontFamily: fontFamily.semibold,
    fontSize: 15,
    color: colors.greenDark
  }
});
