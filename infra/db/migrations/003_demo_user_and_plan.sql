ALTER TABLE users
ADD COLUMN IF NOT EXISTS password_hash TEXT;

INSERT INTO users (id, email, name, timezone, password_hash)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'demo@example.com',
  'Demo User',
  'UTC',
  NULL
)
ON CONFLICT (email) DO NOTHING;

INSERT INTO user_profiles (user_id, goals, constraints, preferences)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  '["better_sleep","reduce_stress","more_energy"]'::jsonb,
  '{"work_hours":"9-6"}'::jsonb,
  '{"reminder_windows":["07:00-08:00","20:00-21:00"]}'::jsonb
)
ON CONFLICT (user_id) DO NOTHING;

INSERT INTO user_protocols (id, user_id, protocol_id, status, start_date, personalization)
SELECT
  gen_random_uuid(),
  '00000000-0000-0000-0000-000000000001',
  p.id,
  'active',
  CURRENT_DATE,
  '{}'::jsonb
FROM protocols p
ON CONFLICT DO NOTHING;

WITH inserted_plan AS (
  INSERT INTO daily_plans (id, user_id, plan_date, version)
  VALUES (gen_random_uuid(), '00000000-0000-0000-0000-000000000001', CURRENT_DATE, 1)
  ON CONFLICT DO NOTHING
  RETURNING id
),
existing_plan AS (
  SELECT id FROM inserted_plan
  UNION ALL
  SELECT id
  FROM daily_plans
  WHERE user_id = '00000000-0000-0000-0000-000000000001'
    AND plan_date = CURRENT_DATE
  ORDER BY id
  LIMIT 1
)
INSERT INTO daily_plan_items (id, daily_plan_id, protocol_action_id, status)
SELECT gen_random_uuid(), ep.id, pa.id, 'pending'
FROM existing_plan ep
JOIN protocol_actions pa ON true
LEFT JOIN daily_plan_items dpi
  ON dpi.daily_plan_id = ep.id AND dpi.protocol_action_id = pa.id
WHERE dpi.id IS NULL
LIMIT 3;
