import React, { useCallback, useEffect, useMemo, useState } from "react";
import { View, ScrollView, StyleSheet, Text, Pressable } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useNavigation, useRoute } from "@react-navigation/native";
import { useData } from "../context/DataContext";
import { useConsent } from "../context/ConsentContext";
import { useUiShell } from "../context/UiContext";
import { get, post } from "../lib/api";
import { listConsentedExplorations } from "../hooks/useUserExplorations";
import { colors, radius, spacing } from "../theme/colors";
import { layout, text } from "../theme/textStyles";
import { type } from "../theme/typography";
import { SectionTitle, SectionSub } from "../components/primitives/SectionTitle";
import { MetricGrid, MetricCard } from "../components/primitives/MetricCard";
import { PrimaryButton } from "../components/primitives/Buttons";
import { ChipRow } from "../components/primitives/ChipRow";
import { Card } from "../components/primitives/Card";
import { Badge } from "../components/primitives/Badge";
import { Avatar } from "../components/primitives/Avatar";
import { RichTextParts } from "../utils/RichText";
import { ExplorationProgressSummary } from "../components/home/ExplorationProgressSummary";
import { DailyCheckinCard } from "../components/checkin/DailyCheckinCard";
import { StarterCheckinCard } from "../components/checkin/StarterCheckinCard";
import { FeedFilterEmptyState } from "../components/home/FeedFilterEmptyState";
import {
  allExplorationsLogged,
  buildInitialLogValues,
  formatLogFieldValues,
  getPendingLogExplorations,
  listConsentedExplorationForms,
  parseLogFieldValues
} from "../utils/explorationLogState";

const REMINDER_DISMISS_KEY = "@kind/reminder_banner_dismissed";

function todayDateString() {
  return new Date().toISOString().slice(0, 10);
}

