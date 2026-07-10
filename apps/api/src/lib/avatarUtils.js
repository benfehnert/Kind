/** Resolve the canonical avatar key from a DB row or API payload fragment. */
export function resolveAvatarKey(row = {}) {
  if (row.avatar_key) return row.avatar_key;
  if (row.avatarKey) return row.avatarKey;
  if (row.actor_avatar_key) return row.actor_avatar_key;
  if (row.sender_avatar_key) return row.sender_avatar_key;
  if (row.owner_avatar_key) return row.owner_avatar_key;

  const imageId =
    row.avatar_image_id ??
    row.avatarImageId ??
    row.img ??
    row.actor_img ??
    row.sender_img ??
    row.owner_img ??
    null;

  return imageId != null ? `pravatar-${imageId}` : null;
}

export function avatarKeyFromImageId(imageId) {
  return imageId != null ? `pravatar-${imageId}` : null;
}

/** Normalize avatar fields onto a row/object for API responses. */
export function enrichAvatarFields(row = {}) {
  const avatarKey = resolveAvatarKey(row);
  const avatarUrl = row.avatar_url ?? row.avatarUrl ?? null;
  const initials = row.initials ?? row.avatar_initials ?? row.avatarInitials ?? "?";

  const enriched = {
    ...row,
    avatarKey,
    avatarUrl: avatarKey === "photo" ? avatarUrl : null,
    initials
  };

  if (avatarKey?.startsWith("pravatar-")) {
    enriched.img = parseInt(avatarKey.replace("pravatar-", ""), 10);
  } else if (avatarKey?.startsWith("scene-")) {
    enriched.sceneKey = avatarKey.replace("scene-", "");
  } else if (row.img != null && !avatarKey) {
    enriched.img = row.img;
    enriched.avatarKey = `pravatar-${row.img}`;
  }

  return enriched;
}

/** Map avatar key + url to feed-item avatar fields. */
export function feedAvatarFields(row = {}) {
  const avatarKey = resolveAvatarKey(row);
  const avatarUrl =
    row.avatar_url ?? row.avatarUrl ?? row.actor_avatar_url ?? row.sender_avatar_url ?? null;
  const initials =
    row.actor_initials ?? row.sender_initials ?? row.initials ?? row.avatar_initials ?? "?";

  const hasImage = Boolean(
    avatarKey &&
      (avatarKey.startsWith("pravatar-") ||
        avatarKey.startsWith("scene-") ||
        (avatarKey === "photo" && avatarUrl))
  );

  const fields = {
    avatarKind: hasImage ? "image" : "initials",
    initials,
    avatarKey: avatarKey ?? undefined,
    avatarUrl: avatarKey === "photo" ? avatarUrl : undefined
  };

  if (avatarKey?.startsWith("scene-")) {
    fields.sceneKey = avatarKey.replace("scene-", "");
  }

  return fields;
}

const VALID_AVATAR_KEY =
  /^(pravatar-\d+|scene-[a-z0-9-]+|photo)$/;

export function normalizeAvatarUpdate({ avatarKey, avatarUrl, avatarImageId }) {
  if (avatarImageId !== undefined && avatarKey === undefined) {
    avatarKey = avatarImageId != null ? `pravatar-${avatarImageId}` : null;
  }

  if (avatarKey === undefined) {
    return {};
  }

  if (avatarKey != null && !VALID_AVATAR_KEY.test(avatarKey)) {
    throw new Error("Invalid avatarKey");
  }

  if (avatarKey === "photo") {
    if (!avatarUrl) throw new Error("avatarUrl required for photo avatars");
    return {
      avatarKey: "photo",
      avatarUrl,
      avatarImageId: null
    };
  }

  if (avatarKey == null) {
    return {
      avatarKey: null,
      avatarUrl: null,
      avatarImageId: null
    };
  }

  if (avatarKey.startsWith("pravatar-")) {
    const id = parseInt(avatarKey.replace("pravatar-", ""), 10);
    if (Number.isNaN(id)) throw new Error("Invalid pravatar id");
    return {
      avatarKey,
      avatarUrl: null,
      avatarImageId: id
    };
  }

  return {
    avatarKey,
    avatarUrl: null,
    avatarImageId: null
  };
}
