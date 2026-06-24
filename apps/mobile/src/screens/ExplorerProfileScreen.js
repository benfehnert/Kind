import React, { useMemo, useState } from "react";
import { View, ScrollView, StyleSheet, Text, Pressable, TextInput } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation, useRoute } from "@react-navigation/native";
import { getUserProfile } from "../data/mock";
import { useData } from "../context/DataContext";
import { useFollow } from "../context/FollowContext";
import { colors, radius, spacing } from "../theme/colors";
import { layout, text } from "../theme/textStyles";
import { type } from "../theme/typography";
import { Avatar } from "../components/primitives/Avatar";
import { Badge } from "../components/primitives/Badge";
import { BackIcon } from "../components/icons/ProtoIcons";
import { RichTextParts } from "../utils/RichText";

export default function ExplorerProfileScreen() {
  const { explorations, community } = useData();
  const navigation = useNavigation();
  const { params } = useRoute();
  const userId = params?.userId;
  const { followerIdSet, isFollowing, toggleFollow, isSelf } = useFollow();
  const u = userId ? getUserProfile(userId, community, followerIdSet) : null;
  const [expanded, setExpanded] = useState({});
  const [niced, setNiced] = useState({});
  const [messageOpen, setMessageOpen] = useState({});
  const [drafts, setDrafts] = useState({});
  const [sent, setSent] = useState({});

  const acts = useMemo(() => u?.acts || [], [u]);

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
                onPress={() => navigation.navigate("ExplorationDetail", { id: ex.id })}
              >
                <View style={[styles.expIcon, { backgroundColor: ex.bg || colors.amberBg }]}>
                  <Text style={styles.expIconGlyph}>{ex.icon}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.expName}>{expMeta?.feedLabel || ex.name}</Text>
                  <Text style={styles.expProg}>{ex.active ? `Week ${ex.w} of ${ex.of}` : "Complete"}</Text>
                </View>
                {ex.active ? <Badge variant="amber">Active</Badge> : <Badge variant="teal">Complete</Badge>}
              </Pressable>
            );
          })}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Recent activity</Text>
          {acts.map((a, i) => {
            const isExpanded = !!expanded[i];
            const isNiced = !!niced[i];
            const isMsgOpen = !!messageOpen[i];
            const count = (a.nc || 0) + (isNiced ? 1 : 0);

            return (
              <Pressable
                key={i}
                style={[styles.actCard, isExpanded && styles.actCardExpanded]}
                onPress={() => setExpanded((prev) => ({ ...prev, [i]: !prev[i] }))}
              >
                <Text style={styles.actPill}>{a.exp}</Text>
                <Text style={styles.actText}>{a.t}</Text>

                {isExpanded ? (
                  <View style={styles.actDetail}>
                    <RichTextParts
                      html={a.detail || ""}
                      style={styles.actDetailText}
                      strongStyle={{ color: colors.greenDark, ...type.captionStrong }}
                    />
                  </View>
                ) : null}

                <View style={styles.actFoot} onStartShouldSetResponder={() => true}>
                  <Text style={styles.actTime}>{a.time}</Text>
                  <View style={styles.actions}>
                    <Pressable
                      style={[styles.smallBtn, isNiced && styles.smallBtnOn]}
                      onPress={(e) => {
                        e.stopPropagation();
                        setNiced((prev) => ({ ...prev, [i]: !prev[i] }));
                      }}
                    >
                      <Text style={[styles.smallBtnTxt, isNiced && styles.smallBtnTxtOn]}>👌 nice {count}</Text>
                    </Pressable>
                    <Pressable
                      style={styles.smallBtn}
                      onPress={(e) => {
                        e.stopPropagation();
                        setMessageOpen((prev) => ({ ...prev, [i]: !prev[i] }));
                      }}
                    >
                      <Text style={styles.smallBtnTxt}>💬 message</Text>
                    </Pressable>
                  </View>
                </View>

                {isMsgOpen ? (
                  <View
                    style={styles.msgBox}
                    onStartShouldSetResponder={() => true}
                  >
                    {sent[i] ? (
                      <View style={styles.msgSent}>
                        <Text style={styles.msgSentTxt}>Message sent! 🎉</Text>
                      </View>
                    ) : (
                      <>
                        <TextInput
                          style={styles.msgInput}
                          placeholder="Write an encouraging message..."
                          placeholderTextColor={colors.textMuted}
                          multiline
                          numberOfLines={3}
                          value={drafts[i] || ""}
                          onChangeText={(v) => setDrafts((prev) => ({ ...prev, [i]: v }))}
                        />
                        <View style={styles.msgActions}>
                          <Pressable
                            style={styles.msgCancel}
                            onPress={(e) => {
                              e.stopPropagation();
                              setMessageOpen((prev) => ({ ...prev, [i]: false }));
                            }}
                          >
                            <Text style={styles.msgCancelTxt}>Cancel</Text>
                          </Pressable>
                          <Pressable
                            style={styles.msgSend}
                            onPress={(e) => {
                              e.stopPropagation();
                              if (!(drafts[i] || "").trim()) return;
                              setSent((prev) => ({ ...prev, [i]: true }));
                              setTimeout(() => {
                                setMessageOpen((prev) => ({ ...prev, [i]: false }));
                                setSent((prev) => ({ ...prev, [i]: false }));
                                setDrafts((prev) => ({ ...prev, [i]: "" }));
                              }, 1800);
                            }}
                          >
                            <Text style={styles.msgSendTxt}>Send</Text>
                          </Pressable>
                        </View>
                      </>
                    )}
                  </View>
                ) : null}
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
  actCardExpanded: { borderColor: colors.greenDark },
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
  actDetail: {
    backgroundColor: colors.greenLight,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    marginTop: spacing.sm
  },
  actDetailText: { ...text.exploreDesc, color: colors.greenDark },
  actFoot: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: spacing.sm
  },
  actTime: { ...text.caption },
  actions: { flexDirection: "row", gap: spacing.sm },
  smallBtn: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.pill,
    backgroundColor: colors.bg,
    paddingHorizontal: spacing.lg,
    paddingVertical: 5
  },
  smallBtnOn: {
    borderColor: colors.greenDark,
    backgroundColor: colors.greenLight
  },
  smallBtnTxt: { ...type.chip, color: colors.textMuted },
  smallBtnTxtOn: { color: colors.greenDark },
  msgBox: { marginTop: spacing.md },
  msgInput: {
    borderWidth: 1.5,
    borderColor: colors.borderMed,
    borderRadius: radius.md,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    minHeight: 70,
    textAlignVertical: "top",
    ...text.body,
    color: colors.text,
    backgroundColor: colors.surface
  },
  msgActions: { flexDirection: "row", justifyContent: "flex-end", gap: spacing.sm, marginTop: spacing.sm },
  msgCancel: {
    borderWidth: 1,
    borderColor: colors.borderMed,
    borderRadius: radius.md,
    paddingHorizontal: spacing.xl,
    paddingVertical: 7
  },
  msgCancelTxt: { ...type.chip, color: colors.text },
  msgSend: {
    backgroundColor: colors.orange,
    borderRadius: radius.md,
    paddingHorizontal: spacing.xl,
    paddingVertical: 7
  },
  msgSendTxt: { ...type.chip, color: "#fff" },
  msgSent: {
    backgroundColor: colors.greenLight,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg
  },
  msgSentTxt: { ...type.chip, color: colors.greenDark }
});
