import React, { useState } from "react";
import { View, ScrollView, StyleSheet, Text, Pressable, Platform } from "react-native";
import * as Notifications from "expo-notifications";
import { useNavigation } from "@react-navigation/native";
import { useData } from "../context/DataContext";
import { useFollow } from "../context/FollowContext";
import { useConsent } from "../context/ConsentContext";
import { useProfile } from "../context/ProfileContext";
import { useUiShell } from "../context/UiContext";
import { formatConsentDate } from "../hooks/useUserExplorations";
import { colors, radius, spacing } from "../theme/colors";
import { layout, text } from "../theme/textStyles";
import { type } from "../theme/typography";
import { Card, CardTitle } from "../components/primitives/Card";
import { Badge } from "../components/primitives/Badge";
import { ScienceBanner } from "../components/primitives/ScienceBanner";
import { Avatar } from "../components/primitives/Avatar";
import { EditNameModal, EditAvatarModal } from "../components/profile/ProfileEditModals";

export default function ProfileScreen() {
  const { profile, explorations } = useData();
  const navigation = useNavigation();
  const { followingCount } = useFollow();
  const { privacyPrefs, updatePrivacyPref, explorationConsents, activeExplorationId } = useConsent();
  const { displayName, avatar, initials, avatarProps, updateDisplayName, updateAvatar } = useProfile();
  const { showToast } = useUiShell();
  const [nameModalOpen, setNameModalOpen] = useState(false);
  const [avatarModalOpen, setAvatarModalOpen] = useState(false);

  const toggles = profile.privacy?.toggles || [];

  const consentedExplorations = Object.entries(explorationConsents || {})
    .filter(([, v]) => v?.granted)
    .map(([id, v]) => {
      const ex = explorations?.[id];
      return {
        id,
        title: ex?.feedLabel || ex?.title || id,
        consentedAt: v.consentedAt,
        active: activeExplorationId === id
      };
    });

  const handleToggle = async (key, next) => {
    if (key === "reminders" && next) {
      if (Platform.OS === "web") {
        showToast("Daily reminders are available in the iOS and Android apps.");
        return;
      }
      const { status: existing } = await Notifications.getPermissionsAsync();
      if (existing !== "granted") {
        const { status } = await Notifications.requestPermissionsAsync();
        if (status !== "granted") {
          showToast("Enable notifications in your device settings to receive daily reminders.");
          return;
        }
      }
    }
    updatePrivacyPref(key, next);
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScrollView contentContainerStyle={layout.screenPad}>
        <View style={styles.hero}>
          <Pressable
            onPress={() => setAvatarModalOpen(true)}
            accessibilityLabel="Edit profile image"
            style={styles.avatarWrap}
          >
            <Avatar
              size={64}
              {...avatarProps}
              initials={initials}
              borderColor={colors.orange}
              borderWidth={2}
            />
            <View style={styles.editBadge}>
              <Text style={styles.editBadgeTxt}>Edit</Text>
            </View>
          </Pressable>
          <View style={{ flex: 1 }}>
            <Pressable onPress={() => setNameModalOpen(true)} accessibilityLabel="Edit your name">
              <Text style={styles.name}>{displayName}</Text>
              <Text style={styles.editHint}>Tap to edit name</Text>
            </Pressable>
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
          <CardTitle>My health explorations</CardTitle>
          {consentedExplorations.length === 0 ? (
            <Text style={styles.exploreEmpty}>
              You haven't consented to any explorations yet. Browse the Exploration tab to join one.
            </Text>
          ) : (
            consentedExplorations.map((ex, i, arr) => (
              <View
                key={ex.id}
                style={[
                  styles.exploreRow,
                  i < arr.length - 1 && { borderBottomWidth: 1, borderColor: colors.border }
                ]}
              >
                <View style={{ flex: 1 }}>
                  <Text style={styles.exploreTitle}>{ex.title}</Text>
                  {ex.consentedAt ? (
                    <Text style={styles.exploreMeta}>
                      Exploration consent · {formatConsentDate(ex.consentedAt)}
                    </Text>
                  ) : null}
                </View>
                {ex.active ? <Badge variant="amber">Active</Badge> : <Badge variant="teal">Joined</Badge>}
              </View>
            ))
          )}
          <Pressable style={styles.po} onPress={() => navigation.navigate("ConsentSummary")}>
            <Text style={styles.poT}>Consent and data sharing</Text>
          </Pressable>
        </Card>

        <Card>
          <CardTitle>{profile.privacy.title}</CardTitle>
          {toggles.map((t, i) => {
            const on = Boolean(privacyPrefs[t.key] ?? t.defaultOn ?? false);
            return (
              <View key={t.key} style={[styles.setRow, i === toggles.length - 1 && { borderBottomWidth: 0 }]}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.sl}>{t.label}</Text>
                  <Text style={styles.ss}>{t.sub}</Text>
                </View>
                <Pressable
                  style={[styles.toggle, !on && styles.toggleOff]}
                  onPress={() => handleToggle(t.key, !on)}
                  accessibilityRole="switch"
                  accessibilityState={{ checked: on }}
                >
                  <View style={[styles.toggleKnob, !on && styles.toggleKnobOff]} />
                </Pressable>
              </View>
            );
          })}
          {(profile.privacy.actions || []).map((a) => (
            <Pressable key={a.id} style={styles.po} onPress={() => showToast(a.toast)}>
              <Text style={styles.poT}>{a.label}</Text>
            </Pressable>
          ))}
        </Card>

        <View style={styles.legalLinks}>
          <Pressable onPress={() => navigation.navigate("PrivacyPolicy")}>
            <Text style={styles.legalLink}>Privacy policy</Text>
          </Pressable>
          <Text style={styles.legalSep}>·</Text>
          <Pressable onPress={() => navigation.navigate("ResearchEthics")}>
            <Text style={styles.legalLink}>Research ethics</Text>
          </Pressable>
        </View>

        <ScienceBanner title={profile.contributionBanner.title} body={profile.contributionBanner.body} />
      </ScrollView>

      <EditNameModal
        visible={nameModalOpen}
        initialName={displayName}
        onSave={(name) => {
          updateDisplayName(name);
          setNameModalOpen(false);
        }}
        onClose={() => setNameModalOpen(false)}
      />
      <EditAvatarModal
        visible={avatarModalOpen}
        currentAvatar={avatar}
        onSave={(next) => {
          updateAvatar(next);
          setAvatarModalOpen(false);
        }}
        onClose={() => setAvatarModalOpen(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  hero: { flexDirection: "row", gap: spacing.screen, marginBottom: spacing.sectionGap, alignItems: "center" },
  avatarWrap: { position: "relative" },
  editBadge: {
    position: "absolute",
    bottom: -2,
    right: -4,
    backgroundColor: colors.greenDark,
    borderRadius: 999,
    paddingHorizontal: 6,
    paddingVertical: 2
  },
  editBadgeTxt: {
    color: "#fff",
    fontSize: 9,
    fontFamily: "AlbertSans_600SemiBold"
  },
  name: { ...type.profileName, fontSize: 18, color: colors.text },
  editHint: { ...text.profileMeta, fontSize: 11, color: colors.greenDark, marginTop: 2, marginBottom: 2 },
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
  poT: { ...text.link, fontSize: 14 },
  exploreEmpty: { ...text.body, marginBottom: spacing.md },
  exploreRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingVertical: spacing.lg
  },
  exploreTitle: { ...text.label, marginBottom: 2 },
  exploreMeta: text.profileMeta,
  legalLinks: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.md,
    marginBottom: spacing.sectionGap
  },
  legalLink: {
    ...text.link,
    fontSize: 14,
    color: colors.greenDark
  },
  legalSep: { color: colors.textMuted, fontSize: 14 }
});
