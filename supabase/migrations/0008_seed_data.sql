-- =============================================================================
-- Migration: 0008_seed_data
-- Purpose:   Baseline configuration data required for a functional platform.
--            ALL institutional values marked [PLACEHOLDER] require
--            confirmation from Unity University leadership before go-live.
--
-- What is seeded:
--   1. Role enumeration (confirmed — not institutional-specific)
--   2. Complaint categories (confirmed baseline with [PLACEHOLDER] notes)
--   3. Campus / Faculty / Department taxonomy [PLACEHOLDER]
--   4. System settings (configurable defaults with [PROPOSED] notes)
--
-- WARNING: Do NOT use real student names, real complaint text, or real
--          staff identities in seed or test data.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. Roles (Confirmed Baseline)
-- ---------------------------------------------------------------------------
INSERT INTO public.roles (id, name, description) VALUES
  ('student_affairs_admin',
   'Student Affairs Administrator',
   'Primary triage coordinator. Manages intake, categorization, assignment, and resolution of all non-restricted complaints.'),
  ('complaint_reviewer',
   'Complaint Reviewer',
   'Intake assistant. Performs preliminary screening and categorization. Cannot close cases or publish final responses independently.'),
  ('department_handler',
   'Department Case Handler',
   'Faculty or administrative unit representative. Investigates and responds to complaints assigned to their specific department. Cannot view complaints outside their department.'),
  ('escalation_officer',
   'Escalation Officer / Senior Reviewer',
   'Senior institutional leadership (Dean of Students, Ethics Committee). Full access to all complaints including restricted sensitive cases. Handles appeals and high-risk grievances.'),
  ('system_admin',
   'System Administrator',
   'IT administrator. Manages staff accounts, role assignments, and system taxonomy. Zero access to complaint content by design.'),
  ('auditor',
   'Read-Only Auditor',
   'Internal compliance and quality assurance inspector. Read-only access to de-identified complaint data and audit logs. No write operations permitted.')
ON CONFLICT (id) DO NOTHING;

-- ---------------------------------------------------------------------------
-- 2. Complaint Categories
-- [PLACEHOLDER] Category names and sensitivity flags should be validated
-- by Unity University Student Affairs and Ethics Committee leadership.
-- ---------------------------------------------------------------------------
INSERT INTO public.complaint_categories
  (name, code, description, default_priority, is_sensitive, sla_triage_hours, sla_resolution_hours)
VALUES
  ('Grading & Academic Evaluation',
   'ACAD_EVAL',
   'Disputes regarding examination scores, final grades, GPA calculations, or assessment methodology.',
   'MEDIUM', false, 48, 240),

  ('Teaching Quality & Instructor Conduct',
   'ACAD_INST',
   'Concerns about instructional quality, teaching effectiveness, or professional conduct of academic staff.',
   'MEDIUM', false, 48, 240),

  ('Registration, Enrollment & Add/Drop',
   'REG_ENROLL',
   'Issues with course registration, section transfers, add/drop processes, or enrollment holds.',
   'MEDIUM', false, 24, 120),

  ('Tuition, Billing & Financial Clearance',
   'FIN_TUITION',
   'Concerns about tuition invoices, payment processing, financial holds, or scholarship application.',
   'MEDIUM', false, 48, 240),

  ('Facilities, Laboratories & Library',
   'FAC_CAMPUS',
   'Issues with physical campus infrastructure including labs, library resources, restrooms, or safety hazards.',
   'LOW', false, 72, 480),

  ('Student Housing, Dining & Campus Life',
   'STUD_SERV',
   'Concerns about dormitory conditions, cafeteria services, or extracurricular activity administration.',
   'LOW', false, 72, 480),

  ('Harassment, Discrimination & Gender Issues',
   'ETH_HARASS',
   'Reports of sexual harassment, gender discrimination, racial discrimination, or hostile environment. SENSITIVE — routes exclusively to Escalation Officers.',
   'URGENT', true, 24, 120),

  ('Bribery, Fraud & Academic Malpractice',
   'ETH_CORRUPT',
   'Reports of bribery, corruption, academic fraud, or institutional malpractice. SENSITIVE — routes exclusively to Escalation Officers.',
   'URGENT', true, 24, 120),

  ('General Feedback & Other Inquiries',
   'GEN_OTHER',
   'General institutional feedback, suggestions, or complaints not covered by other categories.',
   'LOW', false, 72, 480)

ON CONFLICT (code) DO NOTHING;

-- ---------------------------------------------------------------------------
-- 3. Campus / Faculty / Department Taxonomy
-- [PLACEHOLDER] The structure below is a reasonable default based on
-- publicly available information about Unity University Ethiopia.
-- Unity University leadership MUST confirm and update this taxonomy
-- before go-live. Contact: Student Affairs Directorate / Registrar.
-- ---------------------------------------------------------------------------

-- Campuses
INSERT INTO public.campuses (name, code) VALUES
  ('Main Campus (Gerji)',   'GERJI'),
  ('Megenagna Campus',      'MEGENAGNA'),
  ('Bole Campus',           'BOLE')
ON CONFLICT (code) DO NOTHING;

-- Faculties / units under Gerji (placeholder taxonomy for lean ops)
INSERT INTO public.faculties (campus_id, name, code)
SELECT
  c.id,
  f.name,
  f.code
