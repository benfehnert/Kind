import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { View, ScrollView, StyleSheet, Text, Pressable, ActivityIndicator, Platform, RefreshControl } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useNavigation, useRoute } from "@react-navigation/native";
import { usePostHog } from "posthog-react-native";
import { useAuth } from "../context/AuthContext";
import { useData } from "../context/DataContext";
import { useConsent } from "../context/ConsentContext";
import { useUiShell } from "../context/UiContext";
import { get, post } from "../lib/api";
import { listConsentedExplorations } from "../hooks/useUserExplorations";
import { colors, radius, spacing } from "../theme/colors";
import { layout, text } from "../theme/textStyles";
import { type } from "../theme/typography";
import { SectionTitle } from "../components/primitives/SectionTitle";
import { PrimaryButton } from "../components/primitives/Buttons";
import { ChipRow } from "../components/primitives/ChipRow";
import { Card } from "../components/primitives/Card";
import { ActivityFeedCard } from "../components/home/ActivityFeedCard";
import { ExplorationProgressSummary } from "../components/home/ExplorationProgressSummary";
import { ActiveExplorationOutcomeCards } from "../components/home/ActiveExplorationOutcomeCards";
import { DailyCheckinCard } from "../components/checkin/DailyCheckinCard";
import { StarterCheckinCard } from "../components/checkin/StarterCheckinCard";
import { FeedFilterEmptyState } from "../components/home/FeedFilterEmptyState";
import { useActivityNice } from "../hooks/useActivityNice";
import {
  allExplorationsLogged,
  buildInitialLogValues,
  formatLogFieldValues,
  getPendingLogExplorations,
  listConsentedExplorationForms,
  parseLogFieldValues
} from "../utils/explorationLogState";

const REMINDER_DISMISS_KEY = "@kind/reminder_banner_dismissed";
const FEED_EXPANSION_KEY = "@kind/home_feed_expansion";
const IS_WEB = Platform.OS === "web";
const WEB_PULL_THRESHOLD = 70;
const WEB_PULL_MAX = 100;
const HOME_FEED_TAB_EVENT_MAP = {
  all: "viewed all feed",
  milestone: "viewed milestone feed",
  insight: "viewed insights feed",
  activity: "viewed activity feed",
  science: "viewed science feed",
  tip: "viewed tips feed"
};

function todayDateString() {
  return new Date().toISOString().slice(0, 10);
}

