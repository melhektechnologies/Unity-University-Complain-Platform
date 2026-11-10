-- =============================================================================
-- Migration: 0007_row_level_security
-- Purpose:   Complete Row Level Security (RLS) policy definitions for all
--            operational tables.
--
-- DESIGN PRINCIPLES:
--  1. Default DENY ALL — no policy = no access.
--  2. RLS is a SECONDARY control. Application guards are PRIMARY.
--     Both must independently reject unauthorized access.
--  3. The anon (public) role can NEVER access internal_notes,
--     complaint_identities, complaint_assignments, or staff data.
--  4. All policies use auth.uid() and auth.current_staff_roles()
--     (defined below) — not application-level claims that could be forged.
--
-- HOW TO TEST EACH POLICY:
--  - Connect as a database user with the target Supabase JWT role.
--  - Execute the query that the policy guards.
--  - Verify the expected row count (0 for blocked, N for permitted).
--  - See /docs/security/security-model.md §3 for the test matrix.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 0. Helper: returns the authenticated staff user's role IDs
--    SECURITY DEFINER to prevent tampering via search_path
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_my_roles()
RETURNS SETOF VARCHAR LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT role_id FROM public.user_roles WHERE profile_id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION public.has_role(p_role VARCHAR)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE profile_id = auth.uid() AND role_id = p_role
  );
$$;

CREATE OR REPLACE FUNCTION public.has_any_role(p_roles VARCHAR[])
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE profile_id = auth.uid() AND role_id = ANY(p_roles)
  );
$$;

CREATE OR REPLACE FUNCTION public.my_department_id()
RETURNS UUID LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT department_id FROM public.profiles WHERE id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION public.my_full_name()
RETURNS VARCHAR LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT full_name FROM public.profiles WHERE id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION public.is_active_staff()
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE(
    (SELECT is_active FROM public.profiles WHERE id = auth.uid()),
    false
  );
$$;

-- ---------------------------------------------------------------------------
-- 1. CAMPUSES — Public read (non-sensitive lookup data)
-- ---------------------------------------------------------------------------
ALTER TABLE public.campuses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "campuses_public_read" ON public.campuses
  FOR SELECT TO anon, authenticated USING (is_active = true);

CREATE POLICY "campuses_admin_all" ON public.campuses
  FOR ALL TO authenticated
  USING    (public.is_active_staff() AND public.has_role('system_admin'))
  WITH CHECK (public.is_active_staff() AND public.has_role('system_admin'));

-- ---------------------------------------------------------------------------
-- 2. FACULTIES — Public read (non-sensitive lookup data)
-- ---------------------------------------------------------------------------
ALTER TABLE public.faculties ENABLE ROW LEVEL SECURITY;

CREATE POLICY "faculties_public_read" ON public.faculties
  FOR SELECT TO anon, authenticated USING (is_active = true);

CREATE POLICY "faculties_admin_all" ON public.faculties
  FOR ALL TO authenticated
  USING    (public.is_active_staff() AND public.has_role('system_admin'))
  WITH CHECK (public.is_active_staff() AND public.has_role('system_admin'));

-- ---------------------------------------------------------------------------
-- 3. DEPARTMENTS — Public read (non-sensitive lookup data)
-- ---------------------------------------------------------------------------
ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "departments_public_read" ON public.departments
  FOR SELECT TO anon, authenticated USING (is_active = true);

CREATE POLICY "departments_admin_all" ON public.departments
  FOR ALL TO authenticated
  USING    (public.is_active_staff() AND public.has_role('system_admin'))
  WITH CHECK (public.is_active_staff() AND public.has_role('system_admin'));

-- ---------------------------------------------------------------------------
-- 4. COMPLAINT CATEGORIES — Public read
-- ---------------------------------------------------------------------------
ALTER TABLE public.complaint_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "categories_public_read" ON public.complaint_categories
  FOR SELECT TO anon, authenticated USING (is_active = true);

CREATE POLICY "categories_admin_all" ON public.complaint_categories
  FOR ALL TO authenticated
  USING    (public.is_active_staff() AND public.has_role('system_admin'))
  WITH CHECK (public.is_active_staff() AND public.has_role('system_admin'));

-- ---------------------------------------------------------------------------
-- 5. ROLES — Staff read; Admin write
-- ---------------------------------------------------------------------------
ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "roles_staff_read" ON public.roles
  FOR SELECT TO authenticated USING (public.is_active_staff());

CREATE POLICY "roles_admin_write" ON public.roles
  FOR INSERT TO authenticated
  WITH CHECK (public.is_active_staff() AND public.has_role('system_admin'));

-- ---------------------------------------------------------------------------
-- 6. PROFILES — Staff read own; Admin read all; Admin write
-- ---------------------------------------------------------------------------
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "profiles_own_read" ON public.profiles
  FOR SELECT TO authenticated USING (id = auth.uid());

