import React, { useEffect, useState } from "react";
import { View, ScrollView, StyleSheet, Text, Pressable } from "react-native";
import { useRoute, useFocusEffect } from "@react-navigation/native";
import { useData } from "../context/DataContext";
import { colors, heights, radius, spacing } from "../theme/colors";
import { layout, text } from "../theme/textStyles";
import { type } from "../theme/typography";
import { SectionTitle, SectionSub } from "../components/primitives/SectionTitle";
import { Card } from "../components/primitives/Card";
import { ScienceBanner } from "../components/primitives/ScienceBanner";
import { Badge } from "../components/primitives/Badge";
import { RichTextParts } from "../utils/RichText";
import Svg, { Circle, Path, Polyline } from "react-native-svg";
function InsightIcon({ variant }) {
  const common = { width: 20, height: 20 };
  if (variant === "amber")
    return (
      <Svg {...common} viewBox="0 0 24 24">
        <Circle cx="12" cy="12" r="4" stroke={colors.amberText} strokeWidth="2" fill="none" />
        <Path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41" stroke={colors.amberText} strokeWidth="2" />
      </Svg>
    );
  if (variant === "green")
    return (
      <Svg {...common} viewBox="0 0 24 24">
        <Path d="M18 20V10M12 20V4M6 20v-6" stroke={colors.mintText} strokeWidth="2" fill="none" />
      </Svg>
    );
  return (
    <Svg {...common} viewBox="0 0 24 24">
      <Circle cx="12" cy="12" r="10" stroke={colors.purpleText} strokeWidth="2" fill="none" />
      <Polyline points="12 6 12 12 16 14" stroke={colors.purpleText} strokeWidth="2" fill="none" />
    </Svg>
  );
}

