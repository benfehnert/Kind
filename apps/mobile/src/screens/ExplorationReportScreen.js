import React, { useEffect, useMemo, useState } from "react";
import { View, ScrollView, StyleSheet, Text, Pressable, ActivityIndicator } from "react-native";
import Svg, { Polyline, Polygon, Line, Circle, Text as SvgText } from "react-native-svg";
import { useNavigation } from "@react-navigation/native";
import { usePostHog } from "posthog-react-native";
import { colors } from "../theme/colors";
import { useUiShell } from "../context/UiContext";
import { useData } from "../context/DataContext";
import { get } from "../lib/api";
import { getExplorationReport } from "../data/explorationReportContent";

const NEUTRAL = {
  cardBg: "#FFFFFF",
  border: "#E2E6DA",
  textPrimary: "#1F2A1F",
  textSecondary: "#5F6B5C",
  textTertiary: "#888780",
  success: "#0F6E56",
  infoBg: "#E6F1FB",
  infoText: "#185FA5"
};

const DEFAULT_THEME = { bg: "#FDF0E4", text: "#8A4A1A" };

function hexToRgba(hex, alpha) {
  const h = hex.replace("#", "");
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

function buildReportPalette(theme) {
  return {
    ...NEUTRAL,
    tileBg: theme.bg,
    line: theme.text,
    lineFill: hexToRgba(theme.text, 0.12),
    linePoint: theme.text,
    keepPillBg: theme.bg,
    keepPillText: theme.text,
    accent: theme.text
  };
}

function PhaseChart({ min, max, points, palette }) {
  const W = 300;
  const H = 150;
  const padL = 26;
  const padR = 8;
  const top = 12;
  const plotH = 104;
  const plotW = W - padL - padR;
  const x = (i) => padL + (plotW * i) / (points.length - 1);
  const y = (v) => top + ((max - v) / (max - min)) * plotH;

  const lineCoords = points.map((p, i) => `${x(i)},${y(p.v)}`).join(" ");
  const areaCoords = `${padL},${top + plotH} ${lineCoords} ${padL + plotW},${top + plotH}`;
  const tickStep = max - min <= 4 ? 1 : 2;
  const ticks = [];
  for (let t = min; t <= max; t += tickStep) ticks.push(t);

  return (
    <Svg width="100%" height={150} viewBox={`0 0 ${W} ${H}`}>
      {ticks.map((t) => (
        <React.Fragment key={t}>
          <Line
            x1={padL}
            y1={y(t)}
            x2={W - padR}
            y2={y(t)}
            stroke="rgba(136,135,128,0.15)"
            strokeWidth={1}
          />
          <SvgText x={padL - 6} y={y(t) + 3} fontSize={9} fill={palette.textTertiary} textAnchor="end">
            {t}
          </SvgText>
        </React.Fragment>
      ))}
      <Polygon points={areaCoords} fill={palette.lineFill} />
      <Polyline
        points={lineCoords}
        fill="none"
        stroke={palette.line}
        strokeWidth={2}
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      {points.map((p, i) => (
        <Circle key={i} cx={x(i)} cy={y(p.v)} r={3.5} fill={palette.linePoint} />
      ))}
      {points.map((p, i) => (
        <SvgText
          key={`l-${i}`}
          x={x(i)}
          y={H - 4}
          fontSize={9}
          fill={palette.textTertiary}
          textAnchor={i === 0 ? "start" : i === points.length - 1 ? "end" : "middle"}
        >
          {p.label}
        </SvgText>
      ))}
    </Svg>
  );
}

function StackedBar({ segments }) {
  return (
    <View style={styles.stack}>
      {segments.map((s, i) => (
        <View key={i} style={{ flex: s.w, backgroundColor: s.c }} />
      ))}
    </View>
  );
}

function renderCompareBody(text, palette) {
  const parts = text.split(/([+\-]\d+\.?\d*)/);
  return parts.map((part, i) => {
    if (/^[+\-]\d/.test(part)) {
      return (
        <Text key={i} style={[styles.bodyStrong, { color: palette.textPrimary }]}>
          {part}
        </Text>
      );
    }
    return part;
  });
}

export function ExplorationReportView({ report, theme = DEFAULT_THEME }) {
  const navigation = useNavigation();
  const { showToast } = useUiShell();
  const palette = useMemo(() => buildReportPalette(theme), [theme]);

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <View style={styles.top}>
        <Pressable onPress={() => navigation.goBack()} hitSlop={12}>
          <Text style={[styles.back, { color: palette.accent }]}>‹ Back</Text>
        </Pressable>
      </View>
      <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 48, paddingTop: 4 }}>
        <View style={[styles.report, { backgroundColor: palette.tileBg, borderColor: palette.border }]}>
          <View style={styles.reportHead}>
            <Text style={[styles.headEyebrow, { color: palette.textTertiary }]}>✦ Kind · {report.category}</Text>
            <Text style={[styles.headDone, { color: palette.success }]}>✓ Completed</Text>
          </View>

          <View style={[styles.card, { backgroundColor: palette.cardBg, borderColor: palette.border }]}>
            <Text style={[styles.h1, { color: palette.textPrimary }]}>{report.explorationName}</Text>
            <Text style={[styles.reportType, { color: palette.textSecondary }]}>{report.reportTitleLabel}</Text>
            <Text style={[styles.subMeta, { color: palette.textSecondary }]}>{report.subMeta}</Text>
            <Text style={[styles.lede, { color: palette.textPrimary }]}>{report.lede}</Text>
          </View>

          <View style={styles.tileRow}>
            {report.tiles?.map((tile) => (
              <View key={tile.label} style={[styles.tile, { backgroundColor: palette.tileBg }]}>
                <Text style={[styles.tileLabel, { color: palette.textSecondary }]}>{tile.label}</Text>
                <Text style={[styles.tileValue, { color: palette.textPrimary }]}>{tile.value}</Text>
                <Text style={[styles.tileDelta, { color: palette.success }]}>{tile.delta}</Text>
              </View>
            ))}
          </View>

          <View style={[styles.card, { backgroundColor: palette.cardBg, borderColor: palette.border }]}>
            <Text style={[styles.cardTitle, { color: palette.textPrimary }]}>{report.phaseChart.title}</Text>
            <View style={{ height: 150 }}>
              <PhaseChart
                min={report.phaseChart.min}
                max={report.phaseChart.max}
                points={report.phaseChart.points}
                palette={palette}
              />
            </View>
          </View>

          <View style={[styles.card, { backgroundColor: palette.cardBg, borderColor: palette.border }]}>
            <Text style={[styles.cardTitle, { color: palette.textPrimary }]}>{report.factors.title}</Text>
            <Text style={[styles.cardSub, { color: palette.textSecondary }]}>{report.factors.sub}</Text>
            {report.factors?.rows?.map((r, i, arr) => (
              <View key={r.label} style={{ marginBottom: i === arr.length - 1 ? 0 : 14 }}>
                <View style={styles.ruleRow}>
                  <Text style={[styles.ruleLabel, { color: palette.textPrimary }]}>
                    {r.icon ? `${r.icon}  ` : ""}
                    {r.label}
                  </Text>
                  <Text style={[styles.ruleVal, { color: r.valColor || palette.textPrimary }]}>{r.value}</Text>
                </View>
                <View style={[styles.barTrack, { backgroundColor: palette.tileBg }]}>
                  <View style={[styles.barFill, { width: `${r.width}%`, backgroundColor: r.bar }]} />
                </View>
                <Text style={[styles.ruleBadge, { backgroundColor: r.badgeBg, color: r.badgeText }]}>
                  {r.badge}
                </Text>
              </View>
            ))}
          </View>

          <View style={[styles.card, { backgroundColor: palette.cardBg, borderColor: palette.border }]}>
            <Text style={[styles.cardTitle, { color: palette.textPrimary }]}>{report.distribution.title}</Text>
            <View style={{ marginBottom: 12 }}>
              <Text style={[styles.stackLabel, { color: palette.textSecondary }]}>{report.distribution.beforeLabel}</Text>
              <StackedBar segments={report.distribution.before} />
            </View>
            <View>
              <Text style={[styles.stackLabel, { color: palette.textSecondary }]}>{report.distribution.afterLabel}</Text>
              <StackedBar segments={report.distribution.after} />
            </View>
            <View style={styles.legendRow}>
              {report.distribution.legend.map((l) => (
                <View key={l.label} style={styles.legendItem}>
                  <View style={[styles.legendDot, { backgroundColor: l.c }]} />
                  <Text style={[styles.legendText, { color: palette.textSecondary }]}>{l.label}</Text>
                </View>
              ))}
            </View>
          </View>

          <View style={[styles.card, { backgroundColor: palette.cardBg, borderColor: palette.border }]}>
            <Text style={[styles.cardTitle, { color: palette.textPrimary }]}>🔖  Your keep-list</Text>
            <View style={styles.pillRow}>
              {report.keepList?.items?.map((item) => (
                <Text
                  key={item}
                  style={[styles.keepPill, { backgroundColor: palette.keepPillBg, color: palette.keepPillText }]}
                >
                  {item}
                </Text>
              ))}
            </View>
            <Text style={[styles.bodyText, { color: palette.textSecondary }]}>
              {report.keepList?.body ?? ""}
            </Text>
          </View>

          <View style={[styles.card, { backgroundColor: palette.cardBg, borderColor: palette.border }]}>
            <Text style={[styles.cardTitle, { color: palette.textPrimary }]}>How you compare</Text>
            <Text style={[styles.bodyText, { color: palette.textSecondary }]}>
              {renderCompareBody(report.compare?.body ?? "", palette)}
            </Text>
          </View>

          <View style={[styles.infoCard, { backgroundColor: palette.infoBg }]}>
            <Text style={[styles.infoTitle, { color: palette.infoText }]}>ⓘ  Hold this lightly</Text>
            <Text style={[styles.infoBody, { color: palette.infoText }]}>
              {typeof report.disclaimer === "string"
                ? report.disclaimer
                : report.disclaimerInfo?.body ?? ""}
            </Text>
          </View>

          <Pressable
            style={[styles.cta, { backgroundColor: palette.accent }]}
            onPress={() => showToast(report.cta?.toast ?? "Saved to your profile.")}
          >
            <Text style={styles.ctaText}>{report.cta?.label ?? "Done"}</Text>
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
}

