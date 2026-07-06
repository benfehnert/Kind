import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Avatar } from "../primitives/Avatar";
import { KindBlob } from "../onboarding/KindBlob";

const AVATAR_SIZE = 34;

export function FeedItemAvatar({ item }) {
  if (item.avatarKind === "kind") {
    return (
      <View style={styles.kindWrap}>
        <KindBlob size={AVATAR_SIZE} />
      </View>
    );
  }

  if (item.avatarKind === "icon" || item.avatarKind === "glyph") {
    return (
      <View
        style={[
          styles.iconWrap,
          {
            backgroundColor: item.avatarBg || item.avatarBgStyle,
            borderRadius: item.avatarKind === "glyph" ? 8 : 999
          }
        ]}
      >
        <Text style={{ color: item.iconColor || item.glyphColor, fontSize: 16 }}>
          {item.icon || item.glyph}
        </Text>
      </View>
    );
  }

  return (
    <Avatar
      size={AVATAR_SIZE}
      img={item.avatarKey ? parseInt(item.avatarKey.replace("pravatar-", ""), 10) : undefined}
      sceneKey={item.sceneKey}
      initials={item.initials}
      backgroundColor={item.avatarBgStyle}
    />
  );
}

const styles = StyleSheet.create({
  kindWrap: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    alignItems: "center",
    justifyContent: "center"
  },
  iconWrap: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    minHeight: AVATAR_SIZE,
    alignItems: "center",
    justifyContent: "center"
  }
});
