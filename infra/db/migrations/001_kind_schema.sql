-- Kind platform schema (PostgreSQL)
-- Derived from apps/mobile/prototype.html and apps/kind-website waitlist flows.
-- Standalone conceptual schema; integrate with infra/db/migrations users table as needed.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ---------------------------------------------------------------------------
-- Enumerations
-- ---------------------------------------------------------------------------

CREATE TYPE exploration_phase_status AS ENUM ('complete', 'active', 'upcoming');
CREATE TYPE user_exploration_status AS ENUM ('active', 'complete');
CREATE TYPE log_field_type AS ENUM ('range', 'select', 'checks', 'number');
CREATE TYPE feed_item_type AS ENUM ('milestone', 'insight', 'activity', 'science', 'tip');
CREATE TYPE badge_style AS ENUM ('teal', 'green', 'amber', 'blue', 'purple');
CREATE TYPE waitlist_audience AS ENUM ('individual', 'researcher');

-- ---------------------------------------------------------------------------
-- People
-- ---------------------------------------------------------------------------

CREATE TABLE individuals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_user_id UUID UNIQUE NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  email TEXT UNIQUE NOT NULL,
  display_name TEXT NOT NULL,
  location TEXT,
  bio TEXT,
  avatar_initials TEXT NOT NULL,
  avatar_image_id INT,
  profile_meta TEXT,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE privacy_settings (
  individual_id UUID PRIMARY KEY REFERENCES individuals(id) ON DELETE CASCADE,
  contribute_to_citizen_science BOOLEAN NOT NULL DEFAULT TRUE,
  visible_in_community BOOLEAN NOT NULL DEFAULT TRUE,
  daily_reminders BOOLEAN NOT NULL DEFAULT TRUE,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE researchers (
  id TEXT PRIMARY KEY,
  display_name TEXT NOT NULL,
  title TEXT NOT NULL,
  organisation TEXT NOT NULL,
  avatar_initials TEXT NOT NULL,
  avatar_image_id INT,
  verified BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE researcher_areas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  researcher_id TEXT NOT NULL REFERENCES researchers(id) ON DELETE CASCADE,
  area_label TEXT NOT NULL,
  sort_order INT NOT NULL DEFAULT 0,
  UNIQUE (researcher_id, area_label)
);

-- ---------------------------------------------------------------------------
-- Exploration catalog
-- ---------------------------------------------------------------------------

CREATE TABLE explorations (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  icon TEXT NOT NULL,
  theme_bg TEXT,
  theme_text TEXT,
  duration_label TEXT NOT NULL,
  description TEXT NOT NULL,
  participant_count INT NOT NULL DEFAULT 0,
  is_new BOOLEAN NOT NULL DEFAULT FALSE,
  catalog_active BOOLEAN NOT NULL DEFAULT FALSE,
  status_badge TEXT,
  progress_percent INT CHECK (progress_percent IS NULL OR progress_percent BETWEEN 0 AND 100),
  streak_days INT,
  chart_label TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE exploration_phases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  exploration_id TEXT NOT NULL REFERENCES explorations(id) ON DELETE CASCADE,
  sort_order INT NOT NULL,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  status exploration_phase_status NOT NULL DEFAULT 'upcoming',
  UNIQUE (exploration_id, sort_order)
);

CREATE TABLE exploration_expected_outcomes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  exploration_id TEXT NOT NULL REFERENCES explorations(id) ON DELETE CASCADE,
  sort_order INT NOT NULL,
  icon TEXT NOT NULL,
  label TEXT NOT NULL,
  UNIQUE (exploration_id, sort_order)
);

CREATE TABLE exploration_kpis (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  exploration_id TEXT NOT NULL REFERENCES explorations(id) ON DELETE CASCADE,
  sort_order INT NOT NULL,
  label TEXT NOT NULL,
  value_text TEXT NOT NULL,
  unit TEXT,
  change_text TEXT,
  is_positive BOOLEAN NOT NULL DEFAULT TRUE,
  UNIQUE (exploration_id, sort_order)
);

