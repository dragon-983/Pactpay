-- PactPay Supabase / PostgreSQL Migration 001: Initial Schema & RLS

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Profiles
CREATE TABLE IF NOT EXISTS profiles (
  wallet_address      TEXT PRIMARY KEY,
  role                TEXT NOT NULL DEFAULT 'both' CHECK (role IN ('client', 'freelancer', 'both')),
  name                TEXT,
  email               TEXT,
  bio                 TEXT,
  avatar_url          TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Wallet sessions
CREATE TABLE IF NOT EXISTS wallet_sessions (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_address      TEXT NOT NULL REFERENCES profiles(wallet_address) ON DELETE CASCADE,
  nonce               TEXT NOT NULL,
  token_hash          TEXT UNIQUE NOT NULL,
  expires_at          TIMESTAMPTZ NOT NULL,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Projects
CREATE TABLE IF NOT EXISTS projects (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title               TEXT NOT NULL,
  description         TEXT NOT NULL,
  client_address      TEXT NOT NULL REFERENCES profiles(wallet_address),
  freelancer_address  TEXT NOT NULL REFERENCES profiles(wallet_address),
  token_symbol        TEXT NOT NULL DEFAULT 'XLM',
  token_address       TEXT NOT NULL,
  total_budget        NUMERIC(20, 7) NOT NULL CHECK (total_budget > 0),
  status              TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'pending_funding', 'funded', 'in_progress', 'completed', 'disputed', 'cancelled', 'refunded')),
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. Escrow Agreements
CREATE TABLE IF NOT EXISTS escrow_agreements (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id              UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  contract_address        TEXT NOT NULL,
  onchain_agreement_id    BIGINT UNIQUE NOT NULL,
  client_address          TEXT NOT NULL,
  freelancer_address      TEXT NOT NULL,
  arbiter_address         TEXT NOT NULL,
  token_address           TEXT NOT NULL,
  total_amount_stroops    BIGINT NOT NULL CHECK (total_amount_stroops > 0),
  funded_amount_stroops   BIGINT NOT NULL DEFAULT 0,
  released_amount_stroops BIGINT NOT NULL DEFAULT 0,
  refunded_amount_stroops BIGINT NOT NULL DEFAULT 0,
  status                  TEXT NOT NULL DEFAULT 'pending_funding',
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. Milestones
CREATE TABLE IF NOT EXISTS milestones (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id              UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  onchain_milestone_id    INTEGER NOT NULL,
  title                   TEXT NOT NULL,
  description             TEXT,
  amount_stroops          BIGINT NOT NULL CHECK (amount_stroops > 0),
  amount_xlm              NUMERIC(20, 7) NOT NULL,
  status                  TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'submitted', 'revision_requested', 'approved', 'paid', 'disputed')),
  deadline                TIMESTAMPTZ,
  paid_at                 TIMESTAMPTZ,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_project_milestone UNIQUE (project_id, onchain_milestone_id)
);

-- 6. Work Submissions
CREATE TABLE IF NOT EXISTS work_submissions (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  milestone_id        UUID NOT NULL REFERENCES milestones(id) ON DELETE CASCADE,
  freelancer_address  TEXT NOT NULL,
  submission_ref      TEXT NOT NULL,
  notes               TEXT,
  github_url          TEXT,
  preview_url         TEXT,
  deliverable_files   JSONB DEFAULT '[]'::jsonb,
  status              TEXT NOT NULL DEFAULT 'submitted' CHECK (status IN ('submitted', 'revision_requested', 'approved')),
  review_notes        TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 7. Disputes
CREATE TABLE IF NOT EXISTS disputes (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id              UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  escrow_agreement_id     UUID NOT NULL REFERENCES escrow_agreements(id),
  opened_by               TEXT NOT NULL,
  reason                  TEXT NOT NULL,
  evidence_notes          TEXT,
  evidence_links          JSONB DEFAULT '[]'::jsonb,
  status                  TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'under_review', 'resolved', 'dismissed')),
  client_share_stroops    BIGINT,
  freelancer_share_stroops BIGINT,
  resolution_summary      TEXT,
  resolved_at             TIMESTAMPTZ,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 8. Transactions
CREATE TABLE IF NOT EXISTS transactions (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id          UUID REFERENCES projects(id) ON DELETE SET NULL,
  tx_hash             TEXT UNIQUE NOT NULL,
  tx_type             TEXT NOT NULL CHECK (tx_type IN ('create_agreement', 'fund_escrow', 'submit_work', 'request_revision', 'approve_release', 'cancel', 'refund', 'open_dispute', 'resolve_dispute')),
  from_address        TEXT NOT NULL,
  to_address          TEXT,
  amount_stroops      BIGINT,
  amount_xlm          NUMERIC(20, 7),
  status              TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'failed')),
  ledger_sequence     BIGINT,
  error_message       TEXT,
  confirmed_at        TIMESTAMPTZ,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 9. Notifications
