import React, { useCallback, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Pressable, SectionList, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation, useRoute } from "@react-navigation/native";
import { get } from "../lib/api";
import { useFollow } from "../context/FollowContext";
import { colors, fontFamily, spacing } from "../theme/colors";
import { text } from "../theme/textStyles";
import { Avatar } from "../components/primitives/Avatar";
import { avatarPropsFromPerson } from "../lib/avatarProps";

function SupporterRow({ item, showFollow, isFollowing, toggleFollow, isSelf, onPressProfile }) {
  return (
    <View style={styles.row}>
      <Pressable style={styles.rowMain} onPress={() => onPressProfile(item.slug)}>
        <Avatar size={44} {...avatarPropsFromPerson(item)} />
        <View style={{ flex: 1 }}>
          <Text style={styles.name}>{item.name}</Text>
          <Text style={styles.meta}>{item.meta || item.loc}</Text>
        </View>
      </Pressable>
      {showFollow && !isSelf(item.slug) ? (
        <Pressable
          style={[styles.followBtn, isFollowing(item.slug) && styles.followBtnOn]}
          onPress={() => toggleFollow(item.slug)}
        >
          <Text style={[styles.followTxt, isFollowing(item.slug) && styles.followTxtOn]}>
            {isFollowing(item.slug) ? "Following" : "Follow"}
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}

export default function NiceSupportersScreen() {
  const navigation = useNavigation();
  const { params } = useRoute();
  const activityPostId = params?.activityPostId;
  const { isFollowing, toggleFollow, isSelf } = useFollow();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [data, setData] = useState({ count: 0, following: [], others: [] });

  const load = useCallback(async () => {
    if (!activityPostId) return;
    setLoading(true);
    setError(null);
    try {
      const result = await get(`/activity-posts/${activityPostId}/nices`);
      setData(result);
    } catch (err) {
      setError(err.message || "Could not load supporters.");
    } finally {
      setLoading(false);
    }
  }, [activityPostId]);

  useEffect(() => {
    load();
  }, [load]);

  const sections = useMemo(() => {
    const rows = [];
    if (data.following?.length) {
      rows.push({ title: "INDIVIDUALS YOU FOLLOW", data: data.following, showFollow: false });
    }
    if (data.others?.length) {
      rows.push({ title: "OTHER INDIVIDUALS", data: data.others, showFollow: true });
    }
    return rows;
  }, [data]);

  const openProfile = (slug) => navigation.navigate("ExplorerProfile", { userId: slug });

  return (
    <SafeAreaView style={styles.safe} edges={["top", "left", "right"]}>
      <View style={styles.top}>
        <Pressable onPress={() => navigation.goBack()} hitSlop={12}>
          <Text style={styles.back}>‹ Back</Text>
        </Pressable>
        <Text style={styles.hdr}>{data.count} support you</Text>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.greenDark} />
        </View>
      ) : error ? (
        <View style={styles.center}>
          <Text style={styles.error}>{error}</Text>
          <Pressable onPress={load}>
            <Text style={styles.retry}>Try again</Text>
          </Pressable>
        </View>
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={(item) => item.slug}
          contentContainerStyle={{ padding: spacing.screen, paddingBottom: 48 }}
          ListEmptyComponent={<Text style={styles.empty}>No one has given Nice yet.</Text>}
          renderSectionHeader={({ section: { title } }) => (
            <Text style={styles.sectionLabel}>{title}</Text>
          )}
          renderItem={({ item, section }) => (
            <SupporterRow
              item={item}
              showFollow={section.showFollow}
              isFollowing={isFollowing}
              toggleFollow={toggleFollow}
              isSelf={isSelf}
              onPressProfile={openProfile}
            />
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
  empty: { color: colors.textMuted },
  sectionLabel: { ...text.uppercaseLabel, marginTop: spacing.lg, marginBottom: spacing.md },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    gap: 8
  },
  rowMain: { flex: 1, flexDirection: "row", gap: 12, alignItems: "center" },
  name: { fontSize: 15, fontWeight: "600", color: colors.text },
  meta: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
  followBtn: {
    borderWidth: 1,
    borderColor: colors.greenDark,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6
  },
  followBtnOn: { backgroundColor: colors.greenDark },
  followTxt: { fontSize: 12, fontWeight: "700", color: colors.greenDark },
  followTxtOn: { color: "#fff" }
});