CREATE TABLE exploration_chart_points (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  exploration_id TEXT NOT NULL REFERENCES explorations(id) ON DELETE CASCADE,
  sort_order INT NOT NULL,
  day_label TEXT NOT NULL,
  height_percent INT NOT NULL DEFAULT 0,
  value_label TEXT,
  is_highlight BOOLEAN NOT NULL DEFAULT FALSE,
  is_empty BOOLEAN NOT NULL DEFAULT FALSE,
  UNIQUE (exploration_id, sort_order)
);

CREATE TABLE log_field_defs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  exploration_id TEXT NOT NULL REFERENCES explorations(id) ON DELETE CASCADE,
  field_key TEXT NOT NULL,
  field_type log_field_type NOT NULL,
  label TEXT NOT NULL,
  sort_order INT NOT NULL,
  min_value NUMERIC,
  max_value NUMERIC,
  step_value NUMERIC,
  unit TEXT,
  placeholder TEXT,
  hint TEXT,
  options JSONB NOT NULL DEFAULT '[]'::jsonb,
  hints JSONB NOT NULL DEFAULT '[]'::jsonb,
  allows_multiple BOOLEAN NOT NULL DEFAULT FALSE,
  default_value JSONB,
  UNIQUE (exploration_id, field_key)
);

CREATE TABLE researcher_explorations (
  researcher_id TEXT NOT NULL REFERENCES researchers(id) ON DELETE CASCADE,
  exploration_id TEXT NOT NULL REFERENCES explorations(id) ON DELETE CASCADE,
  collaboration_note TEXT,
  PRIMARY KEY (researcher_id, exploration_id)
);

-- ---------------------------------------------------------------------------
-- Participation and logging
-- ---------------------------------------------------------------------------

CREATE TABLE user_explorations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  individual_id UUID NOT NULL REFERENCES individuals(id) ON DELETE CASCADE,
  exploration_id TEXT NOT NULL REFERENCES explorations(id) ON DELETE CASCADE,
  week_current INT NOT NULL DEFAULT 1,
  weeks_total INT NOT NULL,
  status user_exploration_status NOT NULL DEFAULT 'active',
  streak_days INT NOT NULL DEFAULT 0,
  started_at DATE NOT NULL DEFAULT CURRENT_DATE,
  completed_at DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (individual_id, exploration_id)
);

CREATE TABLE daily_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  individual_id UUID NOT NULL REFERENCES individuals(id) ON DELETE CASCADE,
  exploration_id TEXT NOT NULL REFERENCES explorations(id) ON DELETE CASCADE,
  user_exploration_id UUID REFERENCES user_explorations(id) ON DELETE SET NULL,
  log_date DATE NOT NULL,
  field_values JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (individual_id, exploration_id, log_date)
);

-- ---------------------------------------------------------------------------
-- Community and social
-- ---------------------------------------------------------------------------

CREATE TABLE individual_badges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  individual_id UUID NOT NULL REFERENCES individuals(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  style badge_style NOT NULL DEFAULT 'teal',
  sort_order INT NOT NULL DEFAULT 0
);

CREATE TABLE activity_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  individual_id UUID NOT NULL REFERENCES individuals(id) ON DELETE CASCADE,
  exploration_id TEXT REFERENCES explorations(id) ON DELETE SET NULL,
  user_exploration_id UUID REFERENCES user_explorations(id) ON DELETE SET NULL,
  summary TEXT NOT NULL,
  detail_metrics TEXT,
  exploration_label TEXT,
  posted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  nice_count_base INT NOT NULL DEFAULT 0,
  sort_order INT NOT NULL DEFAULT 0
);

