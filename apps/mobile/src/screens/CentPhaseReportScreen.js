import React, { useEffect, useMemo, useState } from "react";
import { View, ScrollView, StyleSheet, Text, Pressable, ActivityIndicator } from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import { useData } from "../context/DataContext";
import { get } from "../lib/api";
import { colors } from "../theme/colors";

const DEFAULT_THEME = { bg: "#FDF0E4", text: "#8A4A1A" };

function formatReportDate(dateStr) {
  if (!dateStr) return "";
  const date = new Date(dateStr);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
}

export default function CentPhaseReportScreen({ route }) {
  const navigation = useNavigation();
  const explorationId = route?.params?.explorationId;
  const reportType = route?.params?.reportType;
  const ownerSlug = route?.params?.ownerSlug ?? null;

  const { explorations, profile } = useData();
  const [report, setReport] = useState(null);
  const [generatedAt, setGeneratedAt] = useState(null);
  const [loading, setLoading] = useState(true);

  const exploration = explorations[explorationId];
  const theme = {
    bg: exploration?.bg ?? DEFAULT_THEME.bg,
    text: exploration?.text ?? DEFAULT_THEME.text
  };

  useEffect(() => {
    if (!explorationId || !reportType) {
      setLoading(false);
      return undefined;
    }

    let cancelled = false;

    async function loadReport() {
      setLoading(true);
      try {
        const isOwnReport = !ownerSlug || ownerSlug === profile?.viewerSlug;
        const url = isOwnReport
          ? `/me/explorations/${encodeURIComponent(explorationId)}/reports/${encodeURIComponent(reportType)}`
          : `/community/individuals/${encodeURIComponent(ownerSlug)}/explorations/${encodeURIComponent(explorationId)}/reports/${encodeURIComponent(reportType)}`;
        const res = await get(url);
        if (!cancelled && res?.report) {
          setReport(res.report);
          setGeneratedAt(res.generatedAt ?? null);
        }
      } catch {
        if (!cancelled) {
          setReport(null);
          setGeneratedAt(null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadReport();
    return () => {
      cancelled = true;
    };
  }, [explorationId, reportType, ownerSlug, profile?.viewerSlug]);

  const guidance = useMemo(
    () => report?.phase_b_guidance || report?.optimise_guidance || null,
    [report]
  );

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={theme.text} />
      </View>
    );
  }

  if (!report) {
    return (
      <View style={styles.center}>
        <Text style={styles.empty}>Report not found.</Text>
        <Pressable onPress={() => navigation.goBack()} style={{ marginTop: 16 }}>
          <Text style={[styles.back, { color: theme.text }]}>← Back</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <View style={styles.top}>
        <Pressable onPress={() => navigation.goBack()} hitSlop={12}>
          <Text style={[styles.back, { color: theme.text }]}>‹ Back</Text>
        </Pressable>
      </View>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={[styles.hero, { backgroundColor: theme.bg, borderColor: colors.border }]}>
          <Text style={styles.eyebrow}>✦ Kind · {exploration?.category || "Health exploration"}</Text>
          {report.phaseLabel ? (
            <Text style={[styles.phaseLabel, { color: theme.text }]}>{report.phaseLabel}</Text>
          ) : null}
          <Text style={styles.reportTitle}>{report.reportTitle || reportType}</Text>
          {generatedAt ? <Text style={styles.generatedAt}>{formatReportDate(generatedAt)}</Text> : null}
          {report.headline ? <Text style={styles.headline}>{report.headline}</Text> : null}
        </View>

        {report.summary_tiles?.length ? (
          <View style={styles.tileRow}>
            {report.summary_tiles.map((tile) => (
              <View key={tile.label} style={[styles.tile, { backgroundColor: theme.bg }]}>
                <Text style={styles.tileLabel}>{tile.label}</Text>
                <Text style={styles.tileValue}>{tile.value}</Text>
                {tile.note ? <Text style={styles.tileNote}>{tile.note}</Text> : null}
              </View>
            ))}
          </View>
        ) : null}

        {guidance ? (
          <View style={styles.guidanceCard}>
            <Text style={styles.guidanceTitle}>What happens next</Text>
            <Text style={styles.guidanceBody}>{guidance}</Text>
          </View>
        ) : null}

        {report.limitations?.length ? (
          <View style={styles.limitationsCard}>
            {report.limitations.map((item) => (
              <Text key={item} style={styles.limitationItem}>
                · {item}
              </Text>
            ))}
          </View>
        ) : null}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  center: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: colors.bg },
  top: { paddingHorizontal: 12, paddingVertical: 8, backgroundColor: colors.bg },
  back: { fontWeight: "600", fontSize: 16 },
  content: { paddingHorizontal: 16, paddingBottom: 48 },
  hero: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 16,
    marginBottom: 12
  },
  eyebrow: { fontSize: 11, fontWeight: "600", color: colors.textMuted, marginBottom: 6 },
  phaseLabel: { fontSize: 12, fontWeight: "600", marginBottom: 4 },
  reportTitle: { fontSize: 20, fontWeight: "700", color: colors.text, marginBottom: 4 },
  generatedAt: { fontSize: 12, color: colors.textMuted, marginBottom: 10 },
  headline: { fontSize: 15, lineHeight: 22, color: colors.text },
  tileRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 12 },
  tile: {
    flex: 1,
    minWidth: "45%",
    borderRadius: 12,
    padding: 12
  },
  tileLabel: { fontSize: 11, color: colors.textMuted, marginBottom: 4 },
  tileValue: { fontSize: 18, fontWeight: "700", color: colors.text },
  tileNote: { fontSize: 11, color: colors.textMuted, marginTop: 4 },
  guidanceCard: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: 14,
    marginBottom: 12
  },
  guidanceTitle: { fontSize: 13, fontWeight: "600", color: colors.text, marginBottom: 6 },
  guidanceBody: { fontSize: 13, lineHeight: 20, color: colors.textMuted },
  limitationsCard: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: 14
  },
  limitationItem: { fontSize: 12, lineHeight: 18, color: colors.textMuted, marginBottom: 4 },
  empty: { color: colors.textMuted }
});
