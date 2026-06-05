import React from "react";
import { SafeAreaView, ScrollView, StyleSheet, Text, View, Pressable } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { useData } from "../context/DataContext";
import { colors, fontSize, iconSize, spacing } from "../theme/colors";
import { type } from "../theme/typography";
import { Avatar } from "../components/primitives/Avatar";
import { RichTextParts } from "../utils/RichText";
import { CloseIcon } from "../components/icons/ProtoIcons";
import { text } from "../theme/textStyles";

export default function NotificationsModalScreen() {
  const { notifications } = useData();
  const navigation = useNavigation();
  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.head}>
        <Text style={styles.title}>Notifications</Text>
        <Pressable onPress={() => navigation.goBack()} style={styles.xBtn} accessibilityLabel="Close">
          <CloseIcon size={16} color={colors.textMuted} />
        </Pressable>
      </View>
      <ScrollView contentContainerStyle={{ paddingBottom: spacing.screen + spacing.xl }}>
        {(Array.isArray(notifications) ? notifications : []).map((n) => (
          <View key={n.id} style={[styles.item, n.unread && styles.unread]}>
            {n.avatarKind === "icon" ? (
              <View style={[styles.av, { backgroundColor: n.avatarBg }]}>
                <Text style={{ fontSize: fontSize.base, color: n.iconColor }}>{n.icon}</Text>
              </View>
            ) : (
              <Avatar
                size={iconSize.avatarNav}
                img={
                  n.avatarKey
                    ? parseInt(String(n.avatarKey).replace("pravatar-", ""), 10)
                    : undefined
                }
                sceneKey={n.sceneKey}
                initials={n.initials || ""}
                backgroundColor={n.avatarBg}
              />
            )}
            <View style={{ flex: 1 }}>
              <RichTextParts
                html={n.body}
                style={styles.body}
                strongStyle={{ color: colors.text, ...type.bodyStrong }}
              />
              <Text style={styles.time}>{n.time}</Text>
            </View>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.surface, paddingHorizontal: spacing.screen },
  head: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.lg,
    marginBottom: spacing.sectionGap,
    paddingTop: spacing.xs
  },
  title: {
    flex: 1,
    ...type.buttonMd,
    color: colors.text
  },
  xBtn: {
    width: iconSize.close,
    height: iconSize.close,
    borderRadius: iconSize.close / 2,
    backgroundColor: colors.bg,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0
  },
  item: {
    flexDirection: "row",
    gap: spacing.xl,
    alignItems: "flex-start",
    paddingVertical: spacing.lg,
    borderBottomWidth: 1,
    borderColor: colors.border
  },
  unread: { backgroundColor: colors.greenLight },
  av: {
    width: iconSize.avatarNav,
    height: iconSize.avatarNav,
    borderRadius: iconSize.avatarNav / 2,
    alignItems: "center",
    justifyContent: "center"
  },
  body: text.body,
  time: { ...text.caption, marginTop: 3 }
});
