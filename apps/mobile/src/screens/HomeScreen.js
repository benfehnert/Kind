import React, { useMemo, useState } from "react";
import { View, ScrollView, StyleSheet, Text, Pressable } from "react-native";
import Slider from "@react-native-community/slider";
import { useNavigation } from "@react-navigation/native";
import { home, feed, explorations } from "../data/mock";
import { colors, fontSize, radius, spacing } from "../theme/colors";
import { layout, text } from "../theme/textStyles";
import { type } from "../theme/typography";
import { SectionTitle, SectionSub } from "../components/primitives/SectionTitle";
import { MetricGrid, MetricCard } from "../components/primitives/MetricCard";
import { PrimaryButton, GhostButton } from "../components/primitives/Buttons";
import { ChipRow } from "../components/primitives/ChipRow";
import { Card } from "../components/primitives/Card";
import { Badge } from "../components/primitives/Badge";
import { Avatar } from "../components/primitives/Avatar";
import { RichTextParts } from "../utils/RichText";
export default function HomeScreen() {
  const navigation = useNavigation();
  const [showLog, setShowLog] = useState(false);
  const [saved, setSaved] = useState(false);
  const [chip, setChip] = useState("all");
  const [tipsExpanded, setTipsExpanded] = useState(false);
  const [scienceExpanded, setScienceExpanded] = useState(false);

  const [rules, setRules] = useState(() => {
    const m = {};
    home.morningRules.options.forEach((o) => {
      m[o.key] = o.defaultChecked;
    });
    return m;
  });

  const [rangeVals, setRangeVals] = useState(() => {
    const o = {};
    home.ranges.forEach((r) => {
      o[r.id] = r.default;
    });
    return o;
  });
  const [crashIdx, setCrashIdx] = useState(home.crashSelect.defaultIndex ?? 0);

  const dynamicFeed = useMemo(() => {
    const items = [];
    (feed.feedExpIds || []).forEach((expId, i) => {
      const exp = explorations[expId];
      if (!exp || !feed.feedTips[expId]?.[0]) return;
      const tip = feed.feedTips[expId][0];
      const sci = feed.feedScience[expId]?.[0];
      const tipTime = feed.feedTipTimes[i % feed.feedTipTimes.length];
      const sciTime = feed.feedScienceTimes[i % feed.feedScienceTimes.length];
      const label = exp.feedLabel || exp.title;
      items.push({
        id: `tip-${expId}`,
        type: "tip",
        explorationId: expId,
        displayName: "Wellbeing tip",
        badgeLabel: "Tip",
        badge: "teal",
        time: `${tipTime} · ${label}`,
        body: tip.body,
        avatarKind: "glyph",
        glyph: "✓",
        avatarBg: exp.bg || colors.amberBg,
        glyphColor: exp.text || colors.amberText
      });
      items.push({
        id: `sci-${expId}`,
        type: "science",
        explorationId: expId,
        displayName: "kind science",
        badgeLabel: "Science",
        badge: "teal",
        time: `${sciTime} · ${label}`,
        body: sci.body,
        highlight: sci.highlight || "",
        avatarKind: "glyph",
        glyph: "⬡",
        avatarBg: colors.greenLight,
        glyphColor: colors.greenDark
      });
    });
    return items;
  }, []);

  const expandedFeed = useMemo(() => {
    const items = [];
    (feed.feedExpIds || []).forEach((expId, expIndex) => {
      const exp = explorations[expId];
      if (!exp) return;
      const label = exp.feedLabel || exp.title;
      const extraTips = (feed.feedTips[expId] || []).slice(1);
      const extraScience = (feed.feedScience[expId] || []).slice(1);

      if (tipsExpanded) {
        extraTips.forEach((tip, i) => {
          const tipTime = feed.feedTipTimes[(expIndex + i + 1) % feed.feedTipTimes.length];
          items.push({
            id: `tip-more-${expId}-${i}`,
            type: "tip",
            explorationId: expId,
            displayName: "Wellbeing tip",
            badgeLabel: "Tip",
            badge: "teal",
            time: `${tipTime} · ${label}`,
            body: tip.body,
            avatarKind: "glyph",
            glyph: "✓",
            avatarBg: exp.bg || colors.amberBg,
            glyphColor: exp.text || colors.amberText
          });
        });
      }

      if (scienceExpanded) {
        extraScience.forEach((sci, i) => {
          const sciTime = feed.feedScienceTimes[(expIndex + i + 1) % feed.feedScienceTimes.length];
          items.push({
            id: `sci-more-${expId}-${i}`,
            type: "science",
            explorationId: expId,
            displayName: "kind science",
            badgeLabel: "Science",
            badge: "teal",
            time: `${sciTime} · ${label}`,
            body: sci.body,
            highlight: sci.highlight || "",
            avatarKind: "glyph",
            glyph: "⬡",
            avatarBg: colors.greenLight,
            glyphColor: colors.greenDark
          });
        });
      }
    });
    return items;
  }, [tipsExpanded, scienceExpanded]);

  const merged = useMemo(() => {
    const stat = (feed.staticItems || []).map((s) => ({ ...s }));
    return [...stat, ...dynamicFeed];
  }, [dynamicFeed]);

  const visible = useMemo(() => {
    const all = [...merged, ...expandedFeed];
    if (chip === "all") return all;
    return all.filter((x) => x.type === chip);
  }, [merged, expandedFeed, chip]);

  const showMoreTips = chip === "all" || chip === "tip";
  const showMoreSci = chip === "all" || chip === "science";

  return (
    <View style={styles.root}>
      <ScrollView contentContainerStyle={styles.pad}>
        <SectionTitle>{home.greeting}</SectionTitle>
        <SectionSub>{home.sub}</SectionSub>
        <MetricGrid>
          {(home.metrics || []).map((m, i) => (
            <MetricCard
              key={i}
              label={m.label}
              value={m.value}
              unit={m.unit}
              sub={m.sub}
              subTone={m.subTone}
            />
          ))}
        </MetricGrid>

        {!saved && !showLog && (
          <PrimaryButton title="Log today's data" onPress={() => setShowLog(true)} style={{ marginBottom: 12 }} />
        )}

        {showLog && !saved && (
          <Card style={layout.logForm}>
            <Text style={[styles.confirmTitle, { marginBottom: 12 }]}>{home.logFormTitle}</Text>
            <Text style={styles.inputLabel}>{home.morningRules.label}</Text>
            <View style={styles.chips}>
              {home.morningRules.options.map((o) => (
                <Pressable
                  key={o.key}
                  style={[styles.check, rules[o.key] && styles.checkOn]}
                  onPress={() => setRules((r) => ({ ...r, [o.key]: !r[o.key] }))}
                >
                  <Text style={[styles.checkTxt, !rules[o.key] && styles.checkTxtOff]}>
                    {rules[o.key] ? "✓ " : ""}
                    {o.label}
                  </Text>
                </Pressable>
              ))}
            </View>
            {home.ranges.map((r) => (
              <View key={r.id} style={{ marginBottom: 14 }}>
                <Text style={styles.inputLabel}>{r.label}</Text>
                <View style={styles.rangeRow}>
                  <Slider
                    style={{ flex: 1, height: 40 }}
                    minimumValue={r.min}
                    maximumValue={r.max}
                    step={1}
                    value={rangeVals[r.id]}
                    onValueChange={(v) => setRangeVals((o) => ({ ...o, [r.id]: Math.round(v) }))}
                    minimumTrackTintColor={colors.greenDark}
                    maximumTrackTintColor={colors.border}
                    thumbTintColor={colors.greenDark}
                  />
                  <Text style={styles.rangeVal}>{rangeVals[r.id]}</Text>
                </View>
                {r.hints ? (
                  <View style={styles.hintRow}>
                    <Text style={styles.hint}>{r.hints[0]}</Text>
                    <Text style={styles.hint}>{r.hints[1]}</Text>
                  </View>
                ) : null}
              </View>
            ))}
            <Text style={styles.inputLabel}>{home.crashSelect.label}</Text>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6, marginBottom: 12 }}>
              {home.crashSelect.options.map((opt, idx) => (
                <Pressable
                  key={opt}
                  style={[styles.crashChip, crashIdx === idx && styles.crashChipOn]}
                  onPress={() => setCrashIdx(idx)}
                >
                  <Text style={[styles.crashTxt, crashIdx === idx && styles.crashTxtOn]}>{opt}</Text>
                </Pressable>
              ))}
            </View>
            <View style={{ flexDirection: "row", gap: 8, marginTop: 8 }}>
              <GhostButton
                title="Cancel"
                onPress={() => {
                  setShowLog(false);
                }}
              />
              <PrimaryButton
                style={{ flex: 2 }}
                title="Save log"
                onPress={() => {
                  setSaved(true);
                  setShowLog(false);
                }}
              />
            </View>
          </Card>
        )}

        {saved && (
          <Card style={{ backgroundColor: colors.greenLight, borderColor: colors.greenDark }}>
            <Text style={styles.confirmTitle}>{home.confirm.title}</Text>
            <Text style={styles.confirmBody}>{home.confirm.body}</Text>
          </Card>
        )}

        <ChipRow chips={feed.chips || []} value={chip} onChange={setChip} />

        {visible.map((item) => (
          <Pressable
            key={item.id}
            style={styles.feed}
            onPress={() => {
              if (item.route) navigation.navigate(item.route);
              else if (item.userId) navigation.navigate("ExplorerProfile", { userId: item.userId });
              else if (item.type === "insight")
                navigation.navigate("MainTabs", {
                  screen: "Insight",
                  params: { community: item.insightTab === "community" }
                });
              else if (item.explorationId) navigation.navigate("ExplorationDetail", { id: item.explorationId });
            }}
          >
            <View style={styles.feedHead}>
              {item.avatarKind === "icon" || item.avatarKind === "glyph" ? (
                <View
                  style={[
                    styles.feedAv,
                    {
                      backgroundColor: item.avatarBg || item.avatarBgStyle,
                      borderRadius: item.avatarKind === "glyph" ? 8 : 999
                    }
                  ]}
                >
                  <Text style={{ color: item.iconColor || item.glyphColor, fontSize: 16 }}>
                    {item.icon || item.glyph}
                  </Text>
                </View>
              ) : (
                <Avatar
                  size={34}
                  img={item.avatarKey ? parseInt(item.avatarKey.replace("pravatar-", ""), 10) : undefined}
                  sceneKey={item.sceneKey}
                  initials={item.initials}
                  backgroundColor={item.avatarBgStyle}
                />
              )}
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: 6 }}>
                  <Text style={styles.feedName}>{item.displayName}</Text>
                  {item.badge ? <Badge variant={item.badge}>{item.badgeLabel}</Badge> : null}
                </View>
                <Text style={styles.feedTime}>{item.time}</Text>
              </View>
            </View>
            <RichTextParts
              html={item.body}
              style={[text.feedBody, { marginTop: spacing.xs }]}
              strongStyle={{ color: colors.text, ...type.bodyStrong }}
            />
            {item.highlight ? (
              <View style={styles.hl}>
                <RichTextParts
                  html={item.highlight}
                  style={text.feedHighlight}
                  strongStyle={{ color: colors.greenDark, ...type.captionStrong }}
                />
              </View>
            ) : null}
          </Pressable>
        ))}

        {showMoreTips && !tipsExpanded && (
          <Pressable style={styles.more} onPress={() => setTipsExpanded(true)}>
            <Text style={styles.moreT}>More tips</Text>
            <Text style={styles.moreS}>5 wellbeing tips for each exploration</Text>
          </Pressable>
        )}
        {showMoreSci && !scienceExpanded && (
          <Pressable style={styles.more} onPress={() => setScienceExpanded(true)}>
            <Text style={styles.moreT}>More science</Text>
            <Text style={styles.moreS}>5 science updates for each exploration</Text>
          </Pressable>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  pad: layout.screenPad,
  inputLabel: { ...text.label, marginBottom: 7 },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm, marginTop: spacing.sm },
  check: {
    borderWidth: 1,
    borderColor: colors.borderMed,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.chipPadY,
    minHeight: 32,
    justifyContent: "center"
  },
  checkOn: { backgroundColor: colors.greenLight, borderColor: colors.greenDark },
  checkTxt: { ...type.chip, color: colors.greenDark },
  checkTxtOff: { ...type.chip, color: colors.textMuted },
  rangeRow: { flexDirection: "row", alignItems: "center", gap: spacing.lg },
  rangeVal: { ...type.button, minWidth: 32, textAlign: "right", color: colors.text },
  hintRow: { flexDirection: "row", justifyContent: "space-between", marginTop: spacing.xs },
  hint: { ...type.caption, color: colors.textMuted },
  crashChip: {
    borderWidth: 1,
    borderColor: colors.borderMed,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.chipPadY,
    minHeight: 32,
    justifyContent: "center"
  },
  crashChipOn: { backgroundColor: colors.greenDark, borderColor: colors.greenDark },
  crashTxt: { ...type.chip, color: colors.textMuted },
  crashTxtOn: { ...type.chip, color: "#fff" },
  confirmTitle: { ...type.buttonMd, color: colors.greenDark, marginBottom: spacing.xs },
  confirmBody: { ...type.exploreDesc, color: colors.textMuted },
  feed: layout.feedItem,
  feedHead: { flexDirection: "row", alignItems: "center", gap: spacing.feedGap, marginBottom: spacing.md },
  feedAv: {
    width: 34,
    height: 34,
    minHeight: 34,
    alignItems: "center",
    justifyContent: "center"
  },
  feedName: text.feedName,
  feedTime: text.feedTime,
  hl: {
    backgroundColor: colors.greenLight,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    marginTop: spacing.md
  },
  more: layout.feedMore,
  moreT: text.feedMoreTitle,
  moreS: text.feedMoreSub
});
