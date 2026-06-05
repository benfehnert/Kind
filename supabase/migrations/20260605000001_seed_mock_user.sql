-- Seed the mock individual used by MOCK_AUTH=true in dev/staging.
-- Safe to run multiple times.
INSERT INTO individuals (slug, email, display_name, avatar_initials, location)
VALUES (
  'anna-ross',
  'anna.ross@example.com',
  'Anna Ross',
  'AR',
  'London'
)
ON CONFLICT (slug) DO NOTHING;
