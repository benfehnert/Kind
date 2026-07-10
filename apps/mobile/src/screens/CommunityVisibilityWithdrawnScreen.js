import React from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "../context/AuthContext";
import { COMMUNITY_VISIBILITY_WITHDRAWN_COPY } from "../data/profileWithdrawConfirmations";
import { colors, radius, spacing } from "../theme/colors";
import { type } from "../theme/typography";
import { text } from "../theme/textStyles";

export default function CommunityVisibilityWithdrawnScreen() {
  const { logout } = useAuth();
  const copy = COMMUNITY_VISIBILITY_WITHDRAWN_COPY;

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.content}>
        <Text style={styles.title}>{copy.title}</Text>
        <Text style={styles.body}>{copy.body}</Text>

        <Pressable style={styles.btnPrimary} onPress={logout}>
          <Text style={styles.btnPrimaryTxt}>{copy.logoutButton}</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.bg
  },
  content: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: spacing.screen,
    gap: spacing.lg
  },
  title: {
    ...type.profileName,
    fontSize: 22,
    color: colors.text,
    textAlign: "center"
  },
  body: {
    ...text.body,
    color: colors.textMuted,
    textAlign: "center",
    marginBottom: spacing.md
  },
  btnPrimary: {
    backgroundColor: colors.greenDark,
    borderRadius: radius.md,
    paddingVertical: spacing.xl,
    alignItems: "center"
  },
  btnPrimaryTxt: {
    ...type.buttonMd,
    color: "#fff"
  }
});
