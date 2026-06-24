import React from "react";
import { StyleSheet, Text, TouchableOpacity } from "react-native";
import { colors, heights, radius, spacing } from "../../theme/colors";
import { type } from "../../theme/typography";

export function PrimaryButton({ title, onPress, style }) {
  return (
    <TouchableOpacity style={[styles.btn, style]} onPress={onPress}>
      <Text style={styles.txt}>{title}</Text>
    </TouchableOpacity>
  );
}

export function GhostButton({ title, onPress, style }) {
  return (
    <TouchableOpacity style={[styles.ghost, style]} onPress={onPress}>
      <Text style={styles.ghostTxt}>{title}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  btn: {
    backgroundColor: colors.orange,
    paddingVertical: spacing.xxl,
    minHeight: heights.logBtn,
    borderRadius: radius.lg,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.blockMb
  },
  txt: {
    ...type.button,
    color: "#fff"
  },
  ghost: {
    borderWidth: 1,
    borderColor: colors.borderMed,
    paddingVertical: spacing.xxl,
    minHeight: heights.logBtn,
    borderRadius: radius.lg,
    alignItems: "center",
    justifyContent: "center",
    flex: 1
  },
  ghostTxt: {
    ...type.buttonMd,
    color: colors.text
  }
});
