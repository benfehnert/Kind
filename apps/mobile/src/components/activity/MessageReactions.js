import React from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { HeartIcon, ClapIcon } from "../icons/ReactionIcons";
import { colors, radius, spacing } from "../../theme/colors";
import { type } from "../../theme/typography";

const REACTIONS = [
  { type: "heart", Icon: HeartIcon, label: "Heart" },
  { type: "clap", Icon: ClapIcon, label: "Clap" }
];

function ReactionButton({ type, Icon, label, count, selected, onToggle, disabled }) {
  return (
    <Pressable
      style={[styles.reactionBtn, selected && styles.reactionBtnOn]}
      onPress={() => onToggle(type)}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected }}
    >
      <Icon selected={selected} size={16} />
      {count > 0 ? <Text style={[styles.reactionCount, selected && styles.reactionCountOn]}>{count}</Text> : null}
    </Pressable>
  );
}

export function MessageReactions({ reactions, onToggle, disabled = false, togglingType = null }) {
  if (!reactions) return null;

  return (
    <View style={styles.row}>
      {REACTIONS.map(({ type, Icon, label }) => {
        const meta = reactions[type] || { count: 0, viewerReacted: false };
        return (
          <View key={type} style={styles.reactionWrap}>
            {togglingType === type ? (
              <ActivityIndicator size="small" color={colors.greenDark} style={styles.spinner} />
            ) : (
              <ReactionButton
                type={type}
                Icon={Icon}
                label={label}
                count={meta.count}
                selected={meta.viewerReacted}
                onToggle={onToggle}
                disabled={disabled}
              />
            )}
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm
  },
  reactionWrap: {
    minWidth: 36,
    minHeight: 28,
    alignItems: "center",
    justifyContent: "center"
  },
  spinner: {
    paddingHorizontal: spacing.sm
  },
  reactionBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.pill,
    backgroundColor: colors.bg,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4
  },
  reactionBtnOn: {
    borderColor: colors.borderMed,
    backgroundColor: colors.surface
  },
  reactionCount: {
    ...type.captionStrong,
    color: colors.textMuted,
    fontSize: 11
  },
  reactionCountOn: {
    color: colors.text
  }
});
