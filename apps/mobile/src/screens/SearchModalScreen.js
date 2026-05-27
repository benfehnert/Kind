import React, { useMemo, useState } from "react";
import {
  SafeAreaView,
  Pressable,
  StyleSheet,
  TextInput,
  View,
  Text,
  FlatList,
  KeyboardAvoidingView,
  Platform
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import searchData from "../../mock-data/search.json";
import { colors, fontSize, iconSize, radius, spacing } from "../theme/colors";
import { text } from "../theme/textStyles";
import { type } from "../theme/typography";
import exploreCopy from "../../mock-data/exploreCopy.json";
import { CloseIcon } from "../components/icons/ProtoIcons";

export default function SearchModalScreen() {
  const navigation = useNavigation();
  const [q, setQ] = useState("");

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();
    const out = [];
    searchData.sections.forEach((sec) => {
      const rows = sec.rows.filter((r) => {
        if (!query) return true;
        return (
          (r.title && r.title.toLowerCase().includes(query)) ||
          (r.sub && r.sub.toLowerCase().includes(query))
        );
      });
      if (rows.length) out.push({ ...sec, rows });
    });
    return out;
  }, [q]);

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <View style={styles.row}>
          <TextInput
            style={styles.input}
            placeholder={exploreCopy.globalSearchPlaceholder}
            placeholderTextColor={colors.textMuted}
            value={q}
            onChangeText={setQ}
            autoFocus
          />
          <Pressable style={styles.x} onPress={() => navigation.goBack()} accessibilityLabel="Close search">
            <CloseIcon size={16} color={colors.textMuted} />
          </Pressable>
        </View>
        <FlatList
          data={filtered}
          keyExtractor={(s) => s.label}
          renderItem={({ item: sec }) => (
            <View>
              <Text style={styles.lab}>{sec.label}</Text>
              {sec.rows.map((r, i) => (
                <Pressable
                  key={i}
                  style={styles.res}
                  onPress={() => {
                    navigation.goBack();
                    if (r.kind === "exploration" && r.explorationId) {
                      setTimeout(() => navigation.navigate("ExplorationDetail", { id: r.explorationId }), 80);
                    } else if (r.kind === "user" && r.userId) {
                      setTimeout(() => navigation.navigate("ExplorerProfile", { userId: r.userId }), 80);
                    } else if (r.kind === "insight") {
                      setTimeout(
                        () => navigation.navigate("MainTabs", { screen: "Insight", params: { community: false } }),
                        80
                      );
                    }
                  }}
                >
                  <View style={[styles.ico, r.iconBg ? { backgroundColor: r.iconBg } : null]}>
                    {r.initials ? (
                      <Text style={styles.icoInitials}>{r.initials}</Text>
                    ) : (
                      <Text style={styles.icoEmoji}>{r.icon}</Text>
                    )}
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.rt}>{r.title}</Text>
                    <Text style={styles.rs}>{r.sub}</Text>
                  </View>
                </Pressable>
              ))}
            </View>
          )}
          contentContainerStyle={{ paddingBottom: spacing.screen + spacing.xl }}
        />
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.surface, paddingHorizontal: spacing.screen, paddingTop: spacing.screen },
  row: { flexDirection: "row", alignItems: "center", gap: spacing.lg, marginBottom: spacing.sectionGap },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.xxl,
    paddingVertical: spacing.lg,
    minHeight: 44,
    ...type.body,
    color: colors.text,
    backgroundColor: colors.bg
  },
  x: {
    width: iconSize.close,
    height: iconSize.close,
    borderRadius: iconSize.close / 2,
    backgroundColor: colors.bg,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0
  },
  lab: {
    ...text.uppercaseLabel,
    marginTop: spacing.md + 4,
    marginBottom: spacing.xs + 2
  },
  res: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderColor: colors.border
  },
  ico: {
    width: 34,
    height: 34,
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center"
  },
  icoInitials: { ...type.feedName, color: colors.greenDark },
  icoEmoji: { fontSize: fontSize.lg },
  rt: { ...type.bodyStrong, color: colors.text },
  rs: { ...text.caption, marginTop: 1 }
});
