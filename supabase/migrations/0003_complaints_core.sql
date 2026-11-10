-- =============================================================================
-- Migration: 0003_complaints_core
-- Purpose:   The primary complaint record and decoupled identity table.
--
--            DESIGN INVARIANTS (enforced here and in RLS):
--            1. complaints contains NO personal student data.
--            2. complaint_identities holds PII and is controlled by strict RLS.
--            3. For ANONYMOUS submissions, no complaint_identities row exists.
--            4. tracking_hash stores ONLY the salted Argon2id hash of the
--               secret passcode. The plain passcode is never persisted.
--            5. A complaint is NEVER accessible via its id alone from a
--               public endpoint. Access requires tracking_number + passcode.
--
-- Security:  RLS enabled on both tables (defined in migration 0007).
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. Complaints (Core Operational Record — Zero PII)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.complaints (
  id                     UUID         PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Public tracking bearer credentials
  tracking_number        VARCHAR(30)  NOT NULL,
  tracking_hash          VARCHAR(255) NOT NULL,  -- Argon2id/bcrypt hash of passcode only

  -- Submission classification
  privacy_type           VARCHAR(20)  NOT NULL,
  status                 VARCHAR(30)  NOT NULL DEFAULT 'NEW',
  priority               VARCHAR(20)  NOT NULL DEFAULT 'MEDIUM',

  -- Institutional taxonomy (FK references)
  campus_id              UUID         NOT NULL REFERENCES public.campuses(id)             ON DELETE RESTRICT,
  faculty_id             UUID         NOT NULL REFERENCES public.faculties(id)            ON DELETE RESTRICT,
  department_id          UUID         NOT NULL REFERENCES public.departments(id)          ON DELETE RESTRICT,
  category_id            UUID         NOT NULL REFERENCES public.complaint_categories(id) ON DELETE RESTRICT,

  -- Complaint content
  subject                VARCHAR(200) NOT NULL,
  description            TEXT         NOT NULL,
  incident_date          DATE         NOT NULL,
  accused_party          VARCHAR(200) NULL,

  -- Sensitive case flags
  is_restricted_sensitive BOOLEAN     NOT NULL DEFAULT false,

  -- SLA tracking
  sla_status             VARCHAR(30)  NOT NULL DEFAULT 'NORMAL',
  triage_due_at          TIMESTAMPTZ  NULL,
  resolution_due_at      TIMESTAMPTZ  NULL,

  -- Lifecycle timestamps
  resolved_at            TIMESTAMPTZ  NULL,
  closed_at              TIMESTAMPTZ  NULL,
  reopened_at            TIMESTAMPTZ  NULL,
  created_at             TIMESTAMPTZ  NOT NULL DEFAULT clock_timestamp(),
  updated_at             TIMESTAMPTZ  NOT NULL DEFAULT clock_timestamp(),

  -- Constraints
  CONSTRAINT complaints_tracking_number_unique UNIQUE (tracking_number),
  CONSTRAINT complaints_privacy_type_check
    CHECK (privacy_type IN ('IDENTIFIED', 'CONFIDENTIAL', 'ANONYMOUS')),
  CONSTRAINT complaints_status_check
    CHECK (status IN ('NEW', 'UNDER_REVIEW', 'ASSIGNED', 'IN_PROGRESS',
                      'AWAITING_RESPONSE', 'ESCALATED', 'RESOLVED', 'CLOSED', 'REOPENED')),
  CONSTRAINT complaints_priority_check
    CHECK (priority IN ('LOW', 'MEDIUM', 'HIGH', 'URGENT')),
  CONSTRAINT complaints_sla_status_check
    CHECK (sla_status IN ('NORMAL', 'APPROACHING_BREACH', 'BREACHED')),
  CONSTRAINT complaints_incident_date_not_future
    CHECK (incident_date <= CURRENT_DATE),
  CONSTRAINT complaints_resolved_before_closed
    CHECK (resolved_at IS NULL OR closed_at IS NULL OR resolved_at <= closed_at),
  CONSTRAINT complaints_description_min_length
    CHECK (char_length(description) >= 20),
  CONSTRAINT complaints_subject_min_length
    CHECK (char_length(subject) >= 5)
);

