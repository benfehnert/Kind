import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { MessageIcon } from "../icons/MessageIcon";
import { AvatarStack } from "./AvatarStack";
import { colors, radius, spacing } from "../../theme/colors";
import { type } from "../../theme/typography";

function messageLabel(count) {
  const n = Number(count) || 0;
  return n === 1 ? "1 message" : `${n} messages`;
}

export function ActivityMessageBlock({
  count = 0,
  messagePreview = [],
  onOpenMessages,
  disabled = false
}) {
  const showSummary = count > 0;

  return (
    <View style={styles.wrap}>
      {showSummary ? (
        <Pressable
          style={styles.summaryRow}
          onPress={onOpenMessages}
          disabled={!onOpenMessages || disabled}
          accessibilityRole="button"
          accessibilityLabel={messageLabel(count)}
        >
          <AvatarStack people={messagePreview} size={22} max={5} />
          <Text style={styles.summaryText}>{messageLabel(count)}</Text>
        </Pressable>
      ) : null}

      <Pressable
        style={styles.messageBtn}
        onPress={(event) => {
          event?.stopPropagation?.();
          onOpenMessages?.();
        }}
        disabled={disabled}
        accessibilityRole="button"
        accessibilityLabel="View messages"
      >
        <MessageIcon active={count > 0} size={22} />
        <Text style={[styles.messageLabel, count > 0 && styles.messageLabelActive]}>Message</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: "flex-end",
    gap: spacing.xs
  },
  summaryRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingVertical: 2
  },
  summaryText: {
    ...type.captionStrong,
    color: colors.textMuted
  },
  messageBtn: {
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
  messageLabel: {
    ...type.chip,
    color: colors.textMuted
  },
  messageLabelActive: {
    color: colors.greenDark
  }
});
