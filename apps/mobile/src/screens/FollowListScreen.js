import React, { useCallback, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, FlatList, StyleSheet, Text, Pressable, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation, useRoute } from "@react-navigation/native";
import { getResearcher, getUserProfile } from "../data/mock";
import { get } from "../lib/api";
import { useData } from "../context/DataContext";
import { useFollow } from "../context/FollowContext";
import { colors, fontFamily } from "../theme/colors";
import { Avatar } from "../components/primitives/Avatar";

export default function FollowListScreen() {
  const { community } = useData();
  const navigation = useNavigation();
  const { params } = useRoute();
  const mode = params?.mode === "followers" ? "followers" : "following";
  const userId = params?.userId || null;
  const userName = params?.userName || null;
  const {
    following,
    followerIdSet,
    isFollowing,
    toggleFollow,
    isSelf,
    followingResearchers,
    isFollowingResearcher,
    toggleResearcherFollow
  } = useFollow();

  const [loading, setLoading] = useState(Boolean(userId));
  const [error, setError] = useState(null);
  const [remoteRows, setRemoteRows] = useState([]);

  const loadRemoteRows = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    setError(null);
    try {
      const result = await get(`/community/individuals/${userId}/follows?mode=${mode}`);
      setRemoteRows(result.items || []);
    } catch (err) {
      setError(err.message || "Could not load follow list.");
      setRemoteRows([]);
    } finally {
      setLoading(false);
    }
  }, [userId, mode]);

  useEffect(() => {
    if (userId) loadRemoteRows();
  }, [userId, loadRemoteRows]);

  const rows = useMemo(() => {
    if (userId) return remoteRows;

    if (mode === "following") {
      const individualRows = [...following]
        .map((uid) => {
          const u = getUserProfile(uid, community, followerIdSet);
          return u ? { id: uid, kind: "individual", ...u } : null;
        })
        .filter(Boolean);
      const researcherRows = [...followingResearchers]
        .map((researcherId) => {
          const researcher = getResearcher(researcherId, community.researchers || []);
          if (!researcher) return null;
          return {
            id: researcherId,
            kind: "researcher",
            name: researcher.name,
            meta: researcher.title || researcher.org || "Researcher",
            loc: researcher.org,
            img: researcher.img,
            initials: researcher.initials
          };
        })
        .filter(Boolean);
      return [...individualRows, ...researcherRows];
    }

    return [...(community.socialMeta?.followerIdsExpanded || [])]
      .map((uid) => {
        const u = getUserProfile(uid, community, followerIdSet);
        return u ? { id: uid, kind: "individual", ...u } : null;
      })
      .filter(Boolean);
  }, [userId, remoteRows, mode, following, followingResearchers, community, followerIdSet]);

  const title = useMemo(() => {
    const label = mode === "following" ? "Following" : "Followers";
    return userName ? `${userName} · ${label}` : label;
  }, [mode, userName]);

  return (
    <SafeAreaView style={styles.safe} edges={["top", "left", "right"]}>
      <View style={styles.top}>
        <Pressable onPress={() => navigation.goBack()} hitSlop={12}>
          <Text style={styles.back}>‹ Back</Text>
        </Pressable>
        <Text style={styles.hdr} numberOfLines={1}>
          {title}
        </Text>
      </View>
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.greenDark} />
        </View>
      ) : error ? (
        <View style={styles.center}>
          <Text style={styles.error}>{error}</Text>
          <Pressable onPress={loadRemoteRows}>
            <Text style={styles.retry}>Try again</Text>
          </Pressable>
        </View>
      ) : (
        <FlatList
          data={rows}
          keyExtractor={(item) => `${item.kind}:${item.id}`}
          contentContainerStyle={{ padding: 16, paddingBottom: 48 }}
          ListEmptyComponent={<Text style={{ color: colors.textMuted }}>No profiles to show.</Text>}
          renderItem={({ item }) => (
            <View style={styles.row}>
              <Pressable
                style={{ flex: 1, flexDirection: "row", gap: 12 }}
                onPress={() =>
                  item.kind === "researcher"
                    ? navigation.navigate("ResearcherProfile", { researcherId: item.id })
                    : navigation.navigate("ExplorerProfile", { userId: item.id })
                }
              >
                <Avatar size={44} img={item.img} sceneKey={item.sceneKey} initials={item.initials} avatarUrl={item.avatarUrl} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.name}>{item.name}</Text>
                  <Text style={styles.meta}>{item.meta || item.loc}</Text>
                </View>
              </Pressable>
              {mode === "following" ? (
                item.kind === "researcher" ? (
                  <Pressable
                    style={[styles.fo, isFollowingResearcher(item.id) && styles.fon]}
                    onPress={() => toggleResearcherFollow(item.id)}
                  >
                    <Text style={[styles.ft, isFollowingResearcher(item.id) && styles.fton]}>
                      {isFollowingResearcher(item.id) ? "Following" : "Follow"}
                    </Text>
                  </Pressable>
                ) : !isSelf(item.id) ? (
                  <Pressable
                    style={[styles.fo, isFollowing(item.id) && styles.fon]}
                    onPress={() => toggleFollow(item.id)}
                  >
                    <Text style={[styles.ft, isFollowing(item.id) && styles.fton]}>
                      {isFollowing(item.id) ? "Following" : "Follow"}
                    </Text>
                  </Pressable>
                ) : null
              ) : null}
            </View>
          )}
        />
      )}
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
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24 },
  error: { color: colors.textMuted, textAlign: "center", marginBottom: 12 },
  retry: { color: colors.greenDark, fontWeight: "600" },
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
