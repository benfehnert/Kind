import React, { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { usePostHog } from "posthog-react-native";
import { POSTHOG_ENABLED, POSTHOG_FEEDBACK_EVENTS } from "../lib/posthog";

const MENU_ITEMS = [
  {
    label: "Daily feedback",
    event: POSTHOG_FEEDBACK_EVENTS.dailyFeedbackOpened,
    accessibilityLabel: "Daily feedback"
  },
  {
    label: "Report issue",
    event: POSTHOG_FEEDBACK_EVENTS.reportIssueOpened,
    accessibilityLabel: "Report issue"
  }
];

export function FeedbackFab() {
  const posthog = usePostHog();
  const insets = useSafeAreaInsets();
  const [expanded, setExpanded] = useState(false);

  if (!POSTHOG_ENABLED) {
    return null;
  }

  const handleMenuPress = (event) => {
    posthog?.capture(event);
    setExpanded(false);
  };

  return (
    <View style={styles.root} pointerEvents="box-none">
      {expanded ? (
        <Pressable
          style={styles.backdrop}
          onPress={() => setExpanded(false)}
          accessibilityLabel="Close feedback menu"
          accessibilityRole="button"
        />
      ) : null}

      <View
        style={[
          styles.anchor,
          {
            bottom: Math.max(insets.bottom, 16) + 12,
            right: Math.max(insets.right, 16)
          }
        ]}
        pointerEvents="box-none"
      >
        {expanded ? (
          <View style={styles.menu}>
            {MENU_ITEMS.map((item) => (
              <Pressable
                key={item.event}
                style={styles.menuItem}
                onPress={() => handleMenuPress(item.event)}
                accessibilityRole="button"
                accessibilityLabel={item.accessibilityLabel}
              >
                <Text style={styles.menuText}>{item.label}</Text>
              </Pressable>
            ))}
          </View>
        ) : null}

        <Pressable
          style={styles.fab}
          onPress={() => setExpanded((open) => !open)}
          accessibilityRole="button"
          accessibilityLabel={expanded ? "Close feedback menu" : "Give feedback"}
        >
          <Text style={styles.fabText}>Give feedback</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 100
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject
  },
  anchor: {
    position: "absolute",
    alignItems: "flex-end"
  },
  menu: {
    marginBottom: 8,
    gap: 6
  },
  menuItem: {
    backgroundColor: "rgba(30, 30, 30, 0.88)",
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.12)",
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 4
  },
  menuText: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "500"
  },
  fab: {
    backgroundColor: "rgba(30, 30, 30, 0.72)",
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 10,
    minHeight: 38,
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.15)",
    shadowColor: "#000",
    shadowOpacity: 0.25,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6
  },
  fabText: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "500"
  }
});
