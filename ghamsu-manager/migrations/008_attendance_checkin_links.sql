-- ============================================================================
-- GHAMSU Manager — Migration 008
-- Public self check-in links: lets a service's attendees mark themselves
-- present by student ID from their own phone, instead of an executive
-- tapping through the member list one by one. Many people can use the same
-- link for the same event concurrently — each submission is scoped to the
-- service_id in the link's token, not to a session.
-- ============================================================================
BEGIN;

CREATE TABLE attendance_links (
  token      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_id BIGINT NOT NULL REFERENCES services(id) ON DELETE CASCADE,
  active     BOOLEAN NOT NULL DEFAULT TRUE,
  expires_at TIMESTAMPTZ,
  created_by UUID NOT NULL REFERENCES executives(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_attendance_links_service ON attendance_links (service_id) WHERE active;

-- Separate from registration_rate_limits: a room full of people checking in
-- over the same chapel wifi/NAT shares one public IP, so this needs a much
-- higher ceiling than the registration form's per-IP limit — it's a backstop
-- against scripted abuse, not a real cap on legitimate concurrent use.
CREATE TABLE attendance_rate_limits (
  ip          TEXT NOT NULL,
  window_hour TIMESTAMPTZ NOT NULL,
  count       INTEGER NOT NULL DEFAULT 1,
  PRIMARY KEY (ip, window_hour)
);

ALTER TABLE attendance_links       ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance_rate_limits ENABLE ROW LEVEL SECURITY;

COMMIT;
