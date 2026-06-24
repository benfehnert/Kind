import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { ExplorationLogFields } from "../logging/ExplorationLogFields";
import { Badge } from "../primitives/Badge";
import { colors, radius, spacing } from "../../theme/colors";
import { type } from "../../theme/typography";

export function ExplorationLogSection({
  exploration,
  values,
  onChange,
  index,
  total,
  loggedToday = false
}) {
  const multi = total > 1;

  return (
    <View
      style={[
        styles.section,
        multi && styles.sectionMulti,
        { borderLeftColor: exploration.text || colors.greenDark, backgroundColor: exploration.bg || colors.greenLight }
      ]}
    >
      {multi ? (
        <Text style={styles.sectionLabel}>
          Exploration {index + 1} of {total}
        </Text>
      ) : null}

      <View style={styles.header}>
        <View style={[styles.iconWrap, { backgroundColor: colors.surface }]}>
          <Text style={styles.icon}>{exploration.icon || "⬡"}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <View style={styles.headerTop}>
            <Text style={styles.eyebrow}>Health exploration</Text>
            {loggedToday ? <Badge variant="teal">Logged today</Badge> : null}
          </View>
          <Text style={[styles.title, { color: exploration.text || colors.greenDark }]}>
            {exploration.title}
          </Text>
          {exploration.category ? (
            <Text style={styles.category}>{exploration.category}</Text>
          ) : null}
        </View>
      </View>

      <View style={styles.fieldsWrap}>
        <ExplorationLogFields
          fields={exploration.fields}
          values={values}
          onChange={onChange}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    borderLeftWidth: 3
  },
  sectionMulti: {
    borderWidth: 1,
    borderColor: colors.borderMed,
    borderLeftWidth: 4
  },
  sectionLabel: {
    ...type.caption,
    color: colors.textMuted,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: spacing.md
  },
  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.md,
    marginBottom: spacing.lg
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center"
  },
  icon: { fontSize: 22 },
  headerTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.sm,
    marginBottom: 4
  },
  eyebrow: {
    ...type.caption,
    color: colors.textMuted,
    textTransform: "uppercase",
    letterSpacing: 0.4
  },
  title: { ...type.buttonMd, lineHeight: 22 },
  category: {
    ...type.caption,
    color: colors.textMuted,
    marginTop: 4
  },
  fieldsWrap: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border
  }
});
