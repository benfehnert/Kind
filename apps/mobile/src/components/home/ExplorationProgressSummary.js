import React from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { Badge } from "../primitives/Badge";
import { colors, radius, spacing } from "../../theme/colors";
import { type } from "../../theme/typography";
import { isShortExploration } from "../../utils/explorationIds";

export function ExplorationProgressSummary({ explorations, starterMode = false }) {
  const navigation = useNavigation();

  const goToExplore = () => {
    navigation.navigate("MainTabs", { screen: "Exploration" });
  };

  if (!explorations?.length) {
    if (!starterMode) return null;

    return (
      <View style={styles.wrapStarter}>
        <Text style={styles.sectionLabel}>Your health explorations</Text>
        <View style={styles.placeholderCard}>
          <Text style={styles.placeholderBody}>
            Join a health exploration to track your progress here.
          </Text>
          <Pressable onPress={goToExplore} hitSlop={8} accessibilityRole="link">
            <Text style={styles.placeholderLink}>Browse explorations</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.wrap}>
      <Text style={styles.sectionLabel}>Your health explorations</Text>
      {explorations.map((ex) => (
        <Pressable
          key={ex.id}
          style={styles.card}
          onPress={() => navigation.navigate("ExplorationSummary", { id: ex.id })}
        >
          <View style={styles.topRow}>
            <View style={[styles.iconWrap, { backgroundColor: ex.bg || colors.greenLight }]}>
              <Text style={styles.icon}>{ex.icon || "⬡"}</Text>
            </View>
            <View style={styles.titleCol}>
              <Text style={styles.category}>{ex.category}</Text>
              <Text style={styles.title} numberOfLines={2}>
                {ex.title}
              </Text>
            </View>
            <View style={styles.progress}>
              <Text style={styles.progressVal}>{ex.progress ?? 0}%</Text>
              <Text style={styles.progressLbl}>complete</Text>
            </View>
          </View>
          <View style={styles.meta}>
            <Badge variant={ex.status === "complete" ? "teal" : "amber"}>
              {ex.status === "complete" ? "Complete" : "Active"}
            </Badge>
            {ex.weekCurrent && ex.weeksTotal ? (
              <Badge variant="teal">
                {isShortExploration(ex.id) ? "Day" : "Week"} {ex.weekCurrent} of {ex.weeksTotal}
              </Badge>
            ) : null}
            <Badge variant="teal">{ex.streakDays ?? 0}-day streak</Badge>
          </View>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: spacing.lg },
  /** Half of default wrap + empty metric grid gap on starter home */
  wrapStarter: { marginBottom: Math.round((spacing.lg + spacing.blockMb) / 2) },
  sectionLabel: {
    ...type.label,
    color: colors.textMuted,
    textTransform: "uppercase",
    letterSpacing: 0.4,
    marginBottom: spacing.md
  },
  card: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md
  },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center"
  },
  icon: { fontSize: 20 },
  titleCol: { flex: 1 },
  category: { ...type.caption, color: colors.textMuted, marginBottom: 2 },
  title: { ...type.buttonMd, color: colors.text },
  meta: {
    flexDirection: "row",
    flexWrap: "nowrap",
    alignItems: "center",
    gap: 6,
    marginTop: spacing.sm
  },
  progress: { alignItems: "flex-end", minWidth: 52 },
  progressVal: { ...type.buttonMd, color: colors.greenDark },
  progressLbl: { ...type.caption, color: colors.textMuted },
  placeholderCard: {
    backgroundColor: colors.greenLight,
    borderRadius: radius.lg,
    padding: spacing.lg
  },
  placeholderBody: { ...type.exploreDesc, color: colors.textMuted, marginBottom: Math.round(spacing.xs * 0.7) },
  placeholderLink: { ...type.buttonMd, color: colors.greenDark }
});
