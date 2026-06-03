import React from "react";
import { View, ScrollView, StyleSheet, Text, Pressable } from "react-native";
import Svg, { Polyline, Polygon, Line, Circle, Text as SvgText } from "react-native-svg";
import { useNavigation } from "@react-navigation/native";
import { colors } from "../theme/colors";
import { useUiShell } from "../context/UiContext";

// Report-specific palette (mirrors anna_week8_energy_report.html).
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
  infoText: "#185FA5",
  crash: { none: "#5DCAA5", mild: "#FAC775", noticeable: "#EF9F27", severe: "#E24B4A" }
};

const RULES = [
  {
    icon: "☀️",
    label: "Morning sunlight",
    value: "+2.1",
    width: 100,
    bar: "#1D9E75",
    valColor: R.textPrimary,
    badge: "Strong evidence · 82% of days",
    badgeBg: "#E1F5EE",
    badgeText: "#085041"
  },
  {
    icon: "🤸",
    label: "Morning movement",
    value: "+1.4",
    width: 67,
    bar: "#1D9E75",
    valColor: R.textPrimary,
    badge: "Moderate–strong · 68% of days",
    badgeBg: "#E1F5EE",
    badgeText: "#085041"
  },
  {
    icon: "🧘",
    label: "Morning meditation",
    value: "+0.9",
    width: 43,
    bar: "#EF9F27",
    valColor: R.textPrimary,
    badge: "Moderate · 47% of days",
    badgeBg: "#FAEEDA",
    badgeText: "#854F0B"
  },
  {
    icon: "☕",
    label: "Caffeine offsetting",
    value: "+0.4",
    width: 19,
    bar: "#888780",
    valColor: R.textSecondary,
    badge: "Experimental · too small to call",
    badgeBg: "#F1EFE8",
    badgeText: "#444441"
  }
];

const CRASH_LEGEND = [
  { c: R.crash.none, label: "None" },
  { c: R.crash.mild, label: "Mild dip" },
  { c: R.crash.noticeable, label: "Noticeable" },
  { c: R.crash.severe, label: "Severe" }
];

function PhaseChart() {
  // viewBox coordinate system; scales responsively to container width.
  const W = 300;
  const H = 150;
  const padL = 26;
  const padR = 8;
  const top = 12;
  const plotH = 104;
  const min = 4;
  const max = 8;
  const points = [
    { label: "Baseline", v: 5.2 },
    { label: "Morning rules", v: 6.1 },
    { label: "Optimise", v: 6.8 }
  ];
  const plotW = W - padL - padR;
  const x = (i) => padL + (plotW * i) / (points.length - 1);
  const y = (v) => top + ((max - v) / (max - min)) * plotH;

  const lineCoords = points.map((p, i) => `${x(i)},${y(p.v)}`).join(" ");
  const areaCoords = `${padL},${top + plotH} ${lineCoords} ${padL + plotW},${top + plotH}`;
  const ticks = [4, 5, 6, 7, 8];

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

export default function EnergyReportScreen() {
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
            <Text style={styles.headEyebrow}>✦ Kind · Energy &amp; Focus</Text>
            <Text style={styles.headDone}>✓ Completed</Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.h1}>Your 8-week energy report</Text>
            <Text style={styles.subMeta}>Anna · 8 Apr – 2 Jun 2026 · 89% of days logged</Text>
            <Text style={styles.lede}>
              Your afternoons got steadier. Here's what your own data — not a study average — suggests
              worked for you.
            </Text>
          </View>

          <View style={styles.tileRow}>
            <View style={styles.tile}>
              <Text style={styles.tileLabel}>Afternoon energy</Text>
              <Text style={styles.tileValue}>5.2 → 6.8</Text>
              <Text style={styles.tileDelta}>+1.6 pts</Text>
            </View>
            <View style={styles.tile}>
              <Text style={styles.tileLabel}>Days with a real crash</Text>
              <Text style={styles.tileValue}>64% → 29%</Text>
              <Text style={styles.tileDelta}>−35 pts</Text>
            </View>
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>Afternoon energy by phase</Text>
            <View style={{ height: 150 }}>
              <PhaseChart />
            </View>
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>What worked for you</Text>
            <Text style={styles.cardSub}>Extra afternoon energy on the days you did each rule.</Text>
            {RULES.map((r, i) => (
              <View key={r.label} style={{ marginBottom: i === RULES.length - 1 ? 0 : 14 }}>
                <View style={styles.ruleRow}>
                  <Text style={styles.ruleLabel}>
                    {r.icon}  {r.label}
                  </Text>
                  <Text style={[styles.ruleVal, { color: r.valColor }]}>{r.value}</Text>
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
            <Text style={styles.cardTitle}>How your afternoons felt</Text>
            <View style={{ marginBottom: 12 }}>
              <Text style={styles.stackLabel}>Baseline (wks 1–2)</Text>
              <StackedBar
                segments={[
                  { w: 18, c: R.crash.none },
                  { w: 18, c: R.crash.mild },
                  { w: 40, c: R.crash.noticeable },
                  { w: 24, c: R.crash.severe }
                ]}
              />
            </View>
            <View>
              <Text style={styles.stackLabel}>Optimise (wks 6–7)</Text>
              <StackedBar
                segments={[
                  { w: 46, c: R.crash.none },
                  { w: 25, c: R.crash.mild },
                  { w: 22, c: R.crash.noticeable },
                  { w: 7, c: R.crash.severe }
                ]}
              />
            </View>
            <View style={styles.legendRow}>
              {CRASH_LEGEND.map((l) => (
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
              <Text style={styles.keepPill}>Morning sunlight</Text>
              <Text style={styles.keepPill}>Morning movement</Text>
            </View>
            <Text style={styles.bodyText}>
              These two tracked most closely with your better afternoons. Worth keeping. You can park
              meditation and the caffeine delay, or revisit them later.
            </Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>How you compare</Text>
            <Text style={styles.bodyText}>
              Explorers improved afternoon energy by about 1.1 points on average. Your{" "}
              <Text style={styles.bodyStrong}>+1.6</Text> puts you a little ahead of the group — and you
              logged more consistently than most (89% vs ~78%).
            </Text>
          </View>

          <View style={styles.infoCard}>
            <Text style={styles.infoTitle}>ⓘ  Hold this lightly</Text>
            <Text style={styles.infoBody}>
              This is a study of one person — you — over a short window. Sleep, stress and lunch sway
              afternoons too, so read this as a strong personal hint rather than proof. The rule that
              worked for you is the one worth keeping.
            </Text>
          </View>

          <Pressable
            style={styles.cta}
            onPress={() =>
              showToast("Setting up a focused 4-week re-check on morning sunlight and morning movement.")
            }
          >
            <Text style={styles.ctaText}>Run a 4-week re-check on your keep-list  →</Text>
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
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
  h1: { fontSize: 19, fontWeight: "600", color: R.textPrimary, marginBottom: 2 },
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
