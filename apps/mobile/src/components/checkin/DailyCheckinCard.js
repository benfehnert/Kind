import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Card } from "../primitives/Card";
import { PrimaryButton, GhostButton } from "../primitives/Buttons";
import { ExplorationLogSection } from "./ExplorationLogSection";
import { layout } from "../../theme/textStyles";
import { colors, radius, spacing } from "../../theme/colors";
import { type } from "../../theme/typography";

export function DailyCheckinCard({
  explorations,
  logValues,
  onChange,
  onSave,
  onCancel,
  saving = false,
  loggedExplorationIds = [],
  logFormTitle = "Today's log"
}) {
  const multi = explorations.length > 1;
  const title = multi ? "Daily check-in" : logFormTitle;

  return (
    <Card style={layout.logForm}>
      <Text style={[styles.title, { marginBottom: multi ? spacing.xs : spacing.lg }]}>{title}</Text>

      {multi ? (
        <>
          <Text style={styles.intro}>
            Log today's data for each of your health explorations below.
          </Text>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryChip}>
              {explorations.map((ex) => ex.title).join(" · ")}
            </Text>
          </View>
        </>
      ) : null}

      {explorations.map((ex, index) => (
        <ExplorationLogSection
          key={ex.id}
          exploration={ex}
          values={logValues[ex.id] || {}}
          onChange={(fieldId, value) => onChange(ex.id, fieldId, value)}
          index={index}
          total={explorations.length}
          loggedToday={loggedExplorationIds.includes(ex.id)}
        />
      ))}

      <View style={styles.actions}>
        <GhostButton title="Cancel" onPress={onCancel} style={styles.actionBtn} />
        <PrimaryButton
          style={styles.saveBtn}
          title={saving ? "Saving…" : multi ? "Save all logs" : "Save"}
          onPress={onSave}
          disabled={saving}
        />
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  title: {
    ...type.buttonMd,
    color: colors.greenDark
  },
  intro: {
    ...type.exploreDesc,
    color: colors.textMuted,
    lineHeight: 20,
    marginBottom: spacing.md
  },
  summaryRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginBottom: spacing.lg,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.greenLight,
    borderRadius: radius.md
  },
  summaryChip: {
    ...type.caption,
    color: colors.greenDark
  },
  actions: {
    flexDirection: "row",
    alignItems: "stretch",
    gap: spacing.sm,
    marginTop: spacing.sm
  },
  actionBtn: {
    marginBottom: 0
  },
  saveBtn: {
    flex: 2,
    marginBottom: 0
  }
});
