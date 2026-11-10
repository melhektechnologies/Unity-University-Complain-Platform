# Database Design & Normalized Data Model

**Product Name:** Unity Student Support  
**Document Version:** 1.0.0  
**Status:** Approved Technical Architecture Baseline  
**Target RDBMS:** PostgreSQL 15+ (Supabase)  

---

## 1. Schema Overview & Design Philosophy

The database schema is designed to enforce:
1. **Third Normal Form (3NF):** Ensuring operational integrity and zero data anomalies.
2. **Physical Partitioning of Identity (PII):** Complainant identity details are decoupled from the operational `complaints` record into `complaint_identities`. This enables granular Row Level Security (RLS) policies that conceal identity for confidential cases while leaving case narrative and status visible to investigating handlers.
3. **The Airgap Architecture:** The `internal_notes` table is structurally separate from student-facing communications (`complaint_updates`), guaranteeing zero query leakage.
4. **Append-Only Auditing:** Status transitions, case assignments, escalations, and system actions are recorded in dedicated immutable history tables (`complaint_status_history`, `complaint_assignments`, `escalations`, and `audit_logs`).

---

## 2. Table Specifications

### 2.1 Table: `campuses`
- **Purpose:** Stores Unity University campuses (e.g., Main Campus - Gerji, Regional Campuses).
- **Columns:**
  - `id` (UUID, PK, default: `gen_random_uuid()`)
  - `name` (VARCHAR(100), NOT NULL, UNIQUE)
  - `code` (VARCHAR(20), NOT NULL, UNIQUE)
  - `is_active` (BOOLEAN, NOT NULL, default: `true`)
  - `created_at` (TIMESTAMPTZ, NOT NULL, default: `clock_timestamp()`)
- **Constraints:** `UNIQUE(name)`, `UNIQUE(code)`.
- **Indexes:** `idx_campuses_active` ON `(is_active)`.
- **Sensitivity:** Low (Public institutional metadata).
- **Retention:** Permanent.

---

### 2.2 Table: `faculties`
- **Purpose:** Academic faculties and institutional divisions (e.g., Faculty of Technology, Faculty of Business).
- **Columns:**
  - `id` (UUID, PK, default: `gen_random_uuid()`)
  - `campus_id` (UUID, FK -> `campuses(id)`, NOT NULL)
  - `name` (VARCHAR(150), NOT NULL)
  - `code` (VARCHAR(30), NOT NULL)
  - `is_active` (BOOLEAN, NOT NULL, default: `true`)
  - `created_at` (TIMESTAMPTZ, NOT NULL, default: `clock_timestamp()`)
- **Constraints:** `UNIQUE(campus_id, code)`.
- **Indexes:** `idx_faculties_campus` ON `(campus_id)`.
- **Sensitivity:** Low (Public institutional metadata).
- **Retention:** Permanent.

---

### 2.3 Table: `departments`
- **Purpose:** Specific academic departments and administrative service units (e.g., Computer Science, Registrar, Finance).
- **Columns:**
  - `id` (UUID, PK, default: `gen_random_uuid()`)
  - `faculty_id` (UUID, FK -> `faculties(id)`, NOT NULL)
  - `name` (VARCHAR(150), NOT NULL)
  - `code` (VARCHAR(30), NOT NULL)
  - `is_active` (BOOLEAN, NOT NULL, default: `true`)
  - `head_title` (VARCHAR(100), NULL) — Title of department head (e.g., "Department Chair")
  - `created_at` (TIMESTAMPTZ, NOT NULL, default: `clock_timestamp()`)
- **Constraints:** `UNIQUE(faculty_id, code)`.
- **Indexes:** `idx_departments_faculty` ON `(faculty_id)`.
- **Sensitivity:** Low (Public institutional metadata).
- **Retention:** Permanent.

---

### 2.4 Table: `complaint_categories`
- **Purpose:** Master taxonomy of grievance categories with default priority, SLA thresholds, and sensitivity flags.
- **Columns:**
  - `id` (UUID, PK, default: `gen_random_uuid()`)
  - `name` (VARCHAR(100), NOT NULL, UNIQUE)
  - `code` (VARCHAR(50), NOT NULL, UNIQUE)
  - `description` (TEXT, NULL)
  - `default_priority` (VARCHAR(20), NOT NULL, default: `'MEDIUM'`)
  - `is_sensitive` (BOOLEAN, NOT NULL, default: `false`) — Auto-quarantines case to Senior Reviewers if true
  - `sla_triage_hours` (INTEGER, NOT NULL, default: `48`)
  - `sla_resolution_hours` (INTEGER, NOT NULL, default: `120`)
  - `is_active` (BOOLEAN, NOT NULL, default: `true`)
  - `created_at` (TIMESTAMPTZ, NOT NULL, default: `clock_timestamp()`)
