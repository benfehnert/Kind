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
import { usePostHog } from "posthog-react-native";
import { useAuth } from "../context/AuthContext";
import { identifyPostHogUser } from "../lib/posthog";
import { ApiError } from "../lib/api";
import { OAuthButtons } from "../components/auth/OAuthButtons";
import { KindBlob } from "../components/onboarding/KindBlob";
import { OnboardingContinueButton } from "../components/onboarding/OnboardingContinueButton";
import { colors, fontFamily, radius, spacing } from "../theme/colors";
import { type } from "../theme/typography";

export default function LoginScreen() {
  const navigation = useNavigation();
  const posthog = usePostHog();
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const canSubmit = email.trim().length > 0 && password.length > 0 && !submitting;

  const handleLogin = async () => {
    if (!canSubmit) return;
    setError("");
    setSubmitting(true);
    try {
      await login(email, password);
      identifyPostHogUser(posthog, email);
      posthog?.capture("signed in");
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
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.logoBlock}>
            <Text style={styles.logo}>kind</Text>
            <Text style={styles.strapline}>health exploration</Text>
          </View>

          <Text style={styles.headline}>
            Welcome <Text style={styles.accent}>back.</Text>
          </Text>
          <Text style={styles.subhead}>Sign in with email and password, or continue with a provider.</Text>

          <View style={styles.blobWrap}>
            <KindBlob size={140} />
          </View>

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
                onSubmitEditing={handleLogin}
              />
            </View>

            <Pressable
              onPress={() => navigation.navigate("ForgotPassword")}
              hitSlop={8}
              style={styles.forgotWrap}
            >
              <Text style={styles.forgotLink}>Forgot password?</Text>
            </Pressable>

            {error ? <Text style={styles.error}>{error}</Text> : null}

            <OnboardingContinueButton
              label={submitting ? "Signing in…" : "Sign in"}
              onPress={handleLogin}
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

          <View style={styles.oauthSection}>
            <OAuthButtons />
          </View>

          <View style={styles.footer}>
            <Text style={styles.footerTxt}>New to Kind?</Text>
            <Pressable onPress={() => navigation.navigate("SignUp")} hitSlop={8}>
              <Text style={styles.footerLink}>Create an account</Text>
            </Pressable>
          </View>

          {__DEV__ ? (
            <Text style={styles.demoHint}>Demo: anna@kind.example / demo1234</Text>
          ) : null}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  flex: { flex: 1 },
  scroll: {
    flexGrow: 1,
    paddingHorizontal: spacing.screen,
    paddingTop: spacing.xxl,
    paddingBottom: spacing.screen
  },
  logoBlock: { marginBottom: 28 },
  logo: {
    fontFamily: fontFamily.logo,
    fontSize: 48,
    color: colors.greenDark,
    letterSpacing: -1
  },
  strapline: {
    fontFamily: fontFamily.medium,
    fontSize: 14,
    color: colors.orange,
    letterSpacing: 1.2,
    textTransform: "lowercase",
    marginTop: 4
  },
  headline: {
    fontFamily: fontFamily.semibold,
    fontSize: 28,
    color: colors.text,
    lineHeight: 36,
    marginBottom: 8
  },
  accent: { color: colors.orange },
  subhead: {
    ...type.body,
    color: colors.textMuted,
    marginBottom: 8
  },
  blobWrap: { alignItems: "center", marginVertical: 16 },
  form: { gap: 12 },
  forgotWrap: { alignSelf: "flex-end", marginTop: -4 },
  forgotLink: {
    fontFamily: fontFamily.semibold,
    fontSize: 14,
    color: colors.greenDark
  },
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
  oauthSection: { marginBottom: 24 },
  footer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 6,
    marginTop: "auto",
    paddingTop: 16
  },
  footerTxt: {
    ...type.body,
    color: colors.textMuted
  },
  footerLink: {
    ...type.link,
    color: colors.greenDark
  },
  demoHint: {
    ...type.caption,
    color: colors.textMuted,
    textAlign: "center",
    marginTop: 20
  }
});
