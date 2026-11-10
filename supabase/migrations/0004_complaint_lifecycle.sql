-- =============================================================================
-- Migration: 0004_complaint_lifecycle
-- Purpose:   Tables that model the operational lifecycle of a complaint:
--            - Assignments (who is handling it)
--            - Status history (immutable transition ledger)
--            - Public updates (official student communications)
--            - Internal notes (air-gapped, never visible to public)
--            - Attachments (metadata; files live in private storage bucket)
--            - Escalations (formal senior leadership referrals)
--
-- DESIGN INVARIANTS:
--  - internal_notes is NEVER joined in public tracking queries.
--  - complaint_updates with is_public=false are staff drafts; never returned
--    to the public tracking API.
--  - complaint_status_history is append-only (trigger enforced in 0006).
--
-- Security: RLS enabled (defined in migration 0007).
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. Complaint Assignments
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.complaint_assignments (
  id                       UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  complaint_id             UUID        NOT NULL REFERENCES public.complaints(id)     ON DELETE CASCADE,
  assigned_to_profile_id   UUID        NOT NULL REFERENCES public.profiles(id)       ON DELETE RESTRICT,
  assigned_by_profile_id   UUID        NOT NULL REFERENCES public.profiles(id)       ON DELETE RESTRICT,
  department_id            UUID        NOT NULL REFERENCES public.departments(id)    ON DELETE RESTRICT,
  assignment_note          TEXT        NULL,
  is_active                BOOLEAN     NOT NULL DEFAULT true,
  created_at               TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
  unassigned_at            TIMESTAMPTZ NULL,
  CONSTRAINT assignments_unassigned_after_created
    CHECK (unassigned_at IS NULL OR unassigned_at >= created_at)
);

CREATE INDEX idx_assignments_complaint  ON public.complaint_assignments (complaint_id);
CREATE INDEX idx_assignments_handler    ON public.complaint_assignments (assigned_to_profile_id, is_active);
CREATE INDEX idx_assignments_department ON public.complaint_assignments (department_id, is_active);

COMMENT ON TABLE  public.complaint_assignments           IS 'Full assignment history. is_active=true is the current active assignment.';
COMMENT ON COLUMN public.complaint_assignments.is_active IS 'Only one active assignment per complaint at a time. Previous assignments are archived (is_active=false).';

-- ---------------------------------------------------------------------------
-- 2. Complaint Status History (Append-Only Transition Ledger)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.complaint_status_history (
  id                      UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  complaint_id            UUID        NOT NULL REFERENCES public.complaints(id) ON DELETE CASCADE,
  from_status             VARCHAR(30) NULL,   -- NULL for initial NEW insertion
  to_status               VARCHAR(30) NOT NULL,
  reason                  TEXT        NULL,
  changed_by_profile_id   UUID        NULL REFERENCES public.profiles(id) ON DELETE SET NULL,
  is_system_automated     BOOLEAN     NOT NULL DEFAULT false,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
  CONSTRAINT status_history_to_status_check
    CHECK (to_status IN ('NEW', 'UNDER_REVIEW', 'ASSIGNED', 'IN_PROGRESS',
                         'AWAITING_RESPONSE', 'ESCALATED', 'RESOLVED', 'CLOSED', 'REOPENED'))
);

CREATE INDEX idx_status_history_complaint ON public.complaint_status_history (complaint_id, created_at ASC);

COMMENT ON TABLE public.complaint_status_history IS 'Immutable lifecycle ledger. Every status transition recorded here. Never update or delete rows (trigger enforced in 0006).';

-- ---------------------------------------------------------------------------
-- 3. Complaint Updates (Public Student-Facing Communications)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.complaint_updates (
  id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  complaint_id        UUID        NOT NULL REFERENCES public.complaints(id) ON DELETE CASCADE,
  author_profile_id   UUID        NULL REFERENCES public.profiles(id) ON DELETE SET NULL, -- NULL = student reply
  update_type         VARCHAR(30) NOT NULL,
  message             TEXT        NOT NULL,
  is_public           BOOLEAN     NOT NULL DEFAULT true,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
  CONSTRAINT updates_type_check
    CHECK (update_type IN ('OFFICIAL_UPDATE', 'CLARIFICATION_REQUEST', 'STUDENT_REPLY', 'RESOLUTION_NOTICE')),
  CONSTRAINT updates_message_min_length
    CHECK (char_length(message) >= 10)
);

CREATE INDEX idx_updates_complaint        ON public.complaint_updates (complaint_id, created_at ASC);
CREATE INDEX idx_updates_complaint_public ON public.complaint_updates (complaint_id, is_public) WHERE is_public = true;

