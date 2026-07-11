import React, { useCallback, useState } from "react";
import { View, ScrollView, StyleSheet, Text, Pressable } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation, useRoute, useFocusEffect } from "@react-navigation/native";
import { usePostHog } from "posthog-react-native";
import { useData } from "../context/DataContext";
import { useFollow } from "../context/FollowContext";
import { get, patch } from "../lib/api";
import { ActivityNiceBlock } from "../components/activity/ActivityNiceBlock";
import { ActivityMessageBlock } from "../components/activity/ActivityMessageBlock";
import { colors, radius, spacing } from "../theme/colors";
import { layout, text } from "../theme/textStyles";
import { type } from "../theme/typography";
import { Card, CardTitle } from "../components/primitives/Card";
import { Avatar } from "../components/primitives/Avatar";
import { avatarPropsFromPerson } from "../lib/avatarProps";
import { Badge } from "../components/primitives/Badge";
import { BackIcon } from "../components/icons/ProtoIcons";
import { isShortExploration } from "../utils/explorationIds";

const RECENT_ACTIVITY_LIMIT = 6;

function normalizeBadges(badges = []) {
  return badges.map((b) => ({
    variant: b.variant || b.s || "teal",
    label: b.label || b.t || ""
  }));
}

export default function ExplorerProfileScreen() {
  const { explorations } = useData();
  const posthog = usePostHog();
  const navigation = useNavigation();
  const { params } = useRoute();
  const userId = params?.userId;
  const { isFollowing, toggleFollow, isSelf } = useFollow();
  const [profile, setProfile] = useState(null);
  const [acts, setActs] = useState([]);
  const [unavailable, setUnavailable] = useState(false);
  const [togglingNice, setTogglingNice] = useState({});

  const loadProfile = useCallback(async () => {
    if (!userId) return;
    setUnavailable(false);
    try {
      const data = await get(`/community/individuals/${userId}`);
      setProfile(data);
      setActs((data.acts || []).slice(0, RECENT_ACTIVITY_LIMIT));
    } catch {
      setProfile(null);
      setActs([]);
      setUnavailable(true);
    }
  }, [userId]);

  useFocusEffect(
    useCallback(() => {
      loadProfile();
    }, [loadProfile])
  );

  const toggleNice = useCallback(
    async (act) => {
      if (!act?.id || act.kind === "report" || togglingNice[act.id] || isSelf(userId)) return;
      const previous = { nc: act.nc || 0, viewerNiced: !!act.viewerNiced, supporterPreview: act.supporterPreview || [] };
      const optimisticNiced = !previous.viewerNiced;

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
        posthog?.capture("interacted with a community post");
      } catch (err) {
        console.error("[ExplorerProfile] toggle nice failed:", err);
        setActs((prev) =>
          prev.some((row) => row.id === act.id)
            ? prev.map((row) => (row.id === act.id ? { ...row, ...previous } : row))
            : prev
        );
      } finally {
        setTogglingNice((prev) => ({ ...prev, [act.id]: false }));
      }
    },
    [isSelf, posthog, togglingNice, userId]
  );

  const openSupporters = useCallback(
    (act) => {
      if (!act?.id || act.kind === "report" || !(act.nc > 0)) return;
      navigation.navigate("NiceSupporters", { activityPostId: act.id });
    },
    [navigation]
  );

  const openActivity = useCallback(
    (act) => {
      if (act?.kind === "report" && act.explorationId) {
        navigation.navigate("ExplorationReport", {
          explorationId: act.explorationId,
          ownerSlug: userId
        });
        return;
      }
      if (!act?.id || act.kind === "report") return;
      navigation.navigate("ActivityDetail", { activityPostId: act.id });
    },
    [navigation, userId]
  );

  const u = profile;

  if (!u || !userId) {
    return (
      <SafeAreaView style={{ flex: 1, padding: 20, backgroundColor: colors.bg }}>
        <Text style={styles.name}>{unavailable ? "Individual not available" : "Explorer not found"}</Text>
        <Text style={styles.loc}>
          {unavailable
            ? "This Individual is not visible in the community, or you do not have permission to view other Individuals."
            : "We could not load this profile."}
        </Text>
        <Pressable onPress={() => navigation.goBack()}>
          <Text style={{ color: colors.greenDark, marginTop: 12 }}>Back</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  const following = isFollowing(userId);
  const mutualText = u.follower ? "Follows you" : "";
  const badges = normalizeBadges(u.badges);
  const locationLine = u.locationLine || (u.loc ? u.loc : "");
  const exps = u.exps || [];

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

      <ScrollView contentContainerStyle={layout.screenPad}>
        <View style={styles.hero}>
          <Avatar
            size={64}
            {...avatarPropsFromPerson(u)}
            borderColor={colors.orange}
            borderWidth={2}
          />
          <View style={{ flex: 1 }}>
            <Text style={styles.name}>{u.name}</Text>
            {locationLine ? <Text style={styles.loc}>{locationLine}</Text> : null}
            {badges.length ? (
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 4, marginTop: 6 }}>
                {badges.map((b) => (
                  <Badge key={b.label} variant={b.variant}>
                    {b.label}
                  </Badge>
                ))}
              </View>
            ) : null}
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

        <View style={styles.ff}>
          <Pressable
            style={styles.ffCell}
            onPress={() =>
              navigation.navigate("FollowList", {
                mode: "following",
                userId,
                userName: u.name
              })
            }
          >
            <Text style={styles.ffN}>{u.followStats?.following ?? 0}</Text>
            <Text style={styles.ffL}>Following</Text>
          </Pressable>
          <View style={styles.ffDiv} />
          <Pressable
            style={styles.ffCell}
            onPress={() =>
              navigation.navigate("FollowList", {
                mode: "followers",
                userId,
                userName: u.name
              })
            }
          >
            <Text style={styles.ffN}>{u.followStats?.followers ?? 0}</Text>
            <Text style={styles.ffL}>Followers</Text>
          </Pressable>
        </View>

        <Card>
          <CardTitle>{u.summaryTitle || "My exploration summary"}</CardTitle>
          {u.hasSummaryData ? (
            (u.summaryRows || []).map((row, i, arr) => (
              <View
                key={row.label}
                style={[
                  styles.kv,
                  i < arr.length - 1 && { borderBottomWidth: 1, borderColor: colors.border, paddingBottom: 8 }
                ]}
              >
                <Text style={styles.kl}>{row.label}</Text>
                <Text
                  style={[
                    styles.kvTxt,
                    row.valueTone === "green" ? { color: colors.greenDark } : { color: colors.text }
                  ]}
                >
                  {row.value}
                </Text>
              </View>
            ))
          ) : (
            <Text style={styles.exploreEmpty}>
              {u.emptySummaryMessage ||
                "Join an exploration and log daily check-ins to build your personal summary."}
            </Text>
          )}
        </Card>

        <Card>
          <CardTitle>My health explorations</CardTitle>
          {exps.length === 0 ? (
            <Text style={styles.exploreEmpty}>No active explorations yet.</Text>
          ) : (
            exps.map((ex, i, arr) => {
              const expMeta = explorations[ex.id];
              return (
                <Pressable
                  key={ex.id}
                  onPress={() =>
                    navigation.navigate("ExplorationSummary", {
                      id: ex.id,
                      ownerSlug: userId,
                      ownerName: u.name,
                      ownerWeek: ex.w,
                      ownerWeeksTotal: ex.of,
                      ownerActive: ex.active
                    })
                  }
                  style={[
                    styles.exploreRow,
                    i < arr.length - 1 && { borderBottomWidth: 1, borderColor: colors.border }
                  ]}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={styles.exploreTitle}>{expMeta?.feedLabel || ex.name}</Text>
                    <Text style={styles.exploreMeta}>
                      {ex.active
                        ? `${isShortExploration(ex.id) ? "Day" : "Week"} ${ex.w} of ${ex.of}`
                        : "Complete"}
                    </Text>
                  </View>
                  {ex.active ? <Badge variant="amber">Active</Badge> : <Badge variant="teal">Complete</Badge>}
                </Pressable>
              );
            })
          )}
        </Card>

        <Card>
          <CardTitle>Recent activity</CardTitle>
          {acts.length === 0 ? (
            <Text style={styles.exploreEmpty}>No recent activity yet.</Text>
          ) : (
            acts.map((a, i) => {
              const actKey = a.id || String(i);
              const isReport = a.kind === "report";

              return (
                <Pressable
                  key={actKey}
                  style={[styles.actCard, i < acts.length - 1 && styles.actCardGap]}
                  onPress={() => openActivity(a)}
                >
                  <Text style={styles.actPill}>{a.exp}</Text>
                  <Text style={styles.actText}>{a.t}</Text>

                  <View style={styles.actFoot} onStartShouldSetResponder={() => true}>
                    <Text style={styles.actTime}>{a.time}</Text>
                    {!isReport ? (
                      <View style={styles.actions}>
                        <ActivityNiceBlock
                          count={a.nc || 0}
                          viewerNiced={!!a.viewerNiced}
                          supporterPreview={a.supporterPreview || []}
                          onToggleNice={() => toggleNice(a)}
                          onOpenSupporters={() => openSupporters(a)}
                          disabled={!!togglingNice[a.id]}
                          canToggleNice={!isSelf(userId)}
                        />
                        <ActivityMessageBlock
                          count={a.mc || 0}
                          messagePreview={a.messagePreview || []}
                          onOpenMessages={() => openActivity(a)}
                        />
                      </View>
                    ) : (
                      <Text style={styles.reportLink}>View report</Text>
                    )}
                  </View>
                </Pressable>
              );
            })
          )}
        </Card>
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
  hero: { flexDirection: "row", gap: spacing.screen, marginBottom: spacing.sectionGap, alignItems: "center" },
  name: { ...type.profileName, fontSize: 18, color: colors.text },
  loc: { ...text.profileMeta, marginBottom: 0 },
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
  exploreEmpty: { ...text.body, marginBottom: spacing.md },
  exploreRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingVertical: spacing.lg
  },
  exploreTitle: { ...text.label, marginBottom: 2 },
  exploreMeta: text.profileMeta,
  actCard: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    paddingVertical: spacing.cardY,
    paddingHorizontal: spacing.cardX,
    backgroundColor: colors.surface
  },
  actCardGap: { marginBottom: spacing.feedMb },
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
  actions: { flexDirection: "row", gap: spacing.sm, alignItems: "flex-end" },
  reportLink: { ...text.link, fontSize: 13, color: colors.greenDark }
});