- **Constraints:** `CHECK (default_priority IN ('LOW', 'MEDIUM', 'HIGH', 'URGENT'))`.
- **Indexes:** `idx_categories_sensitive` ON `(is_sensitive)`, `idx_categories_active` ON `(is_active)`.
- **Sensitivity:** Low.
- **Retention:** Permanent.

---

### 2.5 Table: `roles`
- **Purpose:** Enumeration of system roles with functional descriptions.
- **Columns:**
  - `id` (VARCHAR(50), PK) — e.g., `'student_affairs_admin'`, `'complaint_reviewer'`, `'department_handler'`, `'escalation_officer'`, `'system_admin'`, `'auditor'`
  - `name` (VARCHAR(100), NOT NULL)
  - `description` (TEXT, NOT NULL)
  - `created_at` (TIMESTAMPTZ, NOT NULL, default: `clock_timestamp()`)
- **Sensitivity:** Low.
- **Retention:** Permanent.

---

### 2.6 Table: `profiles`
- **Purpose:** Staff user profiles linked 1:1 with Supabase Auth (`auth.users`).
- **Columns:**
  - `id` (UUID, PK, FK -> `auth.users(id)` ON DELETE CASCADE)
  - `full_name` (VARCHAR(150), NOT NULL)
  - `email` (VARCHAR(255), NOT NULL, UNIQUE)
  - `phone` (VARCHAR(50), NULL)
  - `department_id` (UUID, FK -> `departments(id)`, NULL) — Primary department affiliation
  - `is_active` (BOOLEAN, NOT NULL, default: `true`)
  - `last_login_at` (TIMESTAMPTZ, NULL)
  - `created_at` (TIMESTAMPTZ, NOT NULL, default: `clock_timestamp()`)
  - `updated_at` (TIMESTAMPTZ, NOT NULL, default: `clock_timestamp()`)
- **Indexes:** `idx_profiles_department` ON `(department_id)`, `idx_profiles_email` ON `(email)`.
- **Sensitivity:** High (Staff PII).
- **Retention:** Retained during employment + 5 years post-separation.

---

### 2.7 Table: `user_roles`
- **Purpose:** Junction table linking staff profiles to operational roles (supports multi-role staff).
- **Columns:**
  - `id` (UUID, PK, default: `gen_random_uuid()`)
  - `profile_id` (UUID, FK -> `profiles(id)` ON DELETE CASCADE, NOT NULL)
  - `role_id` (VARCHAR(50), FK -> `roles(id)` ON DELETE CASCADE, NOT NULL)
  - `assigned_by` (UUID, FK -> `profiles(id)`, NULL)
  - `created_at` (TIMESTAMPTZ, NOT NULL, default: `clock_timestamp()`)
- **Constraints:** `UNIQUE(profile_id, role_id)`.
- **Indexes:** `idx_user_roles_lookup` ON `(profile_id, role_id)`.
- **Sensitivity:** High (Privilege mapping).
- **Retention:** Indefinite (Archived for audit purposes).

---