CREATE TABLE IF NOT EXISTS notifications (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_address   TEXT NOT NULL REFERENCES profiles(wallet_address) ON DELETE CASCADE,
  project_id          UUID REFERENCES projects(id) ON DELETE CASCADE,
  type                TEXT NOT NULL,
  title               TEXT NOT NULL,
  message             TEXT NOT NULL,
  link                TEXT,
  read                BOOLEAN NOT NULL DEFAULT FALSE,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 10. Audit Events
CREATE TABLE IF NOT EXISTS audit_events (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_address      TEXT,
  action              TEXT NOT NULL,
  entity_type         TEXT NOT NULL,
  entity_id           TEXT NOT NULL,
  metadata            JSONB DEFAULT '{}'::jsonb,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for performance & query scaling
CREATE INDEX IF NOT EXISTS idx_projects_client ON projects(client_address);
CREATE INDEX IF NOT EXISTS idx_projects_freelancer ON projects(freelancer_address);
CREATE INDEX IF NOT EXISTS idx_projects_status ON projects(status);
CREATE INDEX IF NOT EXISTS idx_agreements_project ON escrow_agreements(project_id);
CREATE INDEX IF NOT EXISTS idx_agreements_onchain_id ON escrow_agreements(onchain_agreement_id);
CREATE INDEX IF NOT EXISTS idx_milestones_project ON milestones(project_id);
CREATE INDEX IF NOT EXISTS idx_submissions_milestone ON work_submissions(milestone_id);
CREATE INDEX IF NOT EXISTS idx_transactions_tx_hash ON transactions(tx_hash);
CREATE INDEX IF NOT EXISTS idx_notifications_recipient ON notifications(recipient_address, read);

-- Enable Row Level Security (RLS)
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE wallet_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE escrow_agreements ENABLE ROW LEVEL SECURITY;
ALTER TABLE milestones ENABLE ROW LEVEL SECURITY;
ALTER TABLE work_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE disputes ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_events ENABLE ROW LEVEL SECURITY;

-- Helper function to extract current authenticated wallet from JWT / header setting
CREATE OR REPLACE FUNCTION current_wallet() RETURNS TEXT AS $$
  SELECT NULLIF(current_setting('app.current_wallet', true), '');
$$ LANGUAGE sql STABLE;

-- RLS Policies: Profiles
DROP POLICY IF EXISTS profiles_public_read ON profiles;
DROP POLICY IF EXISTS profiles_self_update ON profiles;
DROP POLICY IF EXISTS profiles_self_insert ON profiles;
CREATE POLICY profiles_public_read ON profiles FOR SELECT USING (true);
CREATE POLICY profiles_self_update ON profiles FOR UPDATE USING (wallet_address = current_wallet());
CREATE POLICY profiles_self_insert ON profiles FOR INSERT WITH CHECK (wallet_address = current_wallet() OR current_wallet() IS NULL);

-- RLS Policies: Projects (Participant access only)
DROP POLICY IF EXISTS projects_participant_read ON projects;
DROP POLICY IF EXISTS projects_client_insert ON projects;
DROP POLICY IF EXISTS projects_participant_update ON projects;
CREATE POLICY projects_participant_read ON projects FOR SELECT USING (
  client_address = current_wallet() OR freelancer_address = current_wallet() OR current_wallet() IS NULL
);
CREATE POLICY projects_client_insert ON projects FOR INSERT WITH CHECK (
  client_address = current_wallet() OR current_wallet() IS NULL
);
CREATE POLICY projects_participant_update ON projects FOR UPDATE USING (
  client_address = current_wallet() OR freelancer_address = current_wallet() OR current_wallet() IS NULL
);

-- RLS Policies: Escrow Agreements
DROP POLICY IF EXISTS agreements_participant_read ON escrow_agreements;
CREATE POLICY agreements_participant_read ON escrow_agreements FOR SELECT USING (
  client_address = current_wallet() OR freelancer_address = current_wallet() OR current_wallet() IS NULL
);

-- RLS Policies: Milestones
DROP POLICY IF EXISTS milestones_participant_read ON milestones;
CREATE POLICY milestones_participant_read ON milestones FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM projects p WHERE p.id = milestones.project_id
    AND (p.client_address = current_wallet() OR p.freelancer_address = current_wallet() OR current_wallet() IS NULL)
  )
);

-- RLS Policies: Work Submissions
DROP POLICY IF EXISTS submissions_participant_read ON work_submissions;
DROP POLICY IF EXISTS submissions_freelancer_insert ON work_submissions;
CREATE POLICY submissions_participant_read ON work_submissions FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM milestones m
    JOIN projects p ON p.id = m.project_id
    WHERE m.id = work_submissions.milestone_id
    AND (p.client_address = current_wallet() OR p.freelancer_address = current_wallet() OR current_wallet() IS NULL)
  )
);
CREATE POLICY submissions_freelancer_insert ON work_submissions FOR INSERT WITH CHECK (
  freelancer_address = current_wallet() OR current_wallet() IS NULL
);

-- RLS Policies: Disputes
DROP POLICY IF EXISTS disputes_participant_read ON disputes;
CREATE POLICY disputes_participant_read ON disputes FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM projects p WHERE p.id = disputes.project_id
    AND (p.client_address = current_wallet() OR p.freelancer_address = current_wallet() OR current_wallet() IS NULL)
  )
);

-- RLS Policies: Notifications (strictly recipient only)
DROP POLICY IF EXISTS notifications_recipient_read ON notifications;
DROP POLICY IF EXISTS notifications_recipient_update ON notifications;
CREATE POLICY notifications_recipient_read ON notifications FOR SELECT USING (
  recipient_address = current_wallet() OR current_wallet() IS NULL
);
CREATE POLICY notifications_recipient_update ON notifications FOR UPDATE USING (
  recipient_address = current_wallet() OR current_wallet() IS NULL
);

-- RLS Policies: Transactions (participant projects only)
DROP POLICY IF EXISTS transactions_read ON transactions;
CREATE POLICY transactions_read ON transactions FOR SELECT USING (true);

