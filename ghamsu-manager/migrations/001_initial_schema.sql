-- ============================================================================
-- GHAMSU Manager — Migration 001 (v2, consolidated fresh start)
-- Target: Supabase (PostgreSQL 15+)
-- Reflects current decisions:
--   * Supabase Auth owns identity + TOTP MFA (no custom users/refresh tables)
--   * 4 roles: national_president, local_president, treasurer, secretary
--     (wing_leader removed; wings/classes remain as member data + audiences)
--   * Email alerts via Resend (no SMS tables)
-- Enable extensions first: Dashboard → Database → Extensions → citext, pg_trgm
-- ============================================================================

BEGIN;

CREATE EXTENSION IF NOT EXISTS citext;
CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- ORGANISATION STRUCTURE
-- ============================================================================

CREATE TABLE locals (
  id              BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name            TEXT NOT NULL,
  short_code      TEXT NOT NULL UNIQUE,             -- 'UG', 'KNUST'
  university_name TEXT NOT NULL,
  active          BOOLEAN NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TRIGGER trg_locals_updated
  BEFORE UPDATE ON locals FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE wings (
  id         BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  local_id   BIGINT NOT NULL REFERENCES locals(id),
  name       TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (local_id, name),
  UNIQUE (id, local_id)          -- composite-FK target (scope integrity)
);
CREATE INDEX idx_wings_local ON wings (local_id);

CREATE TABLE classes (
  id         BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  local_id   BIGINT NOT NULL REFERENCES locals(id),
  name       TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (local_id, name),
  UNIQUE (id, local_id)
);
CREATE INDEX idx_classes_local ON classes (local_id);

-- ============================================================================
-- EXECUTIVES (profile over Supabase Auth) & ROLES
-- ============================================================================

CREATE TABLE executives (
  id         UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name       TEXT NOT NULL,
  phone      TEXT NOT NULL UNIQUE CHECK (phone ~ '^\+233[0-9]{9}$'),
  is_active  BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TRIGGER trg_executives_updated
  BEFORE UPDATE ON executives FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE role_assignments (
  id            BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id       UUID NOT NULL REFERENCES executives(id) ON DELETE CASCADE,
  role_type     TEXT NOT NULL CHECK (role_type IN (
                  'national_president', 'local_president',
                  'treasurer', 'secretary')),
  local_id      BIGINT REFERENCES locals(id),
  academic_year TEXT NOT NULL CHECK (academic_year ~ '^\d{4}/\d{4}$'),
  active        BOOLEAN NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT chk_role_scope CHECK (
    (role_type = 'national_president' AND local_id IS NULL)
    OR
    (role_type IN ('local_president', 'treasurer', 'secretary')
       AND local_id IS NOT NULL)
  )
);

CREATE UNIQUE INDEX uq_role_active ON role_assignments
  (user_id, role_type, COALESCE(local_id, 0))
  WHERE active;
CREATE INDEX idx_roles_user  ON role_assignments (user_id)  WHERE active;
CREATE INDEX idx_roles_local ON role_assignments (local_id) WHERE active;

-- ============================================================================
-- MEMBERS
-- ============================================================================

CREATE TABLE members (
  id                  BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  student_id          TEXT NOT NULL CHECK (length(trim(student_id)) > 0),
  full_name           TEXT NOT NULL,
  gender              TEXT NOT NULL CHECK (gender IN ('male', 'female')),
  phone               TEXT NOT NULL CHECK (phone ~ '^\+233[0-9]{9}$'),
  email               CITEXT,        -- nullable, but now the alert channel:
                                     -- collect it aggressively at registration
  hall_of_residence   TEXT,
  local_id            BIGINT NOT NULL REFERENCES locals(id),
  wing_id             BIGINT,
  class_id            BIGINT,
  level               SMALLINT NOT NULL
                      CHECK (level IN (100, 200, 300, 400, 500, 600)),
  status              TEXT NOT NULL DEFAULT 'active' CHECK (status IN (
                        'prospective', 'active', 'executive', 'associate')),
  expected_graduation DATE,
  joined_at           DATE NOT NULL DEFAULT CURRENT_DATE,
  created_by          UUID NOT NULL REFERENCES executives(id),
  deleted_at          TIMESTAMPTZ,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT fk_member_wing_in_local
    FOREIGN KEY (wing_id, local_id)  REFERENCES wings   (id, local_id),
  CONSTRAINT fk_member_class_in_local
    FOREIGN KEY (class_id, local_id) REFERENCES classes (id, local_id)
);
CREATE TRIGGER trg_members_updated
  BEFORE UPDATE ON members FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE UNIQUE INDEX uq_members_phone ON members (phone)
  WHERE deleted_at IS NULL;
CREATE UNIQUE INDEX uq_members_student_per_local ON members (local_id, student_id)
  WHERE deleted_at IS NULL;
CREATE INDEX idx_members_local_status ON members (local_id, status, id)
  WHERE deleted_at IS NULL;
CREATE INDEX idx_members_wing ON members (wing_id)
  WHERE deleted_at IS NULL AND wing_id IS NOT NULL;
CREATE INDEX idx_members_class ON members (class_id)
  WHERE deleted_at IS NULL AND class_id IS NOT NULL;
CREATE INDEX idx_members_graduation ON members (expected_graduation)
  WHERE deleted_at IS NULL
    AND status IN ('active', 'executive')
    AND expected_graduation IS NOT NULL;
CREATE INDEX idx_members_name_trgm ON members
  USING gin (full_name gin_trgm_ops)
  WHERE deleted_at IS NULL;
-- email audience resolution: members of a local who have an email
CREATE INDEX idx_members_emailable ON members (local_id)
  WHERE deleted_at IS NULL AND email IS NOT NULL;

CREATE TABLE member_history (
  id            BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  member_id     BIGINT NOT NULL REFERENCES members(id),
  event_type    TEXT NOT NULL CHECK (event_type IN (
                  'joined', 'wing_changed', 'class_changed',
                  'status_changed', 'level_updated', 'position_assigned')),
  old_value     JSONB,
  new_value     JSONB,
  changed_by    UUID NOT NULL REFERENCES executives(id),
  academic_year TEXT NOT NULL CHECK (academic_year ~ '^\d{4}/\d{4}$'),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_history_member ON member_history (member_id, created_at DESC);

-- ============================================================================
-- LEADERSHIP (wing-scoped positions kept as records; no wing login role)
-- ============================================================================

CREATE TABLE leadership_positions (
  id       BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  title    TEXT NOT NULL,
  scope    TEXT NOT NULL CHECK (scope IN ('national', 'local', 'wing')),
  local_id BIGINT REFERENCES locals(id),
  wing_id  BIGINT,

  CONSTRAINT chk_position_scope CHECK (
    (scope = 'national' AND local_id IS NULL AND wing_id IS NULL) OR
    (scope = 'local'    AND local_id IS NOT NULL AND wing_id IS NULL) OR
    (scope = 'wing'     AND local_id IS NOT NULL AND wing_id IS NOT NULL)
  ),
  CONSTRAINT fk_position_wing_in_local
    FOREIGN KEY (wing_id, local_id) REFERENCES wings (id, local_id),
  UNIQUE (title, scope, local_id, wing_id)
);
CREATE INDEX idx_positions_local ON leadership_positions (local_id)
  WHERE local_id IS NOT NULL;

CREATE TABLE leadership_assignments (
  id            BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  member_id     BIGINT NOT NULL REFERENCES members(id),
  position_id   BIGINT NOT NULL REFERENCES leadership_positions(id),
  academic_year TEXT NOT NULL CHECK (academic_year ~ '^\d{4}/\d{4}$'),
  start_date    DATE NOT NULL DEFAULT CURRENT_DATE,
  end_date      DATE,
  assigned_by   UUID NOT NULL REFERENCES executives(id),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (end_date IS NULL OR end_date >= start_date)
);
CREATE UNIQUE INDEX uq_current_holder ON leadership_assignments (position_id)
  WHERE end_date IS NULL;
CREATE INDEX idx_assignments_member ON leadership_assignments (member_id);
CREATE INDEX idx_assignments_year   ON leadership_assignments (academic_year);
CREATE INDEX idx_assignments_archive ON leadership_assignments
  (academic_year, position_id) WHERE end_date IS NOT NULL;

-- ============================================================================
-- CONTRIBUTIONS
-- ============================================================================

CREATE TABLE contributions (
  id              BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  member_id       BIGINT NOT NULL REFERENCES members(id),
  local_id        BIGINT NOT NULL REFERENCES locals(id),
  amount_pesewas  INTEGER NOT NULL CHECK (amount_pesewas > 0),
  payment_method  TEXT NOT NULL CHECK (payment_method IN ('momo', 'cash')),
  momo_reference  TEXT,
  receipt_note    TEXT,
  academic_year   TEXT NOT NULL CHECK (academic_year ~ '^\d{4}/\d{4}$'),
  semester        TEXT NOT NULL CHECK (semester IN ('first', 'second')),
  recorded_by     UUID NOT NULL REFERENCES executives(id),
  paid_at         DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT chk_momo_ref CHECK (
    payment_method <> 'momo' OR momo_reference IS NOT NULL
  )
);
CREATE INDEX idx_contrib_summary ON contributions
  (local_id, academic_year, semester, payment_method);
CREATE INDEX idx_contrib_member ON contributions
  (member_id, academic_year, semester);
CREATE UNIQUE INDEX uq_contrib_momo_ref ON contributions (momo_reference)
  WHERE momo_reference IS NOT NULL;

-- ============================================================================
-- EMAIL ALERTS (Resend)
-- ============================================================================

CREATE TABLE email_blasts (
  id              BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  local_id        BIGINT REFERENCES locals(id),     -- NULL = national blast
  audience_filter JSONB NOT NULL,                   -- {type:'all'|'local'|'wing'|'class'|'executives', ids:[]}
  subject         TEXT NOT NULL,
  body_html       TEXT NOT NULL,
  body_text       TEXT,                             -- plain-text fallback
  recipient_count INTEGER NOT NULL DEFAULT 0,
  skipped_count   INTEGER NOT NULL DEFAULT 0,       -- members with no email
  status          TEXT NOT NULL DEFAULT 'draft' CHECK (status IN (
                    'draft', 'pending_approval', 'approved',
                    'sent', 'failed')),
  scheduled_at    TIMESTAMPTZ,
  sent_at         TIMESTAMPTZ,
  created_by      UUID NOT NULL REFERENCES executives(id),
  approved_by     UUID REFERENCES executives(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT chk_sent_has_time CHECK (status <> 'sent' OR sent_at IS NOT NULL)
);
CREATE TRIGGER trg_blasts_updated
  BEFORE UPDATE ON email_blasts FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE INDEX idx_blasts_local ON email_blasts (local_id, created_at DESC);
CREATE INDEX idx_blasts_due ON email_blasts (scheduled_at)
  WHERE status = 'approved' AND scheduled_at IS NOT NULL;
CREATE INDEX idx_blasts_pending ON email_blasts (local_id)
  WHERE status = 'pending_approval';

CREATE TABLE email_delivery_reports (
  id                  BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  blast_id            BIGINT NOT NULL REFERENCES email_blasts(id) ON DELETE CASCADE,
  member_id           BIGINT REFERENCES members(id),
  email_address       CITEXT NOT NULL,
  status              TEXT NOT NULL DEFAULT 'sent' CHECK (status IN (
                        'sent', 'delivered', 'bounced', 'complained', 'failed')),
  provider_message_id TEXT,                          -- Resend message id
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TRIGGER trg_delivery_updated
  BEFORE UPDATE ON email_delivery_reports
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE INDEX idx_delivery_blast ON email_delivery_reports (blast_id, status);
CREATE UNIQUE INDEX uq_delivery_provider_id
  ON email_delivery_reports (provider_message_id)
  WHERE provider_message_id IS NOT NULL;

-- ============================================================================
-- DOCUMENTS
-- ============================================================================

CREATE TABLE documents (
  id              BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  local_id        BIGINT NOT NULL REFERENCES locals(id),
  name            TEXT NOT NULL,
  document_type   TEXT NOT NULL CHECK (document_type IN (
                    'minutes', 'report', 'constitution', 'handover', 'other')),
  academic_year   TEXT NOT NULL CHECK (academic_year ~ '^\d{4}/\d{4}$'),
  file_url        TEXT NOT NULL,                     -- storage key
  file_size_bytes BIGINT NOT NULL CHECK (file_size_bytes > 0),
  mime_type       TEXT NOT NULL,
  status          TEXT NOT NULL DEFAULT 'pending' CHECK (status IN (
                    'pending', 'approved')),
  uploaded_by     UUID NOT NULL REFERENCES executives(id),
  approved_by     UUID REFERENCES executives(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TRIGGER trg_documents_updated
  BEFORE UPDATE ON documents FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE INDEX idx_documents_browse ON documents
  (local_id, document_type, academic_year);

-- ============================================================================
-- BULK IMPORT (synchronous two-step: stage → review → commit)
-- ============================================================================

CREATE TABLE import_jobs (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  local_id       BIGINT NOT NULL REFERENCES locals(id),
  uploaded_by    UUID NOT NULL REFERENCES executives(id),
  file_url       TEXT NOT NULL,
  original_name  TEXT NOT NULL,
  status         TEXT NOT NULL DEFAULT 'awaiting_review' CHECK (status IN (
                   'awaiting_review', 'committing', 'completed', 'failed')),
  total_rows     INTEGER NOT NULL DEFAULT 0,
  valid_rows     INTEGER NOT NULL DEFAULT 0,
  duplicate_rows INTEGER NOT NULL DEFAULT 0,
  invalid_rows   INTEGER NOT NULL DEFAULT 0,
  imported_rows  INTEGER NOT NULL DEFAULT 0,
  error_summary  JSONB,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  finished_at    TIMESTAMPTZ
);
CREATE INDEX idx_import_jobs_local ON import_jobs (local_id, created_at DESC);

CREATE TABLE import_rows (
  id                BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  job_id            UUID NOT NULL REFERENCES import_jobs(id) ON DELETE CASCADE,
  row_number        INTEGER NOT NULL,
  raw_data          JSONB NOT NULL,
  normalized_phone  TEXT,
  resolution        TEXT NOT NULL DEFAULT 'new' CHECK (resolution IN (
                      'new', 'duplicate_in_file', 'duplicate_existing',
                      'invalid', 'skip', 'merge')),
  matched_member_id BIGINT REFERENCES members(id),
  error_detail      TEXT,
  UNIQUE (job_id, row_number)
);
CREATE INDEX idx_import_rows_review ON import_rows (job_id, resolution);

-- ============================================================================
-- AUDIT LOG
-- ============================================================================

CREATE TABLE audit_logs (
  id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id     UUID NOT NULL REFERENCES executives(id),
  action      TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id   TEXT NOT NULL,
  local_id    BIGINT REFERENCES locals(id),
  metadata    JSONB,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_audit_feed   ON audit_logs (local_id, created_at DESC);
CREATE INDEX idx_audit_entity ON audit_logs (entity_type, entity_id);
CREATE INDEX idx_audit_user   ON audit_logs (user_id, created_at DESC);
CREATE INDEX idx_audit_created_brin ON audit_logs USING brin (created_at);

-- ============================================================================
-- RLS: default-deny on every table (API uses service role, which bypasses RLS;
-- this guarantees the anon key can read nothing if it ever leaks)
-- ============================================================================

DO $$
DECLARE t TEXT;
BEGIN
  FOR t IN
    SELECT tablename FROM pg_tables WHERE schemaname = 'public'
  LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
  END LOOP;
END $$;

COMMIT;

-- ============================================================================
-- Seed (run after the migration)
-- ============================================================================
-- INSERT INTO locals (name, short_code, university_name) VALUES
--   ('GHAMSU UG',    'UG',    'University of Ghana, Legon'),
--   ('GHAMSU KNUST', 'KNUST', 'Kwame Nkrumah University of Science and Technology'),
--   ('GHAMSU UCC',   'UCC',   'University of Cape Coast'),
--   ('GHAMSU UEW',   'UEW',   'University of Education, Winneba'),
--   ('GHAMSU UDS',   'UDS',   'University for Development Studies'),
--   ('GHAMSU GIMPA', 'GIMPA', 'Ghana Institute of Management and Public Administration'),
--   ('GHAMSU ATU',   'ATU',   'Accra Technical University');