-- Indexes
CREATE UNIQUE INDEX idx_complaints_tracking_number ON public.complaints (tracking_number);
CREATE        INDEX idx_complaints_status          ON public.complaints (status);
CREATE        INDEX idx_complaints_department      ON public.complaints (department_id);
CREATE        INDEX idx_complaints_category        ON public.complaints (category_id);
CREATE        INDEX idx_complaints_sensitive        ON public.complaints (is_restricted_sensitive) WHERE is_restricted_sensitive = true;
CREATE        INDEX idx_complaints_sla_status      ON public.complaints (sla_status) WHERE sla_status != 'NORMAL';
CREATE        INDEX idx_complaints_created_at      ON public.complaints (created_at DESC);
CREATE        INDEX idx_complaints_status_priority ON public.complaints (status, priority);

COMMENT ON TABLE  public.complaints                   IS 'Primary complaint record. Contains ZERO student PII. PII is in complaint_identities.';
COMMENT ON COLUMN public.complaints.tracking_number    IS 'Institutional reference code format: UU-YYYY-XXXXX. Stored cleartext for lookup.';
COMMENT ON COLUMN public.complaints.tracking_hash      IS 'Argon2id/bcrypt salted hash of the secret tracking passcode. NEVER store cleartext passcode.';
COMMENT ON COLUMN public.complaints.accused_party      IS 'Free-text name or office cited as respondent. Used for conflict-of-interest assignment checks.';
COMMENT ON COLUMN public.complaints.is_restricted_sensitive IS 'When true: complaint is quarantined from all standard queues. Only escalation_officer role can view.';

-- Auto-update updated_at
CREATE TRIGGER complaints_updated_at_trigger
BEFORE UPDATE ON public.complaints
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ---------------------------------------------------------------------------
-- 2. Complaint Identities (Decoupled PII — Strict Access Control)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.complaint_identities (
  id                UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  complaint_id      UUID         NOT NULL REFERENCES public.complaints(id) ON DELETE CASCADE,
  student_name      VARCHAR(150) NOT NULL,
  student_id_number VARCHAR(50)  NOT NULL,
  email             VARCHAR(255) NOT NULL,
  phone             VARCHAR(50)  NOT NULL,
  is_confidential   BOOLEAN      NOT NULL DEFAULT false,
  created_at        TIMESTAMPTZ  NOT NULL DEFAULT clock_timestamp(),
  CONSTRAINT complaint_identities_complaint_unique UNIQUE (complaint_id)
);

CREATE INDEX idx_identities_complaint   ON public.complaint_identities (complaint_id);
CREATE INDEX idx_identities_student_id  ON public.complaint_identities (student_id_number);

COMMENT ON TABLE  public.complaint_identities               IS 'Decoupled PII storage. For ANONYMOUS complaints this table has no row. RLS restricts confidential rows from department_handler role.';
COMMENT ON COLUMN public.complaint_identities.is_confidential IS 'When true: department_handler queries receive zero rows from this table. Only student_affairs_admin and escalation_officer can read.';

-- ---------------------------------------------------------------------------
-- 3. Enforce: Anonymous complaints must NOT have an identity row
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.enforce_no_identity_for_anonymous()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  v_privacy_type VARCHAR(20);
BEGIN
  SELECT privacy_type INTO v_privacy_type
  FROM public.complaints WHERE id = NEW.complaint_id;

  IF v_privacy_type = 'ANONYMOUS' THEN
    RAISE EXCEPTION
      'SECURITY VIOLATION: Identity record cannot be inserted for ANONYMOUS complaint (complaint_id: %)',
      NEW.complaint_id;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER enforce_no_identity_for_anonymous_trigger
BEFORE INSERT ON public.complaint_identities
FOR EACH ROW EXECUTE FUNCTION public.enforce_no_identity_for_anonymous();

COMMENT ON FUNCTION public.enforce_no_identity_for_anonymous() IS 'Hard database-level guard: prevents any PII record being stored for anonymous complaints, even if application logic is bypassed.';

-- ---------------------------------------------------------------------------
-- 4. Auto-escalate sensitive category complaints
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.auto_flag_sensitive_complaint()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  v_is_sensitive BOOLEAN;
BEGIN
  SELECT is_sensitive INTO v_is_sensitive
  FROM public.complaint_categories WHERE id = NEW.category_id;

  IF v_is_sensitive THEN
    NEW.is_restricted_sensitive := true;
    NEW.priority := 'URGENT';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER auto_flag_sensitive_complaint_trigger
BEFORE INSERT ON public.complaints
FOR EACH ROW EXECUTE FUNCTION public.auto_flag_sensitive_complaint();

COMMENT ON FUNCTION public.auto_flag_sensitive_complaint() IS 'Automatically quarantines complaints in sensitive categories (harassment, corruption) before the row is committed.';
