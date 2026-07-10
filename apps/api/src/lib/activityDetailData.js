import { query } from "../db.js";
import { formatActivityTime } from "./activityNiceData.js";
import { fetchActivityMessages, fetchActivityMessageSummary } from "./activityMessageData.js";
import { buildCommunityVisibilityFilters } from "./communityVisibility.js";
import { enrichAvatarFields } from "./avatarUtils.js";

const SUPPORTER_PREVIEW_LIMIT = 5;

async function fetchSupporterPreview(activityPostId, shouldHideSlug, limit = SUPPORTER_PREVIEW_LIMIT) {
  const { rows } = await query(
    `SELECT i.slug, i.display_name AS name, i.avatar_image_id AS img, i.avatar_initials AS initials,
            i.avatar_key, i.avatar_url
     FROM activity_nices an
     JOIN individuals i ON i.id = an.individual_id
     WHERE an.activity_post_id = $1
     ORDER BY an.created_at DESC
     LIMIT $2`,
    [activityPostId, limit]
  );
  return rows.filter((row) => !shouldHideSlug(row.slug)).map(enrichAvatarFields);
}

/**
 * Combined activity detail — everything an Activity Detail screen needs
 * (post content, nices, and the full message thread) in a single call so
 * the screen can be opened from anywhere with just an activityPostId
 * (a profile card, or a feed deep-link).
 */
export async function fetchActivityPostDetail(activityPostId, viewerId) {
  const { shouldHideSlug } = await buildCommunityVisibilityFilters(viewerId);

  const { rows } = await query(
    `SELECT ap.id, ap.exploration_id, ap.summary, ap.detail_metrics, ap.exploration_label, ap.posted_at,
            COALESCE(anc.nice_count, ap.nice_count_base, 0)::int AS nice_count,
            i.slug AS owner_slug, i.display_name AS owner_name,
            i.avatar_image_id AS owner_img, i.avatar_initials AS owner_initials,
            i.avatar_key AS owner_avatar_key, i.avatar_url AS owner_avatar_url
     FROM activity_posts ap
     JOIN individuals i ON i.id = ap.individual_id
     LEFT JOIN activity_nice_counts anc ON anc.activity_post_id = ap.id
     WHERE ap.id = $1`,
    [activityPostId]
  );
  if (!rows.length) return null;
  const post = rows[0];
  if (shouldHideSlug(post.owner_slug)) return null;

  const [supporterPreview, nicedRows, messages, messageSummary] = await Promise.all([
    fetchSupporterPreview(post.id, shouldHideSlug),
    query(
      `SELECT 1 FROM activity_nices WHERE activity_post_id = $1 AND individual_id = $2`,
      [post.id, viewerId]
    ),
    fetchActivityMessages(post.id, viewerId),
    fetchActivityMessageSummary(post.id)
  ]);

  return {
    id: post.id,
    t: post.summary,
    detail: post.detail_metrics,
    exp: post.exploration_label,
    explorationId: post.exploration_id,
    time: formatActivityTime(post.posted_at),
    nc: Number(post.nice_count),
    viewerNiced: nicedRows.rows.length > 0,
    supporterPreview,
    mc: messageSummary.mc,
    messagePreview: messageSummary.messagePreview,
    messages,
    owner: enrichAvatarFields({
      slug: post.owner_slug,
      name: post.owner_name,
      img: post.owner_img,
      initials: post.owner_initials,
      avatar_key: post.owner_avatar_key,
      avatar_url: post.owner_avatar_url
    })
  };
}
