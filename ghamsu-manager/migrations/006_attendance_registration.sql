-- ============================================================================
-- GHAMSU Manager — Migration 006
-- Attendance, public self-registration, and birthdays (renumbered from the
-- drafted 003 — 003/004/005 were already used by earlier migrations).
-- ============================================================================
BEGIN;

-- ---- members: date of birth ------------------------------------------------
ALTER TABLE members ADD COLUMN date_of_birth DATE;

-- birthday cron lookup: match on month+day across all live members
CREATE INDEX idx_members_birthday ON members (
  EXTRACT(MONTH FROM date_of_birth),
  EXTRACT(DAY   FROM date_of_birth)
) WHERE deleted_at IS NULL AND date_of_birth IS NOT NULL;

-- ---- services & attendance -------------------------------------------------
CREATE TABLE services (
  id           BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  local_id     BIGINT NOT NULL REFERENCES locals(id),
  service_date DATE NOT NULL DEFAULT CURRENT_DATE,
  service_type TEXT NOT NULL DEFAULT 'sunday_service' CHECK (service_type IN (
                 'sunday_service', 'midweek', 'special')),
  title        TEXT,
  created_by   UUID NOT NULL REFERENCES executives(id),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (local_id, service_date, service_type)
);
CREATE INDEX idx_services_local ON services (local_id, service_date DESC);

CREATE TABLE attendance_records (
  id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  service_id  BIGINT NOT NULL REFERENCES services(id) ON DELETE CASCADE,
  member_id   BIGINT NOT NULL REFERENCES members(id),
  recorded_by UUID NOT NULL REFERENCES executives(id),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (service_id, member_id)          -- presence is a row; absence is derived
);
CREATE INDEX idx_attendance_member ON attendance_records (member_id, service_id);

-- ---- public self-registration ----------------------------------------------
CREATE TABLE registration_links (
  token      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  local_id   BIGINT NOT NULL REFERENCES locals(id),
  active     BOOLEAN NOT NULL DEFAULT TRUE,
  expires_at TIMESTAMPTZ,
  created_by UUID NOT NULL REFERENCES executives(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_reglinks_local ON registration_links (local_id) WHERE active;

CREATE TABLE member_registrations (
  id                  BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  link_token          UUID NOT NULL REFERENCES registration_links(token),
  local_id            BIGINT NOT NULL REFERENCES locals(id),
  full_name           TEXT NOT NULL,
  gender              TEXT NOT NULL CHECK (gender IN ('male', 'female')),
  phone               TEXT NOT NULL CHECK (phone ~ '^\+233[0-9]{9}$'),
  email               CITEXT,
  student_id          TEXT NOT NULL,
  hall_of_residence   TEXT,
  wing_id             BIGINT,
  class_id            BIGINT,
  level               SMALLINT CHECK (level IN (100, 200, 300, 400, 500, 600)),
  expected_graduation DATE,
  date_of_birth       DATE,
  status              TEXT NOT NULL DEFAULT 'pending' CHECK (status IN (
                        'pending', 'approved', 'rejected')),
  matched_member_id   BIGINT REFERENCES members(id),   -- duplicate flag
  created_member_id   BIGINT REFERENCES members(id),   -- set on approval
  reviewed_by         UUID REFERENCES executives(id),
  reviewed_at         TIMESTAMPTZ,
  submitted_ip        TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT fk_reg_wing_in_local
    FOREIGN KEY (wing_id, local_id)  REFERENCES wings   (id, local_id),
  CONSTRAINT fk_reg_class_in_local
    FOREIGN KEY (class_id, local_id) REFERENCES classes (id, local_id)
);
CREATE INDEX idx_registrations_queue ON member_registrations (local_id, created_at DESC)
  WHERE status = 'pending';

-- crude rate limiting for the public endpoint (counter per IP per hour)
CREATE TABLE registration_rate_limits (
  ip          TEXT NOT NULL,
  window_hour TIMESTAMPTZ NOT NULL,
  count       INTEGER NOT NULL DEFAULT 1,
  PRIMARY KEY (ip, window_hour)
);

-- ---- birthday email de-duplication ------------------------------------------
CREATE TABLE birthday_email_log (
  member_id  BIGINT NOT NULL REFERENCES members(id),
  year       SMALLINT NOT NULL,
  sent_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (member_id, year)           -- one greeting per member per year, ever
);

-- RLS default-deny on the new tables (consistent with the rest)
ALTER TABLE services                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance_records       ENABLE ROW LEVEL SECURITY;
ALTER TABLE registration_links       ENABLE ROW LEVEL SECURITY;
ALTER TABLE member_registrations     ENABLE ROW LEVEL SECURITY;
ALTER TABLE registration_rate_limits ENABLE ROW LEVEL SECURITY;
ALTER TABLE birthday_email_log       ENABLE ROW LEVEL SECURITY;

COMMIT;
