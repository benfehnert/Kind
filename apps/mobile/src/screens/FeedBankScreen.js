import React from "react";
import { View, ScrollView, StyleSheet, Text, Pressable } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation, useRoute } from "@react-navigation/native";
import { useData } from "../context/DataContext";
import { colors, fontFamily } from "../theme/colors";
import { RichTextParts } from "../utils/RichText";

export default function FeedBankScreen() {
  const { feed, explorations } = useData();
  const navigation = useNavigation();
  const { params } = useRoute();
  const kind = params?.kind === "science" ? "science" : "tips";
  const map = kind === "tips" ? feed.feedTips : feed.feedScience;
  const title = kind === "tips" ? "More tips" : "More science";

  return (
    <SafeAreaView style={styles.safe} edges={["top", "left", "right"]}>
      <View style={styles.top}>
        <Pressable onPress={() => navigation.goBack()} hitSlop={12}>
          <Text style={styles.back}>‹ Back</Text>
        </Pressable>
        <Text style={styles.hdr}>{title}</Text>
      </View>
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 120 }}>
        <Text style={styles.sub}>One section per exploration — same copy as the home feed generator.</Text>
        {(feed.feedExpIds || []).map((expId) => {
          const exp = explorations[expId];
          const rows = map[expId] || [];
          if (!exp || !rows.length) return null;
          return (
            <View key={expId} style={styles.sec}>
              <Text style={styles.expCat}>{exp.category}</Text>
              <Text style={styles.expTitle}>{exp.title}</Text>
              {rows.map((row, i) => (
                <View key={i} style={styles.card}>
                  <Text style={styles.cardEyeb}>{kind === "tips" ? "Tip" : "Science"} · #{i + 1}</Text>
                  <RichTextParts
                    html={row.body}
                    style={{ fontSize: 14, color: colors.textMuted, lineHeight: 22 }}
                    strongStyle={{ fontWeight: "600", color: colors.text }}
                  />
                  {row.highlight ? (
                    <View style={styles.hl}>
                      <RichTextParts
                        html={row.highlight}
                        style={{ fontSize: 12, color: colors.greenDark, lineHeight: 18 }}
                        strongStyle={{ fontWeight: "700", color: colors.greenDark }}
                      />
                    </View>
                  ) : null}
                  <Pressable
                    style={{ marginTop: 10 }}
                    onPress={() => {
                      navigation.navigate("ExplorationDetail", { id: expId });
                    }}
                  >
                    <Text style={styles.link}>Open exploration</Text>
                  </Pressable>
                </View>
              ))}
            </View>
          );
        })}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  top: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.border
  },
  back: { color: colors.greenDark, fontWeight: "600", fontSize: 16, marginRight: 8 },
  hdr: {
    flex: 1,
    fontSize: 18,
    fontFamily: fontFamily.semibold,
    fontWeight: "600",
    color: colors.text
  },
  sub: { fontSize: 13, color: colors.textMuted, marginBottom: 16, lineHeight: 20 },
  sec: { marginBottom: 24 },
  expCat: { fontSize: 11, fontWeight: "600", color: colors.greenDark, marginBottom: 4 },
  expTitle: { fontSize: 15, fontWeight: "700", color: colors.text, marginBottom: 12 },
  cardEyeb: { fontSize: 11, color: colors.textMuted, marginBottom: 8, textTransform: "uppercase", fontWeight: "600" },
  card: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: 14,
    marginBottom: 10
  },
  hl: {
    marginTop: 10,
    backgroundColor: colors.greenLight,
    borderRadius: 8,
    padding: 10
  },
  link: { fontSize: 13, fontWeight: "600", color: colors.greenDark }
});
