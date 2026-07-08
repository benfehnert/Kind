import React, { useCallback, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation, useRoute, useFocusEffect } from "@react-navigation/native";
import { usePostHog } from "posthog-react-native";
import { get, patch, post } from "../lib/api";
import { useData } from "../context/DataContext";
import { colors, fontFamily, radius, spacing } from "../theme/colors";
import { text } from "../theme/textStyles";
import { type } from "../theme/typography";
import { Avatar } from "../components/primitives/Avatar";
import { MessageReactions } from "../components/activity/MessageReactions";
import { ActivityNiceBlock } from "../components/activity/ActivityNiceBlock";
import { RichTextParts } from "../utils/RichText";

function MessageRow({ item, parentName, onReply, onPressProfile, isSelf, onToggleReaction, togglingReaction }) {
  const showReactions = !isSelf(item.sender.slug);

  return (
    <View style={[styles.messageRow, item.parentMessageId && styles.replyRow]}>
      <Pressable onPress={() => onPressProfile(item.sender.slug)}>
        <Avatar size={36} img={item.sender.img} initials={item.sender.initials} />
      </Pressable>
      <View style={styles.messageBody}>
        <View style={styles.messageHead}>
          <Pressable onPress={() => onPressProfile(item.sender.slug)}>
            <Text style={styles.senderName}>{item.sender.name}</Text>
          </Pressable>
          <Text style={styles.messageTime}>{item.time}</Text>
        </View>
        {parentName ? (
          <Text style={styles.replyingTo}>Replying to {parentName}</Text>
        ) : null}
        <Text style={styles.messageText}>{item.body}</Text>
        <View style={styles.messageActions}>
          {!isSelf(item.sender.slug) ? (
            <Pressable style={styles.replyBtn} onPress={() => onReply(item)}>
              <Text style={styles.replyBtnTxt}>Reply</Text>
            </Pressable>
          ) : null}
          {showReactions ? (
            <MessageReactions
              reactions={item.reactions}
              onToggle={(type) => onToggleReaction(item, type)}
              disabled={!!togglingReaction}
              togglingType={togglingReaction?.messageId === item.id ? togglingReaction.type : null}
            />
          ) : null}
        </View>
      </View>
    </View>
  );
}

