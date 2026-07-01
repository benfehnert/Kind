-- Algorithm-generated exploration updates surfaced in the home feed.

CREATE TABLE user_exploration_updates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  individual_id UUID NOT NULL REFERENCES individuals(id) ON DELETE CASCADE,
  exploration_id TEXT NOT NULL REFERENCES explorations(id) ON DELETE CASCADE,
  update_key TEXT NOT NULL,
  feed_item JSONB NOT NULL,
  report_content JSONB,
  generated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (individual_id, exploration_id, update_key)
);

CREATE INDEX idx_user_exploration_updates_individual
  ON user_exploration_updates (individual_id, generated_at DESC);
