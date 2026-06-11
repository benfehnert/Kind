import React from "react";
import { View, ScrollView, StyleSheet, Text, Pressable } from "react-native";
import Svg, { Polyline, Polygon, Line, Circle, Text as SvgText } from "react-native-svg";
import { useNavigation } from "@react-navigation/native";
import { colors } from "../theme/colors";
import { useUiShell } from "../context/UiContext";
import { getExplorationReport } from "../data/explorationReportContent";

const R = {
  cardBg: "#FFFFFF",
  tileBg: "#F2F4EC",
  border: "#E2E6DA",
  textPrimary: "#1F2A1F",
  textSecondary: "#5F6B5C",
  textTertiary: "#888780",
  success: "#0F6E56",
  line: "#1D9E75",
  lineFill: "rgba(29,158,117,0.12)",
  linePoint: "#0F6E56",
  infoBg: "#E6F1FB",
  infoText: "#185FA5"
};

function PhaseChart({ min, max, points }) {
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
          <SvgText x={padL - 6} y={y(t) + 3} fontSize={9} fill={R.textTertiary} textAnchor="end">
            {t}
          </SvgText>
        </React.Fragment>
      ))}
      <Polygon points={areaCoords} fill={R.lineFill} />
      <Polyline
        points={lineCoords}
        fill="none"
        stroke={R.line}
        strokeWidth={2}
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      {points.map((p, i) => (
        <Circle key={i} cx={x(i)} cy={y(p.v)} r={3.5} fill={R.linePoint} />
      ))}
      {points.map((p, i) => (
        <SvgText
          key={`l-${i}`}
          x={x(i)}
          y={H - 4}
          fontSize={9}
          fill={R.textTertiary}
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

function renderCompareBody(text) {
  const parts = text.split(/([+\-]\d+\.?\d*)/);
  return parts.map((part, i) => {
    if (/^[+\-]\d/.test(part)) {
      return (
        <Text key={i} style={styles.bodyStrong}>
          {part}
        </Text>
      );
    }
    return part;
  });
}

export function ExplorationReportView({ report }) {
  const navigation = useNavigation();
  const { showToast } = useUiShell();

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <View style={styles.top}>
        <Pressable onPress={() => navigation.goBack()} hitSlop={12}>
          <Text style={styles.back}>‹ Back</Text>
        </Pressable>
      </View>
      <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 48, paddingTop: 4 }}>
        <View style={styles.report}>
          <View style={styles.reportHead}>
            <Text style={styles.headEyebrow}>✦ Kind · {report.category}</Text>
            <Text style={styles.headDone}>✓ Completed</Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.h1}>{report.explorationName}</Text>
            <Text style={styles.reportType}>{report.reportTitleLabel}</Text>
            <Text style={styles.subMeta}>{report.subMeta}</Text>
            <Text style={styles.lede}>{report.lede}</Text>
          </View>

          <View style={styles.tileRow}>
            {report.tiles.map((tile) => (
              <View key={tile.label} style={styles.tile}>
                <Text style={styles.tileLabel}>{tile.label}</Text>
                <Text style={styles.tileValue}>{tile.value}</Text>
                <Text style={styles.tileDelta}>{tile.delta}</Text>
              </View>
            ))}
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>{report.phaseChart.title}</Text>
            <View style={{ height: 150 }}>
              <PhaseChart
                min={report.phaseChart.min}
                max={report.phaseChart.max}
                points={report.phaseChart.points}
              />
            </View>
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>{report.factors.title}</Text>
            <Text style={styles.cardSub}>{report.factors.sub}</Text>
            {report.factors.rows.map((r, i) => (
              <View key={r.label} style={{ marginBottom: i === report.factors.rows.length - 1 ? 0 : 14 }}>
                <View style={styles.ruleRow}>
                  <Text style={styles.ruleLabel}>
                    {r.icon ? `${r.icon}  ` : ""}
                    {r.label}
                  </Text>
                  <Text style={[styles.ruleVal, { color: r.valColor || R.textPrimary }]}>{r.value}</Text>
                </View>
                <View style={styles.barTrack}>
                  <View style={[styles.barFill, { width: `${r.width}%`, backgroundColor: r.bar }]} />
                </View>
                <Text style={[styles.ruleBadge, { backgroundColor: r.badgeBg, color: r.badgeText }]}>
                  {r.badge}
                </Text>
              </View>
            ))}
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>{report.distribution.title}</Text>
            <View style={{ marginBottom: 12 }}>
              <Text style={styles.stackLabel}>{report.distribution.beforeLabel}</Text>
              <StackedBar segments={report.distribution.before} />
            </View>
            <View>
              <Text style={styles.stackLabel}>{report.distribution.afterLabel}</Text>
              <StackedBar segments={report.distribution.after} />
            </View>
            <View style={styles.legendRow}>
              {report.distribution.legend.map((l) => (
                <View key={l.label} style={styles.legendItem}>
                  <View style={[styles.legendDot, { backgroundColor: l.c }]} />
                  <Text style={styles.legendText}>{l.label}</Text>
                </View>
              ))}
            </View>
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>🔖  Your keep-list</Text>
            <View style={styles.pillRow}>
              {report.keepList.items.map((item) => (
                <Text key={item} style={styles.keepPill}>
                  {item}
                </Text>
              ))}
            </View>
            <Text style={styles.bodyText}>{report.keepList.body}</Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>How you compare</Text>
            <Text style={styles.bodyText}>{renderCompareBody(report.compare.body)}</Text>
          </View>

          <View style={styles.infoCard}>
            <Text style={styles.infoTitle}>ⓘ  Hold this lightly</Text>
            <Text style={styles.infoBody}>{report.disclaimer}</Text>
          </View>

          <Pressable style={styles.cta} onPress={() => showToast(report.cta.toast)}>
            <Text style={styles.ctaText}>{report.cta.label}</Text>
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
}

