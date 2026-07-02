import React, { useMemo, useState } from "react";
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Linking,
  Pressable,
  KeyboardAvoidingView,
  Platform
} from "react-native";
import { ProfileDetailScreen } from "../components/profile/ProfileDetailScreen";
import { OnboardingContinueButton } from "../components/onboarding/OnboardingContinueButton";
import { useAuth } from "../context/AuthContext";
import { post, ApiError } from "../lib/api";
import { downloadDataContent as c } from "../data/downloadDataContent";
import { colors, fontFamily, radius, spacing } from "../theme/colors";

function normalizeEmail(value) {
  return String(value || "")
    .trim()
    .toLowerCase();
}

export default function DownloadDataScreen() {
  const { email: accountEmail } = useAuth();
  const [email, setEmail] = useState(accountEmail || "");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const emailsMatch = useMemo(() => {
    if (!email.trim() || !accountEmail) return false;
    return normalizeEmail(email) === normalizeEmail(accountEmail);
  }, [email, accountEmail]);

  const canSubmit = emailsMatch && !submitting && !submitted;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setError("");
    setSubmitting(true);
    try {
      await post("/profile/data-export-request", { email: email.trim() });
      setSubmitted(true);
    } catch (err) {
      const message =
        err instanceof ApiError ? err.message : "Something went wrong. Please try again.";
      setError(message);
    } finally {
      setSubmitting(false);
    }
  };

  const openLink = (url) => {
    if (url) Linking.openURL(url);
  };

  if (submitted) {
    return (
      <ProfileDetailScreen title={c.title}>
        <View style={styles.successCard}>
          <Text style={styles.successTitle}>{c.successTitle}</Text>
          <Text style={styles.successBody}>{c.successBody}</Text>
        </View>
      </ProfileDetailScreen>
    );
  }

  return (
    <ProfileDetailScreen title={c.title}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <Text style={styles.body}>{c.intro}</Text>

        <Text style={styles.groupHeading}>{c.guidelinesHeading}</Text>
        {(c.guidelines || []).map((item) => (
          <Pressable key={item.url} style={styles.linkRow} onPress={() => openLink(item.url)}>
            <Text style={styles.linkText}>{item.label}</Text>
          </Pressable>
        ))}

        <View style={styles.form}>
          <Text style={styles.label}>{c.emailLabel}</Text>
          <Text style={styles.hint}>{c.emailHint}</Text>
          <TextInput
            style={styles.input}
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="email-address"
            textContentType="emailAddress"
            placeholder="you@example.com"
            placeholderTextColor={colors.textMuted}
          />
          {email.trim().length > 0 && !emailsMatch ? (
            <Text style={styles.fieldError}>This must match the email on your Kind account.</Text>
          ) : null}
          {error ? <Text style={styles.fieldError}>{error}</Text> : null}
          <OnboardingContinueButton
            label={c.submitLabel}
            onPress={handleSubmit}
            disabled={!canSubmit}
          />
        </View>
      </KeyboardAvoidingView>
    </ProfileDetailScreen>
  );
}

const styles = StyleSheet.create({
  body: {
    fontSize: 14,
    color: colors.textMuted,
    lineHeight: 22,
    marginBottom: spacing.blockMbLg
  },
  groupHeading: {
    fontSize: 11,
    color: colors.textMuted,
    textTransform: "uppercase",
    letterSpacing: 0.8,
    fontFamily: fontFamily.semibold,
    marginBottom: spacing.sm
  },
  linkRow: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.xxl,
    marginBottom: spacing.md
  },
  linkText: {
    fontSize: 14,
    color: colors.greenDark,
    fontFamily: fontFamily.semibold
  },
  form: {
    marginTop: spacing.lg
  },
  label: {
    fontSize: 14,
    fontFamily: fontFamily.semibold,
    color: colors.text,
    marginBottom: spacing.sm
  },
  hint: {
    fontSize: 13,
    color: colors.textMuted,
    lineHeight: 20,
    marginBottom: spacing.lg
  },
  input: {
    borderWidth: 1,
    borderColor: colors.borderMed,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.xxl,
    paddingVertical: spacing.lg,
    fontSize: 15,
    color: colors.text,
    fontFamily: fontFamily.regular,
    marginBottom: spacing.md
  },
  fieldError: {
    fontSize: 13,
    color: colors.orangeDark,
    marginBottom: spacing.md,
    lineHeight: 18
  },
  successCard: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    padding: spacing.xxl
  },
  successTitle: {
    fontSize: 16,
    fontFamily: fontFamily.semibold,
    color: colors.text,
    marginBottom: spacing.md
  },
  successBody: {
    fontSize: 14,
    color: colors.textMuted,
    lineHeight: 22
  }
});
