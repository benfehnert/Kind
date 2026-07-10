-- Persist scene presets and custom photo avatars alongside pravatar IDs.

ALTER TABLE individuals
  ADD COLUMN IF NOT EXISTS avatar_key TEXT,
  ADD COLUMN IF NOT EXISTS avatar_url TEXT;

UPDATE individuals
SET avatar_key = 'pravatar-' || avatar_image_id::text
WHERE avatar_image_id IS NOT NULL
  AND avatar_key IS NULL;

-- Public avatars bucket for custom profile photos.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('avatars', 'avatars', true, 2097152, ARRAY['image/jpeg', 'image/png', 'image/webp'])
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Avatar images are publicly readable"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'avatars');
