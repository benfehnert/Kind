import React, { useEffect, useMemo, useState } from "react";
import { View, ScrollView, StyleSheet, Text, Pressable, ActivityIndicator } from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import { usePostHog } from "posthog-react-native";
import { useCaptureOnFocus } from "../lib/analytics";
import { useUserExplorations } from "../hooks/useUserExplorations";
import { computeUserPhaseStatuses, computeExplorationProgress } from "../utils/explorationProgress";
import { isShortExploration } from "../utils/explorationIds";
import { resolveExplorationMeta } from "../utils/resolveExplorationMeta";
import { useData } from "../context/DataContext";
import { get } from "../lib/api";
import { colors } from "../theme/colors";
import { Badge } from "../components/primitives/Badge";

function formatLogDate(dateStr) {
  if (!dateStr) return "";
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(dateStr));
  if (!match) return String(dateStr);
  const [, y, m, d] = match;
  const date = new Date(Number(y), Number(m) - 1, Number(d));
  if (Number.isNaN(date.getTime())) return String(dateStr);
  return date.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
}

function formatReportDate(dateStr) {
  if (!dateStr) return "";
  const date = new Date(dateStr);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function formatFieldValue(field, value) {
  if (value === undefined || value === null || value === "") return null;
  if (field.type === "checks") {
    if (!Array.isArray(value) || value.length === 0) return "None logged";
    return value.join(", ");
  }
  if (field.type === "range") {
    return field.max != null ? `${value}/${field.max}` : String(value);
  }
  return String(value);
}

export default function ExplorationSummaryScreen() {
  const navigation = useNavigation();
  const posthog = usePostHog();
  const { params } = useRoute();
  const id = params?.id;
  const ownerSlug = params?.ownerSlug ?? null;
  const ownerName = params?.ownerName ?? null;
  const ownerWeek = params?.ownerWeek;
  const ownerWeeksTotal = params?.ownerWeeksTotal;
  const ownerActive = params?.ownerActive;

  const { explorations, explorePage, profile } = useData();
  const userExplorations = useUserExplorations();
  const isOwnerView = Boolean(ownerSlug) && ownerSlug !== profile?.viewerSlug;

  const catalogExploration = id ? resolveExplorationMeta(id, { explorations, explorePage }) : null;
  const ownExploration =
    !isOwnerView && id ? userExplorations[id] ?? catalogExploration : null;

  const [logs, setLogs] = useState([]);
  const [loadingLogs, setLoadingLogs] = useState(true);
  const [reports, setReports] = useState([]);
  const [loadingReports, setLoadingReports] = useState(true);
  const [ownerRun, setOwnerRun] = useState(null);
  const [loadingOwnerRun, setLoadingOwnerRun] = useState(isOwnerView);

  useEffect(() => {
    if (!id || !isOwnerView || !ownerSlug) {
      setLoadingOwnerRun(false);
      return undefined;
    }
    let cancelled = false;
    setLoadingOwnerRun(true);
    get(`/community/individuals/${encodeURIComponent(ownerSlug)}/explorations/${encodeURIComponent(id)}`)
      .then((res) => {
        if (!cancelled) setOwnerRun(res);
      })
      .catch(() => {
        if (!cancelled) setOwnerRun(null);
      })
      .finally(() => {
        if (!cancelled) setLoadingOwnerRun(false);
      });
    return () => {
      cancelled = true;
    };
  }, [id, isOwnerView, ownerSlug]);

  useEffect(() => {
    if (!id) {
      setLoadingLogs(false);
      return undefined;
    }
    let cancelled = false;
    setLoadingLogs(true);
    const logsUrl = isOwnerView && ownerSlug
      ? `/community/individuals/${encodeURIComponent(ownerSlug)}/explorations/${encodeURIComponent(id)}/logs`
      : `/me/logs?explorationId=${encodeURIComponent(id)}`;
    get(logsUrl)
      .then((res) => {
        if (!cancelled) setLogs(res.items || []);
      })
      .catch(() => {
        if (!cancelled) setLogs([]);
      })
      .finally(() => {
        if (!cancelled) setLoadingLogs(false);
      });
    return () => {
      cancelled = true;
    };
  }, [id, isOwnerView, ownerSlug]);

  useEffect(() => {
    if (!id) {
      setLoadingReports(false);
      return undefined;
    }
    let cancelled = false;
    setLoadingReports(true);
    const reportsUrl = isOwnerView && ownerSlug
      ? `/community/individuals/${encodeURIComponent(ownerSlug)}/explorations/${encodeURIComponent(id)}/reports`
      : `/me/explorations/${encodeURIComponent(id)}/reports`;
    get(reportsUrl)
      .then((res) => {
        if (!cancelled) setReports(res.items || []);
      })
      .catch(() => {
        if (!cancelled) setReports([]);
      })
      .finally(() => {
        if (!cancelled) setLoadingReports(false);
      });
    return () => {
      cancelled = true;
    };
  }, [id, isOwnerView, ownerSlug]);

  const e = useMemo(() => {
    if (!id) return null;
    if (!isOwnerView) return ownExploration;
    if (!catalogExploration) return null;

    const weekCurrent = ownerRun?.weekCurrent ?? ownerWeek ?? null;
    const weeksTotal = ownerRun?.weeksTotal ?? ownerWeeksTotal ?? null;
    const streakDays = ownerRun?.streakDays ?? 0;
    const startedAt = ownerRun?.startedAt ?? null;
    const isShort = isShortExploration(id);
    const progress = computeExplorationProgress({
      startedAt,
      weeksTotal,
      weekCurrent,
      isShort
    });

    return {
      ...catalogExploration,
      id,
      title: catalogExploration.title,
      category: catalogExploration.category,
      weekCurrent,
      weeksTotal,
      streakDays,
      progress,
      phases: catalogExploration.phases ?? [],
      fields: catalogExploration.fields ?? [],
      active: ownerRun?.isActive ?? ownerActive ?? false,
      ownerName
    };
  }, [
    id,
    isOwnerView,
    ownExploration,
    catalogExploration,
    ownerRun,
    ownerWeek,
    ownerWeeksTotal,
    ownerActive,
    ownerName
  ]);

  const phases = useMemo(
    () => computeUserPhaseStatuses(e?.phases, e?.weekCurrent, e?.weeksTotal),
    [e?.phases, e?.weekCurrent, e?.weeksTotal]
  );

  const isEngaged = e
    ? isOwnerView
      ? (ownerActive ?? Boolean(ownerRun?.isActive))
      : Boolean(e.userConsented || e.active)
    : false;

  useCaptureOnFocus(
    isEngaged ? posthog : null,
    "existing exploration details opened",
    { explorationId: id }
  );

  const openReport = (report) => {
    if (report.isFinal) {
      navigation.navigate("ExplorationReport", {
        explorationId: id,
        ownerSlug: isOwnerView ? ownerSlug : undefined
      });
      return;
    }
    navigation.navigate("CentPhaseReport", {
      explorationId: id,
      reportType: report.reportType,
      ownerSlug: isOwnerView ? ownerSlug : undefined
    });
  };

  if (!e || (isOwnerView && loadingOwnerRun && !ownerWeek)) {
    return (
      <View style={styles.center}>
        {isOwnerView && loadingOwnerRun ? (
          <ActivityIndicator color={colors.greenDark} />
        ) : (
          <Text style={{ color: colors.text }}>Exploration not found.</Text>
        )}
        <Pressable onPress={() => navigation.goBack()} style={{ marginTop: 16 }}>
          <Text style={{ color: colors.greenDark, fontWeight: "600" }}>← Back</Text>
        </Pressable>
      </View>
    );
  }

  const unitLabel = isShortExploration(id) ? "Day" : "Week";
  const loggedDataTitle = isOwnerView ? "Their logged data" : "Your logged data";
  const emptyLogsCopy = isOwnerView
    ? "They haven't logged any data for this exploration yet."
    : "You haven't logged any data for this exploration yet.";

  return (
    <View style={styles.root}>
      <View style={styles.top}>
        <Pressable onPress={() => navigation.goBack()} hitSlop={12}>
          <Text style={styles.back}>‹ Back</Text>
        </Pressable>
      </View>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.cat}>{e.category}</Text>
        <Text style={styles.title}>{e.title}</Text>
        {isOwnerView && ownerName ? (
          <Text style={styles.ownerMeta}>{ownerName}'s exploration</Text>
        ) : null}

        <View style={styles.metaRow}>
          {e.weekCurrent && e.weeksTotal ? (
            <Badge variant="teal">
              {unitLabel} {e.weekCurrent} of {e.weeksTotal}
            </Badge>
          ) : null}
          <Badge variant="amber">{e.progress ?? 0}% complete</Badge>
          {!isOwnerView ? <Badge variant="teal">{e.streakDays ?? 0}-day streak</Badge> : null}
          {isOwnerView && e.streakDays ? (
            <Badge variant="teal">{e.streakDays}-day streak</Badge>
          ) : null}
        </View>

        <Text style={styles.sectionTitle}>Exploration structure</Text>
        {phases.map((ph, i) => (
          <View key={i} style={styles.tl}>
            <View
              style={[
                styles.dot,
                ph.status === "active" && styles.dotAct,
                ph.status === "complete" && { backgroundColor: colors.borderMed }
              ]}
            />
            <View style={{ flex: 1 }}>
              <Text style={styles.phn}>{ph.name}</Text>
              <Text style={styles.phd}>{ph.desc}</Text>
            </View>
          </View>
        ))}

        <Text style={[styles.sectionTitle, { marginTop: 24 }]}>Reports</Text>
        {loadingReports ? (
          <ActivityIndicator color={colors.greenDark} style={{ marginVertical: 20 }} />
        ) : reports.length === 0 ? (
          <Text style={styles.emptyLogs}>No reports generated yet.</Text>
        ) : (
          reports.map((report) => (
            <Pressable
              key={report.reportType}
              style={styles.reportRow}
              onPress={() => openReport(report)}
            >
              <View style={{ flex: 1 }}>
                <Text style={styles.reportLabel}>{report.label}</Text>
                {report.generatedAt ? (
                  <Text style={styles.reportDate}>{formatReportDate(report.generatedAt)}</Text>
                ) : null}
              </View>
              <Text style={styles.reportChevron}>›</Text>
            </Pressable>
          ))
        )}

        <Text style={[styles.sectionTitle, { marginTop: 24 }]}>{loggedDataTitle}</Text>
        {loadingLogs ? (
          <ActivityIndicator color={colors.greenDark} style={{ marginVertical: 20 }} />
        ) : logs.length === 0 ? (
          <Text style={styles.emptyLogs}>{emptyLogsCopy}</Text>
        ) : (
          logs.map((log) => {
            const rows = (e.fields || [])
              .map((field) => ({ field, display: formatFieldValue(field, log.fieldValues?.[field.id]) }))
              .filter((row) => row.display !== null);
            if (!rows.length) return null;
            return (
              <View key={log.logDate} style={styles.logCard}>
                <Text style={styles.logDate}>{formatLogDate(log.logDate)}</Text>
                {rows.map(({ field, display }) => (
                  <View key={field.id} style={styles.logRow}>
                    <Text style={styles.logLabel}>{field.label}</Text>
                    <Text style={styles.logValue}>{display}</Text>
                  </View>
                ))}
              </View>
            );
          })
        )}

        <Pressable
          style={styles.overviewLink}
          onPress={() =>
            navigation.navigate("ExplorationDetail", {
              id,
              ...(isOwnerView
                ? {
                    ownerSlug,
                    ownerName,
                    ownerWeek: e.weekCurrent,
                    ownerWeeksTotal: e.weeksTotal,
                    ownerActive: e.active
                  }
                : {})
            })
          }
        >
          <Text style={styles.overviewLinkTxt}>View full exploration overview ›</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  center: { flex: 1, justifyContent: "center", padding: 24, backgroundColor: colors.bg },
  top: { paddingHorizontal: 12, paddingVertical: 8, backgroundColor: colors.bg },
  back: { color: colors.greenDark, fontWeight: "600", fontSize: 16 },
  content: { paddingHorizontal: 16, paddingBottom: 48 },
  cat: { fontSize: 11, fontWeight: "600", color: colors.greenDark, marginBottom: 4 },
  title: { fontSize: 20, fontWeight: "700", color: colors.text },
  ownerMeta: { fontSize: 13, color: colors.textMuted, marginTop: 4 },
  metaRow: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 10, marginBottom: 8 },
  sectionTitle: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.text,
    marginBottom: 10,
    marginTop: 16,
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
  emptyLogs: { fontSize: 13, color: colors.textMuted, lineHeight: 20 },
  reportRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: 14,
    marginBottom: 8
  },
  reportLabel: { fontSize: 14, fontWeight: "600", color: colors.text },
  reportDate: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
  reportChevron: { fontSize: 20, color: colors.greenDark, fontWeight: "600", marginLeft: 8 },
  logCard: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: 14,
    marginBottom: 10
  },
  logDate: { fontSize: 12, fontWeight: "600", color: colors.greenDark, marginBottom: 8 },
  logRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4
  },
  logLabel: { fontSize: 13, color: colors.textMuted, flex: 1, marginRight: 8 },
  logValue: { fontSize: 13, fontWeight: "600", color: colors.text, textAlign: "right" },
  overviewLink: { marginTop: 20, alignItems: "center", paddingVertical: 8 },
  overviewLinkTxt: { fontSize: 13, fontWeight: "600", color: colors.greenDark }
});
