import React from "react";
import { View, ScrollView, StyleSheet, Text, Pressable } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { useData } from "../context/DataContext";
import { useConsent } from "../context/ConsentContext";
import { colors, fontFamily } from "../theme/colors";

export default function ConsentSummaryScreen() {
  const { consent } = useData();
  const navigation = useNavigation();
  const { choices, completed } = useConsent();
  const s = consent.summary;
  const labels = consent.consentLabels || {};

  return (
    <SafeAreaView style={styles.safe} edges={["top", "left", "right"]}>
      <View style={styles.top}>
        <Pressable onPress={() => navigation.goBack()} hitSlop={12}>
          <Text style={styles.back}>‹ Back</Text>
        </Pressable>
        <Text style={styles.hdr}>Consent & data sharing</Text>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
        <Text style={styles.eyebrow}>{s.eyebrow}</Text>
        <Text style={styles.title}>{s.title}</Text>
        <Text style={styles.body}>{s.body}</Text>

        {!completed ? (
          <View style={styles.banner}>
            <Text style={styles.bannerTitle}>{s.notStartedTitle}</Text>
            <Text style={styles.bannerBody}>{s.notStartedBody}</Text>
            <Pressable
              style={styles.bannerBtn}
              onPress={() => navigation.navigate("OnboardingConsent")}
            >
              <Text style={styles.bannerBtnTxt}>Start onboarding & consent</Text>
            </Pressable>
          </View>
        ) : null}

        {(s.groups || []).map((group) => (
          <View key={group.heading} style={styles.group}>
            <Text style={styles.groupHeading}>{group.heading}</Text>
            <View style={styles.card}>
              {group.keys.map((key, idx, arr) => {
                const granted = Boolean(choices[key]);
                return (
                  <View
                    key={key}
                    style={[
                      styles.row,
                      idx < arr.length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.border }
                    ]}
                  >
                    <Text style={styles.rowLabel}>{labels[key] || key}</Text>
                    <View style={[styles.pill, granted ? styles.pillYes : styles.pillNo]}>
                      <Text style={[styles.pillTxt, granted ? styles.pillTxtYes : styles.pillTxtNo]}>
                        {granted ? s.grantedLabel : s.deniedLabel}
                      </Text>
                    </View>
                  </View>
                );
              })}
            </View>
          </View>
        ))}

        <Text style={styles.region}>Region: {consent.jurisdiction.regionLabel}</Text>
        <Text style={styles.withdraw}>{s.withdrawNote}</Text>

        <Pressable
          style={styles.editBtn}
          onPress={() => navigation.navigate("OnboardingConsent", { review: true })}
        >
          <Text style={styles.editBtnTxt}>Review or change my choices</Text>
        </Pressable>
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
  body: { fontSize: 14, color: colors.textMuted, lineHeight: 22, marginBottom: 16 },
  banner: {
    backgroundColor: colors.amberBg,
    borderRadius: 12,
    padding: 14,
    marginBottom: 18
  },
  bannerTitle: { fontSize: 14, fontFamily: fontFamily.semibold, color: colors.amberText, marginBottom: 4 },
  bannerBody: { fontSize: 13, color: colors.amberText, lineHeight: 19, marginBottom: 10 },
  bannerBtn: {
    backgroundColor: colors.greenDark,
    borderRadius: 10,
    paddingVertical: 11,
    alignItems: "center"
  },
  bannerBtnTxt: { color: "#fff", fontFamily: fontFamily.semibold, fontSize: 13 },
  group: { marginBottom: 18 },
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
    paddingHorizontal: 14
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 14
  },
  rowLabel: { flex: 1, fontSize: 13, color: colors.text, lineHeight: 19 },
  pill: { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 },
  pillYes: { backgroundColor: colors.greenLight },
  pillNo: { backgroundColor: colors.border },
  pillTxt: { fontSize: 11, fontFamily: fontFamily.semibold },
  pillTxtYes: { color: colors.greenDark },
  pillTxtNo: { color: colors.textMuted },
  region: { fontSize: 12, color: colors.textMuted, fontFamily: fontFamily.medium, marginBottom: 12 },
  withdraw: {
    fontSize: 12,
    color: colors.textMuted,
    lineHeight: 18,
    backgroundColor: colors.greenLight,
    borderRadius: 10,
    padding: 12,
    marginBottom: 16
  },
  editBtn: {
    borderWidth: 1.5,
    borderColor: colors.borderMed,
    borderRadius: 12,
    paddingVertical: 13,
    alignItems: "center"
  },
  editBtnTxt: { color: colors.greenDark, fontFamily: fontFamily.semibold, fontSize: 14 }
});
