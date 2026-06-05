import React, { useMemo } from "react";
import { View, FlatList, StyleSheet, Text, Pressable } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation, useRoute } from "@react-navigation/native";
import { getUserProfile } from "../data/mock";
import { useData } from "../context/DataContext";
import { useFollow } from "../context/FollowContext";
import { colors, fontFamily } from "../theme/colors";
import { Avatar } from "../components/primitives/Avatar";

export default function FollowListScreen() {
  const { community } = useData();
  const navigation = useNavigation();
  const { params } = useRoute();
  const mode = params?.mode === "followers" ? "followers" : "following";
  const { following, followerIdSet, isFollowing, toggleFollow } = useFollow();

  const userIds = useMemo(() => {
    if (mode === "following") return [...following];
    return [...(community.socialMeta?.followerIdsExpanded || [])];
  }, [mode, following, community]);

  const rows = useMemo(
    () =>
      userIds
        .map((uid) => {
          const u = getUserProfile(uid, community, followerIdSet);
          return u ? { uid, ...u } : null;
        })
        .filter(Boolean),
    [userIds, followerIdSet]
  );

  return (
    <SafeAreaView style={styles.safe} edges={["top", "left", "right"]}>
      <View style={styles.top}>
        <Pressable onPress={() => navigation.goBack()} hitSlop={12}>
          <Text style={styles.back}>‹ Back</Text>
        </Pressable>
        <Text style={styles.hdr}>{mode === "following" ? "Following" : "Followers"}</Text>
      </View>
      <FlatList
        data={rows}
        keyExtractor={(item) => item.uid}
        contentContainerStyle={{ padding: 16, paddingBottom: 48 }}
        ListEmptyComponent={<Text style={{ color: colors.textMuted }}>No profiles to show.</Text>}
        renderItem={({ item }) => (
          <View style={styles.row}>
            <Pressable style={{ flex: 1, flexDirection: "row", gap: 12 }} onPress={() => navigation.navigate("ExplorerProfile", { userId: item.uid })}>
              <Avatar size={44} img={item.img} sceneKey={item.sceneKey} initials={item.initials} avatarUrl={item.avatarUrl} />
              <View style={{ flex: 1 }}>
                <Text style={styles.name}>{item.name}</Text>
                <Text style={styles.meta}>{item.meta || item.loc}</Text>
              </View>
            </Pressable>
            {mode === "following" ? (
              <Pressable style={[styles.fo, isFollowing(item.uid) && styles.fon]} onPress={() => toggleFollow(item.uid)}>
                <Text style={[styles.ft, isFollowing(item.uid) && styles.fton]}>{isFollowing(item.uid) ? "Following" : "Follow"}</Text>
              </Pressable>
            ) : null}
          </View>
        )}
      />
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
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    gap: 8
  },
  name: { fontSize: 15, fontWeight: "600", color: colors.text },
  meta: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
  fo: {
    borderWidth: 1,
    borderColor: colors.greenDark,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6
  },
  fon: { backgroundColor: colors.greenDark },
  ft: { fontSize: 12, fontWeight: "700", color: colors.greenDark },
  fton: { color: "#fff" }
});
