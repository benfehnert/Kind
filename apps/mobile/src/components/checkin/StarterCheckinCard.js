import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Card } from "../primitives/Card";
import { PrimaryButton, GhostButton } from "../primitives/Buttons";
import { layout } from "../../theme/textStyles";
import { colors, spacing } from "../../theme/colors";
import { type } from "../../theme/typography";

export function StarterCheckinCard({
  logFormTitle = "Today's log",
  onCancel,
  onBrowseExplorations
}) {
  return (
    <Card style={layout.logForm}>
      <Text style={styles.title}>{logFormTitle}</Text>
      <Text style={styles.body}>
        You'll use this button to log your daily check-in once you've started a health exploration.
      </Text>
      <View style={styles.actions}>
        <GhostButton title="Cancel" onPress={onCancel} style={styles.actionBtn} />
        <PrimaryButton
          style={styles.primaryBtn}
          title="Browse explorations"
          onPress={onBrowseExplorations}
        />
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  title: {
    ...type.buttonMd,
    color: colors.greenDark,
    marginBottom: spacing.lg
  },
  body: {
    ...type.exploreDesc,
    color: colors.textMuted,
    lineHeight: 20,
    marginBottom: spacing.lg
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
  primaryBtn: {
    flex: 2,
    marginBottom: 0
  }
});
