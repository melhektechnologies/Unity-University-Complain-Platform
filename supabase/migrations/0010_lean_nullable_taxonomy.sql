-- Lean intake does not collect campus/faculty/department from students.
-- Keep columns for future upgrades, but allow null for simple submissions.
ALTER TABLE public.complaints
  ALTER COLUMN campus_id DROP NOT NULL,
  ALTER COLUMN faculty_id DROP NOT NULL,
  ALTER COLUMN department_id DROP NOT NULL;
