-- =============================================================================
-- Migration: 0001_institutional_taxonomy
-- Purpose:   Core lookup tables for institutional structure.
--            All other tables depend on this hierarchy.
--            Campuses > Faculties > Departments
-- Security:  Public read (no sensitive data). No RLS required.
--            System Admin role manages via admin UI only.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. Campuses
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.campuses (
  id         UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  name       VARCHAR(100) NOT NULL,
  code       VARCHAR(20)  NOT NULL,
  is_active  BOOLEAN      NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ  NOT NULL DEFAULT clock_timestamp(),
  CONSTRAINT campuses_name_unique UNIQUE (name),
  CONSTRAINT campuses_code_unique UNIQUE (code)
);

CREATE INDEX idx_campuses_active ON public.campuses (is_active);

COMMENT ON TABLE  public.campuses          IS 'Unity University physical campuses. Seed data required before go-live.';
COMMENT ON COLUMN public.campuses.code     IS 'Short institutional identifier, e.g. GERJI, BOLE.';
COMMENT ON COLUMN public.campuses.is_active IS 'Soft-delete flag; deactivated campuses are hidden from intake wizard.';

-- ---------------------------------------------------------------------------
-- 2. Faculties
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.faculties (
  id         UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  campus_id  UUID         NOT NULL REFERENCES public.campuses(id) ON DELETE RESTRICT,
  name       VARCHAR(150) NOT NULL,
  code       VARCHAR(30)  NOT NULL,
  is_active  BOOLEAN      NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ  NOT NULL DEFAULT clock_timestamp(),
  CONSTRAINT faculties_campus_code_unique UNIQUE (campus_id, code)
);

CREATE INDEX idx_faculties_campus  ON public.faculties (campus_id);
CREATE INDEX idx_faculties_active  ON public.faculties (is_active);

COMMENT ON TABLE public.faculties IS 'Academic faculties and institutional divisions under a campus.';

-- ---------------------------------------------------------------------------
-- 3. Departments
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.departments (
  id          UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  faculty_id  UUID         NOT NULL REFERENCES public.faculties(id) ON DELETE RESTRICT,
  name        VARCHAR(150) NOT NULL,
  code        VARCHAR(30)  NOT NULL,
  head_title  VARCHAR(100) NULL,   -- e.g. "Department Chair" — not a person name
  is_active   BOOLEAN      NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT clock_timestamp(),
  CONSTRAINT departments_faculty_code_unique UNIQUE (faculty_id, code)
);

CREATE INDEX idx_departments_faculty ON public.departments (faculty_id);
CREATE INDEX idx_departments_active  ON public.departments (is_active);

COMMENT ON TABLE  public.departments            IS 'Specific academic departments and administrative service units.';
COMMENT ON COLUMN public.departments.head_title IS 'Role title of the departmental head (e.g. Department Chair, Director). Not a personal name.';

-- ---------------------------------------------------------------------------
-- 4. Complaint Categories
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.complaint_categories (
  id                   UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name                 VARCHAR(100) NOT NULL,
  code                 VARCHAR(50)  NOT NULL,
  description          TEXT         NULL,
  default_priority     VARCHAR(20)  NOT NULL DEFAULT 'MEDIUM',
  is_sensitive         BOOLEAN      NOT NULL DEFAULT false,
  sla_triage_hours     INTEGER      NOT NULL DEFAULT 48,
  sla_resolution_hours INTEGER      NOT NULL DEFAULT 240, -- 10 business days
  is_active            BOOLEAN      NOT NULL DEFAULT true,
  created_at           TIMESTAMPTZ  NOT NULL DEFAULT clock_timestamp(),
  CONSTRAINT categories_name_unique UNIQUE (name),
  CONSTRAINT categories_code_unique UNIQUE (code),
  CONSTRAINT categories_priority_check
    CHECK (default_priority IN ('LOW', 'MEDIUM', 'HIGH', 'URGENT')),
  CONSTRAINT categories_sla_triage_positive
    CHECK (sla_triage_hours > 0),
  CONSTRAINT categories_sla_resolution_positive
    CHECK (sla_resolution_hours > 0)
);

CREATE INDEX idx_categories_sensitive ON public.complaint_categories (is_sensitive);
CREATE INDEX idx_categories_active    ON public.complaint_categories (is_active);

COMMENT ON TABLE  public.complaint_categories              IS 'Master taxonomy of grievance types. is_sensitive=true auto-quarantines to Escalation Officers.';
COMMENT ON COLUMN public.complaint_categories.is_sensitive IS 'If true, complaint is automatically flagged is_restricted_sensitive and routes to escalation officers only.';
