import React, { useState } from "react";
import { Image, StyleSheet, Text, View } from "react-native";
import { resolveImageSource } from "../../assets/imageManifest";
import { colors } from "../../theme/colors";
import { fontSize } from "../../theme/tokens";
import { type } from "../../theme/typography";
import { getSceneKeyFromAvatarUrl } from "../../assets/sceneAvatars";

const AV_BG = [colors.greenLight, colors.purpleBg, colors.amberBg, colors.blueBg, colors.mintBg];
const AV_TC = [colors.greenDark, colors.purpleText, colors.amberText, colors.blueText, colors.mintText];

function initialsStyle(size) {
  if (size >= 60) return type.profileName;
  if (size >= 40) return type.profileName;
  if (size >= 36) return type.feedName;
  return type.feedTime;
}

export function Avatar({
  size = 40,
  img,
  initials = "",
  sceneKey,
  avatarUrl,
  backgroundColor,
  textColor,
  borderColor,
  borderWidth = 0
}) {
  const resolvedScene = sceneKey || getSceneKeyFromAvatarUrl(avatarUrl);
  const key = img != null ? `pravatar-${img}` : resolvedScene ? `scene-${resolvedScene}` : null;
  const src = key ? resolveImageSource(key) : null;
  const [failed, setFailed] = useState(false);
  const bg = backgroundColor ?? AV_BG[Math.abs((img ?? 0) % AV_BG.length)];
  const tc = textColor ?? AV_TC[Math.abs((img ?? 0) % AV_TC.length)];
  const initialsText = initialsStyle(size);

  return (
    <View
      style={[
        styles.wrap,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: bg,
          borderWidth,
          borderColor: borderColor || "transparent"
        }
      ]}
    >
      {src && !failed ? (
        <Image
          source={src}
          style={[styles.img, { borderRadius: size / 2 }]}
          resizeMode="cover"
          onError={() => setFailed(true)}
        />
      ) : null}
      {(failed || !src) && initials ? (
        <Text style={[initialsText, { color: tc, fontSize: size >= 36 ? fontSize.md : fontSize.sm }]}>
          {initials}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0
  },
  img: { ...StyleSheet.absoluteFillObject, width: "100%", height: "100%" }
});