CREATE POLICY "profiles_admin_read_all" ON public.profiles
  FOR SELECT TO authenticated
  USING (public.is_active_staff() AND public.has_any_role(ARRAY['system_admin', 'student_affairs_admin']));

CREATE POLICY "profiles_admin_write" ON public.profiles
  FOR ALL TO authenticated
  USING    (public.is_active_staff() AND public.has_role('system_admin'))
  WITH CHECK (public.is_active_staff() AND public.has_role('system_admin'));

-- ---------------------------------------------------------------------------
-- 7. USER_ROLES — Admin manages; Staff read own
-- ---------------------------------------------------------------------------
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user_roles_own_read" ON public.user_roles
  FOR SELECT TO authenticated USING (profile_id = auth.uid());

CREATE POLICY "user_roles_admin_all" ON public.user_roles
  FOR ALL TO authenticated
  USING    (public.is_active_staff() AND public.has_role('system_admin'))
  WITH CHECK (public.is_active_staff() AND public.has_role('system_admin'));

-- ---------------------------------------------------------------------------
-- 8. COMPLAINTS — Multi-policy access control
--
--  PUBLIC INSERT  : anon may insert (complaint submission)
--  PUBLIC SELECT  : via tracking session only (server enforces, no direct RLS)
--  STAFF SELECT   : role-scoped (dept handlers see only their dept)
--  RESTRICTED     : only escalation_officer sees is_restricted_sensitive=true
-- ---------------------------------------------------------------------------
ALTER TABLE public.complaints ENABLE ROW LEVEL SECURITY;

-- Public may INSERT new complaints (strict validation of initial state)
CREATE POLICY "complaints_public_insert" ON public.complaints
  FOR INSERT TO anon, authenticated
  WITH CHECK (
    status = 'NEW'
    AND sla_status = 'NORMAL'
    AND resolved_at IS NULL
    AND closed_at IS NULL
    AND reopened_at IS NULL
    AND incident_date <= CURRENT_DATE
  );

-- Staff: Student Affairs Admin + Reviewer: all non-restricted
CREATE POLICY "complaints_triage_staff_read" ON public.complaints
  FOR SELECT TO authenticated
  USING (
    public.is_active_staff()
    AND is_restricted_sensitive = false
    AND public.has_any_role(ARRAY['student_affairs_admin', 'complaint_reviewer'])
  );

-- Staff: Department Handler: only their department, non-restricted, not cited as accused_party
CREATE POLICY "complaints_dept_handler_read" ON public.complaints
  FOR SELECT TO authenticated
  USING (
    public.is_active_staff()
    AND is_restricted_sensitive = false
    AND public.has_role('department_handler')
    AND department_id = public.my_department_id()
    AND (
      accused_party IS NULL 
      OR NOT (LOWER(accused_party) ILIKE '%' || LOWER(public.my_full_name()) || '%')
    )
  );

-- Staff: Escalation Officer: ALL complaints including restricted
CREATE POLICY "complaints_escalation_officer_read" ON public.complaints
  FOR SELECT TO authenticated
  USING (
    public.is_active_staff()
    AND public.has_role('escalation_officer')
  );

-- Staff: Auditor: ALL non-restricted (read-only)
CREATE POLICY "complaints_auditor_read" ON public.complaints
  FOR SELECT TO authenticated
  USING (
    public.is_active_staff()
    AND is_restricted_sensitive = false
    AND public.has_role('auditor')
  );

-- Staff updates (status, assignment, etc.)
CREATE POLICY "complaints_triage_staff_update" ON public.complaints
  FOR UPDATE TO authenticated
  USING (
    public.is_active_staff()
    AND public.has_any_role(ARRAY['student_affairs_admin', 'escalation_officer'])
  );

CREATE POLICY "complaints_dept_handler_update" ON public.complaints
  FOR UPDATE TO authenticated
  USING (
    public.is_active_staff()
    AND public.has_role('department_handler')
    AND department_id = public.my_department_id()
    AND is_restricted_sensitive = false
    AND (
      accused_party IS NULL 
      OR NOT (LOWER(accused_party) ILIKE '%' || LOWER(public.my_full_name()) || '%')
    )
  );

-- ---------------------------------------------------------------------------
-- 9. COMPLAINT_IDENTITIES — Strictly controlled PII access
--
--  ANONYMOUS  -> no row exists (enforced by trigger in 0003)
--  IDENTIFIED -> student_affairs_admin, escalation_officer, assigned dept_handler
--  CONFIDENTIAL -> ONLY student_affairs_admin and escalation_officer
-- ---------------------------------------------------------------------------
ALTER TABLE public.complaint_identities ENABLE ROW LEVEL SECURITY;

