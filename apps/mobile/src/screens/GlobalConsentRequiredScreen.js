import React, { useState } from "react";
import { View, Text, StyleSheet, Pressable, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useConsent } from "../context/ConsentContext";
import { useAuth } from "../context/AuthContext";
import { colors, radius, spacing } from "../theme/colors";
import { type } from "../theme/typography";
import { text } from "../theme/textStyles";

export default function GlobalConsentRequiredScreen() {
  const { updatePrivacyPref } = useConsent();
  const { logout } = useAuth();
  const [saving, setSaving] = useState(false);

  const handleReEnable = async () => {
    setSaving(true);
    try {
      await updatePrivacyPref("globalConsent", true);
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.content}>
        <Text style={styles.title}>Global consent required</Text>
        <Text style={styles.body}>
          At Kind, we need your Global consent to provide Kind to you. Please re-enable Global consent
          to continue using the app, or sign out.
        </Text>

        <Pressable
          style={[styles.btnPrimary, saving && styles.btnDisabled]}
          onPress={handleReEnable}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.btnPrimaryTxt}>Re-enable Global consent</Text>
          )}
        </Pressable>

        <Pressable style={styles.btnGhost} onPress={logout} disabled={saving}>
          <Text style={styles.btnGhostTxt}>Sign out</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.bg
  },
  content: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: spacing.screen,
    gap: spacing.lg
  },
  title: {
    ...type.profileName,
    fontSize: 22,
    color: colors.text,
    textAlign: "center"
  },
  body: {
    ...text.body,
    color: colors.textMuted,
    textAlign: "center",
    marginBottom: spacing.md
  },
  btnPrimary: {
    backgroundColor: colors.greenDark,
    borderRadius: radius.md,
    paddingVertical: spacing.xl,
    alignItems: "center"
  },
  btnDisabled: {
    opacity: 0.7
  },
  btnPrimaryTxt: {
    ...type.buttonMd,
    color: "#fff"
  },
  btnGhost: {
    borderWidth: 1.5,
    borderColor: colors.borderMed,
    borderRadius: radius.md,
    paddingVertical: spacing.xl,
    alignItems: "center"
  },
  btnGhostTxt: {
    ...text.link,
    fontSize: 14,
    color: colors.textMuted
  }
});
