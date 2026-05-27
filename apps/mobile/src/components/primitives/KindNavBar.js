import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors, fontSize, iconSize, letterSpacing, spacing } from "../../theme/colors";
import { type } from "../../theme/typography";
import { Avatar } from "./Avatar";
import { BellIcon, SearchIcon } from "../icons/ProtoIcons";

export function KindNavBar({ profile, onSearch, onNotifications, onAvatar }) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.nav, { paddingTop: Math.max(insets.top, spacing.navY) }]}>
      <View>
        <Text style={styles.logo}>kind</Text>
        <Text style={styles.sub}>health exploration</Text>
      </View>
      <View style={styles.actions}>
        <TouchableOpacity style={styles.iconBtn} onPress={onSearch} accessibilityLabel="Search">
          <SearchIcon size={iconSize.nav} color={colors.navIcon} />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.iconBtn}
          onPress={onNotifications}
          accessibilityLabel="Notifications"
        >
          <BellIcon size={iconSize.nav} color={colors.navIcon} />
          <View style={styles.dot} />
        </TouchableOpacity>
        <TouchableOpacity onPress={onAvatar} accessibilityLabel="Profile">
          <Avatar
            size={iconSize.avatarNav}
            img={profile?.img ?? 28}
            initials={profile?.initials || "AR"}
            borderColor={colors.orange}
            borderWidth={1.5}
          />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  nav: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: colors.greenDark,
    paddingHorizontal: spacing.navX,
    paddingBottom: spacing.navY,
    minHeight: 56
  },
  logo: {
    ...type.logo,
    color: "#fff",
    letterSpacing: letterSpacing.logo
  },
  sub: {
    ...type.navSub,
    color: colors.orange,
    letterSpacing: letterSpacing.navSub,
    marginTop: 1
  },
  actions: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  iconBtn: {
    width: iconSize.navBtn,
    height: iconSize.navBtn,
    minHeight: iconSize.navBtn,
    borderRadius: iconSize.navBtn / 2,
    alignItems: "center",
    justifyContent: "center"
  },
  dot: {
    position: "absolute",
    top: 6,
    right: 6,
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: colors.notifDot,
    borderWidth: 1.5,
    borderColor: colors.greenDark
  }
});