export default function HomeScreen() {
  const { home, refetchHome, refetchInsight, explorations } = useData();
  const homeFeed = home.feed || {};
  const starterMode = Boolean(home.starterMode);
  const {
    explorationConsents,
    explorationRuns,
    activeExplorationId,
    privacyPrefs,
    refreshExplorationRuns
  } = useConsent();
  const { showToast } = useUiShell();
  const navigation = useNavigation();
  const route = useRoute();
  const [showLog, setShowLog] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [prefilling, setPrefilling] = useState(false);
  const [chip, setChip] = useState("all");
  const [tipsExpanded, setTipsExpanded] = useState(false);
  const [scienceExpanded, setScienceExpanded] = useState(false);
  const [extraFeedItems, setExtraFeedItems] = useState([]);
  const [expandingFeed, setExpandingFeed] = useState(false);
  const [reminderDismissed, setReminderDismissed] = useState(false);
  const [lastSavedNames, setLastSavedNames] = useState([]);

  const consentedIds = useMemo(
    () =>
      new Set(
        Object.entries(explorationConsents || {})
          .filter(([, v]) => v?.granted)
          .map(([id]) => id)
      ),
    [explorationConsents]
  );

  const progressExplorations = useMemo(
    () =>
      listConsentedExplorations(
        explorations,
        explorationConsents,
        activeExplorationId,
        explorationRuns
      ),
    [explorations, explorationConsents, activeExplorationId, explorationRuns]
  );

  const logExplorations = useMemo(
    () => listConsentedExplorationForms(explorations, explorationConsents),
    [explorations, explorationConsents]
  );

  const loggedExplorationIds = home.loggedExplorationIds || [];

  const pendingLogExplorations = useMemo(
    () => getPendingLogExplorations(logExplorations, loggedExplorationIds),
    [logExplorations, loggedExplorationIds]
  );

  const checkinComplete = useMemo(
    () => allExplorationsLogged(logExplorations, loggedExplorationIds),
    [logExplorations, loggedExplorationIds]
  );

  const multiExplorationLog = logExplorations.length > 1;

  const showReminderBanner =
    privacyPrefs.reminders &&
    consentedIds.size > 0 &&
    !reminderDismissed &&
    pendingLogExplorations.length > 0 &&
    !saved &&
    !showLog;

  const [logValues, setLogValues] = useState(() => buildInitialLogValues(logExplorations));

  useEffect(() => {
    setLogValues((prev) => {
      const next = {};
      for (const ex of logExplorations) {
        next[ex.id] = prev[ex.id] || buildInitialLogValues([ex])[ex.id];
      }
      return next;
    });
  }, [logExplorations]);

  const savedConfirmBody = useMemo(() => {
    const tail = home.confirm.body.replace(/^Your data has been saved\.\s*/i, "");
    const names = lastSavedNames.length ? lastSavedNames : logExplorations.map((ex) => ex.title);
    if (names.length > 1) {
      return `Daily check-in complete for ${names.join(" and ")}. ${tail}`;
    }
    if (names.length === 1) {
      return `Daily check-in complete for ${names[0]}. ${tail}`;
    }
    return home.confirm.body;
  }, [home.confirm.body, lastSavedNames, logExplorations]);

  const logButtonTitle = useMemo(() => {
    if (multiExplorationLog) {
      const pending = pendingLogExplorations.length;
      if (pending < logExplorations.length && pending > 0) {
        return `Daily check-in (${pending} remaining)`;
      }
      return `Daily check-in (${logExplorations.length} explorations)`;
    }
    return "Log today's data";
  }, [multiExplorationLog, pendingLogExplorations.length, logExplorations.length]);

  const prefillCheckin = useCallback(async () => {
    setPrefilling(true);
    const today = todayDateString();
    const next = buildInitialLogValues(logExplorations);

    await Promise.all(
      logExplorations.map(async (ex) => {
        try {
          const res = await get(`/me/logs?explorationId=${encodeURIComponent(ex.id)}&date=${today}`);
          const item = res.items?.[0];
          if (item?.fieldValues) {
            next[ex.id] = parseLogFieldValues(ex.fields, item.fieldValues);
          }
        } catch {
          // keep defaults
        }
      })
    );

    setLogValues(next);
    setPrefilling(false);
  }, [logExplorations]);

  const goToExplore = useCallback(() => {
    setShowLog(false);
    navigation.navigate("MainTabs", { screen: "Exploration" });
  }, [navigation]);

  const goToYourInsights = useCallback(() => {
    navigation.navigate("MainTabs", { screen: "Insight", params: { community: false } });
  }, [navigation]);

  const goToCommunityInsights = useCallback(() => {
    navigation.navigate("MainTabs", { screen: "Insight", params: { community: true } });
  }, [navigation]);

  const goToCommunity = useCallback(() => {
    navigation.navigate("MainTabs", { screen: "Community" });
  }, [navigation]);

  const openCheckin = useCallback(async () => {
    setShowLog(true);
    setSaved(false);
    if (!starterMode || logExplorations.length > 0) {
      await prefillCheckin();
    }
  }, [prefillCheckin, starterMode, logExplorations.length]);

  useEffect(() => {
    if (route.params?.openLog) {
      openCheckin();
      navigation.setParams({ openLog: undefined });
    }
  }, [route.params?.openLog, navigation, openCheckin]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(REMINDER_DISMISS_KEY);
        if (!cancelled && raw === todayDateString()) setReminderDismissed(true);
      } catch {
        // ignore
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const dismissReminderBanner = useCallback(async () => {
    setReminderDismissed(true);
    try {
      await AsyncStorage.setItem(REMINDER_DISMISS_KEY, todayDateString());
    } catch {
      // ignore
    }
  }, []);

  const expandFeed = useCallback(async (type) => {
    if (expandingFeed) return;
    setExpandingFeed(true);
    try {
      const res = await get(`/home/feed?type=${type}&offset=1`);
      setExtraFeedItems((prev) => [...prev, ...(res.items || [])]);
      if (type === "tip") setTipsExpanded(true);
      if (type === "science") setScienceExpanded(true);
    } catch {
      showToast("Could not load more feed items.");
    } finally {
      setExpandingFeed(false);
    }
  }, [expandingFeed, showToast]);

  const baseFeedItems = homeFeed.items || [];
  const allFeedItems = useMemo(
    () => [...baseFeedItems, ...extraFeedItems],
    [baseFeedItems, extraFeedItems]
  );

  const visible = useMemo(() => {
    if (chip === "all") return allFeedItems;
    return allFeedItems.filter((x) => x.type === chip);
  }, [allFeedItems, chip]);

  const showMoreTips = (chip === "all" || chip === "tip") && homeFeed.hasMoreTips && !tipsExpanded;
  const showMoreSci =
    (chip === "all" || chip === "science") && homeFeed.hasMoreScience && !scienceExpanded;
  const showFeedFilterEmpty = chip !== "all" && visible.length === 0;
  const showLogLinkInFeedEmpty =
    logExplorations.length > 0 || (starterMode && logExplorations.length === 0);
  const reportItems = homeFeed.reportItems || [];

  async function handleSaveLogs() {
    if (saving || logExplorations.length === 0) return;
    setSaving(true);
    try {
      await Promise.all(
        logExplorations.map((ex) =>
          post("/me/logs", {
            explorationId: ex.id,
            fieldValues: formatLogFieldValues(ex.fields, logValues[ex.id] || {})
          })
        )
      );
      await refreshExplorationRuns();
      await refetchHome();
      await refetchInsight();
      setLastSavedNames(logExplorations.map((ex) => ex.title));
      setSaved(true);
      setShowLog(false);
    } catch {
      showToast("Could not save your log. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  function handleFeedPress(item) {
    if (item.route) navigation.navigate(item.route, item.routeParams ?? {});
    else if (item.userId) navigation.navigate("ExplorerProfile", { userId: item.userId });
    else if (item.type === "insight")
      navigation.navigate("MainTabs", {
        screen: "Insight",
        params: { community: item.insightTab === "community" }
      });
    else if (item.type === "science")
      navigation.navigate("MainTabs", {
        screen: "Insight",
        params: {
          community: true,
          explorationId: item.explorationId,
          feedItemId: item.id
        }
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
        {home.sub ? <SectionSub>{home.sub}</SectionSub> : null}

        <ExplorationProgressSummary
          explorations={progressExplorations}
          starterMode={starterMode}
        />

        {(home.metrics || []).length > 0 ? (
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
        ) : null}

        {showReminderBanner ? (
          <Card style={styles.reminderBanner}>
            <View style={{ flex: 1 }}>
              <Text style={styles.reminderTitle}>Daily check-in</Text>
              <Text style={styles.reminderBody}>Log your exploration data to keep your streak going.</Text>
            </View>
            <Pressable onPress={openCheckin} style={styles.reminderAction}>
              <Text style={styles.reminderActionTxt}>Log now</Text>
            </Pressable>
            <Pressable onPress={dismissReminderBanner} hitSlop={8}>
              <Text style={styles.reminderDismiss}>✕</Text>
            </Pressable>
          </Card>
        ) : null}

        {starterMode && logExplorations.length === 0 && !saved && !showLog ? (
          <PrimaryButton title="Log today's data" onPress={openCheckin} style={{ marginBottom: 12 }} />
        ) : null}

        {logExplorations.length > 0 && pendingLogExplorations.length > 0 && !saved && !showLog && (
          <PrimaryButton title={logButtonTitle} onPress={openCheckin} style={{ marginBottom: 12 }} />
        )}

        {logExplorations.length > 0 && checkinComplete && !saved && !showLog && (
          <Card style={styles.loggedTodayCard}>
            <Text style={styles.confirmTitle}>Already logged today</Text>
            <Text style={styles.confirmBody}>
              You've completed today's check-in for all your health explorations. Great work keeping
              your streak.
            </Text>
          </Card>
        )}

        {showLog && !saved && starterMode && logExplorations.length === 0 ? (
          <StarterCheckinCard
            logFormTitle={home.logFormTitle}
            onCancel={() => setShowLog(false)}
            onBrowseExplorations={goToExplore}
          />
        ) : null}

        {showLog && !saved && logExplorations.length > 0 && !prefilling ? (
          <DailyCheckinCard
            explorations={logExplorations}
            logValues={logValues}
            onChange={(explorationId, fieldId, value) =>
              setLogValues((prev) => ({
                ...prev,
                [explorationId]: { ...prev[explorationId], [fieldId]: value }
              }))
            }
            onSave={handleSaveLogs}
            onCancel={() => setShowLog(false)}
            saving={saving}
            loggedExplorationIds={loggedExplorationIds}
            logFormTitle={home.logFormTitle}
          />
        ) : null}

        {saved && (
          <Card style={{ backgroundColor: colors.greenLight, borderColor: colors.greenDark }}>
            <Text style={styles.confirmTitle}>{home.confirm.title}</Text>
            <Text style={styles.confirmBody}>{savedConfirmBody}</Text>
          </Card>
        )}

        <ChipRow chips={homeFeed.chips || []} value={chip} onChange={setChip} />

        {showFeedFilterEmpty ? (
          <FeedFilterEmptyState
            filterKey={chip}
            showLogLink={showLogLinkInFeedEmpty}
            onBrowseExplorations={goToExplore}
            onOpenLog={openCheckin}
            onGoToYourInsights={goToYourInsights}
            onGoToCommunityInsights={goToCommunityInsights}
            onGoToCommunity={goToCommunity}
          />
        ) : null}

        {visible.map((item) => renderFeedItem(item))}

        {showMoreTips ? (
          <Pressable style={styles.more} onPress={() => expandFeed("tip")} disabled={expandingFeed}>
            <Text style={styles.moreT}>More tips</Text>
            <Text style={styles.moreS}>
              {starterMode
                ? "Wellbeing tips from Kind explorations"
                : "Additional wellbeing tips for your explorations"}
            </Text>
          </Pressable>
        ) : null}
        {showMoreSci ? (
          <Pressable style={styles.more} onPress={() => expandFeed("science")} disabled={expandingFeed}>
            <Text style={styles.moreT}>More science</Text>
            <Text style={styles.moreS}>
              {starterMode
                ? "Science updates from Kind explorations"
                : "Additional science updates for your explorations"}
            </Text>
          </Pressable>
        ) : null}

        {reportItems.length > 0 ? (
          <View style={styles.demoSection}>
            <Text style={styles.demoSectionTitle}>Personalised trial final reports</Text>
            {reportItems.map((item) => renderFeedItem(item))}
          </View>
        ) : null}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  pad: layout.screenPad,
  reminderBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    marginBottom: spacing.lg,
    backgroundColor: colors.amberBg,
    borderColor: colors.amberText
  },
  reminderTitle: { ...type.buttonMd, color: colors.amberText, marginBottom: 4 },
  reminderBody: { ...type.exploreDesc, color: colors.amberText, flex: 1 },
  reminderAction: {
    backgroundColor: colors.greenDark,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm
  },
  reminderActionTxt: { ...type.chip, color: "#fff" },
  reminderDismiss: { color: colors.amberText, fontSize: 16, paddingHorizontal: 4 },
  loggedTodayCard: {
    marginBottom: spacing.lg,
    backgroundColor: colors.greenLight,
    borderColor: colors.greenDark
  },
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
