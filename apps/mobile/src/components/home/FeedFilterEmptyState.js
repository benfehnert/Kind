import React from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { colors, radius, spacing } from "../../theme/colors";
import { type } from "../../theme/typography";

const FILTER_COPY = {
  milestone: {
    body:
      "Milestones from your health explorations — like streaks, week completions, and personal bests — will appear here as you progress."
  },
  insight: {
    body:
      "Personal insights drawn from your daily check-ins will appear here once you start logging data for an exploration."
  },
  activity: {
    body:
      "Your check-ins and updates from explorers you follow will appear here as you log data and connect with others."
  },
  science: {
    default:
      "Science findings from Kind explorations and aggregated community research will appear in this space.",
    starter:
      "Science findings from Kind explorations are shown in your feed. Scroll to the bottom of All to load more science updates."
  },
  tip: {
    default:
      "Wellbeing tips tailored to your health explorations will appear here once you join an exploration.",
    starter:
      "Wellbeing tips from Kind explorations are shown in your feed. Scroll to the bottom of All to load more tips."
  }
};

export function FeedFilterEmptyState({
  filterKey,
  starterMode = false,
  showLogLink = false,
  showCommunityInsightsLink = false,
  onBrowseExplorations,
  onOpenLog,
  onGoToYourInsights,
  onGoToCommunityInsights,
  onGoToCommunity
}) {
  const entry = FILTER_COPY[filterKey];
  if (!entry) return null;

  const copy = entry.body ?? entry[starterMode ? "starter" : "default"] ?? entry.default;

  const showBrowse = ["milestone", "insight", "activity"].includes(filterKey);

  return (
    <View style={styles.wrap}>
      <Text style={styles.body}>{copy}</Text>
      <View style={styles.links}>
        {showBrowse ? (
          <Pressable onPress={onBrowseExplorations} hitSlop={8} accessibilityRole="link">
            <Text style={styles.link}>Browse explorations</Text>
          </Pressable>
        ) : null}
        {filterKey === "insight" ? (
          <Pressable onPress={onGoToYourInsights} hitSlop={8} accessibilityRole="link">
            <Text style={styles.link}>View your insights</Text>
          </Pressable>
        ) : null}
        {filterKey === "activity" ? (
          <Pressable onPress={onGoToCommunity} hitSlop={8} accessibilityRole="link">
            <Text style={styles.link}>Explore community</Text>
          </Pressable>
        ) : null}
        {filterKey === "science" && showCommunityInsightsLink ? (
          <Pressable onPress={onGoToCommunityInsights} hitSlop={8} accessibilityRole="link">
            <Text style={styles.link}>View community insights</Text>
          </Pressable>
        ) : null}
        {filterKey === "tip" ? (
          <Pressable onPress={onBrowseExplorations} hitSlop={8} accessibilityRole="link">
            <Text style={styles.link}>Browse explorations</Text>
          </Pressable>
        ) : null}
        {showLogLink && (filterKey === "milestone" || filterKey === "insight") ? (
          <Pressable onPress={onOpenLog} hitSlop={8} accessibilityRole="link">
            <Text style={styles.link}>Log today's data</Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginBottom: spacing.lg
  },
  body: {
    ...type.exploreDesc,
    color: colors.textMuted,
    lineHeight: 20,
    marginBottom: spacing.md
  },
  links: {
    gap: spacing.sm
  },
  link: {
    ...type.buttonMd,
    color: colors.greenDark
  }
});
