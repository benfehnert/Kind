import React, { useEffect, useState } from "react";
import { View, StyleSheet, Text, Pressable, ActivityIndicator } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { usePostHog } from "posthog-react-native";
import { useData } from "../context/DataContext";
import { get } from "../lib/api";
import { colors } from "../theme/colors";
import ExplorationReportContent from "../components/reports/ExplorationReportContent";

const DEFAULT_THEME = { bg: "#FDF0E4", text: "#8A4A1A" };

const REPORT_VIEW_EVENTS = {
  BASELINE_SUMMARY: "baseline report viewed",
  INTERVENTION_INTERIM: "interim report viewed",
  OPTIMISE_COMPLETION: "optimise report viewed"
};

export default function CentPhaseReportScreen({ route }) {
  const navigation = useNavigation();
  const posthog = usePostHog();
  const explorationId = route?.params?.explorationId;
  const reportType = route?.params?.reportType;
  const ownerSlug = route?.params?.ownerSlug ?? null;
  const ownerName = route?.params?.ownerName ?? null;

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
          const event = REPORT_VIEW_EVENTS[reportType];
          if (event) posthog?.capture(event, { explorationId });
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
  }, [explorationId, reportType, ownerSlug, profile?.viewerSlug, posthog]);

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
    <ExplorationReportContent
      report={report}
      theme={theme}
      explorationId={explorationId}
      explorationTitle={exploration?.title}
      ownerSlug={ownerSlug}
      ownerName={ownerName}
      variant="phase"
      generatedAt={generatedAt}
    />
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: colors.bg },
  back: { fontWeight: "600", fontSize: 16 },
  empty: { color: colors.textMuted }
});
