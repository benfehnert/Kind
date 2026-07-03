import React, { useEffect } from "react";
import { View, ScrollView, StyleSheet, Text, Pressable } from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import { usePostHog } from "posthog-react-native";
import { getResearcher } from "../data/mock";
import { useData } from "../context/DataContext";
import { useUiShell } from "../context/UiContext";
import { useUserExplorations, useExplorationStart } from "../hooks/useUserExplorations";
import { colors, fontFamily } from "../theme/colors";
import { Avatar } from "../components/primitives/Avatar";
import { PrimaryButton } from "../components/primitives/Buttons";

export default function ExplorationDetailScreen() {
  const posthog = usePostHog();
  const { community } = useData();
  const userExplorations = useUserExplorations();
  const startExploration = useExplorationStart();
  const { showToast } = useUiShell();
  const navigation = useNavigation();
  const { params } = useRoute();
  const id = params?.id;
  const e = id ? userExplorations[id] : null;

  useEffect(() => {
    if (e) posthog?.capture("exploration details opened");
  }, [posthog, e]);

  if (!e) {
    return (
      <View style={{ flex: 1, justifyContent: "center", padding: 24, backgroundColor: colors.bg }}>
        <Text style={{ color: colors.text }}>Exploration not found.</Text>
        <Pressable onPress={() => navigation.goBack()} style={{ marginTop: 16 }}>
          <Text style={{ color: colors.greenDark, fontWeight: "600" }}>← Back</Text>
        </Pressable>
      </View>
    );
  }

  const r = getResearcher(e.researcherId, community.researchers);
  const showKindResearchBox = id === "eating" || id === "relaxation";

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <View style={styles.top}>
        <Pressable onPress={() => navigation.goBack()} hitSlop={12}>
          <Text style={styles.back}>‹ Back</Text>
        </Pressable>
      </View>
      <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 120 }}>
        <Text style={styles.cat}>{e.category}</Text>
        <Text style={styles.title}>{e.title}</Text>
        <Text style={styles.meta}>
          {e.duration} · {e.participants} explorers active
        </Text>
        <Text style={styles.desc}>{e.desc}</Text>

        {showKindResearchBox ? (
          <View style={styles.rl}>
            <Text style={styles.eb}>KIND RESEARCH</Text>
            <Text style={styles.krBody}>
              This exploration was created by the kind research team using emerging evidence and
              citizen-science design principles to help you test meal-timing effects on your own energy levels.
            </Text>
          </View>
        ) : r ? (
          <View style={styles.rl}>
            <Text style={styles.eb}>Research lead</Text>
            <Pressable style={styles.rrow} onPress={() => navigation.navigate("ResearcherProfile", { researcherId: r.id })}>
              <Avatar size={44} img={r.img} initials={r.initials} />
              <View style={{ flex: 1 }}>
                <Text style={styles.rn}>{r.name}</Text>
                <Text style={styles.rt}>{r.title}</Text>
                <Text style={styles.ro}>{r.org}</Text>
              </View>
              <BadgeVerified r={r} />
            </Pressable>
            <Pressable onPress={() => navigation.navigate("ResearcherProfile", { researcherId: r.id })}>
              <Text style={styles.evL}>View researcher profile</Text>
            </Pressable>
          </View>
        ) : null}

        <PrimaryButton title="See evidence summary" style={{ marginBottom: 12 }} onPress={() => navigation.navigate("Evidence", { id })} />

        {!e.active ? (
          <PrimaryButton
            title="Start this exploration"
            onPress={() => startExploration(navigation, id, { showToast })}
            backgroundColor={e.text}
            textColor="#fff"
            style={{ marginBottom: 12 }}
          />
        ) : null}

        <Text style={styles.sec}>Hypothesised outcomes supported by emerging evidence:</Text>
        {(e.outcomes || []).map((o, i) => (
          <View key={i} style={styles.outRow}>
            <Text>{o.icon}</Text>
            <Text style={{ flex: 1, fontSize: 13, color: colors.textMuted, lineHeight: 19 }}>{o.label}</Text>
          </View>
        ))}

        <Text style={styles.cardEyeb}>Phases</Text>
        {(e.phases || []).map((ph, i) => (
          <View key={i} style={styles.tl}>
            <View
              style={[
                styles.dot,
                e.userConsented && ph.status === "active" && styles.dotAct,
                e.userConsented && ph.status === "complete" && { backgroundColor: colors.borderMed }
              ]}
            />
            <View style={{ flex: 1 }}>
              <Text style={styles.phn}>{ph.name}</Text>
              <Text style={styles.phd}>{ph.desc}</Text>
            </View>
          </View>
        ))}

        {e.userConsented && e.chart && e.chart.length ? (
          <>
            <Text style={styles.cardEyeb}>{e.chartLabel}</Text>
            <View style={styles.chartWrap}>
              {e.chart.map((c, i) => (
                <View key={i} style={styles.cbar}>
                  <View style={[styles.cv, !c.empty && { height: `${c.h}%`, backgroundColor: colors.greenDark }]} />
                  <Text style={styles.clab}>
                    {c.day}
                    {"\n"}
                    {c.v}
                  </Text>
                </View>
              ))}
            </View>
          </>
        ) : null}

        <Text style={[styles.sec, { marginTop: 12 }]}>Today's log</Text>
        <Text style={{ color: colors.textMuted, fontSize: 13 }}>
          Exploration logging mirrors the prototype — structured fields configured per exploration JSON.
        </Text>

        {!e.active ? (
          <PrimaryButton
            title="Start this exploration"
            onPress={() => startExploration(navigation, id, { showToast })}
            backgroundColor={e.text}
            textColor="#fff"
            style={{ marginTop: 16 }}
          />
        ) : (
          <Text style={{ marginTop: 8, fontSize: 12, color: colors.greenDark, fontWeight: "600" }}>
            You're active · keep logging consistently.
          </Text>
        )}

        <Pressable style={{ marginTop: 24 }} onPress={() => navigation.navigate("ExplorersList", { explorationId: id })}>
          <Text style={styles.evL}>Browse public explorers ({e.participants})</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}

