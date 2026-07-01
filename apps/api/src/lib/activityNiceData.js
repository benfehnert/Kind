import { query } from "../db.js";
import { fetchActivityMessageSummary } from "./activityMessageData.js";

const SUPPORTER_PREVIEW_LIMIT = 5;

export function formatActivityTime(postedAt) {
  if (!postedAt) return "Recently";
  const then = new Date(postedAt);
  const now = new Date();
  const diffMs = now - then;
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffHours < 1) return "Just now";
  if (diffHours < 24) return `${diffHours} hour${diffHours === 1 ? "" : "s"} ago`;
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays} days ago`;
  return then.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

async function fetchSupporterPreview(activityPostId, limit = SUPPORTER_PREVIEW_LIMIT) {
  const { rows } = await query(
    `SELECT i.slug, i.display_name AS name, i.avatar_image_id AS img, i.avatar_initials AS initials
     FROM activity_nices an
     JOIN individuals i ON i.id = an.individual_id
     WHERE an.activity_post_id = $1
     ORDER BY an.created_at DESC
     LIMIT $2`,
    [activityPostId, limit]
  );
  return rows;
}

async function fetchNiceCount(activityPostId) {
  const { rows } = await query(
    `SELECT COALESCE(anc.nice_count, ap.nice_count_base, 0)::int AS nice_count
     FROM activity_posts ap
     LEFT JOIN activity_nice_counts anc ON anc.id = ap.id
     WHERE ap.id = $1`,
    [activityPostId]
  );
  return rows[0]?.nice_count ?? 0;
}

async function viewerHasNiced(activityPostId, viewerId) {
  if (!viewerId) return false;
  const { rows } = await query(
    `SELECT 1 FROM activity_nices
     WHERE activity_post_id = $1 AND individual_id = $2`,
    [activityPostId, viewerId]
  );
  return rows.length > 0;
}

export async function buildActsForIndividual(individualId, viewerId) {
  const { rows: posts } = await query(
    `SELECT ap.id, ap.summary, ap.detail_metrics, ap.exploration_label, ap.posted_at, ap.sort_order,
            COALESCE(anc.nice_count, ap.nice_count_base, 0)::int AS nice_count
     FROM activity_posts ap
     LEFT JOIN activity_nice_counts anc ON anc.id = ap.id
     WHERE ap.individual_id = $1
     ORDER BY ap.sort_order`,
    [individualId]
  );

  return Promise.all(
    posts.map(async (post) => {
      const [supporterPreview, niced, messageSummary] = await Promise.all([
        fetchSupporterPreview(post.id),
        viewerHasNiced(post.id, viewerId),
        fetchActivityMessageSummary(post.id)
      ]);
      return {
        id: post.id,
        t: post.summary,
        time: formatActivityTime(post.posted_at),
        exp: post.exploration_label,
        detail: post.detail_metrics,
        nc: Number(post.nice_count),
        viewerNiced: niced,
        supporterPreview,
        mc: messageSummary.mc,
        messagePreview: messageSummary.messagePreview
      };
    })
  );
}

export async function toggleActivityNice(activityPostId, viewerId) {
  const alreadyNiced = await viewerHasNiced(activityPostId, viewerId);

  if (alreadyNiced) {
    await query(
      `DELETE FROM activity_nices
       WHERE activity_post_id = $1 AND individual_id = $2`,
      [activityPostId, viewerId]
    );
  } else {
    await query(
      `INSERT INTO activity_nices (individual_id, activity_post_id)
       VALUES ($1, $2) ON CONFLICT DO NOTHING`,
      [viewerId, activityPostId]
    );
  }

  const [nc, supporterPreview] = await Promise.all([
    fetchNiceCount(activityPostId),
    fetchSupporterPreview(activityPostId)
  ]);

  return {
    viewerNiced: !alreadyNiced,
    nc,
    supporterPreview
  };
}

export async function fetchActivityNiceSupporters(activityPostId, viewerId) {
  const { rows } = await query(
    `SELECT
       i.slug,
       i.display_name AS name,
       i.location AS loc,
       i.avatar_image_id AS img,
       i.avatar_initials AS initials,
       i.profile_meta AS meta,
       EXISTS(
         SELECT 1 FROM individual_follows f
         WHERE f.follower_id = $2 AND f.followee_id = i.id
       ) AS "viewerFollows"
     FROM activity_nices an
     JOIN individuals i ON i.id = an.individual_id
     WHERE an.activity_post_id = $1
     ORDER BY an.created_at DESC`,
    [activityPostId, viewerId]
  );

  const following = [];
  const others = [];

  for (const row of rows) {
    const entry = {
      slug: row.slug,
      name: row.name,
      loc: row.loc,
      img: row.img,
      initials: row.initials,
      meta: row.meta
    };
    if (row.viewerFollows) following.push(entry);
    else others.push(entry);
  }

  return {
    count: rows.length,
    following,
    others
  };
}
