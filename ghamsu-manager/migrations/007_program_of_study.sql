-- ============================================================================
-- GHAMSU Manager — Migration 007
-- Program of study — free text, same pattern as hall_of_residence (no fixed
-- list to maintain per local; 7 universities' programs vary too much for that).
-- ============================================================================
BEGIN;

ALTER TABLE members ADD COLUMN program_of_study TEXT;
ALTER TABLE member_registrations ADD COLUMN program_of_study TEXT;

COMMIT;