-- Student Affairs Admin & Escalation Officer: ALL identity records
CREATE POLICY "identities_privileged_read" ON public.complaint_identities
  FOR SELECT TO authenticated
  USING (
    public.is_active_staff()
    AND public.has_any_role(ARRAY['student_affairs_admin', 'escalation_officer'])
  );

-- Department Handler: ONLY non-confidential, for their department
CREATE POLICY "identities_dept_handler_identified_read" ON public.complaint_identities
  FOR SELECT TO authenticated
  USING (
    public.is_active_staff()
    AND public.has_role('department_handler')
    AND is_confidential = false
    AND complaint_id IN (
      SELECT id FROM public.complaints
      WHERE department_id = public.my_department_id()
      AND is_restricted_sensitive = false
    )
  );

-- INSERT: application service layer only (via service-role in submit action)
-- No direct INSERT policy for anon — submission server action uses admin client
-- for identity insertion after complaint row is committed.

-- ---------------------------------------------------------------------------
-- 10. COMPLAINT_ASSIGNMENTS
-- ---------------------------------------------------------------------------
ALTER TABLE public.complaint_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "assignments_privileged_read" ON public.complaint_assignments
  FOR SELECT TO authenticated
  USING (
    public.is_active_staff()
    AND public.has_any_role(ARRAY['student_affairs_admin', 'escalation_officer', 'auditor'])
  );

CREATE POLICY "assignments_dept_handler_read" ON public.complaint_assignments
  FOR SELECT TO authenticated
  USING (
    public.is_active_staff()
    AND public.has_role('department_handler')
    AND department_id = public.my_department_id()
  );

CREATE POLICY "assignments_triage_write" ON public.complaint_assignments
  FOR INSERT TO authenticated
  WITH CHECK (
    public.is_active_staff()
    AND public.has_any_role(ARRAY['student_affairs_admin', 'escalation_officer'])
  );

CREATE POLICY "assignments_triage_update" ON public.complaint_assignments
  FOR UPDATE TO authenticated
  USING (
    public.is_active_staff()
    AND public.has_any_role(ARRAY['student_affairs_admin', 'escalation_officer'])
  );

-- ---------------------------------------------------------------------------
-- 11. COMPLAINT_STATUS_HISTORY — Append-only read
-- ---------------------------------------------------------------------------
ALTER TABLE public.complaint_status_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "status_history_staff_read" ON public.complaint_status_history
  FOR SELECT TO authenticated
  USING (
    public.is_active_staff()
    AND public.has_any_role(ARRAY[
      'student_affairs_admin', 'complaint_reviewer',
      'escalation_officer', 'auditor'
    ])
  );

CREATE POLICY "status_history_dept_read" ON public.complaint_status_history
  FOR SELECT TO authenticated
  USING (
    public.is_active_staff()
    AND public.has_role('department_handler')
    AND complaint_id IN (
      SELECT id FROM public.complaints
      WHERE department_id = public.my_department_id()
    )
  );

-- INSERT only (immutability trigger blocks UPDATE/DELETE)
CREATE POLICY "status_history_insert" ON public.complaint_status_history
  FOR INSERT TO authenticated
  WITH CHECK (public.is_active_staff());

-- ---------------------------------------------------------------------------
-- 12. COMPLAINT_UPDATES — Public reads for is_public=true via server action
--     (Server enforces tracking token; no direct anon RLS policy needed here)
-- ---------------------------------------------------------------------------
ALTER TABLE public.complaint_updates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "updates_staff_read_all" ON public.complaint_updates
  FOR SELECT TO authenticated
  USING (
    public.is_active_staff()
    AND public.has_any_role(ARRAY[
      'student_affairs_admin', 'complaint_reviewer',
      'escalation_officer', 'auditor'
    ])
  );

CREATE POLICY "updates_dept_handler_read" ON public.complaint_updates
  FOR SELECT TO authenticated
  USING (
    public.is_active_staff()
    AND public.has_role('department_handler')
    AND complaint_id IN (
      SELECT id FROM public.complaints
      WHERE department_id = public.my_department_id()
    )
  );

CREATE POLICY "updates_staff_insert" ON public.complaint_updates
  FOR INSERT TO authenticated
  WITH CHECK (
    public.is_active_staff()
    AND public.has_any_role(ARRAY[
      'student_affairs_admin', 'department_handler', 'escalation_officer'
    ])
  );

-- ---------------------------------------------------------------------------
-- 13. INTERNAL NOTES — AIR-GAPPED: Strictly staff only. anon = NEVER.
-- ---------------------------------------------------------------------------
ALTER TABLE public.internal_notes ENABLE ROW LEVEL SECURITY;

-- Privileged staff: all notes
CREATE POLICY "internal_notes_privileged_read" ON public.internal_notes
  FOR SELECT TO authenticated
  USING (
    public.is_active_staff()
    AND public.has_any_role(ARRAY['student_affairs_admin', 'escalation_officer', 'auditor'])
  );

