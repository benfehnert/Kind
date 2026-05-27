import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { colors, heights, spacing } from "../../theme/colors";
import { type } from "../../theme/typography";

const TAB_LABELS = {
  Home: "Home",
  Exploration: "Exploration",
  Insight: "Insight",
  Community: "Community",
  Profile: "Profile"
};

export function KindTabBar({ state, navigation, descriptors }) {
  return (
    <View style={styles.tabs}>
      {state.routes.map((route, index) => {
        const focused = state.index === index;
        const label = descriptors[route.key]?.options?.title ?? TAB_LABELS[route.name] ?? route.name;

        return (
          <Pressable
            key={route.key}
            accessibilityRole="button"
            accessibilityState={focused ? { selected: true } : {}}
            style={styles.tab}
            onPress={() => {
              const event = navigation.emit({
                type: "tabPress",
                target: route.key,
                canPreventDefault: true
              });
              if (!focused && !event.defaultPrevented) {
                navigation.navigate(route.name);
              }
            }}
          >
            <Text style={[styles.tabText, focused && styles.tabTextActive]}>{label}</Text>
            {focused ? <View style={styles.indicator} /> : null}
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  tabs: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.surface,
    minHeight: heights.tabBar
  },
  tab: {
    flex: 1,
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.xs,
    alignItems: "center",
    justifyContent: "center",
    minHeight: heights.tabBar
  },
  tabText: {
    ...type.tab,
    color: colors.textMuted,
    textAlign: "center"
  },
  tabTextActive: {
    ...type.tabActive,
    color: colors.greenDark,
    textAlign: "center"
  },
  indicator: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: 2,
    backgroundColor: colors.orange
  }
});
