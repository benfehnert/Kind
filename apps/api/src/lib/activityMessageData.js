import { query } from "../db.js";
import { formatActivityTime } from "./activityNiceData.js";

const PREVIEW_LIMIT = 5;
export const MESSAGE_REACTION_TYPES = ["heart", "clap"];

function emptyReactions() {
  return {
    heart: { count: 0, viewerReacted: false },
    clap: { count: 0, viewerReacted: false }
  };
}

async function fetchReactionsForMessages(messageIds, viewerId) {
  const map = new Map();
  for (const id of messageIds) map.set(id, emptyReactions());
  if (!messageIds.length) return map;

  const { rows } = await query(
    `SELECT activity_message_id, reaction_type, COUNT(*)::int AS count,
            BOOL_OR(individual_id = $2) AS viewer_reacted
     FROM activity_message_reactions
     WHERE activity_message_id = ANY($1::uuid[])
     GROUP BY activity_message_id, reaction_type`,
    [messageIds, viewerId]
  );

  for (const row of rows) {
    if (!MESSAGE_REACTION_TYPES.includes(row.reaction_type)) continue;
    const entry = map.get(row.activity_message_id);
    if (!entry) continue;
    entry[row.reaction_type] = {
      count: row.count,
      viewerReacted: row.viewer_reacted
    };
  }

  return map;
}

async function fetchReactionsForMessage(messageId, viewerId) {
  const map = await fetchReactionsForMessages([messageId], viewerId);
  return map.get(messageId) ?? emptyReactions();
}

async function fetchMessageCount(activityPostId) {
  const { rows } = await query(
    `SELECT COUNT(*)::int AS count FROM activity_messages WHERE activity_post_id = $1`,
    [activityPostId]
  );
  return rows[0]?.count ?? 0;
}

async function fetchMessagePreview(activityPostId, limit = PREVIEW_LIMIT) {
  const { rows } = await query(
    `SELECT i.slug, i.display_name AS name, i.avatar_image_id AS img, i.avatar_initials AS initials
     FROM (
       SELECT DISTINCT ON (sender_id) sender_id, sent_at
       FROM activity_messages
       WHERE activity_post_id = $1
       ORDER BY sender_id, sent_at DESC
     ) latest
     JOIN individuals i ON i.id = latest.sender_id
     ORDER BY latest.sent_at DESC
     LIMIT $2`,
    [activityPostId, limit]
  );
  return rows;
}

export async function fetchActivityMessageSummary(activityPostId) {
  const [mc, messagePreview] = await Promise.all([
    fetchMessageCount(activityPostId),
    fetchMessagePreview(activityPostId)
  ]);
  return { mc, messagePreview };
}

function mapMessageRow(row) {
  return {
    id: row.id,
    body: row.body,
    time: formatActivityTime(row.sent_at),
    sentAt: row.sent_at,
    parentMessageId: row.parent_message_id,
    sender: {
      slug: row.senderSlug,
      name: row.senderName,
      img: row.senderImg,
      initials: row.senderInitials
    }
  };
}

export async function fetchActivityMessages(activityPostId, viewerId) {
  const { rows } = await query(
    `SELECT am.id, am.body, am.sent_at, am.parent_message_id,
            i.slug AS "senderSlug", i.display_name AS "senderName",
            i.avatar_image_id AS "senderImg", i.avatar_initials AS "senderInitials"
     FROM activity_messages am
     JOIN individuals i ON i.id = am.sender_id
     WHERE am.activity_post_id = $1
     ORDER BY am.sent_at ASC`,
    [activityPostId]
  );

  const reactionMap = await fetchReactionsForMessages(
    rows.map((row) => row.id),
    viewerId
  );

  return rows.map((row) => ({
    ...mapMessageRow(row),
    reactions: reactionMap.get(row.id) ?? emptyReactions()
  }));
}

export async function createActivityMessage(activityPostId, senderId, { body, parentMessageId }) {
  const trimmed = String(body || "").trim();
  if (!trimmed) {
    const err = new Error("Message body required");
    err.status = 400;
    throw err;
  }

  if (parentMessageId) {
    const { rows } = await query(
      `SELECT id FROM activity_messages
       WHERE id = $1 AND activity_post_id = $2`,
      [parentMessageId, activityPostId]
    );
    if (!rows.length) {
      const err = new Error("Parent message not found");
      err.status = 404;
      throw err;
    }
  }

  const { rows: inserted } = await query(
    `INSERT INTO activity_messages (sender_id, activity_post_id, body, parent_message_id)
     VALUES ($1, $2, $3, $4)
     RETURNING id`,
    [senderId, activityPostId, trimmed, parentMessageId || null]
  );

  const [messages, summary] = await Promise.all([
    fetchActivityMessages(activityPostId, senderId),
    fetchActivityMessageSummary(activityPostId)
  ]);

  return {
    ...summary,
    messages,
    message: messages.find((m) => m.id === inserted[0].id) ?? null
  };
}

export async function toggleActivityMessageReaction(
  activityPostId,
  messageId,
  viewerId,
  reactionType
) {
  if (!MESSAGE_REACTION_TYPES.includes(reactionType)) {
    const err = new Error("Invalid reaction type");
    err.status = 400;
    throw err;
  }

  const { rows } = await query(
    `SELECT am.id, am.sender_id
     FROM activity_messages am
     WHERE am.id = $1 AND am.activity_post_id = $2`,
    [messageId, activityPostId]
  );

  if (!rows.length) {
    const err = new Error("Message not found");
    err.status = 404;
    throw err;
  }

  if (rows[0].sender_id === viewerId) {
    const err = new Error("Cannot react to your own message");
    err.status = 400;
    throw err;
  }

  const { rows: existing } = await query(
    `SELECT 1 FROM activity_message_reactions
     WHERE activity_message_id = $1 AND individual_id = $2 AND reaction_type = $3`,
    [messageId, viewerId, reactionType]
  );

  if (existing.length) {
    await query(
      `DELETE FROM activity_message_reactions
       WHERE activity_message_id = $1 AND individual_id = $2 AND reaction_type = $3`,
      [messageId, viewerId, reactionType]
    );
  } else {
    await query(
      `INSERT INTO activity_message_reactions (individual_id, activity_message_id, reaction_type)
       VALUES ($1, $2, $3) ON CONFLICT DO NOTHING`,
      [viewerId, messageId, reactionType]
    );
  }

  return fetchReactionsForMessage(messageId, viewerId);
}