function BadgeVerified({ r }) {
  return r?.verified ? (
    <Text style={{ fontSize: 10, paddingHorizontal: 8, paddingVertical: 2, backgroundColor: colors.blueBg, color: colors.blueText, borderRadius: 999, fontWeight: "600", alignSelf: "flex-start" }}>✓ Verified</Text>
  ) : null;
}

const styles = StyleSheet.create({
  top: { paddingHorizontal: 12, paddingVertical: 8, backgroundColor: colors.bg },
  back: { color: colors.greenDark, fontWeight: "600", fontSize: 16 },
  cat: { fontSize: 11, fontWeight: "600", color: colors.greenDark, marginBottom: 4 },
  title: { fontSize: 20, fontWeight: "700", color: colors.text },
  meta: { fontSize: 12, color: colors.textMuted, marginTop: 4 },
  desc: { fontSize: 14, color: colors.textMuted, lineHeight: 22, marginVertical: 12 },
  rl: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: 14,
    marginBottom: 12
  },
  eb: { fontSize: 11, fontWeight: "600", color: colors.textMuted, marginBottom: 10, textTransform: "uppercase" },
  rrow: { flexDirection: "row", gap: 10, alignItems: "flex-start" },
  rn: { fontSize: 14, fontWeight: "600", color: colors.text },
  rt: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
  ro: { fontSize: 12, color: colors.greenDark, marginTop: 2 },
  evL: { fontSize: 12, fontWeight: "600", color: colors.greenDark, marginTop: 8 },
  krBody: { fontSize: 13, color: colors.textMuted, lineHeight: 20 },
  sec: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.text,
    marginBottom: 10,
    marginTop: 12
  },
  outRow: { flexDirection: "row", gap: 10, alignItems: "flex-start", marginBottom: 8 },
  cardEyeb: {
    marginTop: 16,
    fontSize: 11,
    fontWeight: "600",
    color: colors.textMuted,
    textTransform: "uppercase"
  },
  tl: { flexDirection: "row", gap: 12, marginTop: 10 },
  dot: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.borderMed, marginTop: 6 },
  dotAct: {
    backgroundColor: colors.greenDark,
    width: 12,
    height: 12,
    borderRadius: 6,
    marginTop: 4
  },
  phn: { fontWeight: "600", color: colors.text, fontSize: 13 },
  phd: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
  chartWrap: { flexDirection: "row", height: 100, gap: 6, alignItems: "flex-end", marginTop: 8 },
  cbar: { flex: 1, alignItems: "center", justifyContent: "flex-end", height: "100%" },
  cv: { width: "100%", borderTopLeftRadius: 4, borderTopRightRadius: 4 },
  clab: { fontSize: 10, color: colors.textMuted, textAlign: "center", marginTop: 6 }
});
