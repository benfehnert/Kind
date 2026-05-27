import React from "react";
import { StyleSheet, Text } from "react-native";
import { colors, radius, spacing } from "../../theme/colors";
import { type } from "../../theme/typography";

export function Badge({ variant, children }) {
  const map = VARIANTS[variant] || VARIANTS.teal;
  return <Text style={[styles.base, map]}>{children}</Text>;
}

const VARIANTS = {
  teal: { backgroundColor: colors.greenLight, color: colors.greenDark },
  amber: { backgroundColor: colors.amberBg, color: colors.amberText },
  blue: { backgroundColor: colors.blueBg, color: colors.blueText },
  green: { backgroundColor: colors.mintBg, color: colors.mintText },
  purple: { backgroundColor: colors.purpleBg, color: colors.purpleText }
};

const styles = StyleSheet.create({
  base: {
    ...type.captionStrong,
    paddingHorizontal: spacing.lg,
    paddingVertical: 3,
    borderRadius: radius.pill,
    overflow: "hidden",
    alignSelf: "flex-start"
  }
});
