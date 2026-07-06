import React, { useEffect } from "react";
import { View, ScrollView, StyleSheet, Text, Pressable } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { usePostHog } from "posthog-react-native";
import { useData } from "../context/DataContext";
import { useConsent } from "../context/ConsentContext";
import { masterConsentSummary } from "../data/profileLegalContent";
import { formatConsentDate } from "../hooks/useUserExplorations";
import { colors, fontFamily } from "../theme/colors";

function buildExplorationConsentList(explorations, explorationConsents, activeExplorationId) {
  return Object.entries(explorationConsents || {})
    .filter(([, v]) => v?.granted)
    .map(([id, v]) => {
      const ex = explorations?.[id];
      return {
        id,
        title: ex?.feedLabel || ex?.title || id,
        category: ex?.category,
        duration: ex?.duration,
        granted: true,
        consentedAt: v.consentedAt,
        active: activeExplorationId === id
      };
    });
}

export default function ConsentSummaryScreen() {
  const posthog = usePostHog();
  const { consent, explorations } = useData();
  const navigation = useNavigation();
  const { privacyPrefs, explorationConsents, activeExplorationId } = useConsent();
  const master = masterConsentSummary;
  const masterGranted = Boolean(privacyPrefs.globalConsent ?? privacyPrefs.consent);
  const explorationConsentList = buildExplorationConsentList(
    explorations,
    explorationConsents,
    activeExplorationId
  );

  useEffect(() => {
    posthog?.capture("viewed exploration data controls");
  }, [posthog]);

  return (
    <SafeAreaView style={styles.safe} edges={["top", "left", "right"]}>
      <View style={styles.top}>
        <Pressable onPress={() => navigation.goBack()} hitSlop={12}>
          <Text style={styles.back}>‹ Back</Text>
        </Pressable>
        <Text style={styles.hdr}>Consent and data sharing</Text>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
        <Text style={styles.eyebrow}>Your agreements</Text>
        <Text style={styles.title}>Consent and data sharing</Text>
        <Text style={styles.body}>
          A summary of the master consent you gave during onboarding, and the individual health explorations
          you have joined.
        </Text>

        <View style={styles.group}>
          <Text style={styles.groupHeading}>{master.title}</Text>
          <View style={styles.card}>
            <Text style={styles.cardBody}>{master.body}</Text>
            <View style={styles.statusRow}>
              <Text style={styles.statusLabel}>Status</Text>
              <View style={[styles.pill, masterGranted ? styles.pillYes : styles.pillNo]}>
                <Text style={[styles.pillTxt, masterGranted ? styles.pillTxtYes : styles.pillTxtNo]}>
                  {masterGranted ? master.grantedLabel : master.deniedLabel}
                </Text>
              </View>
            </View>
          </View>
          <Text style={styles.withdraw}>{master.withdrawNote}</Text>
        </View>

        <View style={styles.group}>
          <Text style={styles.groupHeading}>Individual health explorations</Text>
          {explorationConsentList.length === 0 ? (
            <View style={styles.card}>
              <Text style={styles.cardBody}>
                You have not joined any explorations yet. When you consent to an exploration, it will appear here.
              </Text>
            </View>
          ) : (
            explorationConsentList.map((ex, idx) => (
              <View
                key={ex.id}
                style={[styles.card, idx > 0 && { marginTop: 10 }]}
              >
                <Text style={styles.exTitle}>{ex.title}</Text>
                {ex.category ? <Text style={styles.exMeta}>{ex.category}</Text> : null}
                {ex.duration ? <Text style={styles.exMeta}>{ex.duration}</Text> : null}
                {ex.consentedAt ? (
                  <Text style={styles.exMeta}>Consented {formatConsentDate(ex.consentedAt)}</Text>
                ) : null}
                <View style={styles.statusRow}>
                  <Text style={styles.statusLabel}>Consent</Text>
                  <View style={[styles.pill, ex.granted ? styles.pillYes : styles.pillNo]}>
                    <Text style={[styles.pillTxt, ex.granted ? styles.pillTxtYes : styles.pillTxtNo]}>
                      {ex.granted ? "Agreed" : "Not agreed"}
                    </Text>
                  </View>
                </View>
                {ex.active ? (
                  <Text style={styles.activeNote}>Currently active exploration</Text>
                ) : null}
              </View>
            ))
          )}
        </View>

        <Text style={styles.region}>Region: {consent.jurisdiction.regionLabel}</Text>
        <Text style={styles.withdraw}>{consent.summary.withdrawNote}</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  top: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.border
  },
  back: { color: colors.greenDark, fontFamily: fontFamily.semibold, fontSize: 16, marginRight: 8 },
  hdr: { flex: 1, fontSize: 18, fontFamily: fontFamily.semibold, color: colors.text },
  eyebrow: {
    fontSize: 11,
    fontFamily: fontFamily.semibold,
    color: colors.greenDark,
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: 6
  },
  title: { fontSize: 22, fontFamily: fontFamily.semibold, color: colors.text, marginBottom: 10 },
  body: { fontSize: 14, color: colors.textMuted, lineHeight: 22, marginBottom: 20 },
  group: { marginBottom: 20 },
  groupHeading: {
    fontSize: 11,
    color: colors.textMuted,
    textTransform: "uppercase",
    letterSpacing: 0.8,
    fontFamily: fontFamily.semibold,
    marginBottom: 8
  },
  card: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: 14
  },
  cardBody: { fontSize: 14, color: colors.textMuted, lineHeight: 22, marginBottom: 12 },
  exTitle: { fontSize: 15, fontFamily: fontFamily.semibold, color: colors.text, marginBottom: 4, lineHeight: 21 },
  exMeta: { fontSize: 12, color: colors.textMuted, marginBottom: 2 },
  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 8,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: colors.border
  },
  statusLabel: { fontSize: 13, color: colors.text, fontFamily: fontFamily.medium },
  pill: { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 },
  pillYes: { backgroundColor: colors.greenLight },
  pillNo: { backgroundColor: colors.border },
  pillTxt: { fontSize: 11, fontFamily: fontFamily.semibold },
  pillTxtYes: { color: colors.greenDark },
  pillTxtNo: { color: colors.textMuted },
  activeNote: {
    marginTop: 8,
    fontSize: 12,
    fontFamily: fontFamily.medium,
    color: colors.greenDark
  },
  region: { fontSize: 12, color: colors.textMuted, fontFamily: fontFamily.medium, marginBottom: 12 },
  withdraw: {
    fontSize: 12,
    color: colors.textMuted,
    lineHeight: 18,
    backgroundColor: colors.greenLight,
    borderRadius: 10,
    padding: 12
  }
});
