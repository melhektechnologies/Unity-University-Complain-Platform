-- The MVP has one complaint receiver: the Student Affairs officer using the CMS.
-- Keep student submission/tracking server flows intact, but remove direct
-- authenticated staff access to case data for other roles.
BEGIN;

-- The all-case Student Affairs SELECT policy from 0013 remains in force.
DROP POLICY IF EXISTS complaints_triage_staff_read ON public.complaints;
DROP POLICY IF EXISTS complaints_dept_handler_read ON public.complaints;
DROP POLICY IF EXISTS complaints_escalation_officer_read ON public.complaints;
DROP POLICY IF EXISTS complaints_auditor_read ON public.complaints;

DROP POLICY IF EXISTS complaints_triage_staff_update ON public.complaints;
DROP POLICY IF EXISTS complaints_dept_handler_update ON public.complaints;
CREATE POLICY complaints_student_affairs_update
  ON public.complaints
  FOR UPDATE
  TO authenticated
  USING (
    public.is_active_staff()
    AND public.has_role('student_affairs_admin')
  )
  WITH CHECK (
    public.is_active_staff()
    AND public.has_role('student_affairs_admin')
  );

-- Student identity is visible only to the designated active Student Affairs role.
DROP POLICY IF EXISTS identities_privileged_read ON public.complaint_identities;
DROP POLICY IF EXISTS identities_dept_handler_identified_read ON public.complaint_identities;
CREATE POLICY identities_student_affairs_read
  ON public.complaint_identities
  FOR SELECT
  TO authenticated
  USING (
    public.is_active_staff()
    AND public.has_role('student_affairs_admin')
  );

-- Case assignments are managed by the same single receiver.
DROP POLICY IF EXISTS assignments_privileged_read ON public.complaint_assignments;
DROP POLICY IF EXISTS assignments_dept_handler_read ON public.complaint_assignments;
DROP POLICY IF EXISTS assignments_triage_write ON public.complaint_assignments;
DROP POLICY IF EXISTS assignments_triage_update ON public.complaint_assignments;
CREATE POLICY assignments_student_affairs_read
  ON public.complaint_assignments
  FOR SELECT
  TO authenticated
  USING (
    public.is_active_staff()
    AND public.has_role('student_affairs_admin')
  );
CREATE POLICY assignments_student_affairs_insert
  ON public.complaint_assignments
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.is_active_staff()
    AND public.has_role('student_affairs_admin')
  );
CREATE POLICY assignments_student_affairs_update
  ON public.complaint_assignments
  FOR UPDATE
  TO authenticated
  USING (
    public.is_active_staff()
    AND public.has_role('student_affairs_admin')
  )
  WITH CHECK (
    public.is_active_staff()
    AND public.has_role('student_affairs_admin')
  );

-- Status history and public updates are read/written through the Student Affairs CMS.
DROP POLICY IF EXISTS status_history_staff_read ON public.complaint_status_history;
DROP POLICY IF EXISTS status_history_dept_read ON public.complaint_status_history;
DROP POLICY IF EXISTS status_history_insert ON public.complaint_status_history;
CREATE POLICY status_history_student_affairs_read
  ON public.complaint_status_history
  FOR SELECT
  TO authenticated
  USING (
    public.is_active_staff()
    AND public.has_role('student_affairs_admin')
  );
CREATE POLICY status_history_student_affairs_insert
  ON public.complaint_status_history
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.is_active_staff()
    AND public.has_role('student_affairs_admin')
  );

DROP POLICY IF EXISTS updates_staff_read_all ON public.complaint_updates;
DROP POLICY IF EXISTS updates_dept_handler_read ON public.complaint_updates;
DROP POLICY IF EXISTS updates_staff_insert ON public.complaint_updates;
CREATE POLICY updates_student_affairs_read
  ON public.complaint_updates
  FOR SELECT
  TO authenticated
  USING (
    public.is_active_staff()
    AND public.has_role('student_affairs_admin')
  );
