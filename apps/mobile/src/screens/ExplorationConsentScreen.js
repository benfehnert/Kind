import React, { useState } from "react";
import { View, ScrollView, StyleSheet, Text, Pressable, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation, useRoute } from "@react-navigation/native";
import { useData } from "../context/DataContext";
import { useConsent } from "../context/ConsentContext";
import { useUiShell } from "../context/UiContext";
import { OnboardingContinueButton } from "../components/onboarding/OnboardingContinueButton";
import { Card } from "../components/primitives/Card";
import { colors, fontFamily, spacing } from "../theme/colors";
import { text } from "../theme/textStyles";

const OPT_IN_LABEL =
  "I want to join this exploration and consent to the use of my data for my personalised (N-of-1) analysis.";
const OPT_IN_SUB =
  "Your exploration-specific consent will be saved to your profile.";
const OPT_IN_SUB_ON =
  "Thank you — your exploration-specific consent will be saved to your profile.";

function buildAtAGlance(exploration) {
  return [
    { label: "Category", value: exploration.category },
    { label: "Duration", value: exploration.duration },
    {
      label: "What we'll measure",
      value: exploration.chartLabel || "Outcomes you log during the exploration"
    }
  ].filter((row) => row.value);
}

export default function ExplorationConsentScreen() {
  const { explorations } = useData();
  const navigation = useNavigation();
  const { params } = useRoute();
  const explorationId = params?.id;
  const exploration = explorationId ? explorations[explorationId] : null;
  const { privacyPrefs, enrollInExploration } = useConsent();
  const { showToast } = useUiShell();
  const [optIn, setOptIn] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const globalConsent = Boolean(privacyPrefs.globalConsent);
  const canContinue = globalConsent && optIn;

  if (!exploration) {
    return (
      <SafeAreaView style={styles.safe}>
        <Text style={styles.title}>Exploration not found.</Text>
        <Pressable onPress={() => navigation.goBack()}>
          <Text style={styles.back}>‹ Back</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  const atAGlance = buildAtAGlance(exploration);

  const handleStart = async () => {
    if (!canContinue || submitting) return;
    setSubmitting(true);
    try {
      await enrollInExploration(explorationId, { setActive: true });
      navigation.replace("ExplorationStarted", { id: explorationId });
    } catch {
      showToast("Something went wrong. Please try again.");
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={["top", "left", "right", "bottom"]}>
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} hitSlop={12}>
          <Text style={styles.back}>‹ Back</Text>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Text style={styles.eyebrow}>Exploration consent</Text>
        <Text style={styles.title}>Join this health exploration</Text>
        <Text style={styles.body}>
          In addition to your master consent, I need your opt-in to take part in this specific
          exploration before you can start.
        </Text>

        {!globalConsent ? (
          <View style={styles.blocker}>
            <Text style={styles.blockerTitle}>Master consent required</Text>
            <Text style={styles.blockerBody}>
              Please enable Global consent in your profile before joining an individual health
              exploration.
            </Text>
            <Pressable
              style={styles.blockerBtn}
              onPress={() => navigation.navigate("MainTabs", { screen: "Profile" })}
            >
              <Text style={styles.blockerBtnTxt}>Go to profile</Text>
            </Pressable>
          </View>
        ) : null}

        <View style={styles.exCard}>
          <Text style={styles.exName}>{exploration.title}</Text>
          {atAGlance.map((row, idx, arr) => (
            <View
              key={row.label}
              style={[styles.exRow, idx < arr.length - 1 && styles.exRowBorder]}
            >
              <Text style={styles.exLabel}>{row.label}</Text>
              <Text style={styles.exValue}>{row.value}</Text>
            </View>
          ))}
        </View>

        <Text style={styles.consentIntro}>
          This is research and self-experimentation, not medical care. You can withdraw from this
          exploration at any time from your profile.
        </Text>

        {globalConsent ? (
          <Card style={styles.optInCard}>
            <View style={styles.setRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.sl}>{OPT_IN_LABEL}</Text>
                <Text style={styles.ss}>{optIn ? OPT_IN_SUB_ON : OPT_IN_SUB}</Text>
              </View>
              <Pressable
                style={[styles.toggle, !optIn && styles.toggleOff]}
                onPress={() => setOptIn((prev) => !prev)}
                accessibilityRole="switch"
                accessibilityState={{ checked: optIn }}
              >
                <View style={[styles.toggleKnob, !optIn && styles.toggleKnobOff]} />
              </Pressable>
            </View>
          </Card>
        ) : null}
      </ScrollView>

      <View style={styles.footer}>
        <OnboardingContinueButton
          label={submitting ? "Starting…" : "Agree & start exploration"}
          onPress={handleStart}
          disabled={!canContinue || submitting}
        />
        {submitting ? <ActivityIndicator color={colors.greenDark} style={{ marginTop: 12 }} /> : null}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  header: { paddingHorizontal: spacing.screen, paddingVertical: spacing.lg },
  back: { color: colors.greenDark, fontFamily: fontFamily.semibold, fontSize: 16 },
  scroll: { paddingHorizontal: spacing.screen, paddingBottom: spacing.screen },
  eyebrow: {
    fontSize: 11,
    fontFamily: fontFamily.semibold,
    color: colors.greenDark,
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: 6
  },
  title: {
    fontSize: 24,
    fontFamily: fontFamily.semibold,
    color: colors.text,
    lineHeight: 32,
    marginBottom: 10
  },
  body: {
    fontSize: 14,
    color: colors.textMuted,
    lineHeight: 22,
    marginBottom: 16,
    fontFamily: fontFamily.regular
  },
  blocker: {
    backgroundColor: colors.amberBg,
    borderRadius: 12,
    padding: 14,
    marginBottom: 16
  },
  blockerTitle: {
    fontFamily: fontFamily.semibold,
    fontSize: 14,
    color: colors.amberText,
    marginBottom: 6
  },
  blockerBody: {
    fontSize: 13,
    color: colors.amberText,
    lineHeight: 20,
    marginBottom: 12
  },
  blockerBtn: {
    backgroundColor: colors.greenDark,
    borderRadius: 10,
    paddingVertical: 11,
    alignItems: "center"
  },
  blockerBtnTxt: { color: "#fff", fontFamily: fontFamily.semibold, fontSize: 13 },
  exCard: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: 14,
    marginBottom: 14
  },
  exName: {
    fontSize: 15,
    fontFamily: fontFamily.semibold,
    color: colors.text,
    marginBottom: 10,
    lineHeight: 21
  },
  exRow: { paddingVertical: 8 },
  exRowBorder: { borderBottomWidth: 1, borderBottomColor: colors.border },
  exLabel: {
    fontSize: 11,
    color: colors.greenDark,
    textTransform: "uppercase",
    letterSpacing: 0.6,
    fontFamily: fontFamily.semibold,
    marginBottom: 2
  },
  exValue: { fontSize: 13, color: colors.text, lineHeight: 19 },
  consentIntro: {
    fontSize: 12,
    color: colors.textMuted,
    lineHeight: 18,
    marginBottom: 14,
    fontStyle: "italic"
  },
  optInCard: {
    marginBottom: 8
  },
  setRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: spacing.lg
  },
  sl: text.label,
  ss: { ...text.profileMeta, marginTop: spacing.xs },
  toggle: {
    width: 42,
    height: 24,
    borderRadius: 999,
    backgroundColor: colors.greenDark,
    justifyContent: "center",
    paddingHorizontal: 3
  },
  toggleOff: { backgroundColor: colors.border },
  toggleKnob: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: "#fff",
    alignSelf: "flex-end"
  },
  toggleKnobOff: {
    alignSelf: "flex-start"
  },
  footer: {
    paddingHorizontal: spacing.screen,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xxl,
    backgroundColor: colors.bg
  }
});
