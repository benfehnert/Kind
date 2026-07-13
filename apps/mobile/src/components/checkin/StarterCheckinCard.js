import React from "react";
import { Text, StyleSheet, Pressable } from "react-native";
import { Card } from "../primitives/Card";
import { layout } from "../../theme/textStyles";
import { colors, spacing } from "../../theme/colors";
import { type } from "../../theme/typography";

export function StarterCheckinCard({ onBrowseExplorations }) {
  return (
    <Card style={layout.logForm}>
      <Text style={styles.body}>
        You can't log any data until you've started a health exploration.
      </Text>
      <Pressable onPress={onBrowseExplorations} hitSlop={8} accessibilityRole="link">
        <Text style={styles.link}>Browse explorations</Text>
      </Pressable>
    </Card>
  );
}

const styles = StyleSheet.create({
  body: {
    ...type.exploreDesc,
    color: colors.textMuted,
    lineHeight: 20,
    marginBottom: spacing.md
  },
  link: {
    ...type.buttonMd,
    color: colors.greenDark
  }
});
