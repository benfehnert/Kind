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
    body:
      "Science findings from Kind explorations and aggregated community research will appear in this space."
  },
  tip: {
    body:
      "Wellbeing tips tailored to your health explorations will appear here once you join an exploration."
  }
};

export function FeedFilterEmptyState({
  filterKey,
  showLogLink = false,
  onBrowseExplorations,
  onOpenLog,
  onGoToYourInsights,
  onGoToCommunityInsights,
  onGoToCommunity
}) {
  const copy = FILTER_COPY[filterKey];
  if (!copy) return null;

  const showBrowse = ["milestone", "insight", "activity"].includes(filterKey);

  return (
    <View style={styles.wrap}>
      <Text style={styles.body}>{copy.body}</Text>
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
        {filterKey === "science" ? (
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