### 2.8 Table: `complaints`
- **Purpose:** Primary operational case record. Contains core narrative, status, category, department, and tracking metadata, but NO personally identifiable complainant data.
- **Columns:**
  - `id` (UUID, PK, default: `gen_random_uuid()`)
  - `tracking_number` (VARCHAR(30), NOT NULL, UNIQUE) — e.g., `UU-2026-89412`
  - `tracking_hash` (VARCHAR(255), NOT NULL) — Salted cryptographic hash of secret passcode
  - `privacy_type` (VARCHAR(20), NOT NULL) — `IDENTIFIED`, `CONFIDENTIAL`, `ANONYMOUS`
  - `status` (VARCHAR(30), NOT NULL, default: `'NEW'`)
  - `priority` (VARCHAR(20), NOT NULL, default: `'MEDIUM'`)
  - `campus_id` (UUID, FK -> `campuses(id)`, NOT NULL)
  - `faculty_id` (UUID, FK -> `faculties(id)`, NOT NULL)
  - `department_id` (UUID, FK -> `departments(id)`, NOT NULL)
  - `category_id` (UUID, FK -> `complaint_categories(id)`, NOT NULL)
  - `subject` (VARCHAR(200), NOT NULL)
  - `description` (TEXT, NOT NULL)
  - `incident_date` (DATE, NOT NULL)
  - `accused_party` (VARCHAR(200), NULL) — Person or specific office cited
  - `is_restricted_sensitive` (BOOLEAN, NOT NULL, default: `false`)
  - `sla_status` (VARCHAR(30), NOT NULL, default: `'NORMAL'`)
  - `triage_due_at` (TIMESTAMPTZ, NULL)
  - `resolution_due_at` (TIMESTAMPTZ, NULL)
  - `resolved_at` (TIMESTAMPTZ, NULL)
  - `closed_at` (TIMESTAMPTZ, NULL)
  - `reopened_at` (TIMESTAMPTZ, NULL)
  - `created_at` (TIMESTAMPTZ, NOT NULL, default: `clock_timestamp()`)
  - `updated_at` (TIMESTAMPTZ, NOT NULL, default: `clock_timestamp()`)
- **Constraints:**
  - `CHECK (privacy_type IN ('IDENTIFIED', 'CONFIDENTIAL', 'ANONYMOUS'))`
  - `CHECK (status IN ('NEW', 'UNDER_REVIEW', 'ASSIGNED', 'IN_PROGRESS', 'AWAITING_RESPONSE', 'ESCALATED', 'RESOLVED', 'CLOSED', 'REOPENED'))`
  - `CHECK (priority IN ('LOW', 'MEDIUM', 'HIGH', 'URGENT'))`
  - `CHECK (sla_status IN ('NORMAL', 'APPROACHING_BREACH', 'BREACHED'))`
- **Indexes:**
  - `idx_complaints_tracking_number` ON `(tracking_number)` (UNIQUE)
  - `idx_complaints_status_priority` ON `(status, priority)`
  - `idx_complaints_department` ON `(department_id)`
  - `idx_complaints_sensitive` ON `(is_restricted_sensitive)`
  - `idx_complaints_created_at` ON `(created_at DESC)`
- **Sensitivity:** High (Institutional grievance data).
- **Retention:** 7 years post-closure pursuant to institutional record retention policies.

---

### 2.9 Table: `complaint_identities`
- **Purpose:** Decoupled storage of Personally Identifiable Information (PII) for complainants who choose `IDENTIFIED` or `CONFIDENTIAL`. For `ANONYMOUS`, this record is completely absent.
- **Columns:**
  - `id` (UUID, PK, default: `gen_random_uuid()`)
  - `complaint_id` (UUID, FK -> `complaints(id)` ON DELETE CASCADE, NOT NULL, UNIQUE)
  - `student_name` (VARCHAR(150), NOT NULL)
  - `student_id_number` (VARCHAR(50), NOT NULL)
  - `email` (VARCHAR(255), NOT NULL)
  - `phone` (VARCHAR(50), NOT NULL)
  - `is_confidential` (BOOLEAN, NOT NULL, default: `false`)
  - `created_at` (TIMESTAMPTZ, NOT NULL, default: `clock_timestamp()`)
- **Constraints:** `UNIQUE(complaint_id)`.
- **Indexes:** `idx_identities_student_id` ON `(student_id_number)`.
- **Sensitivity:** Critical (Student PII).
- **Security Rule:** RLS permits reads ONLY by `student_affairs_admin` and `escalation_officer`. For `department_handler`, this table is completely blocked if `is_confidential = true`.

---

### 2.10 Table: `complaint_assignments`
- **Purpose:** Tracks the historical and active delegation of complaints to departments and individual staff handlers.
- **Columns:**
  - `id` (UUID, PK, default: `gen_random_uuid()`)
  - `complaint_id` (UUID, FK -> `complaints(id)` ON DELETE CASCADE, NOT NULL)
  - `assigned_to_profile_id` (UUID, FK -> `profiles(id)`, NOT NULL)
  - `assigned_by_profile_id` (UUID, FK -> `profiles(id)`, NOT NULL)
  - `department_id` (UUID, FK -> `departments(id)`, NOT NULL)
  - `assignment_note` (TEXT, NULL)
  - `is_active` (BOOLEAN, NOT NULL, default: `true`)
  - `created_at` (TIMESTAMPTZ, NOT NULL, default: `clock_timestamp()`)
  - `unassigned_at` (TIMESTAMPTZ, NULL)