CREATE POLICY updates_student_affairs_insert
  ON public.complaint_updates
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.is_active_staff()
    AND public.has_role('student_affairs_admin')
  );

-- Private notes and attachment metadata must follow the same case boundary.
DROP POLICY IF EXISTS internal_notes_privileged_read ON public.internal_notes;
DROP POLICY IF EXISTS internal_notes_dept_handler_read ON public.internal_notes;
DROP POLICY IF EXISTS internal_notes_staff_insert ON public.internal_notes;
DROP POLICY IF EXISTS internal_notes_own_update ON public.internal_notes;
CREATE POLICY internal_notes_student_affairs_read
  ON public.internal_notes
  FOR SELECT
  TO authenticated
  USING (
    public.is_active_staff()
    AND public.has_role('student_affairs_admin')
  );
CREATE POLICY internal_notes_student_affairs_insert
  ON public.internal_notes
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.is_active_staff()
    AND public.has_role('student_affairs_admin')
    AND author_profile_id = auth.uid()
  );
CREATE POLICY internal_notes_student_affairs_update
  ON public.internal_notes
  FOR UPDATE
  TO authenticated
  USING (
    public.is_active_staff()
    AND public.has_role('student_affairs_admin')
    AND author_profile_id = auth.uid()
  )
  WITH CHECK (
    public.is_active_staff()
    AND public.has_role('student_affairs_admin')
    AND author_profile_id = auth.uid()
  );

DROP POLICY IF EXISTS attachments_staff_read ON public.complaint_attachments;
DROP POLICY IF EXISTS attachments_dept_handler_read ON public.complaint_attachments;
CREATE POLICY attachments_student_affairs_read
  ON public.complaint_attachments
  FOR SELECT
  TO authenticated
  USING (
    public.is_active_staff()
    AND public.has_role('student_affairs_admin')
  );

-- The Student Affairs officer is the only MVP case manager.
DROP POLICY IF EXISTS escalations_officer_all ON public.escalations;
DROP POLICY IF EXISTS escalations_dept_handler_insert ON public.escalations;
DROP POLICY IF EXISTS escalations_auditor_read ON public.escalations;
CREATE POLICY escalations_student_affairs_all
  ON public.escalations
  FOR ALL
  TO authenticated
  USING (
    public.is_active_staff()
    AND public.has_role('student_affairs_admin')
  )
  WITH CHECK (
    public.is_active_staff()
    AND public.has_role('student_affairs_admin')
  );

-- Case-level audit events follow the same single-receiver boundary.
DROP POLICY IF EXISTS audit_logs_admin_auditor_read ON public.audit_logs;
DROP POLICY IF EXISTS audit_logs_triage_case_read ON public.audit_logs;
CREATE POLICY audit_logs_admin_auditor_non_case_read
  ON public.audit_logs
  FOR SELECT
  TO authenticated
  USING (
    public.is_active_staff()
    AND public.has_any_role(ARRAY['system_admin', 'auditor'])
    AND entity_table NOT IN (
      'complaints',
      'complaint_identities',
      'complaint_assignments',
      'complaint_status_history',
      'complaint_updates',
      'complaint_attachments',
      'internal_notes',
      'escalations'
    )
  );

CREATE POLICY audit_logs_student_affairs_case_read
  ON public.audit_logs
  FOR SELECT
  TO authenticated
  USING (
    public.is_active_staff()
    AND public.has_role('student_affairs_admin')
    AND entity_table IN (
      'complaints',
      'complaint_identities',
      'complaint_assignments',
      'complaint_status_history',
      'complaint_updates',
      'complaint_attachments',
      'internal_notes',
      'escalations'
    )
  );

INSERT INTO public.schema_migrations (filename)
VALUES ('0014_student_affairs_only_receiver.sql')
ON CONFLICT (filename) DO NOTHING;

COMMIT;
