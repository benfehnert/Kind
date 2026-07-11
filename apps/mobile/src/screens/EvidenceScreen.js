import React, { useEffect, useMemo, useState } from "react";
import { View, ScrollView, StyleSheet, Text, Pressable, Linking, ActivityIndicator } from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import { usePostHog } from "posthog-react-native";
import { useData } from "../context/DataContext";
import { get } from "../lib/api";
import { evidenceExplorationId } from "../utils/explorationIds";
import { colors, fontFamily } from "../theme/colors";

function resolveExplorationMeta(id, { explorations, explorePage }) {
  if (!id) return null;

  if (explorations?.[id]) {
    return { ...explorations[id], id };
  }

  const fromExplore = [
    ...(explorePage?.activeExplorations ?? []),
    ...(explorePage?.availableExplorations ?? []),
    ...(explorePage?.recommendedExplorations ?? [])
  ].find((entry) => entry?.id === id);

  if (fromExplore) return fromExplore;

  const shortId = id.endsWith("-short") ? id : `${id}-short`;
  if (explorations?.[shortId]) {
    return { ...explorations[shortId], id: shortId };
  }

  const parentId = evidenceExplorationId(id);
  if (parentId !== id && explorations?.[parentId]) {
    return { ...explorations[parentId], id: parentId };
  }

  return null;
}

