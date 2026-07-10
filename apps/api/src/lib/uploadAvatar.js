import { makeAdminClient } from "../supabase.js";

export async function uploadProfileAvatar(env, individualId, fileBuffer, contentType = "image/jpeg") {
  const supabase = makeAdminClient(env);
  const path = `${individualId}/avatar.jpg`;

  const { error } = await supabase.storage.from("avatars").upload(path, fileBuffer, {
    contentType,
    upsert: true
  });

  if (error) throw new Error(error.message);

  const { data } = supabase.storage.from("avatars").getPublicUrl(path);
  return `${data.publicUrl}?v=${Date.now()}`;
}
