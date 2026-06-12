import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  View,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  Pressable,
  ActivityIndicator
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { explorationOrderUi } from "../data/mock";
import { useData } from "../context/DataContext";
import { useUiShell } from "../context/UiContext";
import { useUserExplorations, useExplorationStart } from "../hooks/useUserExplorations";
import { post } from "../lib/api";
import { colors, radius, spacing } from "../theme/colors";
import { SectionTitle, SectionSub } from "../components/primitives/SectionTitle";
import { Badge } from "../components/primitives/Badge";
import { ScienceBanner } from "../components/primitives/ScienceBanner";
import { SearchGlassIcon } from "../components/icons/ProtoIcons";
import { layout, text } from "../theme/textStyles";
import { type } from "../theme/typography";

export default function ExploreScreen() {
  const { exploreCopy } = useData();
  const explorations = useUserExplorations();
  const startExploration = useExplorationStart();
  const { showToast } = useUiShell();
  const navigation = useNavigation();
  const [q, setQ] = useState("");
  const [chat, setChat] = useState(null);
  const timer = useRef(null);

  useEffect(() => {
    if (!q.trim()) {
      setChat(null);
      return;
    }
    setChat({ loading: true });
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      post("/explore/chat", { query: q, explorers: explorations })
        .then((r) => setChat({ loading: false, ...r }))
        .catch(() => setChat({ loading: false, msg: "", explorationIds: [] }));
    }, 700);
    return () => clearTimeout(timer.current);
  }, [q, explorations]);

  const ordered = useMemo(() => explorationOrderUi(explorations), [explorations]);

  const activeId = useMemo(() => ordered.find((id) => explorations[id]?.active), [ordered, explorations]);
  const active = activeId ? explorations[activeId] : null;

  return (
    <View style={styles.root}>
      <ScrollView contentContainerStyle={styles.pad}>
        <SectionTitle>{exploreCopy.title}</SectionTitle>
        <SectionSub>{exploreCopy.subtitle}</SectionSub>
        <View style={styles.searchWrap}>
          <View style={styles.glass}>
            <SearchGlassIcon size={16} color={colors.textMuted} />
          </View>
          <TextInput
            style={styles.search}
            placeholder={exploreCopy.searchPlaceholder}
            placeholderTextColor={colors.textMuted}
            value={q}
            onChangeText={setQ}
          />
        </View>

        {chat?.loading && <ActivityIndicator color={colors.greenDark} style={{ marginVertical: 8 }} />}
        {chat && !chat.loading && chat.msg ? (
          <View style={styles.chat}>
            <View style={styles.aiBub}>
              <View style={styles.kav}>
                <Text style={{ color: "#fff", fontWeight: "700" }}>k</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.aitxt}>{chat.msg}</Text>
                {chat.explorationIds.map((id) => {
                  const e = explorations[id];
                  if (!e) return null;
                  return (
                    <Pressable
                      key={id}
                      style={styles.expCard}
                      onPress={() => navigation.navigate("ExplorationDetail", { id })}
                    >
                      <View style={[styles.eico, { backgroundColor: e.bg }]}>
                        <Text style={{ fontSize: 18 }}>{e.icon}</Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.etitle}>{e.title}</Text>
                        <Text style={styles.esub}>
                          {e.category} · {e.duration} · {e.participants} explorers
                        </Text>
                      </View>
                      <Pressable
                        style={styles.exploreBtn}
                        onPress={() => navigation.navigate("ExplorationDetail", { id })}
                      >
                        <Text style={styles.exploreBtnTxt}>Explore</Text>
                      </Pressable>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          </View>
        ) : null}

        <Text style={styles.secLabel}>{exploreCopy.activeSectionLabel}</Text>
        {active && (
          <Pressable
            style={[styles.area, styles.areaActive]}
            onPress={() => navigation.navigate("ExplorationDetail", { id: activeId })}
          >
            <View style={[styles.ico, { backgroundColor: colors.amberBg }]}>
              <Text style={styles.icoGlyph}>{active.icon}</Text>
            </View>
            <View style={styles.areaBody}>
              <Text style={styles.cat}>{active.category}</Text>
              <Text style={styles.tit}>{active.title}</Text>
              <Text style={styles.desc} numberOfLines={3} ellipsizeMode="tail">
                {active.duration} · {active.statusBadge}
              </Text>
              <View style={styles.areaMeta}>
                <Badge variant="amber">Active</Badge>
                <Badge variant="teal">{active.streak}-day streak</Badge>
              </View>
            </View>
            <View style={styles.areaStatus}>
              <Text style={styles.progressVal}>{active.progress}%</Text>
              <Text style={styles.progressLbl}>complete</Text>
            </View>
          </Pressable>
        )}

        {active && (
          <View style={styles.timelineCard}>
            <Text style={styles.cardEyebrow}>{exploreCopy.timelineCardTitle}</Text>
            {(active.phases || []).map((ph, i) => (
              <View key={i} style={styles.tlRow}>
                <View
                  style={[
                    styles.dot,
                    ph.status === "active" && styles.dotOn,
                    ph.status === "complete" && { backgroundColor: colors.borderMed }
                  ]}
                />
                <View style={{ flex: 1 }}>
                  <Text style={styles.tlName}>
                    {ph.name}{" "}
                    {ph.status === "complete" ? (
                      <Badge variant="teal">Complete</Badge>
                    ) : ph.status === "active" ? (
                      <Badge variant="amber">Active</Badge>
                    ) : null}
                  </Text>
                  <Text style={styles.tlDesc}>{ph.desc}</Text>
                </View>
              </View>
            ))}
          </View>
        )}

        <Text style={styles.secLabel}>{exploreCopy.availableSectionLabel}</Text>
        {ordered
          .filter((id) => !explorations[id]?.active)
          .map((id) => {
            const e = explorations[id];
            return (
              <Pressable key={id} style={styles.area} onPress={() => navigation.navigate("ExplorationDetail", { id })}>
                <View style={[styles.ico, { backgroundColor: e.bg }]}>
                  <Text style={styles.icoGlyph}>{e.icon}</Text>
                </View>
                <View style={styles.areaBody}>
                  <Text style={styles.cat}>{e.category}</Text>
                  <Text style={styles.tit}>{e.title}</Text>
                  <Text style={styles.desc} numberOfLines={3} ellipsizeMode="tail">
                    {e.desc}
                  </Text>
                  <View style={styles.areaMeta}>
                    <Pressable
                      onPress={(ev) => {
                        ev.stopPropagation?.();
                        navigation.navigate("ExplorersList", { explorationId: id });
                      }}
                    >
                      <Badge variant="blue">{e.participants} explorers active</Badge>
                    </Pressable>
                    <Pressable onPress={() => navigation.navigate("Evidence", { id })}>
                      <Text style={styles.evidenceLink}>See evidence</Text>
                    </Pressable>
                  </View>
                </View>
                <View style={styles.areaStatus}>
                  <Pressable
                    style={[styles.startPill, { backgroundColor: e.bg }]}
                    onPress={(ev) => {
                      ev.stopPropagation?.();
                      startExploration(navigation, id, { showToast });
                    }}
                  >
                    <Text style={[styles.startTxt, { color: e.text }]}>Start</Text>
                  </Pressable>
                </View>
              </Pressable>
            );
          })}

        <View style={styles.coming}>
          <View style={styles.comingLabel}>
            <Text style={styles.comingLabelTxt}>{exploreCopy.comingSoonLabel}</Text>
          </View>
          <Text style={styles.comingT}>{exploreCopy.comingSoonTitle}</Text>
          <Text style={styles.comingB}>{exploreCopy.comingSoonBody}</Text>
        </View>

        <ScienceBanner
          title={exploreCopy.multiExplorationBanner.title}
          body={exploreCopy.multiExplorationBanner.body}
        />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  pad: layout.screenPad,
  searchWrap: { position: "relative", marginBottom: spacing.blockMbXL },
  glass: { position: "absolute", left: spacing.xxl, top: 14, zIndex: 1 },
  search: {
    borderWidth: 1.5,
    borderColor: colors.borderMed,
    borderRadius: radius.lg,
    paddingVertical: spacing.xl,
    paddingLeft: 42,
    paddingRight: spacing.screen,
    backgroundColor: colors.surface,
    color: colors.text,
    minHeight: 48,
    ...type.body
  },
  secLabel: {
    ...text.uppercaseLabel,
    marginBottom: spacing.md,
    marginTop: spacing.xs
  },
  area: {
    flexDirection: "row",
    alignItems: "stretch",
    gap: spacing.exploreGap,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    paddingVertical: spacing.cardY,
    paddingHorizontal: spacing.cardX,
    marginBottom: spacing.feedMb,
    minHeight: 104
  },
  areaActive: { borderColor: colors.greenDark, borderWidth: 1.5 },
  areaBody: { flex: 1, justifyContent: "center", minHeight: 72 },
  areaMeta: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: spacing.md,
    marginTop: spacing.sm,
    minHeight: 28
  },
  areaStatus: {
    alignSelf: "center",
    alignItems: "flex-end",
    justifyContent: "center",
    flexShrink: 0,
    minWidth: 56
  },
  ico: {
    width: 42,
    height: 42,
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "center"
  },
  icoGlyph: { fontSize: 18, lineHeight: 22 },
  progressVal: { ...type.metricValue, fontSize: 20, color: colors.amberText },
  progressLbl: { ...type.caption, fontSize: 10, marginTop: 2 },
  cat: text.exploreCategory,
  tit: text.exploreTitle,
  desc: text.exploreDesc,
  startPill: { borderRadius: radius.pill, paddingHorizontal: spacing.xl, paddingVertical: 5 },
  startTxt: { ...type.captionStrong, color: colors.text },
  evidenceLink: { ...text.link, marginTop: 0 },
  timelineCard: layout.card,
  cardEyebrow: { ...text.uppercaseLabel, marginBottom: spacing.lg },
  tlRow: { flexDirection: "row", gap: spacing.xl, marginBottom: spacing.blockMb },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.borderMed,
    marginTop: 5
  },
  dotOn: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.greenDark,
    marginTop: 4
  },
  tlName: { ...type.bodyStrong, color: colors.text },
  tlDesc: { ...text.exploreDesc, marginTop: 2 },
  coming: {
    borderWidth: 1.5,
    borderColor: colors.orange,
    backgroundColor: colors.amberBg,
    borderRadius: radius.lg,
    paddingVertical: spacing.cardY,
    paddingHorizontal: spacing.cardX,
    marginBottom: spacing.feedMb
  },
  comingLabel: {
    alignSelf: "flex-start",
    backgroundColor: colors.orange,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.lg,
    paddingVertical: 3,
    marginBottom: spacing.sm + 4
  },
  comingLabelTxt: { ...type.captionStrong, color: "#fff" },
  comingT: { ...text.exploreTitle, marginBottom: spacing.xs },
  comingB: { ...text.exploreDesc, color: colors.amberText },
  chat: { marginTop: spacing.md, marginBottom: spacing.feedMb },
  aiBub: { flexDirection: "row", gap: spacing.lg },
  kav: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: colors.greenDark,
    alignItems: "center",
    justifyContent: "center"
  },
  aitxt: { ...text.body, marginBottom: spacing.md },
  expCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.xxl,
    marginBottom: spacing.md,
    backgroundColor: colors.surface
  },
  eico: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center"
  },
  etitle: text.feedName,
  esub: { ...text.feedTime, marginTop: 2 },
  exploreBtn: {
    backgroundColor: colors.orange,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.xxl,
    paddingVertical: spacing.sm + 2
  },
  exploreBtnTxt: { ...type.chip, color: "#fff" }
});
