-- =============================================================================
-- Migration: 0006_state_machine_guard
-- Purpose:   Server-enforced PostgreSQL trigger that validates all complaint
--            status transitions against the approved state machine.
--
--            This is a SECONDARY defense. The primary guard is in the
--            application service layer (complaint.service.ts).
--            Both must independently reject illegal transitions.
--
-- Permitted transitions (from -> to):
--   NEW            -> UNDER_REVIEW, ESCALATED
--   UNDER_REVIEW   -> ASSIGNED, ESCALATED, RESOLVED
--   ASSIGNED       -> IN_PROGRESS, ESCALATED, UNDER_REVIEW
--   IN_PROGRESS    -> AWAITING_RESPONSE, ESCALATED, RESOLVED
--   AWAITING_RESP  -> IN_PROGRESS, ESCALATED, CLOSED
--   ESCALATED      -> IN_PROGRESS, RESOLVED, CLOSED
--   RESOLVED       -> CLOSED, REOPENED
--   CLOSED         -> REOPENED
--   REOPENED       -> UNDER_REVIEW, ASSIGNED
--
-- Violations raise an exception with a structured error code that the
-- application layer catches and formats for the client.
-- =============================================================================

CREATE OR REPLACE FUNCTION public.validate_status_transition()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  v_from VARCHAR(30) := OLD.status;
  v_to   VARCHAR(30) := NEW.status;
BEGIN
  -- No change — allow
  IF v_from = v_to THEN
    RETURN NEW;
  END IF;

  -- Validate transition using a decision structure
  IF NOT (
    (v_from = 'NEW'               AND v_to IN ('UNDER_REVIEW', 'ESCALATED'))            OR
    (v_from = 'UNDER_REVIEW'      AND v_to IN ('ASSIGNED', 'ESCALATED', 'RESOLVED'))     OR
    (v_from = 'ASSIGNED'          AND v_to IN ('IN_PROGRESS', 'ESCALATED', 'UNDER_REVIEW')) OR
    (v_from = 'IN_PROGRESS'       AND v_to IN ('AWAITING_RESPONSE', 'ESCALATED', 'RESOLVED')) OR
    (v_from = 'AWAITING_RESPONSE' AND v_to IN ('IN_PROGRESS', 'ESCALATED', 'CLOSED'))    OR
    (v_from = 'ESCALATED'         AND v_to IN ('IN_PROGRESS', 'RESOLVED', 'CLOSED'))     OR
    (v_from = 'RESOLVED'          AND v_to IN ('CLOSED', 'REOPENED'))                    OR
    (v_from = 'CLOSED'            AND v_to IN ('REOPENED'))                              OR
    (v_from = 'REOPENED'          AND v_to IN ('UNDER_REVIEW', 'ASSIGNED'))
  ) THEN
    RAISE EXCEPTION
      'INVALID_STATUS_TRANSITION: Cannot transition complaint from "%" to "%". Complaint ID: %',
      v_from, v_to, NEW.id
      USING ERRCODE = 'P0001';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER complaints_status_transition_guard
BEFORE UPDATE OF status ON public.complaints
FOR EACH ROW EXECUTE FUNCTION public.validate_status_transition();

COMMENT ON FUNCTION public.validate_status_transition() IS
  'Database-level enforcement of the complaint lifecycle state machine. '
  'Acts as a secondary defence after application-layer validation. '
  'Rejects any UPDATE to complaints.status that violates the approved transition graph.';

-- ---------------------------------------------------------------------------
-- Auto-insert status history row on every status change
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.record_status_change()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO public.complaint_status_history
      (complaint_id, from_status, to_status, is_system_automated)
    VALUES
      (NEW.id, OLD.status, NEW.status, false);
    -- Note: changed_by_profile_id and reason are populated by the
    -- application service layer via a separate INSERT if available.
    -- This trigger guarantees a history row even if service omits it.
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER complaints_record_status_change_trigger
AFTER UPDATE OF status ON public.complaints
FOR EACH ROW EXECUTE FUNCTION public.record_status_change();

COMMENT ON FUNCTION public.record_status_change() IS
  'Automatically appends a row to complaint_status_history whenever complaints.status changes. '
  'Guarantees the status ledger is always populated, even if the service layer malfunctions.';
