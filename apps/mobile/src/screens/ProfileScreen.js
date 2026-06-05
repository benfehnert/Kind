import React, { useState } from "react";
import { View, ScrollView, StyleSheet, Text, Pressable } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { useData } from "../context/DataContext";
import { useFollow } from "../context/FollowContext";
import { useUiShell } from "../context/UiContext";
import { colors, radius, spacing } from "../theme/colors";
import { layout, text } from "../theme/textStyles";
import { type } from "../theme/typography";
import { Card, CardTitle } from "../components/primitives/Card";
import { Badge } from "../components/primitives/Badge";
import { ScienceBanner } from "../components/primitives/ScienceBanner";
import { Avatar } from "../components/primitives/Avatar";

function pravatarNum(key) {
  if (!key || typeof key !== "string") return undefined;
  const m = key.match(/pravatar-(\d+)/);
  return m ? parseInt(m[1], 10) : undefined;
}

export default function ProfileScreen() {
  const { profile } = useData();
  const navigation = useNavigation();
  const { followingCount } = useFollow();
  const { showToast } = useUiShell();

  const toggles = profile.privacy?.toggles || [];
  const [t1, setT1] = useState(toggles[0]?.defaultOn ?? true);
  const [t2, setT2] = useState(toggles[1]?.defaultOn ?? true);
  const [t3, setT3] = useState(toggles[2]?.defaultOn ?? true);
  const vals = [t1, t2, t3];
  const setters = [setT1, setT2, setT3];

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScrollView contentContainerStyle={layout.screenPad}>
        <View style={styles.hero}>
          <Avatar
            size={64}
            img={pravatarNum(profile.hero.avatarKey) ?? pravatarNum(profile.navProfile.avatarKey)}
            initials={profile.navProfile.initials}
            borderColor={colors.orange}
            borderWidth={2}
          />
          <View style={{ flex: 1 }}>
            <Text style={styles.name}>{profile.hero.name}</Text>
            <Text style={styles.loc}>{profile.hero.locationLine}</Text>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 4, marginTop: 6 }}>
              {(profile.hero.badges || []).map((b) => (
                <Badge key={b.label} variant={b.variant}>
                  {b.label}
                </Badge>
              ))}
            </View>
          </View>
        </View>

        <View style={styles.ff}>
          <Pressable style={styles.ffCell} onPress={() => navigation.navigate("FollowList", { mode: "following" })}>
            <Text style={styles.ffN}>{followingCount}</Text>
            <Text style={styles.ffL}>Following</Text>
          </Pressable>
          <View style={styles.ffDiv} />
          <Pressable style={styles.ffCell} onPress={() => navigation.navigate("FollowList", { mode: "followers" })}>
            <Text style={styles.ffN}>{profile.followStats.followers}</Text>
            <Text style={styles.ffL}>Followers</Text>
          </Pressable>
        </View>

        <Card>
          <CardTitle>{profile.summaryTitle}</CardTitle>
          {(profile.summaryRows || []).map((row, i, arr) => (
            <View
              key={row.label}
              style={[
                styles.kv,
                i < arr.length - 1 && { borderBottomWidth: 1, borderColor: colors.border, paddingBottom: 8 }
              ]}
            >
              <Text style={styles.kl}>{row.label}</Text>
              <Text
                style={[styles.kvTxt, row.valueTone === "green" ? { color: colors.greenDark } : { color: colors.text }]}
              >
                {row.value}
              </Text>
            </View>
          ))}
        </Card>

        <Card>
          <CardTitle>{profile.privacy.title}</CardTitle>
          {toggles.map((t, i) => (
            <View key={t.key} style={[styles.setRow, i === toggles.length - 1 && { borderBottomWidth: 0 }]}>
              <View style={{ flex: 1 }}>
                <Text style={styles.sl}>{t.label}</Text>
                <Text style={styles.ss}>{t.sub}</Text>
              </View>
              <Pressable
                style={[styles.toggle, !vals[i] && styles.toggleOff]}
                onPress={() => setters[i](!vals[i])}
                accessibilityRole="switch"
                accessibilityState={{ checked: vals[i] }}
              >
                <View style={[styles.toggleKnob, !vals[i] && styles.toggleKnobOff]} />
              </Pressable>
            </View>
          ))}
          {(profile.privacy.actions || []).map((a) => (
            <Pressable key={a.id} style={styles.po} onPress={() => showToast(a.toast)}>
              <Text style={styles.poT}>{a.label}</Text>
            </Pressable>
          ))}
          <Pressable style={styles.po} onPress={() => navigation.navigate("OnboardingConsent")}>
            <Text style={styles.poT}>Onboarding and consent process</Text>
          </Pressable>
          <Pressable style={styles.po} onPress={() => navigation.navigate("ConsentSummary")}>
            <Text style={styles.poT}>View my consent and data sharing</Text>
          </Pressable>
        </Card>

        <ScienceBanner title={profile.contributionBanner.title} body={profile.contributionBanner.body} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  hero: { flexDirection: "row", gap: spacing.screen, marginBottom: spacing.sectionGap, alignItems: "center" },
  name: { ...type.profileName, fontSize: 18, color: colors.text },
  loc: { ...text.profileMeta, marginBottom: 0 },
  ff: {
    flexDirection: "row",
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.sectionGap,
    overflow: "hidden"
  },
  ffCell: { flex: 1, paddingVertical: spacing.xxl, alignItems: "center" },
  ffDiv: { width: 1, backgroundColor: colors.border },
  ffN: { ...type.metricValue, color: colors.text },
  ffL: text.profileMeta,
  kv: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: spacing.lg
  },
  kl: text.body,
  kvTxt: text.feedName,
  setRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: spacing.lg,
    borderBottomWidth: 1,
    borderColor: colors.border
  },
  sl: text.label,
  ss: text.profileMeta,
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
  po: {
    marginTop: spacing.lg,
    borderWidth: 1.5,
    borderColor: colors.borderMed,
    borderRadius: radius.md,
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.xxl,
    alignItems: "center"
  },
  poT: { ...text.link, fontSize: 14 }
});
