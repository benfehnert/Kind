import React from "react";
import { Animated, Modal, Platform, StyleSheet, Text } from "react-native";
import { colors, radius, spacing } from "../theme/colors";
import { type } from "../theme/typography";

export function ProtoToast({ message, visible }) {
  if (!message) return null;
  return (
    <Modal visible={visible !== false && !!message} transparent animationType="fade">
      <Animated.View pointerEvents="none" style={[styles.wrap, Platform.OS === "web" ? { pointerEvents: "auto" } : null]}>
        <Text style={styles.t}>{message}</Text>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: "absolute",
    bottom: 96,
    left: spacing.screen,
    right: spacing.screen,
    maxWidth: 420,
    alignSelf: "center",
    backgroundColor: colors.greenDark,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.screen,
    paddingVertical: spacing.xl,
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 8 }
  },
  t: {
    ...type.body,
    color: "#fff",
    textAlign: "center"
  }
});
