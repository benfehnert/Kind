import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation, useRoute } from "@react-navigation/native";
import { useAuth } from "../context/AuthContext";
import { ApiError } from "../lib/api";
import { OnboardingContinueButton } from "../components/onboarding/OnboardingContinueButton";
import { colors, fontFamily, radius, spacing } from "../theme/colors";
import { type } from "../theme/typography";

export default function ResetPasswordScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const { completePasswordReset, pendingPasswordReset, consumePasswordResetLink } = useAuth();

  const [credentials, setCredentials] = useState(() => {
    const params = route.params || {};
    if (params.accessToken || params.tokenHash || params.error) return params;
    return {};
  });
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState(credentials.error || "");
  const [done, setDone] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const params = route.params || {};
    if (params.accessToken || params.tokenHash || params.error) {
      setCredentials(params);
      if (params.error) setError(params.error);
      return;
    }
    if (pendingPasswordReset) {
      const next = consumePasswordResetLink();
      if (next) {
        setCredentials(next);
        if (next.error) setError(next.error);
      }
    }
  }, [route.params, pendingPasswordReset, consumePasswordResetLink]);

  const hasCredentials = Boolean(credentials.accessToken || credentials.tokenHash);
  const canSubmit =
    hasCredentials &&
    password.length >= 8 &&
    password === confirm &&
    !submitting &&
    !credentials.error;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setError("");
    setSubmitting(true);
    try {
      await completePasswordReset({
        password,
        accessToken: credentials.accessToken,
        tokenHash: credentials.tokenHash
      });
      setDone(true);
    } catch (err) {
      const message =
        err instanceof ApiError ? err.message : "Something went wrong. Please try again.";
      setError(message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={["top", "left", "right", "bottom"]}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View style={styles.header}>
          <Pressable style={styles.backBtn} onPress={() => navigation.navigate("Login")} hitSlop={12}>
            <Text style={styles.backChevron}>‹</Text>
          </Pressable>
        </View>

        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.title}>Choose a new password</Text>
          <Text style={styles.subhead}>
            {hasCredentials
              ? "Enter a new password for your Kind account."
              : "Open the reset link from your email on this device to continue."}
          </Text>

          {done ? (
            <View style={styles.successCard}>
              <Text style={styles.successTitle}>Password updated</Text>
              <Text style={styles.successBody}>You can now sign in with your new password.</Text>
              <OnboardingContinueButton label="Sign in" onPress={() => navigation.navigate("Login")} />
            </View>
          ) : (
            <View style={styles.form}>
              <View style={styles.inputCard}>
                <Text style={styles.inputLabel}>New password</Text>
                <TextInput
                  style={styles.input}
                  value={password}
                  onChangeText={setPassword}
                  placeholder="At least 8 characters"
                  placeholderTextColor={colors.textMuted}
                  secureTextEntry
                  textContentType="newPassword"
                  autoComplete="password-new"
                />
              </View>

              <View style={styles.inputCard}>
                <Text style={styles.inputLabel}>Confirm password</Text>
                <TextInput
                  style={styles.input}
                  value={confirm}
                  onChangeText={setConfirm}
                  placeholder="Repeat your new password"
                  placeholderTextColor={colors.textMuted}
                  secureTextEntry
                  textContentType="newPassword"
                  autoComplete="password-new"
                  onSubmitEditing={handleSubmit}
                />
              </View>

              {password.length > 0 && password.length < 8 ? (
                <Text style={styles.hint}>Password must be at least 8 characters.</Text>
              ) : null}
              {confirm.length > 0 && password !== confirm ? (
                <Text style={styles.hint}>Passwords do not match.</Text>
              ) : null}
              {error ? <Text style={styles.error}>{error}</Text> : null}

              {!hasCredentials ? (
                <OnboardingContinueButton
                  label="Request a new link"
                  onPress={() => navigation.navigate("ForgotPassword")}
                />
              ) : (
                <OnboardingContinueButton
                  label={submitting ? "Saving…" : "Update password"}
                  onPress={handleSubmit}
                  disabled={!canSubmit}
                />
              )}

              {submitting ? (
                <ActivityIndicator style={styles.spinner} color={colors.greenDark} />
              ) : null}
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  flex: { flex: 1 },
  header: {
    paddingHorizontal: spacing.screen,
    paddingTop: spacing.xl
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.greenLight,
    alignItems: "center",
    justifyContent: "center"
  },
  backChevron: {
    fontSize: 24,
    lineHeight: 28,
    color: colors.greenDark,
    fontFamily: fontFamily.semibold,
    marginTop: -2
  },
  scroll: {
    flexGrow: 1,
    paddingHorizontal: spacing.screen,
    paddingTop: spacing.md,
    paddingBottom: spacing.screen
  },
  title: {
    fontFamily: fontFamily.semibold,
    fontSize: 28,
    color: colors.text,
    lineHeight: 36,
    marginBottom: 8
  },
  subhead: {
    ...type.body,
    color: colors.textMuted,
    marginBottom: 24
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
  hint: {
    fontFamily: fontFamily.medium,
    fontSize: 13,
    color: colors.textMuted,
    lineHeight: 20
  },
  error: {
    fontFamily: fontFamily.medium,
    fontSize: 13,
    color: colors.orangeDark,
    lineHeight: 20
  },
  spinner: { marginTop: 8 },
  successCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
    gap: 12
  },
  successTitle: {
    fontFamily: fontFamily.semibold,
    fontSize: 18,
    color: colors.text
  },
  successBody: {
    ...type.body,
    color: colors.textMuted
  }
});