export default function InsightScreen() {
  const { insight, refetchInsight } = useData();
  const route = useRoute();
  const [tab, setTab] = useState(route.params?.community ? 1 : 0);
  const highlightFeedItemId = route.params?.feedItemId;

  useFocusEffect(
    React.useCallback(() => {
      refetchInsight?.(route.params?.explorationId);
    }, [refetchInsight, route.params?.explorationId])
  );

  useEffect(() => {
    if (route.params?.community != null) setTab(route.params.community ? 1 : 0);
  }, [route.params?.community]);

  const your = insight.energyTrend;
  const mr = insight.rulesChart;
  const showCharts = insight.hasPersonalData && your?.bars?.length > 0;
  const showCommunityInsights = insight.showCommunityInsights !== false;

  useEffect(() => {
    if (!showCommunityInsights && tab === 1) setTab(0);
  }, [showCommunityInsights, tab]);

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScrollView contentContainerStyle={layout.screenPad}>
        <SectionTitle>{insight.header.title}</SectionTitle>
        <SectionSub>{insight.header.sub}</SectionSub>

        <View style={styles.subTabs}>
          <Pressable style={[styles.st, tab === 0 && styles.stOn]} onPress={() => setTab(0)}>
            <Text style={[styles.stTxt, tab === 0 && styles.stTxtOn]}>{insight.yourSubTabs[0]}</Text>
          </Pressable>
          {showCommunityInsights ? (
            <Pressable style={[styles.st, tab === 1 && styles.stOn]} onPress={() => setTab(1)}>
              <Text style={[styles.stTxt, tab === 1 && styles.stTxtOn]}>{insight.yourSubTabs[1]}</Text>
            </Pressable>
          ) : null}
        </View>

        {tab === 0 ? (
          <>
            {showCharts ? (
              <>
                <Card>
                  <Text style={styles.cardEyebrow}>{your.cardTitle}</Text>
                  <Text style={styles.chartHint}>{your.chartHint}</Text>
                  <View style={styles.chartRow}>
                    {your.bars.map((b, i) => (
                      <View key={i} style={styles.barCol}>
                        <View style={{ flex: 1, justifyContent: "flex-end", width: "100%" }}>
                          <View
                            style={[
                              styles.barBase,
                              {
                                height: Math.max(4, (90 * b.h) / 100),
                                backgroundColor: colors.greenDark
                              }
                            ]}
                          />
                        </View>
                        <Text style={styles.labSmall}>
                          {your.labels[i]}
                          {"\n"}
                          {b.v}
                        </Text>
                      </View>
                    ))}
                  </View>
                </Card>

                <Card>
                  <Text style={styles.cardEyebrow}>{mr.cardTitle}</Text>
                  <Text style={styles.chartHint}>{mr.chartHint}</Text>
                  <View style={styles.chartRow}>
                    {mr.bars.map((b, i) => (
                      <View key={i} style={styles.barCol}>
                        <View style={{ flex: 1, justifyContent: "flex-end", width: "100%" }}>
                          <View
                            style={[
                              styles.barBase,
                              {
                                height: Math.max(4, (90 * b.h) / 100),
                                backgroundColor: b.crash ? colors.orange : colors.greenDark
                              }
                            ]}
                          />
                        </View>
                      </View>
                    ))}
                  </View>
                  <View style={{ flexDirection: "row", gap: 16, marginTop: 8 }}>
                    {(mr.legend || []).map((lg, i) => (
                      <View key={i} style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                        <View
                          style={{
                            width: 10,
                            height: 10,
                            borderRadius: 2,
                            backgroundColor: lg.crash ? colors.orange : colors.greenDark
                          }}
                        />
                        <Text style={{ fontSize: 11, color: colors.textMuted }}>{lg.label}</Text>
                      </View>
                    ))}
                  </View>
                </Card>
              </>
            ) : (
              <Card>
                <Text style={styles.cardEyebrow}>Your insights</Text>
                <Text style={styles.emptyBody}>
                  {insight.emptyMessage ||
                    "Join an exploration and log daily check-ins to unlock personal charts."}
                </Text>
              </Card>
            )}

            <Card>
              <Text style={styles.cardEyebrow}>{insight.observations.cardTitle}</Text>
              {(insight.observations.rows || []).map((r, i) => (
                <View
                  key={i}
                  style={[styles.obsRow, i === insight.observations.rows.length - 1 && { borderBottomWidth: 0 }]}
                >
                  <View
                    style={[
                      styles.obsIco,
                      {
                        backgroundColor: r.tone === "!" ? colors.amberBg : colors.greenLight
                      }
                    ]}
                  >
                    <Text style={{ fontWeight: "700", color: r.tone === "!" ? colors.amberText : colors.greenDark }}>
                      {r.tone}
                    </Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.obsTitle}>{r.title}</Text>
                    <Text style={styles.obsBody}>{r.body}</Text>
                  </View>
                </View>
              ))}
            </Card>

            <Card>
              <Text style={styles.cardEyebrow}>{insight.adherence.cardTitle}</Text>
              <View style={styles.adRow}>
                <Text style={styles.adLabel}>{insight.adherence.weekLabel}</Text>
                <Text style={styles.adPct}>{insight.adherence.weekPct}</Text>
              </View>
              <View style={styles.pbar}>
                <View style={[styles.pfill, { width: insight.adherence.weekPct }]} />
              </View>
              <View style={[styles.adRow, { marginTop: spacing.lg }]}>
                <Text style={styles.adLabel}>{insight.adherence.overallLabel}</Text>
                <Text style={styles.adPct}>{insight.adherence.overallPct}</Text>
              </View>
              <View style={styles.pbar}>
                <View style={[styles.pfill, { width: insight.adherence.overallPct }]} />
              </View>
            </Card>
          </>
        ) : (
          <>
            <Text style={{ fontSize: 13, fontWeight: "600", color: colors.text }}>{insight.communityIntro.title}</Text>
            <Text style={{ fontSize: 12, color: colors.textMuted, marginTop: 2, marginBottom: 8 }}>
              {insight.communityIntro.sub}
            </Text>
            <Card style={{ marginTop: 4 }}>
              <Text style={styles.cardEyebrow}>{insight.communityFindingsTitle}</Text>
              {(insight.communityInsights || []).map((c, i) => (
                <View
                  key={c.id ?? i}
                  style={[
                    styles.cRow,
                    highlightFeedItemId && c.id === highlightFeedItemId && styles.cRowHighlight,
                    i === insight.communityInsights.length - 1 && { borderBottomWidth: 0 }
                  ]}
                >
                  <View style={[styles.cIco, { backgroundColor: colors.amberBg }]}>
                    <InsightIcon variant={c.iconTone === "green" ? "green" : c.iconTone === "purple" ? "purple" : "amber"} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.cTitle}>{c.title}</Text>
                    <RichTextParts
                      html={c.body}
                      style={{ fontSize: 12, color: colors.textMuted, lineHeight: 18, marginTop: 3 }}
                      strongStyle={{ fontWeight: "600", color: colors.text }}
                    />
                    <View style={styles.pill}>
                      <RichTextParts
                        html={c.pillText}
                        style={{ fontSize: 11, color: colors.greenDark }}
                        strongStyle={{ fontWeight: "700", color: colors.greenDark }}
                      />
                    </View>
                  </View>
                </View>
              ))}
            </Card>

            {(insight.publications || []).map((p, i) => (
              <View key={i} style={styles.pub}>
                <Text
                  style={[
                    styles.pubSrc,
                    p.sourceColor === "blue" ? { color: colors.blueText } : { color: colors.amberText }
                  ]}
                >
                  {p.source}
                </Text>
                <Text style={styles.pubTitle}>{p.title}</Text>
                <Text style={styles.pubMeta}>{p.meta}</Text>
                <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 8 }}>
                  {(p.tags || []).map((t) => (
                    <Badge key={t.label} variant={t.variant}>
                      {t.label}
                    </Badge>
                  ))}
                </View>
              </View>
            ))}

            <ScienceBanner
              title={insight.contributeBanner.title}
              body={insight.contributeBanner.body}
            />
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  subTabs: {
    flexDirection: "row",
    borderWidth: 1,
    borderColor: colors.borderMed,
    borderRadius: radius.md,
    overflow: "hidden",
    marginBottom: spacing.blockMbLg
  },
  st: { flex: 1, paddingVertical: 9, alignItems: "center", justifyContent: "center", backgroundColor: "transparent", minHeight: heights.subTab },
  stOn: { backgroundColor: colors.greenDark },
  stTxt: { ...type.tab, color: colors.textMuted },
  stTxtOn: { ...type.tabActive, color: "#fff" },
  cardEyebrow: { ...text.uppercaseLabel, marginBottom: spacing.sm + 2 },
  emptyBody: { ...text.exploreDesc, lineHeight: 20 },
  chartHint: { ...text.caption, marginBottom: spacing.md },
  chartRow: { flexDirection: "row", height: heights.chart, gap: spacing.sm, alignItems: "flex-end", marginBottom: spacing.md },
  barCol: { flex: 1, alignItems: "center", height: "100%" },
  barBase: { width: "100%", borderTopLeftRadius: 4, borderTopRightRadius: 4 },
  labSmall: { ...type.caption, fontSize: 10, textAlign: "center", marginTop: spacing.xs },
  obsRow: {
    flexDirection: "row",
    gap: spacing.lg,
    paddingVertical: spacing.lg,
    borderBottomWidth: 1,
    borderColor: colors.border
  },
  obsIco: {
    width: 32,
    height: 32,
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center"
  },
  obsTitle: text.feedName,
  obsBody: { ...text.exploreDesc, marginTop: 2 },
  adRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.xs
  },
  adLabel: { ...type.chip, color: colors.textMuted },
  adPct: { ...type.chip, color: colors.greenDark },
  pbar: {
    height: 6,
    backgroundColor: colors.border,
    borderRadius: 999,
    overflow: "hidden"
  },
  pfill: { height: "100%", backgroundColor: colors.greenDark, borderRadius: 999 },
  cRow: {
    flexDirection: "row",
    gap: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderColor: colors.border
  },
  cRowHighlight: {
    backgroundColor: colors.greenLight,
    marginHorizontal: -spacing.lg,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.md
  },
  cIco: {
    width: 36,
    height: 36,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center"
  },
  cTitle: { ...text.feedName, marginBottom: 3 },
  pill: {
    alignSelf: "flex-start",
    backgroundColor: colors.greenLight,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xs,
    marginTop: spacing.sm
  },
  pub: layout.feedItem,
  pubSrc: { ...text.uppercaseLabel, marginBottom: 5 },
  pubTitle: { ...type.exploreTitle, color: colors.text, marginBottom: spacing.xs },
  pubMeta: text.caption
});