- **Indexes:**
  - `idx_assignments_active` ON `(assigned_to_profile_id, is_active)`
  - `idx_assignments_complaint` ON `(complaint_id)`
- **Sensitivity:** Medium.
- **Retention:** 7 years.

---

### 2.11 Table: `complaint_status_history`
- **Purpose:** Immutable state transition ledger recording every lifecycle mutation, transition rationale, and initiating actor.
- **Columns:**
  - `id` (UUID, PK, default: `gen_random_uuid()`)
  - `complaint_id` (UUID, FK -> `complaints(id)` ON DELETE CASCADE, NOT NULL)
  - `from_status` (VARCHAR(30), NULL)
  - `to_status` (VARCHAR(30), NOT NULL)
  - `reason` (TEXT, NULL)
  - `changed_by_profile_id` (UUID, FK -> `profiles(id)`, NULL) — NULL if student or system automated
  - `is_system_automated` (BOOLEAN, NOT NULL, default: `false`)
  - `created_at` (TIMESTAMPTZ, NOT NULL, default: `clock_timestamp()`)
- **Indexes:** `idx_status_history_complaint` ON `(complaint_id, created_at ASC)`.
- **Sensitivity:** Medium.
- **Retention:** 7 years.

---

### 2.12 Table: `complaint_updates`
- **Purpose:** Public-facing communication channel and official progress updates between the university and the complainant.
- **Columns:**
  - `id` (UUID, PK, default: `gen_random_uuid()`)
  - `complaint_id` (UUID, FK -> `complaints(id)` ON DELETE CASCADE, NOT NULL)
  - `author_profile_id` (UUID, FK -> `profiles(id)`, NULL) — NULL if submitted by student
  - `update_type` (VARCHAR(30), NOT NULL) — `OFFICIAL_UPDATE`, `CLARIFICATION_REQUEST`, `STUDENT_REPLY`, `RESOLUTION_NOTICE`
  - `message` (TEXT, NOT NULL)
  - `is_public` (BOOLEAN, NOT NULL, default: `true`)
  - `created_at` (TIMESTAMPTZ, NOT NULL, default: `clock_timestamp()`)
- **Constraints:** `CHECK (update_type IN ('OFFICIAL_UPDATE', 'CLARIFICATION_REQUEST', 'STUDENT_REPLY', 'RESOLUTION_NOTICE'))`.
- **Indexes:** `idx_updates_complaint_public` ON `(complaint_id, is_public, created_at ASC)`.
- **Sensitivity:** Medium.
- **Retention:** 7 years.

---

### 2.13 Table: `internal_notes`
- **Purpose:** Physical air-gap table for private staff investigations, deliberations, witness notes, and case strategy.
- **Columns:**
  - `id` (UUID, PK, default: `gen_random_uuid()`)
  - `complaint_id` (UUID, FK -> `complaints(id)` ON DELETE CASCADE, NOT NULL)
  - `author_profile_id` (UUID, FK -> `profiles(id)`, NOT NULL)
  - `note` (TEXT, NOT NULL)
  - `is_restricted` (BOOLEAN, NOT NULL, default: `false`) — Visible only to Escalation Officers if true
  - `created_at` (TIMESTAMPTZ, NOT NULL, default: `clock_timestamp()`)
  - `updated_at` (TIMESTAMPTZ, NOT NULL, default: `clock_timestamp()`)
- **Indexes:** `idx_internal_notes_complaint` ON `(complaint_id, created_at ASC)`.
- **Sensitivity:** High (Internal university deliberations).
- **Retention:** 7 years.

---