COMMENT ON TABLE  public.complaint_updates          IS 'Official student-facing communications. Public tracking API only fetches rows where is_public=true.';
COMMENT ON COLUMN public.complaint_updates.is_public IS 'Only true records are returned to the public tracking portal. False = internal staff draft pending approval.';

-- ---------------------------------------------------------------------------
-- 4. Internal Notes (AIR-GAPPED — Strictly Staff Only)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.internal_notes (
  id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  complaint_id        UUID        NOT NULL REFERENCES public.complaints(id) ON DELETE CASCADE,
  author_profile_id   UUID        NOT NULL REFERENCES public.profiles(id)   ON DELETE RESTRICT,
  note                TEXT        NOT NULL,
  is_restricted       BOOLEAN     NOT NULL DEFAULT false,  -- true = only escalation_officer can view
  created_at          TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
  CONSTRAINT internal_notes_min_length
    CHECK (char_length(note) >= 5)
);

CREATE INDEX idx_internal_notes_complaint ON public.internal_notes (complaint_id, created_at ASC);

COMMENT ON TABLE  public.internal_notes            IS 'AIR-GAPPED internal investigation notes. NEVER queried or joined in public tracking endpoints. RLS denies anon access entirely.';
COMMENT ON COLUMN public.internal_notes.is_restricted IS 'When true: visible ONLY to escalation_officer role. Standard handlers cannot see restricted notes.';

CREATE TRIGGER internal_notes_updated_at_trigger
BEFORE UPDATE ON public.internal_notes
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ---------------------------------------------------------------------------
-- 5. Complaint Attachments (Metadata Only — Files in Private Storage Bucket)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.complaint_attachments (
  id                       UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  complaint_id             UUID         NOT NULL REFERENCES public.complaints(id)     ON DELETE CASCADE,
  internal_note_id         UUID         NULL REFERENCES public.internal_notes(id)     ON DELETE CASCADE,
  storage_path             VARCHAR(500) NOT NULL,
  file_name                VARCHAR(255) NOT NULL,
  file_size_bytes          INTEGER      NOT NULL,
  mime_type                VARCHAR(100) NOT NULL,
  is_internal_only         BOOLEAN      NOT NULL DEFAULT false,
  uploaded_by_profile_id   UUID         NULL REFERENCES public.profiles(id)           ON DELETE SET NULL,
  created_at               TIMESTAMPTZ  NOT NULL DEFAULT clock_timestamp(),
  CONSTRAINT attachments_storage_path_unique UNIQUE (storage_path),
  CONSTRAINT attachments_max_size
    CHECK (file_size_bytes > 0 AND file_size_bytes <= 5242880),  -- 5 MB
  CONSTRAINT attachments_allowed_mime
    CHECK (mime_type IN ('application/pdf', 'image/jpeg', 'image/png', 'image/webp'))
);

CREATE INDEX idx_attachments_complaint ON public.complaint_attachments (complaint_id);
CREATE INDEX idx_attachments_note      ON public.complaint_attachments (internal_note_id) WHERE internal_note_id IS NOT NULL;

COMMENT ON TABLE  public.complaint_attachments               IS 'File metadata only. Files reside in private Supabase Storage bucket. Access via short-lived signed URLs only.';
COMMENT ON COLUMN public.complaint_attachments.storage_path  IS 'Private bucket path: complaints/{complaint_id}/{uuid}-{filename}. Never expose as public URL.';
COMMENT ON COLUMN public.complaint_attachments.is_internal_only IS 'When true: file is linked to an internal note and is inaccessible via the public tracking portal.';

-- ---------------------------------------------------------------------------
-- 6. Escalations (Formal Senior Leadership Referrals)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.escalations (
  id                        UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  complaint_id              UUID        NOT NULL REFERENCES public.complaints(id) ON DELETE CASCADE,
  escalated_by_profile_id   UUID        NOT NULL REFERENCES public.profiles(id)  ON DELETE RESTRICT,
  target_role               VARCHAR(50) NOT NULL,
  reason                    TEXT        NOT NULL,
  action_taken              TEXT        NULL,
  resolved_at               TIMESTAMPTZ NULL,
  created_at                TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
  CONSTRAINT escalations_reason_min_length
    CHECK (char_length(reason) >= 30),
  CONSTRAINT escalations_resolved_after_created
    CHECK (resolved_at IS NULL OR resolved_at >= created_at)
);

CREATE INDEX idx_escalations_complaint ON public.escalations (complaint_id);
CREATE INDEX idx_escalations_resolved  ON public.escalations (resolved_at) WHERE resolved_at IS NULL;

COMMENT ON TABLE public.escalations IS 'Formal escalation records. reason must be substantive (>=30 chars). Every escalation is audited.';
