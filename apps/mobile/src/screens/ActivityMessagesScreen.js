import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
import { useNavigation, useRoute } from "@react-navigation/native";
import { usePostHog } from "posthog-react-native";
import { get, patch, post } from "../lib/api";
import { useData } from "../context/DataContext";
import { colors, fontFamily, radius, spacing } from "../theme/colors";
import { text } from "../theme/textStyles";
import { type } from "../theme/typography";
import { Avatar } from "../components/primitives/Avatar";
import { MessageReactions } from "../components/activity/MessageReactions";

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

export default function ActivityMessagesScreen() {
  const posthog = usePostHog();
  const navigation = useNavigation();
  const { params } = useRoute();
  const { profile } = useData();
  const activityPostId = params?.activityPostId;
  const activitySummary = params?.activitySummary;
  const ownerName = params?.ownerName;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [messages, setMessages] = useState([]);
  const [mc, setMc] = useState(0);
  const [draft, setDraft] = useState("");
  const [replyTo, setReplyTo] = useState(null);
  const [sending, setSending] = useState(false);
  const [togglingReaction, setTogglingReaction] = useState(null);
  const listRef = useRef(null);

  const viewerSlug = profile?.viewerSlug;

  const load = useCallback(async () => {
    if (!activityPostId) return;
    setLoading(true);
    setError(null);
    try {
      const result = await get(`/activity-posts/${activityPostId}/messages`);
      setMessages(result.messages || []);
      setMc(result.mc ?? result.messages?.length ?? 0);
    } catch (err) {
      setError(err.message || "Could not load messages.");
    } finally {
      setLoading(false);
    }
  }, [activityPostId]);

  useEffect(() => {
    load();
  }, [load]);

  const messageById = useMemo(() => {
    const map = new Map();
    for (const msg of messages) map.set(msg.id, msg);
    return map;
  }, [messages]);

  const sendMessage = useCallback(async () => {
    const trimmed = draft.trim();
    if (!trimmed || !activityPostId || sending) return;

    setSending(true);
    try {
      const result = await post(`/activity-posts/${activityPostId}/messages`, {
        body: trimmed,
        parentMessageId: replyTo?.id ?? undefined
      });
      setMessages(result.messages || []);
      setMc(result.mc ?? result.messages?.length ?? 0);
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
        setMessages((prev) =>
          prev.map((row) =>
            row.id === message.id ? { ...row, reactions: result.reactions } : row
          )
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

  const headerLabel = mc === 1 ? "1 message" : `${mc} messages`;

  return (
    <SafeAreaView style={styles.safe} edges={["top", "left", "right"]}>
      <View style={styles.top}>
        <Pressable onPress={() => navigation.goBack()} hitSlop={12}>
          <Text style={styles.back}>‹ Back</Text>
        </Pressable>
        <Text style={styles.hdr}>{headerLabel}</Text>
      </View>

      {activitySummary ? (
        <View style={styles.activitySnippet}>
          {ownerName ? <Text style={styles.activityOwner}>{ownerName}</Text> : null}
          <Text style={styles.activityText} numberOfLines={2}>
            {activitySummary}
          </Text>
        </View>
      ) : null}

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={Platform.OS === "ios" ? 8 : 0}
      >
        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color={colors.greenDark} />
          </View>
        ) : error && !messages.length ? (
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
            onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: false })}
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
  activitySnippet: {
    backgroundColor: colors.greenLight,
    paddingHorizontal: spacing.screen,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border
  },
  activityOwner: { ...type.captionStrong, color: colors.greenDark, marginBottom: 2 },
  activityText: { ...text.body, color: colors.greenDark },
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24 },
  error: { color: colors.textMuted, textAlign: "center", marginBottom: 12 },
  retry: { color: colors.greenDark, fontWeight: "600" },
  listContent: { padding: spacing.screen, paddingBottom: spacing.lg, flexGrow: 1 },
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