CREATE TABLE individual_follows (
  follower_id UUID NOT NULL REFERENCES individuals(id) ON DELETE CASCADE,
  followee_id UUID NOT NULL REFERENCES individuals(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (follower_id, followee_id),
  CHECK (follower_id <> followee_id)
);

CREATE TABLE researcher_follows (
  individual_id UUID NOT NULL REFERENCES individuals(id) ON DELETE CASCADE,
  researcher_id TEXT NOT NULL REFERENCES researchers(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (individual_id, researcher_id)
);

CREATE TABLE activity_nices (
  individual_id UUID NOT NULL REFERENCES individuals(id) ON DELETE CASCADE,
  activity_post_id UUID NOT NULL REFERENCES activity_posts(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (individual_id, activity_post_id)
);

CREATE TABLE activity_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id UUID NOT NULL REFERENCES individuals(id) ON DELETE CASCADE,
  activity_post_id UUID NOT NULL REFERENCES activity_posts(id) ON DELETE CASCADE,
  body TEXT NOT NULL,
  sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE researcher_exploration_nices (
  individual_id UUID NOT NULL REFERENCES individuals(id) ON DELETE CASCADE,
  researcher_id TEXT NOT NULL REFERENCES researchers(id) ON DELETE CASCADE,
  exploration_id TEXT NOT NULL REFERENCES explorations(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (individual_id, researcher_id, exploration_id),
  FOREIGN KEY (researcher_id, exploration_id)
    REFERENCES researcher_explorations(researcher_id, exploration_id) ON DELETE CASCADE
);

-- ---------------------------------------------------------------------------
-- Feed
-- ---------------------------------------------------------------------------

CREATE TABLE feed_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  feed_type feed_item_type NOT NULL,
  actor_individual_id UUID REFERENCES individuals(id) ON DELETE SET NULL,
  exploration_id TEXT REFERENCES explorations(id) ON DELETE SET NULL,
  headline TEXT NOT NULL,
  body TEXT,
  highlight TEXT,
  published_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  sort_order INT NOT NULL DEFAULT 0
);

-- ---------------------------------------------------------------------------
-- Marketing waitlist (website)
-- ---------------------------------------------------------------------------

CREATE TABLE waitlist_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  audience waitlist_audience NOT NULL,
  first_name TEXT NOT NULL,
  email TEXT NOT NULL,
  self_description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  converted_individual_id UUID REFERENCES individuals(id) ON DELETE SET NULL
);

CREATE UNIQUE INDEX idx_waitlist_email_audience ON waitlist_entries (email, audience);

-- ---------------------------------------------------------------------------
-- Views (prototype denormalisations)
-- ---------------------------------------------------------------------------

CREATE VIEW exploration_participants AS
SELECT
  ue.exploration_id,
  i.id AS individual_id,
  i.display_name,
  i.location,
  ue.week_current,
  ue.weeks_total,
  ue.status
FROM user_explorations ue
JOIN individuals i ON i.id = ue.individual_id;

CREATE VIEW activity_nice_counts AS
SELECT
  ap.id AS activity_post_id,
  ap.nice_count_base + COUNT(an.individual_id)::INT AS nice_count
FROM activity_posts ap
LEFT JOIN activity_nices an ON an.activity_post_id = ap.id
GROUP BY ap.id, ap.nice_count_base;

CREATE VIEW researcher_exploration_nice_counts AS
SELECT
  re.researcher_id,
  re.exploration_id,
  COALESCE(COUNT(ren.individual_id), 0)::INT AS nice_count
FROM researcher_explorations re
LEFT JOIN researcher_exploration_nices ren
  ON ren.researcher_id = re.researcher_id AND ren.exploration_id = re.exploration_id
GROUP BY re.researcher_id, re.exploration_id;

-- ---------------------------------------------------------------------------
-- Indexes
-- ---------------------------------------------------------------------------

CREATE INDEX idx_user_explorations_individual ON user_explorations (individual_id);
CREATE INDEX idx_user_explorations_exploration ON user_explorations (exploration_id);
CREATE INDEX idx_daily_logs_individual_date ON daily_logs (individual_id, log_date DESC);
CREATE INDEX idx_activity_posts_individual ON activity_posts (individual_id, posted_at DESC);
CREATE INDEX idx_feed_items_published ON feed_items (published_at DESC);
CREATE INDEX idx_individual_follows_followee ON individual_follows (followee_id);
