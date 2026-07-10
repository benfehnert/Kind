import { query } from "../db.js";
import { fetchActivityMessageSummary } from "./activityMessageData.js";
import { buildCommunityVisibilityFilters } from "./communityVisibility.js";
import { enrichAvatarFields } from "./avatarUtils.js";

const SUPPORTER_PREVIEW_LIMIT = 5;
const RECENT_ACTIVITY_LIMIT = 6;
const RECENT_ACTIVITY_FETCH_LIMIT = 20;

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

async function fetchNiceCount(activityPostId) {
  const { rows } = await query(
    `SELECT COALESCE(anc.nice_count, ap.nice_count_base, 0)::int AS nice_count
     FROM activity_posts ap
     LEFT JOIN activity_nice_counts anc ON anc.activity_post_id = ap.id
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

async function mapLogAct(post, viewerId, shouldHideSlug) {
  const [supporterPreview, niced, messageSummary] = await Promise.all([
    fetchSupporterPreview(post.id, shouldHideSlug),
    viewerHasNiced(post.id, viewerId),
    fetchActivityMessageSummary(post.id)
  ]);
  return {
    id: post.id,
    kind: "log",
    explorationId: post.exploration_id,
    t: post.summary,
    time: formatActivityTime(post.posted_at),
    exp: post.exploration_label,
    detail: post.detail_metrics,
    nc: Number(post.nice_count),
    viewerNiced: niced,
    supporterPreview,
    mc: messageSummary.mc,
    messagePreview: messageSummary.messagePreview,
    _sortAt: new Date(post.posted_at).getTime()
  };
}

export async function buildActsForIndividual(individualId, viewerId) {
  const { shouldHideSlug } = await buildCommunityVisibilityFilters(viewerId);
  const [{ rows: posts }, { rows: reports }] = await Promise.all([
    query(
      `SELECT ap.id, ap.summary, ap.detail_metrics, ap.exploration_id, ap.exploration_label, ap.posted_at,
              COALESCE(anc.nice_count, ap.nice_count_base, 0)::int AS nice_count
       FROM activity_posts ap
       LEFT JOIN activity_nice_counts anc ON anc.activity_post_id = ap.id
       WHERE ap.individual_id = $1
       ORDER BY ap.posted_at DESC
       LIMIT $2`,
      [individualId, RECENT_ACTIVITY_FETCH_LIMIT]
    ),
    query(
      `SELECT uer.exploration_id, uer.generated_at, e.title
       FROM user_exploration_reports uer
       JOIN explorations e ON e.id = uer.exploration_id
       WHERE uer.individual_id = $1
       ORDER BY uer.generated_at DESC
       LIMIT $2`,
      [individualId, RECENT_ACTIVITY_FETCH_LIMIT]
    )
  ]);

  const logActs = await Promise.all(posts.map((post) => mapLogAct(post, viewerId, shouldHideSlug)));

  const reportActs = reports.map((row) => {
    const title = row.title || row.exploration_id;
    return {
      id: `report-${row.exploration_id}`,
      kind: "report",
      explorationId: row.exploration_id,
      t: `Completed the final report for ${title}.`,
      time: formatActivityTime(row.generated_at),
      exp: title,
      nc: 0,
      viewerNiced: false,
      supporterPreview: [],
      mc: 0,
      messagePreview: [],
      _sortAt: new Date(row.generated_at).getTime()
    };
  });

  return [...logActs, ...reportActs]
    .sort((a, b) => (b._sortAt ?? 0) - (a._sortAt ?? 0))
    .slice(0, RECENT_ACTIVITY_LIMIT)
    .map(({ _sortAt, ...act }) => act);
}

export async function toggleActivityNice(activityPostId, viewerId) {
  const { ctx, shouldHideSlug } = await buildCommunityVisibilityFilters(viewerId);
  const { rows: ownerRows } = await query(
    `SELECT individual_id FROM activity_posts WHERE id = $1`,
    [activityPostId]
  );
  if (!ownerRows.length) {
    const err = new Error("Activity not found");
    err.status = 404;
    throw err;
  }
  if (ownerRows[0].individual_id === viewerId) {
    const err = new Error("You cannot nice your own activity");
    err.status = 403;
    throw err;
  }
  if (!ctx.canViewIndividuals) {
    const err = new Error("Community visibility required to interact with other individuals");
    err.status = 403;
    throw err;
  }

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
    fetchSupporterPreview(activityPostId, shouldHideSlug)
  ]);

  return {
    viewerNiced: !alreadyNiced,
    nc,
    supporterPreview
  };
}

export async function fetchActivityNiceSupporters(activityPostId, viewerId) {
  const { shouldHideSlug } = await buildCommunityVisibilityFilters(viewerId);
  const { rows } = await query(
    `SELECT
       i.slug,
       i.display_name AS name,
       i.location AS loc,
       i.avatar_image_id AS img,
       i.avatar_key,
       i.avatar_url,
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
    if (shouldHideSlug(row.slug)) continue;
    const entry = enrichAvatarFields({
      slug: row.slug,
      name: row.name,
      loc: row.loc,
      img: row.img,
      initials: row.initials,
      meta: row.meta,
      avatar_key: row.avatar_key,
      avatar_url: row.avatar_url
    });
    if (row.viewerFollows) following.push(entry);
    else others.push(entry);
  }

  const visibleCount = following.length + others.length;

  return {
    count: visibleCount,
    following,
    others
  };
}
