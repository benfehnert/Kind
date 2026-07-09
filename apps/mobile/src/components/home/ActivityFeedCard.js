import React from "react";
import { View, StyleSheet, Text, Pressable } from "react-native";
import { colors, radius, spacing } from "../../theme/colors";
import { layout, text } from "../../theme/textStyles";
import { type } from "../../theme/typography";
import { Badge } from "../primitives/Badge";
import { ActivityNiceBlock } from "../activity/ActivityNiceBlock";
import { RichTextParts } from "../../utils/RichText";
import { FeedItemAvatar } from "./FeedItemAvatar";

/**
 * A feed row for an activity/milestone/tip/etc. item. When the item carries
 * a real `activityPostId` (another explorer's logged activity), the header
 * (avatar + name) and body are separate tap targets — header opens that
 * explorer's profile, body opens the activity's detailed view — and a Nice
 * icon can be tapped directly from the card. Other feed item kinds (tips,
 * science, your own milestones) keep a single header + body that both open
 * the same destination.
 */
export function ActivityFeedCard({ item, onOpenProfile, onOpenActivity, niceState, onToggleNice, nicePending }) {
  const canOpenProfile = Boolean(item.userId);

  return (
    <View style={styles.card}>
      <Pressable
        style={styles.head}
        onPress={() => canOpenProfile && onOpenProfile(item.userId)}
        disabled={!canOpenProfile}
        accessibilityRole={canOpenProfile ? "button" : undefined}
        accessibilityLabel={canOpenProfile ? `View ${item.displayName}'s profile` : undefined}
      >
        <FeedItemAvatar item={item} />
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: 6 }}>
            <Text style={styles.name}>{item.displayName}</Text>
            {item.badge ? <Badge variant={item.badge}>{item.badgeLabel}</Badge> : null}
          </View>
          <Text style={styles.time}>{item.time}</Text>
        </View>
      </Pressable>

      <Pressable onPress={() => onOpenActivity(item)}>
        <RichTextParts
          html={item.body}
          style={[text.feedBody, { marginTop: spacing.xs }]}
          strongStyle={{ color: colors.text, ...type.bodyStrong }}
        />
        {item.highlight ? (
          <View style={styles.hl}>
            <RichTextParts
              html={item.highlight}
              style={text.feedHighlight}
              strongStyle={{ color: colors.greenDark, ...type.captionStrong }}
            />
          </View>
        ) : null}
      </Pressable>

      {item.activityPostId ? (
        <View style={styles.foot} onStartShouldSetResponder={() => true}>
          <ActivityNiceBlock
            count={niceState?.nc || 0}
            viewerNiced={!!niceState?.viewerNiced}
            onToggleNice={() => onToggleNice(item)}
            disabled={!!nicePending}
          />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: layout.feedItem,
  head: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.feedGap,
    marginBottom: spacing.md
  },
  name: text.feedName,
  time: text.feedTime,
  hl: {
    backgroundColor: colors.greenLight,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    marginTop: spacing.md
  },
  foot: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginTop: spacing.md
  }
});
