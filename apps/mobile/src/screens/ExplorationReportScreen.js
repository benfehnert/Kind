import React, { useEffect, useState } from "react";
import { View, StyleSheet, Text, ActivityIndicator } from "react-native";
import { usePostHog } from "posthog-react-native";
import { colors } from "../theme/colors";
import { useData } from "../context/DataContext";
import { get } from "../lib/api";
import { getExplorationReport } from "../data/explorationReportContent";
import ExplorationReportContent, { buildReportPalette } from "../components/reports/ExplorationReportContent";

const DEFAULT_THEME = { bg: "#FDF0E4", text: "#8A4A1A" };

export function ExplorationReportView({ report, theme = DEFAULT_THEME, explorationId, ownerSlug, ownerName }) {
  return (
    <ExplorationReportContent
      report={report}
      theme={theme}
      explorationId={explorationId}
      explorationTitle={report?.explorationName}
      ownerSlug={ownerSlug}
      ownerName={ownerName}
      variant="final"
    />
  );
}

export default function ExplorationReportScreen({ route }) {
  const explorationId = route?.params?.explorationId ?? "morning-rules";
  const ownerSlug = route?.params?.ownerSlug ?? null;
  const ownerName = route?.params?.ownerName ?? null;
  const posthog = usePostHog();
  const { explorations, profile } = useData();
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);

  const exploration = explorations[explorationId];
  const theme = {
    bg: exploration?.bg ?? DEFAULT_THEME.bg,
    text: exploration?.text ?? DEFAULT_THEME.text
  };

  useEffect(() => {
    let cancelled = false;

    async function loadReport() {
      setLoading(true);
      try {
        const isOwnReport = !ownerSlug || ownerSlug === profile?.viewerSlug;
        const url = isOwnReport
          ? `/me/explorations/${explorationId}/report`
          : `/community/individuals/${ownerSlug}/explorations/${explorationId}/report`;
        const res = await get(url);
        if (!cancelled && res?.report) {
          setReport(res.report);
          posthog?.capture("end of exploration report viewed", { explorationId });
        } else if (!cancelled) {
          setReport(getExplorationReport(explorationId));
          posthog?.capture("end of exploration report viewed", { explorationId });
        }
      } catch {
        if (!cancelled) {
          setReport(getExplorationReport(explorationId));
          posthog?.capture("end of exploration report viewed", { explorationId });
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadReport();
    return () => {
      cancelled = true;
    };
  }, [explorationId, ownerSlug, ownerName, posthog, profile?.viewerSlug]);

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
      </View>
    );
  }

  return (
    <ExplorationReportContent
      report={report}
      theme={theme}
      explorationId={explorationId}
      explorationTitle={exploration?.title || report.explorationName}
      ownerSlug={ownerSlug}
      ownerName={ownerName}
      variant="final"
    />
  );
}

/** Backwards-compatible alias for morning-rules report. */
export function EnergyReportScreen() {
  return <ExplorationReportView report={getExplorationReport("morning-rules")} theme={DEFAULT_THEME} explorationId="morning-rules" />;
}

const styles = StyleSheet.create({
  center: { flex: 1, backgroundColor: colors.bg, justifyContent: "center", alignItems: "center" },
  empty: { color: colors.textMuted }
});

export { buildReportPalette };
