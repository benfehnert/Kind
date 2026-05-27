import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { colors, radius, spacing } from "../../theme/colors";
import { type } from "../../theme/typography";

export function ScienceBanner({ title, body, footer }) {
  return (
    <View style={styles.banner}>
      <Text style={styles.t}>{title}</Text>
      <Text style={styles.b}>{body}</Text>
      {footer}
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    backgroundColor: colors.greenLight,
    borderWidth: 1,
    borderColor: colors.borderMed,
    borderRadius: radius.lg,
    paddingVertical: spacing.cardY,
    paddingHorizontal: spacing.cardX,
    marginBottom: spacing.blockMb
  },
  t: {
    ...type.scienceTitle,
    color: colors.greenDark,
    marginBottom: spacing.xs
  },
  b: {
    ...type.scienceText,
    color: colors.textMuted
  }
});
