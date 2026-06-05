import React from "react";
import { View, ScrollView, StyleSheet, Text, Pressable } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation, useRoute } from "@react-navigation/native";
import { getResearcher } from "../data/mock";
import { useData } from "../context/DataContext";
import { useFollow } from "../context/FollowContext";
import { colors, fontFamily } from "../theme/colors";
import { Avatar } from "../components/primitives/Avatar";
import { PrimaryButton } from "../components/primitives/Buttons";

export default function ResearcherProfileScreen() {
  const { explorations, community } = useData();
  const navigation = useNavigation();
  const { params } = useRoute();
  const researcherId = params?.researcherId;
  const r = researcherId ? getResearcher(researcherId, community.researchers) : null;
  const { isFollowingResearcher, toggleResearcherFollow } = useFollow();

  if (!r || !researcherId) {
    return (
      <SafeAreaView style={{ flex: 1, padding: 20 }}>
        <Text>Researcher not found</Text>
        <Pressable onPress={() => navigation.goBack()}>
          <Text style={{ color: colors.greenDark, marginTop: 12 }}>Back</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  const follows = isFollowingResearcher(researcherId);

  return (
    <SafeAreaView style={styles.safe} edges={["top", "left", "right"]}>
      <View style={styles.top}>
        <Pressable onPress={() => navigation.goBack()} hitSlop={12}>
          <Text style={styles.back}>‹ Back</Text>
        </Pressable>
        <Text style={styles.hdr}>Researcher</Text>
      </View>
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 120 }}>
        <View style={styles.hero}>
          <Avatar size={72} img={r.img} initials={r.initials} />
          <View style={{ flex: 1 }}>
            <Text style={styles.name}>{r.name}</Text>
            <Text style={styles.title}>{r.title}</Text>
            <Text style={styles.org}>{r.org}</Text>
            {r.verified ? (
              <Text style={styles.ver}>✓ Verified researcher</Text>
            ) : null}
          </View>
        </View>

        <Pressable style={[styles.foBtn, follows && styles.foBtnOn]} onPress={() => toggleResearcherFollow(researcherId)}>
          <Text style={[styles.foTxt, follows && styles.foTxtOn]}>{follows ? "Following" : "Follow"}</Text>
        </Pressable>

        <Text style={styles.sec}>Areas</Text>
        <View style={styles.tags}>
          {(r.areas || []).map((a) => (
            <Text key={a} style={styles.tag}>
              {a}
            </Text>
          ))}
        </View>

        <Text style={styles.sec}>Explorations</Text>
        {(r.explorations || []).map((ex) => {
          const meta = explorations[ex.expId];
          return (
            <View key={ex.expId} style={styles.card}>
              <Pressable onPress={() => navigation.navigate("ExplorationDetail", { id: ex.expId })}>
                <Text style={styles.expTitle}>{meta?.title || ex.expId}</Text>
              </Pressable>
              <Text style={styles.note}>{ex.note}</Text>
              <PrimaryButton title="Evidence summary" onPress={() => navigation.navigate("Evidence", { id: ex.expId })} style={{ marginTop: 10 }} />
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
    paddingVertical: 10,
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
  hero: { flexDirection: "row", gap: 16, marginBottom: 16, alignItems: "flex-start" },
  name: { fontSize: 20, fontWeight: "700", color: colors.text },
  title: { fontSize: 13, color: colors.textMuted, marginTop: 4 },
  org: { fontSize: 12, color: colors.greenDark, marginTop: 4, fontWeight: "600" },
  ver: { fontSize: 11, color: colors.blueText, marginTop: 8, fontWeight: "600" },
  foBtn: {
    borderWidth: 1.5,
    borderColor: colors.greenDark,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: "center",
    marginBottom: 20
  },
  foBtnOn: { backgroundColor: colors.greenDark },
  foTxt: { fontWeight: "700", color: colors.greenDark },
  foTxtOn: { color: "#fff" },
  sec: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.textMuted,
    textTransform: "uppercase",
    marginBottom: 10,
    marginTop: 8
  },
  tags: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 16 },
  tag: {
    backgroundColor: colors.greenLight,
    color: colors.greenDark,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    fontSize: 12,
    fontWeight: "600",
    overflow: "hidden"
  },
  card: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: 14,
    marginBottom: 12
  },
  expTitle: { fontSize: 15, fontWeight: "600", color: colors.text },
  note: { fontSize: 13, color: colors.textMuted, lineHeight: 20, marginTop: 8 }
});
