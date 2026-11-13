-- Let the one designated Student Affairs officer review all submitted cases.
-- This policy requires both an active staff profile and the specific role.
-- No anonymous/public read access is granted.
BEGIN;

DROP POLICY IF EXISTS complaints_student_affairs_all_read ON public.complaints;
CREATE POLICY complaints_student_affairs_all_read
  ON public.complaints
  FOR SELECT
  TO authenticated
  USING (
    public.is_active_staff()
    AND public.has_role('student_affairs_admin')
  );

INSERT INTO public.schema_migrations (filename)
VALUES ('0013_student_affairs_sensitive_read.sql')
ON CONFLICT (filename) DO NOTHING;

COMMIT;
