import React from "react";
import { View, Text, TextInput, StyleSheet } from "react-native";
import { colors, fontFamily, radius } from "../../theme/colors";

export function AccountOnboardingStep({ step, answers, onChange, error }) {
  const email = answers.signupEmail || "";
  const password = answers.signupPassword || "";

  return (
    <View>
      <Text style={styles.title}>{step.title}</Text>
      {step.body ? <Text style={styles.body}>{step.body}</Text> : null}

      <View style={styles.form}>
        <View style={styles.inputCard}>
          <Text style={styles.inputLabel}>Email</Text>
          <TextInput
            style={styles.input}
            value={email}
            onChangeText={(value) => onChange("signupEmail", value)}
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
            onChangeText={(value) => onChange("signupPassword", value)}
            placeholder="At least 8 characters"
            placeholderTextColor={colors.textMuted}
            secureTextEntry
            textContentType="newPassword"
            autoComplete="password-new"
          />
        </View>
      </View>

      {error ? <Text style={styles.error}>{error}</Text> : null}
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
  form: { gap: 12, marginTop: 8 },
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
    marginTop: 16,
    fontFamily: fontFamily.medium,
    fontSize: 13,
    color: colors.orangeDark,
    lineHeight: 20
  }
});