FROM (VALUES
  ('GERJI', 'Faculty of Technology & Informatics',     'TECH'),
  ('GERJI', 'Faculty of Business & Economics',         'BUS'),
  ('GERJI', 'Faculty of Health Sciences',              'HEALTH'),
  ('GERJI', 'Faculty of Social Sciences & Humanities', 'SOCSCI'),
  ('GERJI', 'Faculty of Natural Sciences',             'NATSCI'),
  ('GERJI', 'Office of the Registrar',                 'REGISTRAR'),
  ('GERJI', 'Finance & Student Accounts',              'FINANCE'),
  ('GERJI', 'Student Affairs Directorate',             'STUDENT_AFFAIRS'),
  ('GERJI', 'Campus Operations & Facilities',          'FACILITIES')
) AS f(campus_code, name, code)
JOIN public.campuses c ON c.code = f.campus_code
ON CONFLICT (campus_id, code) DO NOTHING;

-- Departments — only insert when faculty rows exist (avoids null faculty_id)
INSERT INTO public.departments (faculty_id, name, code, head_title)
SELECT fac.id, d.name, d.code, d.head_title
FROM (VALUES
  ('TECH', 'Department of Computer Science', 'CS', 'Department Chair'),
  ('TECH', 'Department of Information Technology', 'IT', 'Department Chair'),
  ('TECH', 'Department of Software Engineering', 'SE', 'Department Chair'),
  ('TECH', 'Department of Electrical Engineering', 'EE', 'Department Chair'),
  ('BUS', 'Department of Accounting & Finance', 'ACCTFIN', 'Department Chair'),
  ('BUS', 'Department of Management', 'MGMT', 'Department Chair'),
  ('BUS', 'Department of Economics', 'ECON', 'Department Chair'),
  ('BUS', 'Department of Marketing', 'MKT', 'Department Chair'),
  ('HEALTH', 'Department of Public Health', 'PUBHEALTH', 'Department Chair'),
  ('HEALTH', 'Department of Nursing', 'NURSING', 'Department Chair'),
  ('HEALTH', 'Department of Pharmacy', 'PHARM', 'Department Chair'),
  ('REGISTRAR', 'Registrar Office', 'REG_OFFICE', 'University Registrar'),
  ('FINANCE', 'Student Accounts Office', 'STU_ACCTS', 'Head of Student Accounts'),
  ('STUDENT_AFFAIRS', 'Student Affairs Office', 'STU_AFF', 'Director of Student Affairs'),
  ('FACILITIES', 'Campus Operations & Maintenance', 'OPS_MAINT', 'Facilities Manager'),
  ('FACILITIES', 'Library & Learning Resources', 'LIBRARY', 'Head Librarian')
) AS d(faculty_code, name, code, head_title)
JOIN public.faculties fac ON fac.code = d.faculty_code
ON CONFLICT (faculty_id, code) DO NOTHING;

-- ---------------------------------------------------------------------------
-- 4. System Settings (Configurable Operational Defaults)
-- [PROPOSED] All values marked PROPOSED require university confirmation.
-- ---------------------------------------------------------------------------
INSERT INTO public.system_settings (key, value, description) VALUES
  ('sla_triage_hours',
   '{"default": 48, "unit": "hours"}',
   '[PROPOSED] Hours from complaint submission to initial triage completion. Default: 48 business hours.'),

  ('sla_first_action_hours',
   '{"default": 72, "unit": "hours"}',
   '[PROPOSED] Hours from assignment to first substantive investigative action. Default: 72 business hours.'),

  ('sla_resolution_days',
   '{"default": 10, "unit": "business_days"}',
   '[PROPOSED] Business days from IN_PROGRESS to RESOLVED. Default: 10 business days.'),

  ('closure_grace_period_days',
   '{"default": 5, "unit": "business_days"}',
   '[PROPOSED] Business days a complaint remains in RESOLVED before auto-advancing to CLOSED if no appeal. Default: 5.'),

  ('reopening_window_days',
   '{"default": 10, "unit": "business_days"}',
   '[PROPOSED] Business days after RESOLVED that student may request reopening. Default: 10. After this, requires administrative appeal.'),

  ('require_admin_approval_for_responses',
   '{"default": false}',
   '[PROPOSED] When true: department handler public responses require Student Affairs Admin approval before publication. Requires university policy confirmation.'),

  ('max_anonymous_response_wait_days',
   '{"default": 7, "unit": "calendar_days"}',
   '[PROPOSED] Calendar days to wait for student clarification on anonymous complaint before eligible for administrative closure due to insufficient information.'),

  ('max_attachments_per_complaint',
   '{"default": 3}',
   'Maximum number of file attachments per complaint submission. Default: 3.'),

  ('max_attachment_size_bytes',
   '{"default": 5242880}',
   'Maximum file size per attachment in bytes. Default: 5242880 (5 MB). Do not change without infrastructure review.'),

  ('platform_institution_name',
   '{"default": "Unity University"}',
   'Institutional name used in platform branding, emails, and PDF receipts.'),

  ('platform_tracking_prefix',
   '{"default": "UU"}',
   'Two-character prefix for tracking reference numbers. e.g. UU-2026-89412.')

ON CONFLICT (key) DO NOTHING;
