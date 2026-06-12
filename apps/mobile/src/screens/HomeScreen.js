import React, { useEffect, useMemo, useState } from "react";
import { View, ScrollView, StyleSheet, Text, Pressable } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { useData } from "../context/DataContext";
import { useConsent } from "../context/ConsentContext";
import { colors, radius, spacing } from "../theme/colors";
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
import { ExplorationLogFields } from "../components/logging/ExplorationLogFields";
import {
  buildInitialFieldValues,
  buildInitialLogValues,
  listConsentedExplorationForms
} from "../utils/explorationLogState";

export default function HomeScreen() {
  const { home, feed, explorations } = useData();
  const { explorationConsents } = useConsent();
  const navigation = useNavigation();
  const [showLog, setShowLog] = useState(false);
  const [saved, setSaved] = useState(false);
  const [chip, setChip] = useState("all");
  const [tipsExpanded, setTipsExpanded] = useState(false);
  const [scienceExpanded, setScienceExpanded] = useState(false);

  const logExplorations = useMemo(
    () => listConsentedExplorationForms(explorations, explorationConsents),
    [explorations, explorationConsents]
  );

  const [logValues, setLogValues] = useState(() => buildInitialLogValues(logExplorations));

  useEffect(() => {
    setLogValues((prev) => {
      const next = { ...prev };
      let changed = false;
      for (const ex of logExplorations) {
        if (!next[ex.id]) {
          next[ex.id] = buildInitialFieldValues(ex.fields);
          changed = true;
        }
      }
      for (const id of Object.keys(next)) {
        if (!logExplorations.some((ex) => ex.id === id)) {
          delete next[id];
          changed = true;
        }
      }
      return changed ? next : prev;
    });
  }, [logExplorations]);

  const multiExplorationLog = logExplorations.length > 1;

  const savedConfirmBody = useMemo(() => {
    const tail = home.confirm.body.replace(/^Your data has been saved\.\s*/i, "");
    if (logExplorations.length > 1) {
      const names = logExplorations.map((ex) => ex.title).join(" and ");
      return `Your data has been saved for ${names}. ${tail}`;
    }
    if (logExplorations.length === 1) {
      return `Your ${logExplorations[0].title} log has been saved. ${tail}`;
    }
    return home.confirm.body;
  }, [home.confirm.body, logExplorations]);

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
  const demoReports = feed.demoReportItems || [];

  function handleFeedPress(item) {
    if (item.route) navigation.navigate(item.route, item.routeParams ?? {});
    else if (item.userId) navigation.navigate("ExplorerProfile", { userId: item.userId });
    else if (item.type === "insight")
      navigation.navigate("MainTabs", {
        screen: "Insight",
        params: { community: item.insightTab === "community" }
      });
    else if (item.explorationId) navigation.navigate("ExplorationDetail", { id: item.explorationId });
  }

  function renderFeedItem(item) {
    return (
      <Pressable key={item.id} style={styles.feed} onPress={() => handleFeedPress(item)}>
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
    );
  }

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

        {logExplorations.length > 0 && !saved && !showLog && (
          <PrimaryButton title="Log today's data" onPress={() => setShowLog(true)} style={{ marginBottom: 12 }} />
        )}

        {showLog && !saved && logExplorations.length > 0 && (
          <Card style={layout.logForm}>
            <Text style={[styles.confirmTitle, { marginBottom: multiExplorationLog ? 6 : 12 }]}>
              {home.logFormTitle}
            </Text>
            {multiExplorationLog ? (
              <Text style={styles.logIntro}>
                You're logging for {logExplorations.length} health explorations today. Each section below
                shows which exploration you're recording data for.
              </Text>
            ) : null}

            {logExplorations.map((ex, index) => (
              <View
                key={ex.id}
                style={[
                  styles.explorationSection,
                  index > 0 && styles.explorationSectionBorder,
                  { borderLeftColor: ex.text || colors.greenDark }
                ]}
              >
                <View style={[styles.explorationHeader, { backgroundColor: ex.bg || colors.greenLight }]}>
                  <Text style={styles.explorationIcon}>{ex.icon || "⬡"}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.explorationEyebrow}>Health exploration</Text>
                    <Text style={[styles.explorationTitle, { color: ex.text || colors.greenDark }]}>
                      {ex.title}
                    </Text>
                  </View>
                </View>
                <ExplorationLogFields
                  fields={ex.fields}
                  values={logValues[ex.id] || {}}
                  onChange={(fieldId, value) =>
                    setLogValues((prev) => ({
                      ...prev,
                      [ex.id]: { ...prev[ex.id], [fieldId]: value }
                    }))
                  }
                />
              </View>
            ))}

            <View style={{ flexDirection: "row", gap: 8, marginTop: 8 }}>
              <GhostButton
                title="Cancel"
                onPress={() => {
                  setShowLog(false);
                }}
              />
              <PrimaryButton
                style={{ flex: 2 }}
                title={multiExplorationLog ? "Save all logs" : "Save log"}
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
            <Text style={styles.confirmBody}>{savedConfirmBody}</Text>
          </Card>
        )}

        <ChipRow chips={feed.chips || []} value={chip} onChange={setChip} />

        {visible.map((item) => renderFeedItem(item))}

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

        {demoReports.length > 0 ? (
          <View style={styles.demoSection}>
            <Text style={styles.demoSectionTitle}>Personalised trial final reports (demo)</Text>
            {demoReports.map((item) => renderFeedItem(item))}
          </View>
        ) : null}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  pad: layout.screenPad,
  logIntro: { ...type.exploreDesc, color: colors.textMuted, marginBottom: spacing.lg, lineHeight: 20 },
  explorationSection: {
    borderLeftWidth: 3,
    paddingLeft: spacing.lg,
    marginBottom: spacing.lg
  },
  explorationSectionBorder: {
    marginTop: spacing.lg,
    paddingTop: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.borderMed
  },
  explorationHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.lg
  },
  explorationIcon: { fontSize: 22 },
  explorationEyebrow: {
    ...type.caption,
    color: colors.textMuted,
    textTransform: "uppercase",
    letterSpacing: 0.4,
    marginBottom: 2
  },
  explorationTitle: { ...type.buttonMd },
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
  moreS: text.feedMoreSub,
  demoSection: { marginTop: spacing.xl, paddingTop: spacing.lg, borderTopWidth: 1, borderTopColor: colors.border },
  demoSectionTitle: {
    ...type.label,
    color: colors.textMuted,
    marginBottom: spacing.lg,
    textTransform: "uppercase",
    letterSpacing: 0.4
  }
});
