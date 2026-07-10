/** Map API avatar fields to Avatar component props. */
export function avatarPropsFromFields({ avatarKey, avatarUrl, img, sceneKey, initials } = {}) {
  const key = avatarKey ?? (img != null ? `pravatar-${img}` : null);

  if (key?.startsWith("scene-")) {
    return { sceneKey: key.replace(/^scene-/, ""), initials };
  }
  if (key === "photo" && avatarUrl) {
    return { photoUrl: avatarUrl, initials };
  }
  if (key?.startsWith("pravatar-")) {
    return { img: parseInt(key.replace("pravatar-", ""), 10), initials };
  }
  if (sceneKey) {
    return { sceneKey, initials };
  }
  if (img != null) {
    return { img, initials };
  }
  return { initials };
}

/** Map a person/feed item object (mixed API shapes) to Avatar props. */
export function avatarPropsFromPerson(person = {}) {
  return avatarPropsFromFields({
    avatarKey: person.avatarKey,
    avatarUrl: person.avatarUrl,
    img: person.img,
    sceneKey: person.sceneKey,
    initials: person.initials
  });
}

/** Map a home feed item to Avatar props. */
export function avatarPropsFromFeedItem(item = {}) {
  return avatarPropsFromFields({
    avatarKey: item.avatarKey,
    avatarUrl: item.avatarUrl,
    sceneKey: item.sceneKey,
    initials: item.initials
  });
}
