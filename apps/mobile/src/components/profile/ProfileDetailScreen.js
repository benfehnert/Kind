import React from "react";
import { View, ScrollView, StyleSheet, Text, Pressable } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { colors, fontFamily, spacing } from "../../theme/colors";

export function ProfileDetailScreen({ title, children }) {
  const navigation = useNavigation();

  return (
    <SafeAreaView style={styles.safe} edges={["top", "left", "right"]}>
      <View style={styles.top}>
        <Pressable onPress={() => navigation.goBack()} hitSlop={12}>
          <Text style={styles.back}>‹ Back</Text>
        </Pressable>
        <Text style={styles.hdr}>{title}</Text>
      </View>
      <ScrollView contentContainerStyle={styles.scroll}>{children}</ScrollView>
    </SafeAreaView>
  );
}

export function LegalSection({ heading, body, updated }) {
  return (
    <View style={styles.section}>
      {updated ? <Text style={styles.updated}>{updated}</Text> : null}
      <Text style={styles.sectionHeading}>{heading}</Text>
      <Text style={styles.sectionBody}>{body}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  top: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.screen,
    paddingVertical: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border
  },
  back: { color: colors.greenDark, fontFamily: fontFamily.semibold, fontSize: 16, marginRight: spacing.md },
  hdr: { flex: 1, fontSize: 18, fontFamily: fontFamily.semibold, color: colors.text },
  scroll: { padding: spacing.screen, paddingBottom: 40 },
  section: { marginBottom: spacing.blockMbLg },
  updated: {
    fontSize: 12,
    color: colors.textMuted,
    fontFamily: fontFamily.medium,
    marginBottom: spacing.lg
  },
  sectionHeading: {
    fontSize: 16,
    fontFamily: fontFamily.semibold,
    color: colors.text,
    marginBottom: spacing.md
  },
  sectionBody: {
    fontSize: 14,
    color: colors.textMuted,
    lineHeight: 22,
    fontFamily: fontFamily.regular
  }
});