export default function ActivityDetailScreen() {
  const posthog = usePostHog();
  const navigation = useNavigation();
  const { params } = useRoute();
  const { profile } = useData();
  const activityPostId = params?.activityPostId;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [detail, setDetail] = useState(null);
  const [draft, setDraft] = useState("");
  const [replyTo, setReplyTo] = useState(null);
  const [sending, setSending] = useState(false);
  const [togglingReaction, setTogglingReaction] = useState(null);
  const [togglingNice, setTogglingNice] = useState(false);
  const listRef = useRef(null);

  const viewerSlug = profile?.viewerSlug;

  const load = useCallback(async () => {
    if (!activityPostId) return;
    setError(null);
    try {
      const result = await get(`/activity-posts/${activityPostId}`);
      setDetail(result);
    } catch (err) {
      setError(err.message || "Could not load this activity.");
    } finally {
      setLoading(false);
    }
  }, [activityPostId]);

  // Refetch every time this screen gains focus so nices/messages left by
  // other people while we were away show up as soon as we look again.
  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const messages = detail?.messages || [];
  const messageById = useMemo(() => {
    const map = new Map();
    for (const msg of messages) map.set(msg.id, msg);
    return map;
  }, [messages]);

  const toggleNice = useCallback(async () => {
    if (!activityPostId || !detail || togglingNice) return;
    const previous = { nc: detail.nc || 0, viewerNiced: !!detail.viewerNiced };
    const optimisticNiced = !previous.viewerNiced;

    // Flip the icon/color instantly, then reconcile with the server response.
    setDetail((prev) =>
      prev
        ? {
            ...prev,
            nc: Math.max(0, previous.nc + (optimisticNiced ? 1 : -1)),
            viewerNiced: optimisticNiced
          }
        : prev
    );
    setTogglingNice(true);
    try {
      const result = await patch(`/activity-posts/${activityPostId}/nice`, {});
      setDetail((prev) =>
        prev
          ? {
              ...prev,
              nc: result.nc,
              viewerNiced: result.viewerNiced,
              supporterPreview: result.supporterPreview || []
            }
          : prev
      );
    } catch (err) {
      console.error("[ActivityDetail] toggle nice failed:", err);
      setDetail((prev) => (prev ? { ...prev, ...previous } : prev));
    } finally {
      setTogglingNice(false);
    }
  }, [activityPostId, detail, togglingNice]);

  const openSupporters = useCallback(() => {
    if (!activityPostId || !(detail?.nc > 0)) return;
    navigation.navigate("NiceSupporters", { activityPostId });
  }, [navigation, activityPostId, detail?.nc]);

  const sendMessage = useCallback(async () => {
    const trimmed = draft.trim();
    if (!trimmed || !activityPostId || sending) return;

    setSending(true);
    try {
      const result = await post(`/activity-posts/${activityPostId}/messages`, {
        body: trimmed,
        parentMessageId: replyTo?.id ?? undefined
      });
      setDetail((prev) =>
        prev
          ? {
              ...prev,
              messages: result.messages || [],
              mc: result.mc ?? result.messages?.length ?? 0
            }
          : prev
      );
      setDraft("");
      setReplyTo(null);
      posthog?.capture("interacted with a community post");
      setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100);
    } catch (err) {
      setError(err.message || "Could not send message.");
    } finally {
      setSending(false);
    }
  }, [activityPostId, draft, posthog, replyTo, sending]);

  const toggleReaction = useCallback(
    async (message, reactionType) => {
      if (!activityPostId || !message?.id || togglingReaction) return;

      setTogglingReaction({ messageId: message.id, type: reactionType });
      try {
        const result = await patch(
          `/activity-posts/${activityPostId}/messages/${message.id}/reactions`,
          { reactionType }
        );
        setDetail((prev) =>
          prev
            ? {
                ...prev,
                messages: prev.messages.map((row) =>
                  row.id === message.id ? { ...row, reactions: result.reactions } : row
                )
              }
            : prev
        );
        const viewerReacted = result.reactions?.[reactionType]?.viewerReacted;
        if (viewerReacted) posthog?.capture("interacted with a community post");
      } catch (err) {
        setError(err.message || "Could not update reaction.");
      } finally {
        setTogglingReaction(null);
      }
    },
    [activityPostId, posthog, togglingReaction]
  );

  const mc = detail?.mc ?? messages.length;
  const messageHeaderLabel = mc === 1 ? "1 message" : `${mc} messages`;

  return (
    <SafeAreaView style={styles.safe} edges={["top", "left", "right"]}>
      <View style={styles.top}>
        <Pressable onPress={() => navigation.goBack()} hitSlop={12}>
          <Text style={styles.back}>‹ Back</Text>
        </Pressable>
        <Text style={styles.hdr} numberOfLines={1}>
          {detail?.owner?.name ? `${detail.owner.name}'s activity` : "Activity"}
        </Text>
      </View>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={Platform.OS === "ios" ? 8 : 0}
      >
        {loading && !detail ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color={colors.greenDark} />
          </View>
        ) : error && !detail ? (
          <View style={styles.center}>
            <Text style={styles.error}>{error}</Text>
            <Pressable onPress={load}>
              <Text style={styles.retry}>Try again</Text>
            </Pressable>
          </View>
        ) : (
          <FlatList
            ref={listRef}
            data={messages}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContent}
            ListHeaderComponent={
              <View style={styles.activityCard}>
                {detail?.exp ? <Text style={styles.actPill}>{detail.exp}</Text> : null}
                <Text style={styles.actText}>{detail?.t}</Text>
                {detail?.detail ? (
                  <View style={styles.actDetail}>
                    <RichTextParts
                      html={detail.detail}
                      style={styles.actDetailText}
                      strongStyle={{ color: colors.greenDark, ...type.captionStrong }}
                    />
                  </View>
                ) : null}
                <View style={styles.actFoot}>
                  <Text style={styles.actTime}>{detail?.time}</Text>
                  <ActivityNiceBlock
                    count={detail?.nc || 0}
                    viewerNiced={!!detail?.viewerNiced}
                    supporterPreview={detail?.supporterPreview || []}
                    onToggleNice={toggleNice}
                    onOpenSupporters={openSupporters}
                    disabled={togglingNice}
                  />
                </View>
                <Text style={styles.msgSectionLabel}>{messageHeaderLabel}</Text>
              </View>
            }
            ListEmptyComponent={
              <Text style={styles.empty}>Be the first to leave an encouraging message.</Text>
            }
            renderItem={({ item }) => (
              <MessageRow
                item={item}
                parentName={
                  item.parentMessageId
                    ? messageById.get(item.parentMessageId)?.sender?.name
                    : null
                }
                onReply={setReplyTo}
                onPressProfile={(slug) => navigation.navigate("ExplorerProfile", { userId: slug })}
                isSelf={(slug) => slug === viewerSlug}
                onToggleReaction={toggleReaction}
                togglingReaction={togglingReaction}
              />
            )}
          />
        )}

        <View style={styles.composerWrap}>
          {replyTo ? (
            <View style={styles.replyBanner}>
              <Text style={styles.replyBannerTxt} numberOfLines={1}>
                Replying to {replyTo.sender.name}
              </Text>
              <Pressable onPress={() => setReplyTo(null)} hitSlop={8}>
                <Text style={styles.replyCancel}>Cancel</Text>
              </Pressable>
            </View>
          ) : null}
          <View style={styles.composerRow}>
            <TextInput
              style={styles.composerInput}
              placeholder={
                replyTo
                  ? `Reply to ${replyTo.sender.name}...`
                  : "Write an encouraging message..."
              }
              placeholderTextColor={colors.textMuted}
              multiline
              value={draft}
              onChangeText={setDraft}
              editable={!sending}
            />
            <Pressable
              style={[styles.sendBtn, (!draft.trim() || sending) && styles.sendBtnDisabled]}
              onPress={sendMessage}
              disabled={!draft.trim() || sending}
            >
              <Text style={styles.sendBtnTxt}>{sending ? "…" : "Send"}</Text>
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  flex: { flex: 1 },
  top: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.surface
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
  listContent: { padding: spacing.screen, paddingBottom: spacing.lg, flexGrow: 1 },
  activityCard: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    paddingVertical: spacing.cardY,
    paddingHorizontal: spacing.cardX,
    marginBottom: spacing.xl,
    backgroundColor: colors.surface
  },
  actPill: {
    ...type.captionStrong,
    color: colors.greenDark,
    backgroundColor: colors.greenLight,
    alignSelf: "flex-start",
    borderRadius: radius.pill,
    paddingHorizontal: 8,
    paddingVertical: 2,
    marginBottom: spacing.sm
  },
  actText: { ...text.body },
  actDetail: {
    backgroundColor: colors.greenLight,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    marginTop: spacing.sm
  },
  actDetailText: { ...text.exploreDesc, color: colors.greenDark },
  actFoot: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: spacing.lg
  },
  actTime: { ...text.caption },
  msgSectionLabel: {
    ...text.uppercaseLabel,
    marginTop: spacing.xl,
    paddingTop: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.border
  },
  empty: { color: colors.textMuted, textAlign: "center", marginTop: 24 },
  messageRow: {
    flexDirection: "row",
    gap: spacing.md,
    marginBottom: spacing.lg
  },
  replyRow: {
    marginLeft: spacing.xl,
    paddingLeft: spacing.md,
    borderLeftWidth: 2,
    borderLeftColor: colors.border
  },
  messageBody: { flex: 1 },
  messageHead: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginBottom: 2
  },
  senderName: { ...type.feedName, color: colors.text },
  messageTime: { ...text.caption },
  replyingTo: { ...text.caption, color: colors.greenDark, marginBottom: 4 },
  messageText: { ...text.body },
  messageActions: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: spacing.md,
    marginTop: spacing.sm
  },
  replyBtn: { alignSelf: "flex-start" },
  replyBtnTxt: { ...type.captionStrong, color: colors.greenDark },
  composerWrap: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.screen,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md
  },
  replyBanner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing.sm,
    gap: spacing.md
  },
  replyBannerTxt: { ...text.caption, flex: 1, color: colors.textMuted },
  replyCancel: { ...type.captionStrong, color: colors.greenDark },
  composerRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: spacing.sm
  },
  composerInput: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: colors.borderMed,
    borderRadius: radius.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    minHeight: 44,
    maxHeight: 120,
    textAlignVertical: "top",
    ...text.body,
    color: colors.text,
    backgroundColor: colors.bg
  },
  sendBtn: {
    backgroundColor: colors.greenDark,
    borderRadius: radius.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: 10
  },
  sendBtnDisabled: { opacity: 0.45 },
  sendBtnTxt: { ...type.chip, color: "#fff" }
});