export default function ExplorationReportScreen({ route }) {
  const explorationId = route?.params?.explorationId ?? "morning-rules";
  const posthog = usePostHog();
  const { explorations } = useData();
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
        const res = await get(`/me/explorations/${explorationId}/report`);
        if (!cancelled && res?.report) {
          setReport(res.report);
          posthog?.capture("exploration report viewed");
        } else if (!cancelled) {
          setReport(getExplorationReport(explorationId));
          posthog?.capture("exploration report viewed");
        }
      } catch {
        if (!cancelled) {
          setReport(getExplorationReport(explorationId));
          posthog?.capture("exploration report viewed");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadReport();
    return () => {
      cancelled = true;
    };
  }, [explorationId, posthog]);

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator color={theme.text} />
      </View>
    );
  }

  if (!report) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg, justifyContent: "center", alignItems: "center" }}>
        <Text style={{ color: colors.textMuted }}>Report not found.</Text>
      </View>
    );
  }

  return <ExplorationReportView report={report} theme={theme} />;
}

/** Backwards-compatible alias for morning-rules report. */
export function EnergyReportScreen() {
  return <ExplorationReportView report={getExplorationReport("morning-rules")} theme={DEFAULT_THEME} />;
}

const styles = StyleSheet.create({
  top: { paddingHorizontal: 12, paddingVertical: 8, backgroundColor: colors.bg },
  back: { fontWeight: "600", fontSize: 16 },
  report: {
    maxWidth: 420,
    width: "100%",
    alignSelf: "center",
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 24,
    padding: 14
  },
  reportHead: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 6
  },
  headEyebrow: { fontSize: 12 },
  headDone: { fontSize: 12, fontWeight: "600" },
  card: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12
  },
  h1: { fontSize: 19, fontWeight: "600", marginBottom: 4 },
  reportType: { fontSize: 15, fontWeight: "500", marginBottom: 2 },
  subMeta: { fontSize: 13 },
  lede: { fontSize: 15, lineHeight: 24, marginTop: 12 },
  tileRow: { flexDirection: "row", gap: 10, marginBottom: 12 },
  tile: { flex: 1, borderRadius: 12, padding: 12 },
  tileLabel: { fontSize: 12 },
  tileValue: { fontSize: 21, fontWeight: "600", marginTop: 4 },
  tileDelta: { fontSize: 12, marginTop: 2 },
  cardTitle: { fontSize: 14, fontWeight: "600", marginBottom: 10 },
  cardSub: { fontSize: 12, marginBottom: 14, marginTop: -4 },
  ruleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 5
  },
  ruleLabel: { fontSize: 13 },
  ruleVal: { fontSize: 13, fontWeight: "600" },
  barTrack: { height: 8, borderRadius: 6, overflow: "hidden" },
  barFill: { height: "100%", borderRadius: 6 },
  ruleBadge: {
    alignSelf: "flex-start",
    marginTop: 6,
    fontSize: 11,
    paddingVertical: 2,
    paddingHorizontal: 8,
    borderRadius: 6,
    overflow: "hidden"
  },
  stack: { flexDirection: "row", height: 14, borderRadius: 6, overflow: "hidden", marginTop: 4 },
  stackLabel: { fontSize: 12 },
  legendRow: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginTop: 12 },
  legendItem: { flexDirection: "row", alignItems: "center", gap: 4 },
  legendDot: { width: 9, height: 9, borderRadius: 2 },
  legendText: { fontSize: 11 },
  pillRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 10 },
  keepPill: {
    fontSize: 13,
    paddingVertical: 5,
    paddingHorizontal: 12,
    borderRadius: 8,
    overflow: "hidden"
  },
  bodyText: { fontSize: 13, lineHeight: 21 },
  bodyStrong: { fontWeight: "600" },
  infoCard: { borderRadius: 16, padding: 16, marginBottom: 12 },
  infoTitle: { fontSize: 13, fontWeight: "600", marginBottom: 6 },
  infoBody: { fontSize: 13, lineHeight: 21 },
  cta: {
    borderRadius: 12,
    paddingVertical: 13,
    alignItems: "center"
  },
  ctaText: { color: "#fff", fontSize: 14, fontWeight: "600" }
});
