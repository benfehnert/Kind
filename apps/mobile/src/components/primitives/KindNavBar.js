import React from "react";
import { Image, StyleSheet, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors, iconSize, spacing } from "../../theme/colors";
import { Avatar } from "./Avatar";
import { BellIcon, SearchIcon } from "../icons/ProtoIcons";

const kindLogo = require("../../../assets/images/kind-logo.png");

const LOGO_HEIGHT = 48;
const LOGO_WIDTH = 84;

export function KindNavBar({ profile, onSearch, onNotifications, onAvatar }) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.nav, { paddingTop: Math.max(insets.top, spacing.navY) }]}>
      <Image
        source={kindLogo}
        style={styles.logo}
        resizeMode="contain"
        accessibilityLabel="kind health exploration"
      />
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
            img={profile?.img}
            sceneKey={profile?.sceneKey}
            avatarUrl={profile?.avatarUrl}
            initials={profile?.initials || "?"}
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
    paddingLeft: spacing.screen,
    paddingRight: spacing.navX,
    paddingBottom: spacing.navY,
    minHeight: 56
  },
  logo: {
    width: LOGO_WIDTH,
    height: LOGO_HEIGHT
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
