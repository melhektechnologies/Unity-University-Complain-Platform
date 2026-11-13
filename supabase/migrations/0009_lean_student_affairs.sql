-- =============================================================================
-- Migration: 0009_lean_student_affairs
-- Purpose:   One-officer Student Affairs lifecycle + optional email on identity.
--
-- Statuses:
--   NEW (Submitted)
--   UNDER_REVIEW (On Review)
--   IN_PROGRESS (In Progress)
--   AWAITING_RESPONSE (Needs Info)
--   RESOLVED (Solved)
--   CLOSED (Closed)
-- =============================================================================

CREATE OR REPLACE FUNCTION public.validate_status_transition()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  v_from VARCHAR(30) := OLD.status;
  v_to   VARCHAR(30) := NEW.status;
BEGIN
  IF v_from = v_to THEN
    RETURN NEW;
  END IF;

  IF NOT (
    (v_from = 'NEW'               AND v_to IN ('UNDER_REVIEW')) OR
    (v_from = 'UNDER_REVIEW'      AND v_to IN ('IN_PROGRESS', 'AWAITING_RESPONSE', 'RESOLVED', 'CLOSED')) OR
    (v_from = 'IN_PROGRESS'       AND v_to IN ('AWAITING_RESPONSE', 'RESOLVED', 'CLOSED')) OR
    (v_from = 'AWAITING_RESPONSE' AND v_to IN ('UNDER_REVIEW', 'IN_PROGRESS', 'RESOLVED', 'CLOSED')) OR
    (v_from = 'RESOLVED'          AND v_to IN ('CLOSED'))
  ) THEN
    RAISE EXCEPTION
      'INVALID_STATUS_TRANSITION: Cannot transition complaint from "%" to "%". Complaint ID: %',
      v_from, v_to, NEW.id
      USING ERRCODE = 'P0001';
  END IF;

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.validate_status_transition() IS
  'Lean Student Affairs lifecycle: Submitted → On Review → In Progress → Solved → Closed, '
  'with Needs Info as a side state while waiting on the student.';

-- Lean intake: email is optional; phone + name + student ID are required.
ALTER TABLE public.complaint_identities
  ALTER COLUMN email DROP NOT NULL;
