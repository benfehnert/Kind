import React, { useCallback, useState } from "react";
import { View, ScrollView, StyleSheet, Text, Pressable, Linking, ActivityIndicator } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { ProfileDetailScreen } from "../components/profile/ProfileDetailScreen";
import { Badge } from "../components/primitives/Badge";
import { get } from "../lib/api";
import { formatConsentDate } from "../hooks/useUserExplorations";
import { colors, fontFamily, spacing } from "../theme/colors";

function EmptySection({ text }) {
  return (
    <View style={styles.card}>
      <Text style={styles.cardBody}>{text}</Text>
    </View>
  );
}

function PublicationCard({ source, title, meta, status, publicationUrl, onPress }) {
  const pressable = Boolean(publicationUrl || onPress);

  return (
    <Pressable
      style={[styles.card, styles.pubCard, pressable && styles.pubCardPressable]}
      onPress={onPress}
      disabled={!pressable}
    >
      {source ? (
        <Text style={[styles.pubSrc, source.includes("kind") ? styles.pubSrcKind : styles.pubSrcResearch]}>
          {source}
        </Text>
      ) : null}
      <Text style={styles.pubTitle}>{title}</Text>
      {meta ? <Text style={styles.pubMeta}>{meta}</Text> : null}
      {status ? (
        <View style={styles.statusRow}>
          <Badge variant={status === "Published" ? "green" : "amber"}>{status}</Badge>
          {publicationUrl ? <Text style={styles.linkHint}>Tap to view publication</Text> : null}
        </View>
      ) : null}
    </Pressable>
  );
}

export default function DataUsageScreen() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const payload = await get("/profile/data-usage");
      setData(payload);
    } catch (err) {
      setError(err.message || "Could not load data usage summary.");
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const openPublication = (url) => {
    if (url) Linking.openURL(url);
  };

  if (loading && !data) {
    return (
      <ProfileDetailScreen title="How your data has been used">
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.greenDark} />
        </View>
      </ProfileDetailScreen>
    );
  }

  if (error && !data) {
    return (
      <ProfileDetailScreen title="How your data has been used">
        <Text style={styles.body}>{error}</Text>
        <Pressable style={styles.retryBtn} onPress={load}>
          <Text style={styles.retryTxt}>Try again</Text>
        </Pressable>
      </ProfileDetailScreen>
    );
  }

  const health = data?.healthExplorations;
  const kind = data?.kindAnalyses;
  const researcher = data?.researcherAnalyses;

  return (
    <ProfileDetailScreen title={data?.title || "How your data has been used"}>
      <Text style={styles.body}>{data?.intro}</Text>

      <View style={styles.group}>
        <Text style={styles.groupHeading}>{health?.heading}</Text>
        <Text style={styles.sectionBody}>{health?.body}</Text>
        {(health?.items || []).length === 0 ? (
          <EmptySection text="You haven't joined any health explorations yet. When you do, your data will be used to support your personal analysis and health journey." />
        ) : (
          (health?.items || []).map((item, idx) => (
            <View key={item.explorationId} style={[styles.card, idx > 0 && styles.cardGap]}>
              <Text style={styles.exTitle}>{item.feedLabel || item.title}</Text>
              {item.title && item.feedLabel ? <Text style={styles.exMeta}>{item.title}</Text> : null}
              {item.consentedAt ? (
                <Text style={styles.exMeta}>Started {formatConsentDate(item.consentedAt)}</Text>
              ) : null}
              {item.logCount > 0 ? (
                <Text style={styles.exMeta}>{item.logCount} check-ins logged</Text>
              ) : null}
              <Text style={styles.confirmation}>{item.confirmation}</Text>
            </View>
          ))
        )}
      </View>

      <View style={styles.group}>
        <Text style={styles.groupHeading}>{kind?.heading}</Text>
        <Text style={styles.sectionBody}>{kind?.body}</Text>
        {(kind?.items || []).length === 0 ? (
          <EmptySection text="No wider Kind analyses include your de-identified data yet." />
        ) : (
          (kind?.items || []).map((item, idx) => (
            <PublicationCard
              key={`${item.explorationId}-${idx}`}
              source={item.source}
              title={item.title}
              meta={item.meta}
              status={item.status}
              publicationUrl={item.publicationUrl}
              onPress={item.publicationUrl ? () => openPublication(item.publicationUrl) : undefined}
            />
          ))
        )}
      </View>

      <View style={styles.group}>
        <Text style={styles.groupHeading}>{researcher?.heading}</Text>
        <Text style={styles.sectionBody}>{researcher?.body}</Text>
        {(researcher?.items || []).length === 0 ? (
          <EmptySection text="No researcher-led analyses include your de-identified data yet." />
        ) : (
          (researcher?.items || []).map((item, idx) => (
            <PublicationCard
              key={`${item.explorationId}-${idx}`}
              title={item.title}
              meta={[item.researcherName, item.researcherOrg, item.meta].filter(Boolean).join(" · ")}
              status={item.status}
              publicationUrl={item.publicationUrl}
              onPress={item.publicationUrl ? () => openPublication(item.publicationUrl) : undefined}
            />
          ))
        )}
      </View>
    </ProfileDetailScreen>
  );
}

const styles = StyleSheet.create({
  centered: { paddingVertical: 40, alignItems: "center" },
  body: { fontSize: 14, color: colors.textMuted, lineHeight: 22, marginBottom: spacing.blockMbLg },
  group: { marginBottom: spacing.blockMbLg },
  groupHeading: {
    fontSize: 11,
    color: colors.textMuted,
    textTransform: "uppercase",
    letterSpacing: 0.8,
    fontFamily: fontFamily.semibold,
    marginBottom: spacing.sm
  },
  sectionBody: {
    fontSize: 14,
    color: colors.textMuted,
    lineHeight: 22,
    marginBottom: spacing.lg
  },
  card: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: 14
  },
  cardGap: { marginTop: 10 },
  cardBody: { fontSize: 14, color: colors.textMuted, lineHeight: 22 },
  exTitle: { fontSize: 15, fontFamily: fontFamily.semibold, color: colors.text, marginBottom: 4, lineHeight: 21 },
  exMeta: { fontSize: 12, color: colors.textMuted, marginBottom: 2 },
  confirmation: {
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    fontSize: 13,
    color: colors.text,
    lineHeight: 20,
    fontFamily: fontFamily.medium
  },
  pubCard: { marginBottom: 10 },
  pubCardPressable: { borderColor: colors.borderMed },
  pubSrc: {
    fontSize: 11,
    fontFamily: fontFamily.semibold,
    textTransform: "uppercase",
    letterSpacing: 0.6,
    marginBottom: 6
  },
  pubSrcKind: { color: colors.amberText },
  pubSrcResearch: { color: colors.blueText },
  pubTitle: { fontSize: 15, fontFamily: fontFamily.semibold, color: colors.text, lineHeight: 21, marginBottom: 6 },
  pubMeta: { fontSize: 12, color: colors.textMuted, lineHeight: 18 },
  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 10,
    gap: 8
  },
  linkHint: { fontSize: 12, color: colors.greenDark, fontFamily: fontFamily.medium },
  retryBtn: {
    marginTop: spacing.lg,
    borderWidth: 1.5,
    borderColor: colors.borderMed,
    borderRadius: 10,
    paddingVertical: spacing.lg,
    alignItems: "center"
  },
  retryTxt: { fontSize: 14, color: colors.greenDark, fontFamily: fontFamily.semibold }
});
