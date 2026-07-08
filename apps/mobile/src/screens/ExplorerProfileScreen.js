import React, { useCallback, useState } from "react";
import { View, ScrollView, StyleSheet, Text, Pressable } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation, useRoute, useFocusEffect } from "@react-navigation/native";
import { getUserProfile } from "../data/mock";
import { useData } from "../context/DataContext";
import { useFollow } from "../context/FollowContext";
import { get, patch } from "../lib/api";
import { ActivityNiceBlock } from "../components/activity/ActivityNiceBlock";
import { ActivityMessageBlock } from "../components/activity/ActivityMessageBlock";
import { colors, radius, spacing } from "../theme/colors";
import { layout, text } from "../theme/textStyles";
import { type } from "../theme/typography";
import { Avatar } from "../components/primitives/Avatar";
import { Badge } from "../components/primitives/Badge";
import { BackIcon } from "../components/icons/ProtoIcons";
import { isShortExploration } from "../utils/explorationIds";

export default function ExplorerProfileScreen() {
  const { explorations, community } = useData();
  const navigation = useNavigation();
  const { params } = useRoute();
  const userId = params?.userId;
  const { followerIdSet, isFollowing, toggleFollow, isSelf } = useFollow();
  const u = userId ? getUserProfile(userId, community, followerIdSet) : null;
  const [acts, setActs] = useState([]);
  const [togglingNice, setTogglingNice] = useState({});

  const loadActs = useCallback(async () => {
    if (!userId) return;
    try {
      const profile = await get(`/community/individuals/${userId}`);
      setActs(profile.acts || []);
    } catch {
      setActs(u?.acts || []);
    }
  }, [userId, u?.acts]);

  useFocusEffect(
    useCallback(() => {
      loadActs();
    }, [loadActs])
  );

  const toggleNice = useCallback(
    async (act) => {
      if (!act?.id || togglingNice[act.id]) return;
      const previous = { nc: act.nc || 0, viewerNiced: !!act.viewerNiced, supporterPreview: act.supporterPreview || [] };
      const optimisticNiced = !previous.viewerNiced;

      // Flip the icon/color instantly, then reconcile with the server response.
      setActs((prev) =>
        prev.map((row) =>
          row.id === act.id
            ? {
                ...row,
                nc: Math.max(0, previous.nc + (optimisticNiced ? 1 : -1)),
                viewerNiced: optimisticNiced
              }
            : row
        )
      );
      setTogglingNice((prev) => ({ ...prev, [act.id]: true }));
      try {
        const result = await patch(`/activity-posts/${act.id}/nice`, {});
        setActs((prev) =>
          prev.map((row) =>
            row.id === act.id
              ? {
                  ...row,
                  nc: result.nc,
                  viewerNiced: result.viewerNiced,
                  supporterPreview: result.supporterPreview || []
                }
              : row
          )
        );
      } catch (err) {
        console.error("[ExplorerProfile] toggle nice failed:", err);
        setActs((prev) => (prev.some((row) => row.id === act.id) ? prev.map((row) => (row.id === act.id ? { ...row, ...previous } : row)) : prev));
      } finally {
        setTogglingNice((prev) => ({ ...prev, [act.id]: false }));
      }
    },
    [togglingNice]
  );

  const openSupporters = useCallback(
    (act) => {
      if (!act?.id || !(act.nc > 0)) return;
      navigation.navigate("NiceSupporters", { activityPostId: act.id });
    },
    [navigation]
  );

  const openActivity = useCallback(
    (act) => {
      if (!act?.id) return;
      navigation.navigate("ActivityDetail", { activityPostId: act.id });
    },
    [navigation]
  );

  if (!u || !userId) {
    return (
      <SafeAreaView style={{ flex: 1, padding: 20 }}>
        <Text>Explorer not found</Text>
        <Pressable onPress={() => navigation.goBack()}>
          <Text style={{ color: colors.greenDark, marginTop: 12 }}>Back</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  const following = isFollowing(userId);
  const mutualText = u.follower ? "Follows you" : "";

  return (
    <SafeAreaView style={styles.safe} edges={["top", "left", "right", "bottom"]}>
      <View style={styles.header}>
        <Pressable style={styles.backBtn} onPress={() => navigation.goBack()} hitSlop={12}>
          <BackIcon />
        </Pressable>
        <Text style={styles.hdr} numberOfLines={1}>
          {u.name}
        </Text>
      </View>

      <ScrollView contentContainerStyle={styles.pad}>
        <View style={styles.heroWrap}>
          <View style={styles.hero}>
            <Avatar
              size={64}
              img={u.img}
              sceneKey={u.sceneKey}
              initials={u.initials}
              avatarUrl={u.avatarUrl}
            />
            <View style={{ flex: 1 }}>
              <Text style={styles.name}>{u.name}</Text>
              <Text style={styles.loc}>📍 {u.loc}</Text>
              <Text style={styles.bio}>{u.bio}</Text>
              <View style={styles.followRow}>
                {!isSelf(userId) ? (
                  <Pressable style={[styles.followBtn, following && styles.followBtnOn]} onPress={() => toggleFollow(userId)}>
                    <Text style={[styles.followTxt, following && styles.followTxtOn]}>{following ? "Following" : "Follow"}</Text>
                  </Pressable>
                ) : null}
                {mutualText ? <Text style={styles.mutualTxt}>· {mutualText}</Text> : null}
              </View>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Explorations</Text>
          {(u.exps || []).map((ex) => {
            const expMeta = explorations[ex.id];
            return (
              <Pressable
                key={ex.id}
                style={styles.expRow}
                onPress={() =>
                  navigation.navigate("ExplorationDetail", {
                    id: ex.id,
                    ownerSlug: userId,
                    ownerName: u.name,
                    ownerWeek: ex.w,
                    ownerWeeksTotal: ex.of,
                    ownerActive: ex.active
                  })
                }
              >
                <View style={[styles.expIcon, { backgroundColor: ex.bg || colors.amberBg }]}>
                  <Text style={styles.expIconGlyph}>{ex.icon}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.expName}>{expMeta?.feedLabel || ex.name}</Text>
                  <Text style={styles.expProg}>
                    {ex.active ? `${isShortExploration(ex.id) ? "Day" : "Week"} ${ex.w} of ${ex.of}` : "Complete"}
                  </Text>
                </View>
                {ex.active ? <Badge variant="amber">Active</Badge> : <Badge variant="teal">Complete</Badge>}
              </Pressable>
            );
          })}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Recent activity</Text>
          {acts.map((a, i) => {
            const actKey = a.id || String(i);

            return (
              <Pressable
                key={actKey}
                style={styles.actCard}
                onPress={() => openActivity(a)}
              >
                <Text style={styles.actPill}>{a.exp}</Text>
                <Text style={styles.actText}>{a.t}</Text>

                <View style={styles.actFoot} onStartShouldSetResponder={() => true}>
                  <Text style={styles.actTime}>{a.time}</Text>
                  <View style={styles.actions}>
                    <ActivityNiceBlock
                      count={a.nc || 0}
                      viewerNiced={!!a.viewerNiced}
                      supporterPreview={a.supporterPreview || []}
                      onToggleNice={() => toggleNice(a)}
                      onOpenSupporters={() => openSupporters(a)}
                      disabled={!!togglingNice[a.id]}
                    />
                    <ActivityMessageBlock
                      count={a.mc || 0}
                      messagePreview={a.messagePreview || []}
                      onOpenMessages={() => openActivity(a)}
                    />
                  </View>
                </View>
              </Pressable>
            );
          })}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  header: {
    backgroundColor: colors.greenDark,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xl,
    paddingHorizontal: spacing.screen,
    paddingVertical: spacing.xl
  },
  backBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "rgba(255,255,255,0.12)",
    alignItems: "center",
    justifyContent: "center"
  },
  hdr: { ...type.button, color: "#fff", flex: 1 },
  pad: { paddingBottom: spacing.screenBottom },
  heroWrap: {
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingHorizontal: spacing.screen,
    paddingVertical: spacing.blockMbLg
  },
  hero: { flexDirection: "row", gap: spacing.xxl, alignItems: "flex-start" },
  name: { ...type.profileName, fontSize: 18, color: colors.text },
  loc: { ...text.sectionSub, marginBottom: 0 },
  bio: { ...text.body, marginTop: spacing.sm },
  followRow: { flexDirection: "row", alignItems: "center", gap: spacing.md, marginTop: spacing.lg },
  followBtn: {
    borderWidth: 1.5,
    borderColor: colors.greenDark,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.lg,
    paddingVertical: 5
  },
  followBtnOn: { backgroundColor: colors.greenDark },
  followTxt: { ...type.captionStrong, color: colors.greenDark },
  followTxtOn: { color: "#fff" },
  mutualTxt: { ...text.caption },
  section: { paddingHorizontal: spacing.screen, paddingTop: spacing.blockMb },
  sectionLabel: { ...text.uppercaseLabel, marginBottom: spacing.xl },
  expRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xl,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border
  },
  expIcon: {
    width: 36,
    height: 36,
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center"
  },
  expIconGlyph: { fontSize: 16 },
  expName: { ...text.feedName },
  expProg: { ...text.profileMeta },
  actCard: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    paddingVertical: spacing.cardY,
    paddingHorizontal: spacing.cardX,
    marginBottom: spacing.feedMb,
    backgroundColor: colors.surface
  },
  actPill: {
    ...type.captionStrong,
    color: colors.greenDark,
    backgroundColor: colors.greenLight,
    alignSelf: "flex-start",
    borderRadius: radius.pill,
    paddingHorizontal: 8,
    paddingVertical: 2,
    marginBottom: spacing.sm
  },
  actText: { ...text.body },
  actFoot: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: spacing.sm
  },
  actTime: { ...text.caption },
  actions: { flexDirection: "row", gap: spacing.sm, alignItems: "flex-end" }
});