### 2.14 Table: `complaint_attachments`
- **Purpose:** Metadata and access records for files uploaded to the private storage bucket.
- **Columns:**
  - `id` (UUID, PK, default: `gen_random_uuid()`)
  - `complaint_id` (UUID, FK -> `complaints(id)` ON DELETE CASCADE, NOT NULL)
  - `internal_note_id` (UUID, FK -> `internal_notes(id)` ON DELETE CASCADE, NULL) — Linked if attachment belongs to an internal note
  - `storage_path` (VARCHAR(500), NOT NULL, UNIQUE)
  - `file_name` (VARCHAR(255), NOT NULL)
  - `file_size_bytes` (INTEGER, NOT NULL)
  - `mime_type` (VARCHAR(100), NOT NULL)
  - `is_internal_only` (BOOLEAN, NOT NULL, default: `false`)
  - `uploaded_by_profile_id` (UUID, FK -> `profiles(id)`, NULL) — NULL if student upload
  - `created_at` (TIMESTAMPTZ, NOT NULL, default: `clock_timestamp()`)
- **Constraints:** `CHECK (file_size_bytes <= 5242880)` (5MB maximum).
- **Indexes:** `idx_attachments_complaint` ON `(complaint_id)`.
- **Sensitivity:** High (May contain student grade slips or medical/disciplinary notes).
- **Retention:** 7 years.

---

### 2.15 Table: `escalations`
- **Purpose:** Detailed records of formal case escalations to executive leadership.
- **Columns:**
  - `id` (UUID, PK, default: `gen_random_uuid()`)
  - `complaint_id` (UUID, FK -> `complaints(id)` ON DELETE CASCADE, NOT NULL)
  - `escalated_by_profile_id` (UUID, FK -> `profiles(id)`, NOT NULL)
  - `target_role` (VARCHAR(50), NOT NULL) — e.g., `'escalation_officer'`
  - `reason` (TEXT, NOT NULL)
  - `action_taken` (TEXT, NULL)
  - `resolved_at` (TIMESTAMPTZ, NULL)
  - `created_at` (TIMESTAMPTZ, NOT NULL, default: `clock_timestamp()`)
- **Indexes:** `idx_escalations_complaint` ON `(complaint_id)`.
- **Sensitivity:** High.
- **Retention:** 7 years.

---

### 2.16 Table: `audit_logs`
- **Purpose:** System-wide immutable security and compliance ledger.
- **Columns:**
  - `id` (UUID, PK, default: `gen_random_uuid()`)
  - `actor_profile_id` (UUID, FK -> `profiles(id)`, NULL) — NULL if system or public student
  - `actor_role` (VARCHAR(50), NOT NULL)
  - `action` (VARCHAR(100), NOT NULL) — e.g., `'STATUS_MUTATED'`, `'CONFIDENTIAL_PII_VIEWED'`, `'CASE_ASSIGNED'`
  - `entity_table` (VARCHAR(50), NOT NULL)
  - `entity_id` (UUID, NOT NULL)
  - `before_state` (JSONB, NULL)
  - `after_state` (JSONB, NULL)
  - `ip_address` (VARCHAR(50), NULL)
  - `user_agent` (VARCHAR(300), NULL)
  - `created_at` (TIMESTAMPTZ, NOT NULL, default: `clock_timestamp()`)
- **Constraints:** Write-once (PostgreSQL rule or trigger prevents `UPDATE` or `DELETE`).
- **Indexes:**
  - `idx_audit_logs_entity` ON `(entity_table, entity_id)`
  - `idx_audit_logs_actor` ON `(actor_profile_id)`
  - `idx_audit_logs_action` ON `(action)`
  - `idx_audit_logs_created_at` ON `(created_at DESC)`
- **Sensitivity:** High (Audit and forensic evidence).
- **Retention:** Permanent / Minimum 10 years.

---

### 2.17 Table: `system_settings`
- **Purpose:** Key-value runtime configuration repository for operational thresholds, preventing hardcoded rules.
- **Columns:**
  - `key` (VARCHAR(100), PK)
  - `value` (JSONB, NOT NULL)
  - `description` (TEXT, NOT NULL)
  - `updated_by_profile_id` (UUID, FK -> `profiles(id)`, NULL)
  - `updated_at` (TIMESTAMPTZ, NOT NULL, default: `clock_timestamp()`)
- **Initial Seeded Keys:**
  - `sla_triage_hours`: `{"default": 48}`
  - `sla_investigation_days`: `{"default": 10}`
  - `closure_grace_period_days`: `{"default": 5}`
  - `reopening_window_days`: `{"default": 10}`
  - `require_admin_approval_for_responses`: `{"default": false}`
- **Sensitivity:** Medium.
- **Retention:** Permanent.

