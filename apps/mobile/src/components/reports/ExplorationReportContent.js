import React, { useMemo } from "react";
import { View, ScrollView, StyleSheet, Text, Pressable } from "react-native";
import Svg, { Polyline, Polygon, Line, Circle, Text as SvgText } from "react-native-svg";
import { useNavigation } from "@react-navigation/native";
import { colors } from "../../theme/colors";
import { useUiShell } from "../../context/UiContext";

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

function hexToRgba(hex, alpha) {
  const h = hex.replace("#", "");
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

export function buildReportPalette(theme) {
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
  if (!points?.length) return null;

  const W = 300;
  const H = 150;
  const padL = 26;
  const padR = 8;
  const top = 12;
  const plotH = 104;
  const plotW = W - padL - padR;
  const denom = Math.max(points.length - 1, 1);
  const x = (i) => padL + (plotW * i) / denom;
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
      {points.length > 1 ? (
        <>
          <Polygon points={areaCoords} fill={palette.lineFill} />
          <Polyline
            points={lineCoords}
            fill="none"
            stroke={palette.line}
            strokeWidth={2}
            strokeLinejoin="round"
            strokeLinecap="round"
          />
        </>
      ) : (
        <Circle cx={x(0)} cy={y(points[0].v)} r={5} fill={palette.linePoint} />
      )}
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
  if (!segments?.length) return null;
  return (
    <View style={styles.stack}>
      {segments.map((s, i) => (
        <View key={i} style={{ flex: Math.max(s.w, 1), backgroundColor: s.c }} />
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

function normalizeReportView(report) {
  if (!report) return null;
  if (report.mobileView) return report.mobileView;
  if (report.explorationName || report.phaseChart || report.tiles) return report;
  return {
    explorationName: null,
    reportTitleLabel: report.reportTitle || report.type,
    lede: report.headline || report.lede,
    guidance: report.phase_b_guidance || report.optimise_guidance,
    limitations: report.limitations || report.quality_warnings,
    tiles: report.summary_tiles?.map((tile) => ({
      label: tile.label,
      value: tile.value,
      delta: tile.note || tile.delta
    }))
  };
}

export default function ExplorationReportContent({
  report,
  theme,
  explorationId,
  explorationTitle,
  ownerSlug = null,
  ownerName = null,
  variant = "phase",
  generatedAt = null
}) {
  const navigation = useNavigation();
  const { showToast } = useUiShell();
  const palette = useMemo(() => buildReportPalette(theme), [theme]);
  const view = useMemo(() => normalizeReportView(report), [report]);
  const isFinal = variant === "final";

  if (!view) return null;

  const title = view.explorationName || explorationTitle || "Health exploration";
  const tiles = view.tiles ?? [];
  const phasePoints = view.phaseChart?.points ?? [];
  const factorRows = view.factors?.rows ?? [];
  const showDistribution = Boolean(view.distribution?.before?.length);
  const showKeepList = Boolean(view.keepList?.items?.length);
  const showCompare = Boolean(view.compare?.body);
  const showGuidance = Boolean(view.guidance);
  const disclaimerText =
    typeof view.disclaimer === "string"
      ? view.disclaimer
      : view.disclaimerInfo?.body ?? null;
  const limitations = view.limitations ?? [];

  const openSummary = () => {
    if (!explorationId) return;
    navigation.navigate("ExplorationSummary", {
      id: explorationId,
      ownerSlug: ownerSlug || undefined,
      ownerName: ownerName || undefined
    });
  };

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
            <Text style={[styles.headEyebrow, { color: palette.textTertiary }]}>
              ✦ Kind · {view.category || "Health exploration"}
            </Text>
            {isFinal ? (
              <Text style={[styles.headDone, { color: palette.success }]}>✓ Completed</Text>
            ) : generatedAt ? (
              <Text style={[styles.headDate, { color: palette.textTertiary }]}>
                {new Date(generatedAt).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
              </Text>
            ) : null}
          </View>

          <View style={[styles.card, { backgroundColor: palette.cardBg, borderColor: palette.border }]}>
            <Pressable onPress={openSummary} disabled={!explorationId}>
              <Text style={[styles.h1, styles.linkedTitle, { color: palette.textPrimary }]}>{title}</Text>
            </Pressable>
            {view.reportTitleLabel ? (
              <Text style={[styles.reportType, { color: palette.textSecondary }]}>{view.reportTitleLabel}</Text>
            ) : null}
            {view.subMeta ? (
              <Text style={[styles.subMeta, { color: palette.textSecondary }]}>{view.subMeta}</Text>
            ) : null}
            {view.lede ? (
              <Text style={[styles.lede, { color: palette.textPrimary }]}>{view.lede}</Text>
            ) : null}
          </View>

          {tiles.length ? (
            <View style={styles.tileRow}>
              {tiles.map((tile) => (
                <View key={tile.label} style={[styles.tile, { backgroundColor: palette.tileBg }]}>
                  <Text style={[styles.tileLabel, { color: palette.textSecondary }]}>{tile.label}</Text>
                  <Text style={[styles.tileValue, { color: palette.textPrimary }]}>{tile.value}</Text>
                  {tile.delta ? (
                    <Text style={[styles.tileDelta, { color: palette.success }]}>{tile.delta}</Text>
                  ) : null}
                </View>
              ))}
            </View>
          ) : null}

          {phasePoints.length >= 1 && view.phaseChart ? (
            <View style={[styles.card, { backgroundColor: palette.cardBg, borderColor: palette.border }]}>
              <Text style={[styles.cardTitle, { color: palette.textPrimary }]}>{view.phaseChart.title}</Text>
              <View style={{ height: 150 }}>
                <PhaseChart
                  min={view.phaseChart.min}
                  max={view.phaseChart.max}
                  points={phasePoints}
                  palette={palette}
                />
              </View>
            </View>
          ) : null}

          {factorRows.length ? (
            <View style={[styles.card, { backgroundColor: palette.cardBg, borderColor: palette.border }]}>
              <Text style={[styles.cardTitle, { color: palette.textPrimary }]}>{view.factors.title}</Text>
              {view.factors.sub ? (
                <Text style={[styles.cardSub, { color: palette.textSecondary }]}>{view.factors.sub}</Text>
              ) : null}
              {factorRows.map((r, i, arr) => (
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
          ) : null}

          {showDistribution ? (
            <View style={[styles.card, { backgroundColor: palette.cardBg, borderColor: palette.border }]}>
              <Text style={[styles.cardTitle, { color: palette.textPrimary }]}>{view.distribution.title}</Text>
              <View style={{ marginBottom: 12 }}>
                <Text style={[styles.stackLabel, { color: palette.textSecondary }]}>
                  {view.distribution.beforeLabel}
                </Text>
                <StackedBar segments={view.distribution.before} />
              </View>
              {view.distribution.after ? (
                <View>
                  <Text style={[styles.stackLabel, { color: palette.textSecondary }]}>
                    {view.distribution.afterLabel}
                  </Text>
                  <StackedBar segments={view.distribution.after} />
                </View>
              ) : null}
              {view.distribution.legend ? (
                <View style={styles.legendRow}>
                  {view.distribution.legend.map((l) => (
                    <View key={l.label} style={styles.legendItem}>
                      <View style={[styles.legendDot, { backgroundColor: l.c }]} />
                      <Text style={[styles.legendText, { color: palette.textSecondary }]}>{l.label}</Text>
                    </View>
                  ))}
                </View>
              ) : null}
            </View>
          ) : null}

          {showKeepList ? (
            <View style={[styles.card, { backgroundColor: palette.cardBg, borderColor: palette.border }]}>
              <Text style={[styles.cardTitle, { color: palette.textPrimary }]}>🔖  Your keep-list</Text>
              <View style={styles.pillRow}>
                {view.keepList.items.map((item) => (
                  <Text
                    key={item}
                    style={[styles.keepPill, { backgroundColor: palette.keepPillBg, color: palette.keepPillText }]}
                  >
                    {item}
                  </Text>
                ))}
              </View>
              {view.keepList.body ? (
                <Text style={[styles.bodyText, { color: palette.textSecondary }]}>{view.keepList.body}</Text>
              ) : null}
            </View>
          ) : null}

          {showCompare ? (
            <View style={[styles.card, { backgroundColor: palette.cardBg, borderColor: palette.border }]}>
              <Text style={[styles.cardTitle, { color: palette.textPrimary }]}>How you compare</Text>
              <Text style={[styles.bodyText, { color: palette.textSecondary }]}>
                {renderCompareBody(view.compare.body, palette)}
              </Text>
            </View>
          ) : null}

          {showGuidance ? (
            <View style={[styles.guidanceCard, { borderColor: palette.border }]}>
              <Text style={[styles.guidanceTitle, { color: palette.textPrimary }]}>What happens next</Text>
              <Text style={[styles.guidanceBody, { color: palette.textSecondary }]}>{view.guidance}</Text>
            </View>
          ) : null}

          {limitations.length ? (
            <View style={[styles.limitationsCard, { borderColor: palette.border }]}>
              {limitations.map((item) => (
                <Text key={item} style={[styles.limitationItem, { color: palette.textSecondary }]}>
                  · {item}
                </Text>
              ))}
            </View>
          ) : null}

          {disclaimerText ? (
            <View style={[styles.infoCard, { backgroundColor: palette.infoBg }]}>
              <Text style={[styles.infoTitle, { color: palette.infoText }]}>ⓘ  Hold this lightly</Text>
              <Text style={[styles.infoBody, { color: palette.infoText }]}>{disclaimerText}</Text>
            </View>
          ) : null}

          {isFinal && view.cta ? (
            <Pressable
              style={[styles.cta, { backgroundColor: palette.accent }]}
              onPress={() => showToast(view.cta?.toast ?? "Saved to your profile.")}
            >
              <Text style={styles.ctaText}>{view.cta?.label ?? "Done"}</Text>
            </Pressable>
          ) : null}
        </View>
      </ScrollView>
    </View>
  );
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
  headDate: { fontSize: 12 },
  card: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12
  },
  h1: { fontSize: 19, fontWeight: "600", marginBottom: 4 },
  linkedTitle: { textDecorationLine: "underline" },
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
  guidanceCard: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    backgroundColor: colors.surface
  },
  guidanceTitle: { fontSize: 13, fontWeight: "600", marginBottom: 6 },
  guidanceBody: { fontSize: 13, lineHeight: 20 },
  limitationsCard: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    backgroundColor: colors.surface
  },
  limitationItem: { fontSize: 12, lineHeight: 18, marginBottom: 4 },
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
