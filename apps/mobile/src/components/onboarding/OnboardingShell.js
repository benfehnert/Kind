import React from "react";
import { View, ScrollView, Pressable, StyleSheet, Text } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { colors, fontFamily, spacing } from "../../theme/colors";
import { OnboardingProgressBar } from "./OnboardingProgressBar";
import { OnboardingContinueButton } from "./OnboardingContinueButton";

export function OnboardingShell({
  showBack,
  onBack,
  showProgress,
  progressCurrent,
  progressTotal,
  continueLabel,
  continueDisabled,
  onContinue,
  hideFooter,
  children
}) {
  return (
    <SafeAreaView style={styles.safe} edges={["top", "left", "right", "bottom"]}>
      <View style={styles.header}>
        {showBack ? (
          <Pressable style={styles.backBtn} onPress={onBack} hitSlop={12} accessibilityLabel="Back">
            <Text style={styles.backChevron}>‹</Text>
          </Pressable>
        ) : (
          <View style={styles.backPlaceholder} />
        )}
        {showProgress ? (
          <OnboardingProgressBar current={progressCurrent} total={progressTotal} />
        ) : (
          <View style={{ flex: 1 }} />
        )}
        <View style={styles.backPlaceholder} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {children}
      </ScrollView>

      {!hideFooter ? (
        <View style={styles.footer}>
          <OnboardingContinueButton
            label={continueLabel || "Continue"}
            onPress={onContinue}
            disabled={continueDisabled}
          />
        </View>
      ) : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.screen,
    paddingVertical: spacing.xl,
    gap: spacing.md
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
  backPlaceholder: { width: 36 },
  scroll: {
    flexGrow: 1,
    paddingHorizontal: spacing.screen,
    paddingTop: spacing.md,
    paddingBottom: spacing.screen
  },
  footer: {
    paddingHorizontal: spacing.screen,
    paddingTop: spacing.xl,
    paddingBottom: spacing.xxl,
    backgroundColor: colors.bg
  }
});
