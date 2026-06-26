// Static mapping of scene keys to Unsplash photo URLs.
// Mirrors community.json sceneAvatars — kept here as a client-side constant
// so Avatar.js doesn't need to import community data.
/** Preset scene avatars offered in profile image picker (~10). */
export const PRESET_SCENE_KEYS = [
  "pet",
  "cat",
  "landscape",
  "mountains",
  "plants",
  "coffee",
  "books",
  "sunset",
  "ocean",
  "flowers"
];

export const SCENE_AVATARS = {
  pet: "https://images.unsplash.com/photo-1583511655857-d19b40a7a2f8",
  cat: "https://images.unsplash.com/photo-1518791841217-8f162f1e1131",
  landscape: "https://images.unsplash.com/photo-1506905925346-21bda4d32df4",
  mountains: "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b",
  plants: "https://images.unsplash.com/photo-1466781783364-36956622366b",
  coffee: "https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd",
  bike: "https://images.unsplash.com/photo-1485965120180-e99229430dde",
  books: "https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8",
  sunset: "https://images.unsplash.com/photo-1475274041417-6a1c094d82ad",
  ocean: "https://images.unsplash.com/photo-1505142468615-359e7d316be0",
  flowers: "https://images.unsplash.com/photo-1490750967868-88aa2986faa8",
  desk: "https://images.unsplash.com/photo-1518455027359-f3f8164ba6bd",
  trail: "https://images.unsplash.com/photo-1441974231531-c6227db76b6e",
};

/** Map an Unsplash avatar URL → scene key, or null if not found. */
export function getSceneKeyFromAvatarUrl(url) {
  if (!url) return null;
  const base = url.split("?")[0];
  for (const [key, u] of Object.entries(SCENE_AVATARS)) {
    if (u === base) return key;
  }
  return null;
}
