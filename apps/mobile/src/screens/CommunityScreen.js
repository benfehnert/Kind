import React, { useEffect, useMemo, useState, useCallback } from "react";
import { View, ScrollView, StyleSheet, Text, TextInput, Pressable } from "react-native";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import { SearchGlassIcon } from "../components/icons/ProtoIcons";
import { getUserProfile, getResearcher } from "../data/mock";
import { useData } from "../context/DataContext";
import { useUserExplorations } from "../hooks/useUserExplorations";
import { useFollow } from "../context/FollowContext";
import { colors, fontSize, heights, radius, spacing } from "../theme/colors";
import { layout, text } from "../theme/textStyles";
import { type } from "../theme/typography";
import { ScienceBanner } from "../components/primitives/ScienceBanner";
import { Badge } from "../components/primitives/Badge";
import { Avatar } from "../components/primitives/Avatar";
import { Card, CardTitle } from "../components/primitives/Card";
import { RichTextParts } from "../utils/RichText";

const INITIAL_VISIBLE = 8;
const PAGE_SIZE = 8;
const INITIAL_PANEL_HEIGHT = 420;
const PANEL_HEIGHT_STEP = 220;

export default function CommunityScreen() {
  const { community, explorationEvidence, exploreCopy, explorePage, refetchExplore } = useData();
  const explorations = useUserExplorations();
  const navigation = useNavigation();
  const { isFollowing, toggleFollow, followerIdSet, isSelf } = useFollow();
  const [tab, setTab] = useState("individuals");
  const [q, setQ] = useState("");
  const [visibleCount, setVisibleCount] = useState(INITIAL_VISIBLE);
  const [panelHeight, setPanelHeight] = useState(INITIAL_PANEL_HEIGHT);
  const c = exploreCopy?.community ?? explorePage?.copy?.community ?? {};
  const query = q.trim().toLowerCase();

  useFocusEffect(
    useCallback(() => {
      refetchExplore?.();
    }, [refetchExplore])
  );

  const allPeople = useMemo(() => {
    const base = [...(community.basicUsers || []), ...(community.followerOnly || [])];
    const rich = Object.keys(community.commUsers || {}).map((id) => ({ id, ...community.commUsers[id] }));
    const merged = [...rich, ...base];
    merged.sort((a, b) => (a.name || "").localeCompare(b.name || ""));
    return merged;
  }, []);

  const people = useMemo(() => {
    const filtered = allPeople.filter((u) => {
      if (!query) return true;
      return (
        (u.name || "").toLowerCase().includes(query) ||
        (u.meta || "").toLowerCase().includes(query) ||
        (u.loc || "").toLowerCase().includes(query)
      );
    });
    return filtered.sort((a, b) => {
      const af = a.id ? (isFollowing(a.id) ? 0 : 1) : 1;
      const bf = b.id ? (isFollowing(b.id) ? 0 : 1) : 1;
      if (af !== bf) return af - bf;
      return (a.name || "").localeCompare(b.name || "");
    });
  }, [allPeople, query, isFollowing]);

  const evIds = useMemo(
    () => explorePage?.explorationOrder ?? Object.keys(explorations || {}),
    [explorePage?.explorationOrder, explorations]
  );

  const filteredExplorationIds = useMemo(() => {
    const ids = evIds.filter((id) => {
      const e = explorations[id];
      const rid = getResearcher(e?.researcherId, community.researchers);
      if (!query) return true;
      return (
        (e?.title || "").toLowerCase().includes(query) ||
        (e?.category || "").toLowerCase().includes(query) ||
        (e?.desc || "").toLowerCase().includes(query) ||
        (rid?.name || "").toLowerCase().includes(query)
      );
    });
    if (!query) return ids;
    return ids.sort((a, b) => {
      const as = explorations[a]?.active ? 0 : 1;
      const bs = explorations[b]?.active ? 0 : 1;
      if (as !== bs) return as - bs;
      return (explorations[a]?.title || "").localeCompare(explorations[b]?.title || "");
    });
  }, [evIds, query]);

  const filteredResearchers = useMemo(() => {
    const rows = (community.researchers || []).filter((r) => {
      if (!query) return true;
      return (
        (r.name || "").toLowerCase().includes(query) ||
        (r.title || "").toLowerCase().includes(query) ||
        (r.org || "").toLowerCase().includes(query) ||
        (r.areas || []).join(" ").toLowerCase().includes(query)
      );
    });
    return rows;
  }, [query]);

  const evidenceHits = useMemo(() => Object.keys(explorationEvidence || {}), []);
  const filteredEvidenceIds = useMemo(() => {
    const ids = evidenceHits.filter((expId) => {
      const ev = explorationEvidence[expId];
      const exp = explorations[expId];
      if (!query) return true;
      return (
        (ev?.docTitle || "").toLowerCase().includes(query) ||
        (ev?.docSubtitle || "").toLowerCase().includes(query) ||
        (ev?.summaryShort || "").toLowerCase().includes(query) ||
        (exp?.title || "").toLowerCase().includes(query) ||
        (exp?.category || "").toLowerCase().includes(query)
      );
    });
    if (!query) return ids;
    return ids.sort((a, b) => {
      const as = explorations[a]?.active ? 0 : 1;
      const bs = explorations[b]?.active ? 0 : 1;
      if (as !== bs) return as - bs;
      return (explorations[a]?.title || "").localeCompare(explorations[b]?.title || "");
    });
  }, [evidenceHits, query]);

  useEffect(() => {
    setVisibleCount(INITIAL_VISIBLE);
    setPanelHeight(INITIAL_PANEL_HEIGHT);
  }, [tab, query]);

  const panelList = useMemo(() => {
    if (tab === "individuals") return people;
    if (tab === "explorations") return filteredExplorationIds;
    if (tab === "researchers") return filteredResearchers;
    return filteredEvidenceIds;
  }, [tab, people, filteredExplorationIds, filteredResearchers, filteredEvidenceIds]);

  const remaining = Math.max(0, panelList.length - visibleCount);
  const nextBatch = Math.min(PAGE_SIZE, remaining);
  const canShowMore = remaining > 0;
  const isExpanded = visibleCount > INITIAL_VISIBLE;

  const showMore = () => {
    setVisibleCount((n) => Math.min(n + PAGE_SIZE, panelList.length));
    setPanelHeight((h) => h + PANEL_HEIGHT_STEP);
  };

  const showLess = () => {
    setVisibleCount(INITIAL_VISIBLE);
    setPanelHeight(INITIAL_PANEL_HEIGHT);
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScrollView contentContainerStyle={layout.screenPad}>
        <Text style={text.sectionTitle}>{c.title}</Text>
        <Text style={text.sectionSub}>{c.subtitle}</Text>
        <ScienceBanner title={c.bannerTitle} body={c.bannerBody} footer={<View style={styles.bb}>{c.bannerBadges.map((b) => <Badge key={b.label} variant={b.variant}>{b.label}</Badge>)}</View>} />

        <View style={styles.sw}>
          <View style={styles.glass}>
            <SearchGlassIcon size={16} color={colors.textMuted} />
          </View>
          <TextInput
            style={styles.si}
            placeholder={exploreCopy.communitySearchPlaceholder}
            placeholderTextColor={colors.textMuted}
            value={q}
            onChangeText={setQ}
          />
        </View>

        <View style={styles.commBrowse}>
          <View style={styles.commTabs}>
            {c.subTabs.map((label, i) => {
              const key = ["individuals", "explorations", "researchers", "evidence"][i];
              const on = tab === key;
              return (
                <Pressable key={key} style={[styles.csTab, on && styles.csTabOn]} onPress={() => setTab(key)}>
                  <Text style={[styles.csTabText, on && styles.csTabTextOn]}>{label}</Text>
                </Pressable>
              );
            })}
          </View>

          <View
            style={[
              styles.csPanel,
              { maxHeight: panelHeight },
              tab === "explorations" ? styles.csPanelExplorations : styles.csPanelDefault
            ]}
          >
            {tab === "individuals" &&
              people.slice(0, visibleCount).map((u) => {
            const uid = u.id;
            const prof = uid ? getUserProfile(uid, community, new Set()) : u;
            const following = uid ? isFollowing(uid) : false;
            const badges = (prof.badges || []).slice(0, 2);
            return (
              <Pressable key={uid || u.name} style={styles.row} onPress={() => navigation.navigate("ExplorerProfile", { userId: uid })}>
                <Avatar size={42} img={prof.img} sceneKey={prof.sceneKey} avatarUrl={prof.avatarUrl} initials={prof.initials} />
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={styles.pname}>{prof.name}</Text>
                  <Text style={styles.pmeta}>
                    {prof.loc} · {prof.meta}
                  </Text>
                  {badges.length ? (
                    <View style={{ flexDirection: "row", gap: 4, marginTop: 4 }}>
                      {badges.map((b) => (
                        <Badge key={b.t} variant={b.s}>
                          {b.t}
                        </Badge>
                      ))}
                    </View>
                  ) : null}
                </View>
                {uid && !isSelf(uid) ? (
                  <Pressable
                    style={[styles.fb, following && styles.fbon]}
                    onPress={(e) => {
                      e.stopPropagation();
                      toggleFollow(uid);
                    }}
                  >
                    <Text style={[styles.ft, following && styles.fton]}>{following ? "Following" : "Follow"}</Text>
                  </Pressable>
                ) : null}
              </Pressable>
            );
              })}

            {tab === "explorations" &&
              filteredExplorationIds.slice(0, visibleCount).map((id) => {
            const e = explorations[id];
            const rid = getResearcher(e.researcherId, community.researchers);
            return (
              <Pressable key={id} style={styles.expRow} onPress={() => navigation.navigate("ExplorationDetail", { id })}>
                <View style={[styles.ico, { backgroundColor: e.bg }]}>
                  <Text style={{ fontSize: 20 }}>{e.icon}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.cat}>{e.category}</Text>
                  <Text style={styles.tit}>{e.title}</Text>
                  <Text style={styles.esub}>
                    {e.duration} · {e.participants} explorers
                  </Text>
                  {rid ? (
                    <Pressable onPress={() => navigation.navigate("ResearcherProfile", { researcherId: rid.id })}>
                      <Text style={styles.rlink}>Research lead: {rid.name}</Text>
                    </Pressable>
                  ) : null}
                </View>
                <Badge variant={e.active ? "amber" : e.userConsented ? "blue" : "teal"}>
                  {e.active ? "Active" : e.userConsented ? "Joined" : "View"}
                </Badge>
              </Pressable>
            );
              })}

            {tab === "researchers" &&
              filteredResearchers.slice(0, visibleCount).map((r) => (
            <Pressable key={r.id} style={styles.resRow} onPress={() => navigation.navigate("ResearcherProfile", { researcherId: r.id })}>
              <Avatar size={44} img={r.img} initials={r.initials} />
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: 6 }}>
                  <Text style={styles.rtitle}>{r.name}</Text>
                  {r.verified ? <Badge variant="blue">✓ Verified</Badge> : null}
                </View>
                <Text style={styles.rsub}>{r.title}</Text>
                <Text style={styles.rorg}>{r.org}</Text>
                {r.explorations?.[0] ? (
                  <Text style={styles.expLine}>
                    {explorations[r.explorations[0].expId]?.category} · {explorations[r.explorations[0].expId]?.title}
                  </Text>
                ) : null}
              </View>
            </Pressable>
              ))}

            {tab === "evidence" &&
              filteredEvidenceIds.slice(0, visibleCount).map((expId) => {
            const ev = explorationEvidence[expId];
            const exp = explorations[expId];
            return (
              <Pressable key={expId} style={styles.evRow} onPress={() => navigation.navigate("Evidence", { id: expId })}>
                <View style={styles.evIco}>
                  <Text>📄</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.evT}>{ev.docTitle}</Text>
                  <Text style={styles.evS}>
                    {exp?.category || ""} · {ev.docSubtitle}
                  </Text>
                  <Text style={styles.snip}>{(ev.summaryShort || "").slice(0, 140)}…</Text>
                </View>
              </Pressable>
            );
              })}
            {canShowMore || isExpanded ? (
              <View style={styles.panelFooter}>
                {canShowMore ? (
                  <Pressable style={styles.showMoreBtn} onPress={showMore}>
                    <Text style={styles.showMoreTxt}>Show {nextBatch} more</Text>
                  </Pressable>
                ) : null}
                {isExpanded ? (
                  <Pressable
                    style={[styles.showMoreBtn, canShowMore && styles.showLessBtn]}
                    onPress={showLess}
                  >
                    <Text style={styles.showLessTxt}>Show less</Text>
                  </Pressable>
                ) : null}
              </View>
            ) : null}
          </View>
        </View>

        <Card>
          <CardTitle>{c.insightCardTitle}</CardTitle>
          <RichTextParts
            html={c.insightCardBody}
            style={text.body}
            strongStyle={{ fontWeight: "600", color: colors.text }}
          />
        </Card>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  bb: { flexDirection: "row", gap: spacing.sm, marginTop: spacing.lg },
  sw: { position: "relative", marginBottom: spacing.xl },
  glass: { position: "absolute", left: spacing.xxl - 1, top: "50%", marginTop: -8, zIndex: 1 },
  si: {
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radius.pill,
    paddingVertical: spacing.lg,
    paddingLeft: 36,
    paddingRight: spacing.xxl,
    backgroundColor: colors.surface,
    ...type.body,
    color: colors.text
  },
  commBrowse: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    overflow: "hidden",
    marginTop: spacing.sm,
    marginBottom: spacing.blockMb
  },
  commTabs: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderColor: colors.border
  },
  csTab: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 9,
    paddingHorizontal: spacing.xs,
    borderBottomWidth: 2,
    borderBottomColor: "transparent"
  },
  csTabOn: { borderBottomColor: colors.orange },
  csTabText: { ...type.tab, color: colors.textMuted },
  csTabTextOn: { ...type.tabActive, color: colors.greenDark },
  csPanel: { minHeight: 260 },
  csPanelDefault: { paddingHorizontal: 12 },
  csPanelExplorations: { paddingHorizontal: 8 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xl,
    paddingVertical: spacing.lg,
    minHeight: heights.profileRow,
    borderBottomWidth: 1,
    borderColor: colors.border
  },
  pname: text.profileName,
  pmeta: text.profileMeta,
  fb: {
    borderWidth: 1.5,
    borderColor: colors.greenDark,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.xl,
    paddingVertical: 5
  },
  fbon: { backgroundColor: colors.greenDark },
  ft: { ...type.captionStrong, color: colors.greenDark },
  fton: { color: "#fff" },
  expRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xl,
    paddingVertical: spacing.xxl,
    borderBottomWidth: 1,
    borderColor: colors.border
  },
  ico: {
    width: 42,
    height: 42,
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center"
  },
  cat: text.exploreCategory,
  tit: { ...text.exploreTitle, marginTop: 2 },
  esub: { ...text.exploreDesc, marginTop: spacing.xs },
  rlink: { ...text.link, marginTop: spacing.sm },
  resRow: {
    flexDirection: "row",
    gap: spacing.xl,
    alignItems: "flex-start",
    paddingVertical: spacing.xl,
    borderBottomWidth: 1,
    borderColor: colors.border
  },
  rtitle: { ...text.profileName, flexWrap: "wrap" },
  rsub: text.profileMeta,
  rorg: { ...type.profileMeta, color: colors.greenDark, marginTop: 2 },
  expLine: { ...text.caption, marginTop: spacing.sm },
  evRow: {
    flexDirection: "row",
    gap: spacing.xl,
    paddingVertical: spacing.xl,
    borderBottomWidth: 1,
    borderColor: colors.border
  },
  evIco: {
    width: 36,
    height: 36,
    borderRadius: radius.md,
    backgroundColor: colors.greenLight,
    alignItems: "center",
    justifyContent: "center"
  },
  evT: text.feedName,
  evS: { ...text.feedTime, marginTop: spacing.xs },
  snip: { ...text.exploreDesc, marginTop: spacing.sm },
  panelFooter: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    marginTop: spacing.sm
  },
  showMoreBtn: {
    paddingVertical: spacing.lg,
    alignItems: "center"
  },
  showLessBtn: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: spacing.md
  },
  showMoreTxt: { ...text.link },
  showLessTxt: { ...type.chip, color: colors.textMuted }
});
