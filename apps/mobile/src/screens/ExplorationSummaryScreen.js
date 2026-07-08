import React, { useEffect, useMemo, useState } from "react";
import { View, ScrollView, StyleSheet, Text, Pressable, ActivityIndicator } from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import { useUserExplorations } from "../hooks/useUserExplorations";
import { computeUserPhaseStatuses } from "../utils/explorationProgress";
import { isShortExploration } from "../utils/explorationIds";
import { get } from "../lib/api";
import { colors } from "../theme/colors";
import { Badge } from "../components/primitives/Badge";

function formatLogDate(dateStr) {
  if (!dateStr) return "";
  // Parse the date-only portion as a local date to avoid UTC-midnight
  // shifting the displayed day backwards in timezones behind UTC.
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(dateStr));
  if (!match) return String(dateStr);
  const [, y, m, d] = match;
  const date = new Date(Number(y), Number(m) - 1, Number(d));
  if (Number.isNaN(date.getTime())) return String(dateStr);
  return date.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
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
  const { params } = useRoute();
  const id = params?.id;
  const userExplorations = useUserExplorations();
  const e = id ? userExplorations[id] : null;

  const [logs, setLogs] = useState([]);
  const [loadingLogs, setLoadingLogs] = useState(true);

  useEffect(() => {
    if (!id) {
      setLoadingLogs(false);
      return undefined;
    }
    let cancelled = false;
    setLoadingLogs(true);
    get(`/me/logs?explorationId=${encodeURIComponent(id)}`)
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
  }, [id]);

  const phases = useMemo(
    () => computeUserPhaseStatuses(e?.phases, e?.weekCurrent, e?.weeksTotal),
    [e?.phases, e?.weekCurrent, e?.weeksTotal]
  );

  if (!e) {
    return (
      <View style={styles.center}>
        <Text style={{ color: colors.text }}>Exploration not found.</Text>
        <Pressable onPress={() => navigation.goBack()} style={{ marginTop: 16 }}>
          <Text style={{ color: colors.greenDark, fontWeight: "600" }}>← Back</Text>
        </Pressable>
      </View>
    );
  }

  const unitLabel = isShortExploration(id) ? "Day" : "Week";

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

        <View style={styles.metaRow}>
          {e.weekCurrent && e.weeksTotal ? (
            <Badge variant="teal">
              {unitLabel} {e.weekCurrent} of {e.weeksTotal}
            </Badge>
          ) : null}
          <Badge variant="amber">{e.progress ?? 0}% complete</Badge>
          <Badge variant="teal">{e.streakDays ?? 0}-day streak</Badge>
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

        <Text style={[styles.sectionTitle, { marginTop: 24 }]}>Your logged data</Text>
        {loadingLogs ? (
          <ActivityIndicator color={colors.greenDark} style={{ marginVertical: 20 }} />
        ) : logs.length === 0 ? (
          <Text style={styles.emptyLogs}>
            You haven't logged any data for this exploration yet.
          </Text>
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
          onPress={() => navigation.navigate("ExplorationDetail", { id })}
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
