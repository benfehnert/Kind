-- Home dashboard: which log fields appear as metric cards on the Home screen.

ALTER TABLE log_field_defs
  ADD COLUMN IF NOT EXISTS show_on_home BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS home_sort_order INT;

CREATE INDEX IF NOT EXISTS idx_log_field_defs_home
  ON log_field_defs (exploration_id, home_sort_order)
  WHERE show_on_home = TRUE;
