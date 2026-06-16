-- Onboarding, consent persistence, trial reports, and active exploration tracking.

ALTER TABLE privacy_settings
  ADD COLUMN IF NOT EXISTS platform_consent BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE user_explorations
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT FALSE;

-- Explorer onboarding answers (mobile ExplorerOnboardingScreen).
CREATE TABLE individual_onboarding (
  individual_id UUID PRIMARY KEY REFERENCES individuals(id) ON DELETE CASCADE,
  completed_at TIMESTAMPTZ,
  answers JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Legal / platform consent keys (platform_participation, us_collect, etc.).
CREATE TABLE individual_consents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  individual_id UUID NOT NULL REFERENCES individuals(id) ON DELETE CASCADE,
  consent_key TEXT NOT NULL,
  granted BOOLEAN NOT NULL DEFAULT FALSE,
  consented_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (individual_id, consent_key)
);

CREATE INDEX idx_individual_consents_individual ON individual_consents (individual_id);

-- Per-exploration participation consent.
CREATE TABLE exploration_consents (
  individual_id UUID NOT NULL REFERENCES individuals(id) ON DELETE CASCADE,
  exploration_id TEXT NOT NULL REFERENCES explorations(id) ON DELETE CASCADE,
  granted BOOLEAN NOT NULL DEFAULT FALSE,
  consented_at TIMESTAMPTZ,
  is_active BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (individual_id, exploration_id)
);

CREATE INDEX idx_exploration_consents_active ON exploration_consents (individual_id, is_active)
  WHERE is_active = TRUE;

-- Demo report templates (one per exploration catalog entry).
CREATE TABLE exploration_trial_report_templates (
  exploration_id TEXT PRIMARY KEY REFERENCES explorations(id) ON DELETE CASCADE,
  report_title_label TEXT NOT NULL DEFAULT 'Personalised trial final report',
  content JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- User-specific generated trial final reports.
CREATE TABLE user_exploration_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  individual_id UUID NOT NULL REFERENCES individuals(id) ON DELETE CASCADE,
  exploration_id TEXT NOT NULL REFERENCES explorations(id) ON DELETE CASCADE,
  user_exploration_id UUID REFERENCES user_explorations(id) ON DELETE SET NULL,
  content JSONB NOT NULL,
  generated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (individual_id, exploration_id)
);

CREATE INDEX idx_user_exploration_reports_individual ON user_exploration_reports (individual_id);