export default function ExplorationReportScreen({ route }) {
  const explorationId = route?.params?.explorationId ?? "morning-rules";
  const report = getExplorationReport(explorationId);

  if (!report) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg, justifyContent: "center", alignItems: "center" }}>
        <Text style={{ color: colors.textMuted }}>Report not found.</Text>
      </View>
    );
  }

  return <ExplorationReportView report={report} />;
}

/** Backwards-compatible alias for morning-rules report. */
export function EnergyReportScreen() {
  return <ExplorationReportView report={getExplorationReport("morning-rules")} />;
}

const styles = StyleSheet.create({
  top: { paddingHorizontal: 12, paddingVertical: 8, backgroundColor: colors.bg },
  back: { color: colors.greenDark, fontWeight: "600", fontSize: 16 },
  report: {
    maxWidth: 420,
    width: "100%",
    alignSelf: "center",
    backgroundColor: R.tileBg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: R.border,
    borderRadius: 24,
    padding: 14
  },
  reportHead: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 6
  },
  headEyebrow: { fontSize: 12, color: R.textTertiary },
  headDone: { fontSize: 12, color: R.success, fontWeight: "600" },
  card: {
    backgroundColor: R.cardBg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: R.border,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12
  },
  h1: { fontSize: 19, fontWeight: "600", color: R.textPrimary, marginBottom: 4 },
  reportType: { fontSize: 15, fontWeight: "500", color: R.textSecondary, marginBottom: 2 },
  subMeta: { fontSize: 13, color: R.textSecondary },
  lede: { fontSize: 15, lineHeight: 24, color: R.textPrimary, marginTop: 12 },
  tileRow: { flexDirection: "row", gap: 10, marginBottom: 12 },
  tile: { flex: 1, backgroundColor: R.tileBg, borderRadius: 12, padding: 12 },
  tileLabel: { fontSize: 12, color: R.textSecondary },
  tileValue: { fontSize: 21, fontWeight: "600", color: R.textPrimary, marginTop: 4 },
  tileDelta: { fontSize: 12, color: R.success, marginTop: 2 },
  cardTitle: { fontSize: 14, fontWeight: "600", color: R.textPrimary, marginBottom: 10 },
  cardSub: { fontSize: 12, color: R.textSecondary, marginBottom: 14, marginTop: -4 },
  ruleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 5
  },
  ruleLabel: { fontSize: 13, color: R.textPrimary },
  ruleVal: { fontSize: 13, fontWeight: "600" },
  barTrack: { height: 8, backgroundColor: R.tileBg, borderRadius: 6, overflow: "hidden" },
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
  stackLabel: { fontSize: 12, color: R.textSecondary },
  legendRow: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginTop: 12 },
  legendItem: { flexDirection: "row", alignItems: "center", gap: 4 },
  legendDot: { width: 9, height: 9, borderRadius: 2 },
  legendText: { fontSize: 11, color: R.textSecondary },
  pillRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 10 },
  keepPill: {
    fontSize: 13,
    paddingVertical: 5,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: "#E1F5EE",
    color: "#085041",
    overflow: "hidden"
  },
  bodyText: { fontSize: 13, lineHeight: 21, color: R.textSecondary },
  bodyStrong: { color: R.textPrimary, fontWeight: "600" },
  infoCard: { backgroundColor: R.infoBg, borderRadius: 16, padding: 16, marginBottom: 12 },
  infoTitle: { fontSize: 13, fontWeight: "600", color: R.infoText, marginBottom: 6 },
  infoBody: { fontSize: 13, lineHeight: 21, color: R.infoText },
  cta: {
    backgroundColor: colors.greenDark,
    borderRadius: 12,
    paddingVertical: 13,
    alignItems: "center"
  },
  ctaText: { color: "#fff", fontSize: 14, fontWeight: "600" }
});
