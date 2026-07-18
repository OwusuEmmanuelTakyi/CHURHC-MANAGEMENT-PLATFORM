-- ============================================================================
-- GHAMSU Manager — Migration 004
-- Atomic leadership handover: ends every current assignment in scope and
-- inserts the new academic year's assignments in a single transaction.
-- uq_current_holder (from migration 001) remains the backstop — if the
-- caller's p_assignments payload contains a duplicate position_id, the
-- second insert violates the unique index and the whole call rolls back.
-- ============================================================================

CREATE OR REPLACE FUNCTION perform_handover(
  p_scope TEXT,               -- 'national' or 'local'
  p_local_id BIGINT,          -- NULL for a national handover
  p_new_academic_year TEXT,
  p_assignments JSONB,        -- [{"position_id": 1, "member_id": 42}, ...]
  p_performed_by UUID
) RETURNS TABLE(ended_count INT, created_count INT)
LANGUAGE plpgsql AS $$
DECLARE
  v_ended INT;
  v_created INT;
BEGIN
  IF p_scope = 'national' THEN
    UPDATE leadership_assignments la
    SET end_date = CURRENT_DATE
    FROM leadership_positions lp
    WHERE la.position_id = lp.id
      AND la.end_date IS NULL
      AND lp.scope = 'national';
  ELSIF p_scope = 'local' THEN
    IF p_local_id IS NULL THEN
      RAISE EXCEPTION 'p_local_id is required for a local handover';
    END IF;
    UPDATE leadership_assignments la
    SET end_date = CURRENT_DATE
    FROM leadership_positions lp
    WHERE la.position_id = lp.id
      AND la.end_date IS NULL
      AND lp.local_id = p_local_id;
  ELSE
    RAISE EXCEPTION 'Invalid scope: %', p_scope;
  END IF;
  GET DIAGNOSTICS v_ended = ROW_COUNT;

  INSERT INTO leadership_assignments (member_id, position_id, academic_year, start_date, end_date, assigned_by)
  SELECT
    (elem->>'member_id')::BIGINT,
    (elem->>'position_id')::BIGINT,
    p_new_academic_year,
    CURRENT_DATE,
    NULL,
    p_performed_by
  FROM jsonb_array_elements(p_assignments) AS elem;
  GET DIAGNOSTICS v_created = ROW_COUNT;

  RETURN QUERY SELECT v_ended, v_created;
END;
$$;
