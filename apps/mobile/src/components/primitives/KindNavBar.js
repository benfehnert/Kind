import React from "react";
import { StyleSheet, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors, iconSize, spacing } from "../../theme/colors";
import { Avatar } from "./Avatar";
import { KindLogo } from "./KindLogo";
import { SearchIcon } from "../icons/ProtoIcons";
import { avatarPropsFromPerson } from "../../lib/avatarProps";

export function KindNavBar({ profile, onLogo, onSearch, onAvatar }) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.nav, { paddingTop: Math.max(insets.top, spacing.navY) }]}>
      <TouchableOpacity onPress={onLogo} accessibilityLabel="Home" accessibilityRole="button">
        <KindLogo variant="light" />
      </TouchableOpacity>
      <View style={styles.actions}>
        <TouchableOpacity style={styles.iconBtn} onPress={onSearch} accessibilityLabel="Exploration">
          <SearchIcon size={iconSize.nav} color={colors.navIcon} />
        </TouchableOpacity>
        <TouchableOpacity onPress={onAvatar} accessibilityLabel="Profile">
          <Avatar
            size={iconSize.avatarNav}
            {...avatarPropsFromPerson(profile)}
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
  actions: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  iconBtn: {
    width: iconSize.navBtn,
    height: iconSize.navBtn,
    minHeight: iconSize.navBtn,
    borderRadius: iconSize.navBtn / 2,
    alignItems: "center",
    justifyContent: "center"
  }
});
