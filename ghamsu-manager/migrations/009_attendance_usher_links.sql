-- ============================================================================
-- GHAMSU Manager — Migration 009
-- Two follow-ups to the self check-in link (008):
--   1. Usher links: a second kind of check-in link, gated by a short passcode,
--      that an usher can use at the door to mark other people present. Any
--      number can be active per service (one per usher if desired), unlike
--      the single "self" link.
--   2. Both kinds are meant to expire at the end of the service's own day —
--      enforced in application code via expires_at, already a column on
--      attendance_links since 008.
-- ============================================================================
BEGIN;

ALTER TABLE attendance_links
  ADD COLUMN kind TEXT NOT NULL DEFAULT 'self' CHECK (kind IN ('self', 'usher')),
  ADD COLUMN label TEXT,
  ADD COLUMN passcode_hash TEXT;

-- At most one active self-checkin link per service — usher links aren't
-- capped, since a local may want a distinct link per usher.
CREATE UNIQUE INDEX idx_attendance_links_one_self_per_service
  ON attendance_links (service_id) WHERE active AND kind = 'self';

COMMIT;