-- Department Handler: assigned cases, non-restricted notes, no conflict of interest
CREATE POLICY "internal_notes_dept_handler_read" ON public.internal_notes
  FOR SELECT TO authenticated
  USING (
    public.is_active_staff()
    AND public.has_role('department_handler')
    AND is_restricted = false
    AND complaint_id IN (
      SELECT id FROM public.complaints
      WHERE department_id = public.my_department_id()
      AND is_restricted_sensitive = false
      AND (
        accused_party IS NULL 
        OR NOT (LOWER(accused_party) ILIKE '%' || LOWER(public.my_full_name()) || '%')
      )
    )
  );

-- Staff write
CREATE POLICY "internal_notes_staff_insert" ON public.internal_notes
  FOR INSERT TO authenticated
  WITH CHECK (
    public.is_active_staff()
    AND public.has_any_role(ARRAY[
      'student_affairs_admin', 'complaint_reviewer',
      'department_handler', 'escalation_officer'
    ])
    AND author_profile_id = auth.uid()
  );

CREATE POLICY "internal_notes_own_update" ON public.internal_notes
  FOR UPDATE TO authenticated
  USING (
    public.is_active_staff()
    AND author_profile_id = auth.uid()
  );

-- ---------------------------------------------------------------------------
-- 14. COMPLAINT_ATTACHMENTS
-- ---------------------------------------------------------------------------
ALTER TABLE public.complaint_attachments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "attachments_staff_read" ON public.complaint_attachments
  FOR SELECT TO authenticated
  USING (
    public.is_active_staff()
    AND public.has_any_role(ARRAY[
      'student_affairs_admin', 'complaint_reviewer',
      'escalation_officer', 'auditor'
    ])
  );

CREATE POLICY "attachments_dept_handler_read" ON public.complaint_attachments
  FOR SELECT TO authenticated
  USING (
    public.is_active_staff()
    AND public.has_role('department_handler')
    AND is_internal_only = false
    AND complaint_id IN (
      SELECT id FROM public.complaints
      WHERE department_id = public.my_department_id()
      AND (
        accused_party IS NULL 
        OR NOT (LOWER(accused_party) ILIKE '%' || LOWER(public.my_full_name()) || '%')
      )
    )
  );

-- INSERT: handled by server action (uses admin client for submission path)

-- ---------------------------------------------------------------------------
-- 15. ESCALATIONS
-- ---------------------------------------------------------------------------
ALTER TABLE public.escalations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "escalations_officer_all" ON public.escalations
  FOR ALL TO authenticated
  USING (
    public.is_active_staff()
    AND public.has_any_role(ARRAY['student_affairs_admin', 'escalation_officer'])
  )
  WITH CHECK (
    public.is_active_staff()
    AND public.has_any_role(ARRAY['student_affairs_admin', 'escalation_officer'])
  );

CREATE POLICY "escalations_dept_handler_insert" ON public.escalations
  FOR INSERT TO authenticated
  WITH CHECK (
    public.is_active_staff()
    AND public.has_role('department_handler')
    AND escalated_by_profile_id = auth.uid()
  );

CREATE POLICY "escalations_auditor_read" ON public.escalations
  FOR SELECT TO authenticated
  USING (public.is_active_staff() AND public.has_role('auditor'));

-- ---------------------------------------------------------------------------
-- 16. AUDIT LOGS — System_admin and auditor read; no one deletes
-- ---------------------------------------------------------------------------
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "audit_logs_admin_auditor_read" ON public.audit_logs
  FOR SELECT TO authenticated
  USING (
    public.is_active_staff()
    AND public.has_any_role(ARRAY['system_admin', 'auditor'])
  );

-- student_affairs_admin and escalation_officer can read case-level audit entries
CREATE POLICY "audit_logs_triage_case_read" ON public.audit_logs
  FOR SELECT TO authenticated
  USING (
    public.is_active_staff()
    AND public.has_any_role(ARRAY['student_affairs_admin', 'escalation_officer'])
    AND entity_table IN ('complaints', 'complaint_assignments',
                         'complaint_status_history', 'escalations')
  );

-- INSERT via service-role admin client only (bypasses RLS)
-- No RLS INSERT policy needed here — service role is used for audit writes

-- ---------------------------------------------------------------------------
-- 17. SYSTEM SETTINGS — Admin write; authenticated read
-- ---------------------------------------------------------------------------
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "system_settings_staff_read" ON public.system_settings
  FOR SELECT TO authenticated USING (public.is_active_staff());

CREATE POLICY "system_settings_admin_write" ON public.system_settings
  FOR ALL TO authenticated
  USING    (public.is_active_staff() AND public.has_role('system_admin'))
  WITH CHECK (public.is_active_staff() AND public.has_role('system_admin'));
