import React from "react";
import { Text, StyleSheet } from "react-native";
import { ProfileDetailScreen, LegalSection } from "../components/profile/ProfileDetailScreen";
import { privacyPolicyContent } from "../data/profileLegalContent";
import { colors, fontFamily } from "../theme/colors";

export default function PrivacyPolicyScreen() {
  const c = privacyPolicyContent;
  return (
    <ProfileDetailScreen title={c.title}>
      <Text style={styles.updated}>{c.updated}</Text>
      {c.sections.map((s) => (
        <LegalSection key={s.heading} heading={s.heading} body={s.body} />
      ))}
    </ProfileDetailScreen>
  );
}

const styles = StyleSheet.create({
  updated: {
    fontSize: 12,
    color: colors.textMuted,
    fontFamily: fontFamily.medium,
    marginBottom: 16
  }
});
