import React, { useState } from "react";
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
import { useNavigation } from "@react-navigation/native";
import { useAuth } from "../context/AuthContext";
import { ApiError } from "../lib/api";
import { OAuthButtons } from "../components/auth/OAuthButtons";
import { OnboardingContinueButton } from "../components/onboarding/OnboardingContinueButton";
import { colors, fontFamily, radius, spacing } from "../theme/colors";
import { type } from "../theme/typography";

export default function SignUpScreen() {
  const navigation = useNavigation();
  const { signup } = useAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const canSubmit =
    name.trim().length > 0 &&
    email.trim().length > 0 &&
    password.length >= 8 &&
    !submitting;

  const handleSignUp = async () => {
    if (!canSubmit) return;
    setError("");
    setSubmitting(true);
    try {
      await signup(email, name, password);
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
          <Pressable style={styles.backBtn} onPress={() => navigation.goBack()} hitSlop={12}>
            <Text style={styles.backChevron}>‹</Text>
          </Pressable>
        </View>

        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.title}>Create your account</Text>
          <Text style={styles.subhead}>Use your email and a password, or continue with a provider.</Text>

          <View style={styles.form}>
            <View style={styles.inputCard}>
              <Text style={styles.inputLabel}>Name</Text>
              <TextInput
                style={styles.input}
                value={name}
                onChangeText={setName}
                placeholder="Your name"
                placeholderTextColor={colors.textMuted}
                autoCapitalize="words"
                autoCorrect={false}
              />
            </View>

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
                placeholder="At least 8 characters"
                placeholderTextColor={colors.textMuted}
                secureTextEntry
                textContentType="newPassword"
                autoComplete="password-new"
                onSubmitEditing={handleSignUp}
              />
            </View>

            {error ? <Text style={styles.error}>{error}</Text> : null}

            <OnboardingContinueButton
              label={submitting ? "Creating account…" : "Create account"}
              onPress={handleSignUp}
              disabled={!canSubmit}
            />

            {submitting ? (
              <ActivityIndicator style={styles.spinner} color={colors.greenDark} />
            ) : null}
          </View>

          <View style={styles.dividerRow}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>or</Text>
            <View style={styles.dividerLine} />
          </View>

          <OAuthButtons />

          <View style={styles.footer}>
            <Text style={styles.footerTxt}>Already have an account?</Text>
            <Pressable onPress={() => navigation.navigate("Login")} hitSlop={8}>
              <Text style={styles.footerLink}>Sign in</Text>
            </Pressable>
          </View>
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
  error: {
    fontFamily: fontFamily.medium,
    fontSize: 13,
    color: colors.orangeDark,
    lineHeight: 20
  },
  spinner: { marginTop: 8 },
  dividerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginVertical: 24
  },
  dividerLine: { flex: 1, height: 1, backgroundColor: colors.border },
  dividerText: {
    ...type.caption,
    color: colors.textMuted
  },
  footer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 6,
    marginTop: 32
  },
  footerTxt: {
    ...type.body,
    color: colors.textMuted
  },
  footerLink: {
    ...type.link,
    color: colors.greenDark
  }
});