export default function HomeScreen() {
  const posthog = usePostHog();
  const { home, refetchHome, refetchInsight, explorations, insight } = useData();
  const { individualId } = useAuth();
  const homeFeed = home.feed || {};
  const starterMode = Boolean(home.starterMode);
  const personalization = home.personalization ?? homeFeed.personalization ?? null;
  const recommendedExplorationId = personalization?.primaryExplorationId ?? null;
  const recommendedExploration = recommendedExplorationId
    ? explorations[recommendedExplorationId]
    : null;
  const {
    explorationConsents,
    explorationRuns,
    activeExplorationId,
    privacyPrefs,
    explorationHydrating,
    refreshExplorationRuns
  } = useConsent();
  const { showToast } = useUiShell();
  const navigation = useNavigation();
  const route = useRoute();
  const activityNice = useActivityNice();
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
  const [refreshing, setRefreshing] = useState(false);
  const [webPullDistance, setWebPullDistance] = useState(0);
  const completedExplorationsTracked = useRef(new Set());
  const pendingOpenLogRef = useRef(false);
  const webPullRef = useRef({ tracking: false, startY: 0, scrollY: 0 });

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

  useEffect(() => {
    for (const ex of progressExplorations) {
      if (ex.progress >= 100 && !completedExplorationsTracked.current.has(ex.id)) {
        completedExplorationsTracked.current.add(ex.id);
        posthog?.capture("exploration completed");
      }
    }
  }, [posthog, progressExplorations]);

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
      pendingOpenLogRef.current = true;
      navigation.setParams({ openLog: undefined, explorationId: undefined });
    }
  }, [route.params?.openLog, navigation]);

  useEffect(() => {
    if (!pendingOpenLogRef.current) return;
    if (explorationHydrating) return;
    if (logExplorations.length === 0) return;
    pendingOpenLogRef.current = false;
    openCheckin();
  }, [explorationHydrating, logExplorations.length, openCheckin]);

  useEffect(() => {
    if (!showLog) return;
    if (explorationHydrating) return;
    if (logExplorations.length > 0) return;
    if (pendingOpenLogRef.current) return;
    setShowLog(false);
  }, [showLog, explorationHydrating, logExplorations.length]);

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
      const nextTipsExpanded = type === "tip" ? true : tipsExpanded;
      const nextScienceExpanded = type === "science" ? true : scienceExpanded;
      if (type === "tip") setTipsExpanded(true);
      if (type === "science") setScienceExpanded(true);
      if (individualId) {
        await AsyncStorage.setItem(
          FEED_EXPANSION_KEY,
          JSON.stringify({
            individualId,
            tipsExpanded: nextTipsExpanded,
            scienceExpanded: nextScienceExpanded
          })
        );
      }
    } catch {
      showToast("Could not load more feed items.");
    } finally {
      setExpandingFeed(false);
    }
  }, [expandingFeed, showToast, tipsExpanded, scienceExpanded, individualId]);

  useEffect(() => {
    setExtraFeedItems((prev) => {
      const baseIds = new Set((homeFeed.items || []).map((item) => item.id));
      return prev.filter((item) => !baseIds.has(item.id));
    });
  }, [homeFeed.items]);

  useEffect(() => {
    if (!individualId) return undefined;
    let cancelled = false;

    (async () => {
      try {
        const raw = await AsyncStorage.getItem(FEED_EXPANSION_KEY);
        if (!raw || cancelled) return;

        const parsed = JSON.parse(raw);
        if (parsed.individualId !== individualId) {
          await AsyncStorage.removeItem(FEED_EXPANSION_KEY);
          return;
        }

        const loads = [];
        if (parsed.tipsExpanded) {
          setTipsExpanded(true);
          loads.push(get("/home/feed?type=tip&offset=1"));
        }
        if (parsed.scienceExpanded) {
          setScienceExpanded(true);
          loads.push(get("/home/feed?type=science&offset=1"));
        }

        if (!loads.length || cancelled) return;

        const results = await Promise.all(loads);
        if (cancelled) return;

        setExtraFeedItems((prev) => {
          const seen = new Set(prev.map((item) => item.id));
          const next = [...prev];
          for (const res of results) {
            for (const item of res.items || []) {
              if (!seen.has(item.id)) {
                seen.add(item.id);
                next.push(item);
              }
            }
          }
          return next;
        });
      } catch {
        // ignore corrupt storage
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [individualId]);

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

  const handleChipChange = useCallback(
    (nextChip) => {
      if (nextChip !== chip) {
        const eventName = HOME_FEED_TAB_EVENT_MAP[nextChip];
        if (eventName) posthog?.capture(eventName);
      }
      setChip(nextChip);
    },
    [chip, posthog]
  );

  const handleRefresh = useCallback(async () => {
    if (refreshing) return;
    setRefreshing(true);
    try {
      await Promise.all([refetchHome(), refetchInsight()]);
    } catch (err) {
      console.log("[HomeScreen] pull-to-refresh failed:", err);
    } finally {
      setRefreshing(false);
      setWebPullDistance(0);
    }
  }, [refreshing, refetchHome, refetchInsight]);

  const handleWebScroll = useCallback((e) => {
    webPullRef.current.scrollY = e.nativeEvent?.contentOffset?.y ?? 0;
  }, []);

  const handleWebTouchStart = useCallback(
    (e) => {
      if (refreshing) return;
      if (webPullRef.current.scrollY > 0) return;
      const touch = e.nativeEvent?.touches?.[0];
      if (!touch) return;
      webPullRef.current.tracking = true;
      webPullRef.current.startY = touch.pageY;
    },
    [refreshing]
  );

  const handleWebTouchMove = useCallback((e) => {
    if (!webPullRef.current.tracking) return;
    const touch = e.nativeEvent?.touches?.[0];
    if (!touch) return;
    const delta = touch.pageY - webPullRef.current.startY;
    if (delta <= 0) {
      setWebPullDistance(0);
      return;
    }
    setWebPullDistance(Math.min(delta / 1.6, WEB_PULL_MAX));
  }, []);

  const handleWebTouchEnd = useCallback(() => {
    if (!webPullRef.current.tracking) return;
    webPullRef.current.tracking = false;
    setWebPullDistance((distance) => {
      if (distance >= WEB_PULL_THRESHOLD) {
        handleRefresh();
        return distance;
      }
      return 0;
    });
  }, [handleRefresh]);

  async function handleSaveLogs() {
    if (saving || logExplorations.length === 0) return;
    setSaving(true);
    let saveSucceeded = false;
    try {
      await Promise.all(
        logExplorations.map((ex) =>
          post("/me/logs", {
            explorationId: ex.id,
            fieldValues: formatLogFieldValues(ex.fields, logValues[ex.id] || {})
          })
        )
      );
      saveSucceeded = true;
    } catch {
      showToast("Could not save your log. Please try again.");
      setSaving(false);
      return;
    }

    setLastSavedNames(logExplorations.map((ex) => ex.title));
    setSaved(true);
    setShowLog(false);
    posthog?.capture("daily log submitted");
    setSaving(false);

    if (!saveSucceeded) return;

    try {
      await Promise.all([refreshExplorationRuns(), refetchHome(), refetchInsight()]);
    } catch (err) {
      console.log("[HomeScreen] post-save refetch failed:", err);
      showToast("Saved — pull to refresh your feed.");
    }
  }

  function handleFeedPress(item) {
    if (item.activityPostId) navigation.navigate("ActivityDetail", { activityPostId: item.activityPostId });
    else if (item.route) navigation.navigate(item.route, item.routeParams ?? {});
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

  function handleOpenProfile(userId) {
    navigation.navigate("ExplorerProfile", { userId });
  }

  function renderFeedItem(item) {
    return (
      <ActivityFeedCard
        key={item.id}
        item={item}
        onOpenProfile={handleOpenProfile}
        onOpenActivity={handleFeedPress}
        niceState={activityNice.getState(item)}
        onToggleNice={activityNice.toggle}
        nicePending={item.activityPostId ? activityNice.pending[item.activityPostId] : false}
      />
    );
  }

  return (
    <View style={styles.root}>
      <ScrollView
        contentContainerStyle={styles.pad}
        refreshControl={
          IS_WEB ? undefined : (
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={colors.greenDark}
              colors={[colors.greenDark]}
            />
          )
        }
        onScroll={IS_WEB ? handleWebScroll : undefined}
        scrollEventThrottle={IS_WEB ? 16 : undefined}
        onTouchStart={IS_WEB ? handleWebTouchStart : undefined}
        onTouchMove={IS_WEB ? handleWebTouchMove : undefined}
        onTouchEnd={IS_WEB ? handleWebTouchEnd : undefined}
        onTouchCancel={IS_WEB ? handleWebTouchEnd : undefined}
      >
        {IS_WEB && (webPullDistance > 0 || refreshing) ? (
          <View
            style={[
              styles.webPullIndicator,
              { height: refreshing ? 44 : webPullDistance }
            ]}
          >
            {refreshing || webPullDistance >= WEB_PULL_THRESHOLD ? (
              <ActivityIndicator size="small" color={colors.greenDark} />
            ) : (
              <Text style={styles.webPullText}>Pull to refresh</Text>
            )}
          </View>
        ) : null}

        <SectionTitle>{home.greeting}</SectionTitle>

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

        {showLog && !saved && starterMode && logExplorations.length === 0 ? (
          <StarterCheckinCard
            logFormTitle={home.logFormTitle}
            onCancel={() => setShowLog(false)}
            onBrowseExplorations={goToExplore}
          />
        ) : null}

        {showLog && !saved && logExplorations.length > 0 && prefilling ? (
          <Card style={styles.prefillLoading}>
            <ActivityIndicator color={colors.greenDark} />
            <Text style={styles.prefillLoadingText}>Loading today's check-in…</Text>
          </Card>
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

        <ExplorationProgressSummary
          explorations={progressExplorations}
          starterMode={starterMode}
        />

        {starterMode && recommendedExploration ? (
          <Card style={styles.recommendedCard}>
            <Text style={styles.recommendedEyebrow}>Recommended for you</Text>
            <Text style={styles.recommendedTitle}>
              Start with {recommendedExploration.title}
            </Text>
            {personalization?.primaryMatchReason ? (
              <Text style={styles.recommendedBody}>{personalization.primaryMatchReason}</Text>
            ) : null}
            <PrimaryButton
              title="View exploration"
              onPress={() =>
                navigation.navigate("ExplorationDetail", { id: recommendedExplorationId })
              }
              style={{ marginTop: 12 }}
            />
          </Card>
        ) : null}

        <ActiveExplorationOutcomeCards cards={home.outcomeCards} />

        <ChipRow chips={homeFeed.chips || []} value={chip} onChange={handleChipChange} />

        {showFeedFilterEmpty ? (
          <FeedFilterEmptyState
            filterKey={chip}
            starterMode={starterMode}
            showLogLink={showLogLinkInFeedEmpty}
            showCommunityInsightsLink={insight?.showCommunityInsights !== false}
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
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  pad: layout.screenPad,
  webPullIndicator: {
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    marginBottom: spacing.sm
  },
  webPullText: { ...type.exploreDesc, color: colors.textMuted },
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
  recommendedCard: {
    marginBottom: spacing.lg,
    backgroundColor: colors.surface,
    borderColor: colors.border
  },
  recommendedEyebrow: {
    ...text.uppercaseLabel,
    color: colors.greenDark,
    marginBottom: spacing.xs
  },
  recommendedTitle: {
    ...type.buttonMd,
    color: colors.text,
    marginBottom: spacing.xs
  },
  recommendedBody: {
    ...type.exploreDesc,
    color: colors.textMuted
  },
  confirmTitle: { ...type.buttonMd, color: colors.greenDark, marginBottom: spacing.xs },
  confirmBody: { ...type.exploreDesc, color: colors.textMuted },
  prefillLoading: {
    marginBottom: spacing.lg,
    alignItems: "center",
    gap: spacing.md,
    paddingVertical: spacing.xl
  },
  prefillLoadingText: { ...type.exploreDesc, color: colors.textMuted },
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
