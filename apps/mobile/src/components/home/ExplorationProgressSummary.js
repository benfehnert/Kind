import React from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { Badge } from "../primitives/Badge";
import { colors, radius, spacing } from "../../theme/colors";
import { type } from "../../theme/typography";

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
          style={[styles.card, ex.active && styles.cardActive]}
          onPress={() => navigation.navigate("ExplorationDetail", { id: ex.id })}
        >
          <View style={[styles.iconWrap, { backgroundColor: ex.bg || colors.greenLight }]}>
            <Text style={styles.icon}>{ex.icon || "⬡"}</Text>
          </View>
          <View style={styles.body}>
            <Text style={styles.category}>{ex.category}</Text>
            <Text style={styles.title} numberOfLines={2}>
              {ex.title}
            </Text>
            <View style={styles.meta}>
              {ex.active ? <Badge variant="amber">Active</Badge> : <Badge variant="blue">Joined</Badge>}
              {ex.weekCurrent && ex.weeksTotal ? (
                <Badge variant="teal">
                  Week {ex.weekCurrent} of {ex.weeksTotal}
                </Badge>
              ) : null}
              <Badge variant="teal">{ex.streakDays ?? 0}-day streak</Badge>
            </View>
          </View>
          <View style={styles.progress}>
            <Text style={styles.progressVal}>{ex.progress ?? 0}%</Text>
            <Text style={styles.progressLbl}>complete</Text>
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
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md
  },
  cardActive: {
    borderColor: colors.greenDark,
    backgroundColor: colors.greenLight
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center"
  },
  icon: { fontSize: 22 },
  body: { flex: 1 },
  category: { ...type.caption, color: colors.textMuted, marginBottom: 2 },
  title: { ...type.buttonMd, color: colors.text, marginBottom: spacing.sm },
  meta: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
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
