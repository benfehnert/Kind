import React from "react";
import { View, ScrollView, StyleSheet, Text } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation, useRoute } from "@react-navigation/native";
import { usePostHog } from "posthog-react-native";
import { useData } from "../context/DataContext";
import { useUserExplorations } from "../hooks/useUserExplorations";
import { OnboardingContinueButton } from "../components/onboarding/OnboardingContinueButton";
import { Badge } from "../components/primitives/Badge";
import {
  buildExplorationStartContent,
  buildLogFieldSummary
} from "../utils/explorationStartContent";
import { colors, fontFamily, spacing } from "../theme/colors";

export default function ExplorationStartedScreen() {
  const { explorations: catalog } = useData();
  const userExplorations = useUserExplorations();
  const navigation = useNavigation();
  const posthog = usePostHog();
  const { params } = useRoute();
  const explorationId = params?.id;
  const exploration = explorationId ? userExplorations[explorationId] || catalog[explorationId] : null;

  if (!exploration) {
    return (
      <SafeAreaView style={styles.safe}>
        <Text style={styles.title}>Exploration not found.</Text>
      </SafeAreaView>
    );
  }

  const { phaseName, instructions } = buildExplorationStartContent(exploration);
  const logFields = buildLogFieldSummary(exploration);
  const weekCurrent = exploration.weekCurrent ?? 1;
  const weeksTotal = exploration.weeksTotal ?? exploration.duration?.match(/\d+/)?.[0] ?? "?";

  function goToHome() {
    navigation.navigate("MainTabs", { screen: "Home", params: { openLog: true } });
    posthog?.capture("exploration joined");
  }

  return (
    <SafeAreaView style={styles.safe} edges={["top", "left", "right", "bottom"]}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Text style={styles.eyebrow}>Consent confirmed</Text>
        <Text style={styles.title}>You're ready to explore</Text>
        <Text style={styles.body}>
          Your exploration-specific consent has been saved to your profile. You can withdraw at any
          time from Profile → Consent and data sharing.
        </Text>

        <View style={styles.exCard}>
          <View style={styles.exHeader}>
            <View style={[styles.iconWrap, { backgroundColor: exploration.bg || colors.greenLight }]}>
              <Text style={styles.icon}>{exploration.icon || "⬡"}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.exEyebrow}>Exploration started</Text>
              <Text style={styles.exName}>{exploration.title}</Text>
              <View style={styles.badges}>
                <Badge variant="amber">Week {weekCurrent} of {weeksTotal}</Badge>
                {exploration.active ? <Badge variant="teal">Active</Badge> : null}
              </View>
            </View>
          </View>
          <Text style={styles.exMeta}>
            {exploration.category} · {exploration.duration}
          </Text>
        </View>

        <Text style={styles.sectionTitle}>Your first actions</Text>
        {phaseName ? (
          <Text style={styles.phaseName}>{phaseName}</Text>
        ) : null}
        {instructions.map((line, i) => (
          <View key={i} style={styles.bulletRow}>
            <Text style={styles.bullet}>•</Text>
            <Text style={styles.bulletText}>{line}</Text>
          </View>
        ))}

        {logFields.length > 0 ? (
          <>
            <Text style={[styles.sectionTitle, { marginTop: 20 }]}>What to log today</Text>
            {logFields.map((label, i) => (
              <View key={i} style={styles.bulletRow}>
                <Text style={styles.bullet}>•</Text>
                <Text style={styles.bulletText}>{label}</Text>
              </View>
            ))}
          </>
        ) : null}
      </ScrollView>

      <View style={styles.footer}>
        <OnboardingContinueButton
          label="Go to Home and log today's data"
          onPress={goToHome}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  scroll: { paddingHorizontal: spacing.screen, paddingTop: spacing.xl, paddingBottom: spacing.screen },
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
    marginBottom: 20,
    fontFamily: fontFamily.regular
  },
  exCard: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: 14,
    marginBottom: 20
  },
  exHeader: { flexDirection: "row", gap: 12, marginBottom: 10 },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center"
  },
  icon: { fontSize: 22 },
  exEyebrow: {
    fontSize: 11,
    fontFamily: fontFamily.semibold,
    color: colors.greenDark,
    textTransform: "uppercase",
    letterSpacing: 0.6,
    marginBottom: 4
  },
  exName: {
    fontSize: 15,
    fontFamily: fontFamily.semibold,
    color: colors.text,
    lineHeight: 21,
    marginBottom: 8
  },
  badges: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  exMeta: { fontSize: 13, color: colors.textMuted, lineHeight: 19 },
  sectionTitle: {
    fontSize: 16,
    fontFamily: fontFamily.semibold,
    color: colors.text,
    marginBottom: 10
  },
  phaseName: {
    fontSize: 14,
    fontFamily: fontFamily.semibold,
    color: colors.greenDark,
    marginBottom: 8
  },
  bulletRow: { flexDirection: "row", gap: 8, marginBottom: 8 },
  bullet: { color: colors.greenDark, fontSize: 14, lineHeight: 22 },
  bulletText: {
    flex: 1,
    fontSize: 14,
    color: colors.textMuted,
    lineHeight: 22,
    fontFamily: fontFamily.regular
  },
  footer: {
    paddingHorizontal: spacing.screen,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xxl,
    backgroundColor: colors.bg
  }
});
