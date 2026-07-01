import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { NiceIcon } from "../icons/NiceIcon";
import { AvatarStack } from "./AvatarStack";
import { colors, radius, spacing } from "../../theme/colors";
import { type } from "../../theme/typography";

function supportLabel(count) {
  const n = Number(count) || 0;
  return `${n} support you`;
}

export function ActivityNiceBlock({
  count = 0,
  viewerNiced = false,
  supporterPreview = [],
  onToggleNice,
  onOpenSupporters,
  disabled = false
}) {
  const showSupporters = count > 0;

  return (
    <View style={styles.wrap}>
      {showSupporters ? (
        <Pressable
          style={styles.supportRow}
          onPress={onOpenSupporters}
          disabled={!onOpenSupporters}
          accessibilityRole="button"
          accessibilityLabel={supportLabel(count)}
        >
          <AvatarStack people={supporterPreview} size={22} max={5} />
          <Text style={styles.supportText}>{supportLabel(count)}</Text>
        </Pressable>
      ) : null}

      <Pressable
        style={[styles.niceBtn, viewerNiced && styles.niceBtnOn]}
        onPress={(event) => {
          event?.stopPropagation?.();
          onToggleNice?.();
        }}
        disabled={disabled}
        accessibilityRole="button"
        accessibilityLabel={viewerNiced ? "Remove nice" : "Give nice"}
        accessibilityState={{ selected: viewerNiced }}
      >
        <NiceIcon selected={viewerNiced} size={24} />
        <Text style={[styles.niceLabel, viewerNiced && styles.niceLabelOn]}>Nice</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: "flex-end",
    gap: spacing.xs
  },
  supportRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingVertical: 2
  },
  supportText: {
    ...type.captionStrong,
    color: colors.textMuted
  },
  niceBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.pill,
    backgroundColor: colors.bg,
    paddingHorizontal: spacing.md,
    paddingVertical: 5
  },
  niceBtnOn: {
    borderColor: colors.orange,
    backgroundColor: `${colors.orange}18`
  },
  niceLabel: {
    ...type.chip,
    color: colors.textMuted
  },
  niceLabelOn: {
    color: colors.orangeDark
  }
});