export default function EvidenceScreen() {
  const { explorationEvidence, explorations, explorePage } = useData();
  const posthog = usePostHog();
  const navigation = useNavigation();
  const { params } = useRoute();
  const id = params?.id;

  const exp = useMemo(
    () => resolveExplorationMeta(id, { explorations, explorePage }),
    [id, explorations, explorePage]
  );

  const evidenceId = exp?.evidenceId ?? evidenceExplorationId(id);
  const cachedEv = evidenceId ? explorationEvidence?.[evidenceId] : null;

  const [fetchedEv, setFetchedEv] = useState(null);
  const [loading, setLoading] = useState(false);
  const [fetchFailed, setFetchFailed] = useState(false);

  useEffect(() => {
    setFetchedEv(null);
    setFetchFailed(false);

    if (!id || cachedEv) {
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);

    get(`/explorations/${encodeURIComponent(id)}/evidence`)
      .then((data) => {
        if (!cancelled) setFetchedEv(data);
      })
      .catch(() => {
        if (!cancelled) setFetchFailed(true);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [id, cachedEv]);

  const ev = cachedEv ?? fetchedEv;

  useEffect(() => {
    if (!ev || !id) return;
    posthog?.capture("viewed exploration evidence", { explorationId: id });
  }, [ev, id, posthog]);

  const table = ev?.summaryTable || [];
  const colKeys = table.length ? Object.keys(table[0]) : [];
  const summaryHeaders =
    ev?.summaryHeaders?.length === colKeys.length
      ? ev.summaryHeaders
      : colKeys.map((k) => k.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()));

  if (loading && !ev) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.greenDark} />
      </View>
    );
  }

  if (!ev) {
    return (
      <View style={styles.centered}>
        <Text>Evidence not found</Text>
        {fetchFailed ? (
          <Text style={styles.muted}>Could not load evidence for this exploration.</Text>
        ) : null}
        <Pressable onPress={() => navigation.goBack()}>
          <Text style={styles.backLink}>Back</Text>
        </Pressable>
      </View>
    );
  }

  const category = exp?.category ?? "";

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <View style={styles.top}>
        <Pressable hitSlop={12} onPress={() => navigation.goBack()} style={styles.back}>
          <Text style={{ fontSize: 22, color: colors.text }}>‹</Text>
        </Pressable>
        <Text style={styles.hdr}>Evidence</Text>
      </View>
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 120 }}>
        {category ? <Text style={styles.small}>{category}</Text> : null}
        <Text style={styles.title}>{ev.docTitle}</Text>
        <Text style={styles.sub}>{ev.docSubtitle}</Text>
        <ScrollView horizontal style={{ marginVertical: 10 }} showsHorizontalScrollIndicator={false}>
          <View style={{ flexDirection: "row", gap: 8 }}>
            {(ev.interventions || []).map((seg) => (
              <Pressable key={seg.id} style={styles.navP}>
                <Text style={styles.navT}>{seg.title.replace(/^\d+\.\s*/, "").slice(0, 42)}</Text>
              </Pressable>
            ))}
            <Pressable style={styles.navP}>
              <Text style={styles.navT}>Summary</Text>
            </Pressable>
          </View>
        </ScrollView>
        <Text style={styles.intro}>{ev.intro}</Text>
        {(ev.interventions || []).map((seg) => (
          <View key={seg.id} style={{ marginBottom: 20 }}>
            <Text style={styles.h}>{seg.title}</Text>
            <Text style={styles.sh}>The mechanism</Text>
            <Text style={styles.p}>{seg.mechanism}</Text>
            <Text style={styles.sh}>The evidence</Text>
            <Text style={styles.p}>{seg.evidence}</Text>
            {seg.practical ? (
              <>
                <Text style={styles.sh}>{seg.practicalLabel || "Practical threshold"}</Text>
                <Text style={styles.p}>{seg.practical}</Text>
              </>
            ) : null}
            <Text style={styles.sh}>Key sources</Text>
            {(seg.sources || []).map((s, i) => {
              const label = typeof s === "string" ? s : s.label || "";
              const url = typeof s === "string" ? null : s.url;
              return (
                <Pressable key={i} onPress={() => url && Linking.openURL(url)} style={{ marginBottom: 6 }}>
                  <Text style={[styles.link, { color: url ? colors.blueText : colors.textMuted }]}>• {label.slice(0, 200)}</Text>
                </Pressable>
              );
            })}
          </View>
        ))}
        <Text style={styles.h}>Summary</Text>
        <View style={styles.table}>
          <ScrollView horizontal>
            <View>
              {summaryHeaders.length ? (
                <View style={styles.tr}>
                  {summaryHeaders.map((h, hi) => (
                    <Text key={`h-${hi}`} style={[styles.th, { minWidth: 120, maxWidth: 180 }]}>
                      {h}
                    </Text>
                  ))}
                </View>
              ) : null}
              {table.map((row, ri) => (
                <View key={ri} style={styles.tr}>
                  {colKeys.map((key) => (
                    <Text key={key} style={[styles.tc, { minWidth: 120, maxWidth: 180 }]}>
                      {String(row[key] ?? "")}
                    </Text>
                  ))}
                </View>
              ))}
            </View>
          </ScrollView>
        </View>
        {ev.practicalNotes ? (
          <>
            <Text style={styles.h}>Practical notes</Text>
            {ev.practicalNotes.map((note, i) => (
              <Text key={i} style={[styles.p, { marginBottom: 8 }]}>
                • {note}
              </Text>
            ))}
          </>
        ) : null}
        {ev.note ? <Text style={[styles.p, { marginTop: 8 }]}>{ev.note}</Text> : null}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  centered: { flex: 1, padding: 20, justifyContent: "center", backgroundColor: colors.bg },
  muted: { color: colors.textMuted, marginTop: 8, marginBottom: 8 },
  backLink: { color: colors.greenDark, fontWeight: "600", marginTop: 12 },
  top: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 10,
    backgroundColor: colors.bg,
    gap: 6
  },
  back: { padding: 6 },
  hdr: {
    flex: 1,
    fontSize: 17,
    fontFamily: fontFamily.semibold,
    fontWeight: "600",
    color: colors.text
  },
  small: {
    fontSize: 11,
    fontWeight: "600",
    color: colors.textMuted,
    textTransform: "uppercase",
    marginBottom: 6
  },
  title: { fontSize: 17, fontWeight: "600", color: colors.text, lineHeight: 24 },
  sub: { fontSize: 12, color: colors.textMuted, marginTop: 4 },
  navP: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6
  },
  navT: { fontSize: 11, color: colors.greenDark, fontWeight: "600" },
  intro: { fontSize: 14, color: colors.text, lineHeight: 22 },
  h: { fontSize: 17, fontWeight: "700", marginTop: 12, marginBottom: 8, color: colors.text },
  sh: {
    fontSize: 13,
    fontWeight: "600",
    marginTop: 8,
    color: colors.textMuted,
    marginBottom: 4
  },
  p: { fontSize: 14, color: colors.textMuted, lineHeight: 22 },
  link: { fontSize: 13, textDecorationLine: "underline", lineHeight: 20 },
  table: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    overflow: "hidden",
    marginTop: 8
  },
  tr: { flexDirection: "row", borderBottomWidth: 1, borderColor: colors.border },
  th: {
    padding: 8,
    backgroundColor: colors.greenLight,
    fontWeight: "700",
    fontSize: 11,
    color: colors.greenDark,
    flexShrink: 0
  },
  tc: { padding: 8, fontSize: 11, color: colors.textMuted, flexShrink: 0, borderRightWidth: 1, borderColor: colors.border }
});
