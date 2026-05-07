INSERT INTO protocols (title, category, description, evidence_tier, contraindications, source_links, active)
VALUES
  (
    'Wind-down Sleep Routine',
    'sleep',
    'A simple nightly routine to improve sleep consistency.',
    'strong',
    '[]'::jsonb,
    '["https://www.cdc.gov/sleep/about_sleep/sleep_hygiene.html"]'::jsonb,
    true
  ),
  (
    'Daily 10-Minute Walk',
    'movement',
    'Short movement breaks to improve energy and reduce stress.',
    'guideline',
    '[]'::jsonb,
    '["https://www.who.int/news-room/fact-sheets/detail/physical-activity"]'::jsonb,
    true
  ),
  (
    'Box Breathing Reset',
    'stress',
    'Guided breathing intervals to reduce stress response.',
    'emerging',
    '[]'::jsonb,
    '["https://www.nccih.nih.gov/health/relaxation-techniques-what-you-need-to-know"]'::jsonb,
    true
  )
ON CONFLICT DO NOTHING;

INSERT INTO protocol_actions (protocol_id, name, instructions, default_duration_min, difficulty, anchor_type)
SELECT id, 'No screens 45 minutes before bed', 'Avoid phones, laptops, and TV in the final 45 minutes before sleep.', 45, 2, 'time'
FROM protocols
WHERE title = 'Wind-down Sleep Routine'
ON CONFLICT DO NOTHING;

INSERT INTO protocol_actions (protocol_id, name, instructions, default_duration_min, difficulty, anchor_type)
SELECT id, 'Walk after lunch', 'Take a brisk 10-minute walk after your midday meal.', 10, 1, 'event'
FROM protocols
WHERE title = 'Daily 10-Minute Walk'
ON CONFLICT DO NOTHING;

INSERT INTO protocol_actions (protocol_id, name, instructions, default_duration_min, difficulty, anchor_type)
SELECT id, 'Box breathing x3 rounds', 'Inhale 4s, hold 4s, exhale 4s, hold 4s for 3 rounds.', 5, 1, 'event'
FROM protocols
WHERE title = 'Box Breathing Reset'
ON CONFLICT DO NOTHING;
