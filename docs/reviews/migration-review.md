# Forensic SQL Migration Review — Unity Student Support

**Document Version:** 1.0.0  
**Date:** 2026-11-05  
**Auditor:** Principal Software & Security Architect  
**Status:** Approved Migration Baseline Review  

---

## 1. Migration Sequence & Chronology Analysis

The repository forensic inspection revealed 8 core migrations. Below is the verified chronological dependency chain:

| Sequence | File Name | Target Entities / Functions | Dependencies | Structural Status |
| :---: | :--- | :--- | :--- | :---: |
| **0001** | `0001_institutional_taxonomy.sql` | `campuses`, `faculties`, `departments`, `complaint_categories` | None (Root Schema) | Validated |
| **0002** | `0002_staff_profiles_and_roles.sql` | `roles`, `profiles`, `user_roles`, `handle_new_user()`, `set_updated_at()` | `0001` (FK to `departments`), `auth.users` | Validated |
| **0003** | `0003_complaints_core.sql` | `complaints`, `complaint_identities`, `enforce_no_identity_for_anonymous()`, `auto_flag_sensitive_complaint()` | `0001` (FKs to taxonomy) | Validated |
| **0004** | `0004_complaint_lifecycle.sql` | `complaint_assignments`, `complaint_status_history`, `complaint_updates`, `internal_notes`, `complaint_attachments`, `escalations` | `0001`, `0002`, `0003` | Validated |
| **0005** | `0005_audit_and_settings.sql` | `audit_logs`, `system_settings`, `prevent_audit_modification()`, `prevent_status_history_modification()` | `0002` (FK to `profiles`), `0004` | Validated |
| **0006** | `0006_state_machine_guard.sql` | `validate_status_transition()`, `record_status_change()` | `0003`, `0004` | Validated |
| **0007** | `0007_row_level_security.sql` | RLS enablement on all 17 tables, helper functions (`get_my_roles()`, `has_role()`, `has_any_role()`, `my_department_id()`, `is_active_staff()`), granular role policies | All tables (`0001` - `0005`) | Validated |
| **0008** | `0008_seed_data.sql` | Master roles (6), initial categories (9), baseline taxonomy, runtime system settings | `0001` - `0007` | Validated |

---

## 2. Investigation: The "Missing 0001" Migration

The initial preliminary audit noted that migrations appeared to begin at `0002`. Forensic recovery confirmed:
1. **Migration 0001 is NOT missing or obsolete**: It is `0001_institutional_taxonomy.sql`, which establishes `campuses`, `faculties`, `departments`, and `complaint_categories`.
2. Without `0001`:
   - `0002_staff_profiles_and_roles.sql` fails immediately on foreign key `profiles.department_id REFERENCES public.departments(id)`.
   - `0003_complaints_core.sql` fails immediately on foreign keys referencing `campuses`, `faculties`, `departments`, and `complaint_categories`.
3. **Resolution:** `0001_institutional_taxonomy.sql` is formally restored to the canonical migration set at position 1. Numbering is 100% sequential (0001 through 0008).

---

## 3. Entity-by-Entity Forensic Verification

### 3.1 `campuses`, `faculties`, `departments` (Migration 0001)
- **Primary Keys:** UUIDs generated via `gen_random_uuid()`.
- **Foreign Keys:**
  - `faculties.campus_id -> campuses(id) ON DELETE RESTRICT`
  - `departments.faculty_id -> faculties(id) ON DELETE RESTRICT`
- **Integrity Constraints:** Unique campus names and codes; compound unique constraints on `(campus_id, code)` and `(faculty_id, code)`.
- **Soft Deletion:** `is_active` boolean on all three levels.

### 3.2 `complaint_categories` (Migration 0001)
- **Priority Constraint:** `CHECK (default_priority IN ('LOW', 'MEDIUM', 'HIGH', 'URGENT'))`.
- **SLA Constraints:** `sla_triage_hours > 0`, `sla_resolution_hours > 0`.
- **Sensitivity Flag:** `is_sensitive BOOLEAN NOT NULL DEFAULT false`.

### 3.3 `profiles` & `user_roles` (Migration 0002)
- **1:1 Mapping to Auth:** `profiles.id REFERENCES auth.users(id) ON DELETE CASCADE`.
- **Multi-Role Junction:** `user_roles` supports staff with multiple operational roles with a compound unique key `(profile_id, role_id)`.
- **Deactivation Hook:** `is_active BOOLEAN NOT NULL DEFAULT true`. The RLS helper function `public.is_active_staff()` evaluates this field on every query.
- **Auto-Provisioning:** Trigger `on_auth_user_created` safely creates a placeholder profile with `ON CONFLICT DO NOTHING`.

### 3.4 `complaints` (Migration 0003)
- **Zero-PII Invariant:** Contains no student name, student ID, personal email, or phone.
- **Tracking Bearer Security:** `tracking_number` is indexed with a UNIQUE constraint; `tracking_hash` stores the salted cryptographic hash only.
- **Check Constraints:** Validates `privacy_type`, `status`, `priority`, `sla_status`, `incident_date <= CURRENT_DATE`, `resolved_at <= closed_at`, `char_length(description) >= 20`, `char_length(subject) >= 5`.
- **Auto-Quarantine Trigger:** `auto_flag_sensitive_complaint()` sets `is_restricted_sensitive = true` and `priority = 'URGENT'` if the category is marked sensitive.

### 3.5 `complaint_identities` (Migration 0003)
- **Decoupled PII:** Stores student name, student ID, email, and phone.
- **Anonymous Airgap Guard:** Trigger `enforce_no_identity_for_anonymous()` intercepts any attempt to insert an identity row when `complaints.privacy_type = 'ANONYMOUS'` and throws an uncatchable database exception.

### 3.6 `complaint_lifecycle` (Migration 0004)
- **`complaint_assignments`:** Tracks active handler delegation (`is_active = true`) and historical unassignments.
- **`complaint_status_history`:** Immutable lifecycle audit ledger.
- **`complaint_updates`:** Public communication stream; rows where `is_public = false` are internal drafts.
- **`internal_notes`:** Air-gapped staff investigation table. Completely unmapped in public queries. `is_restricted` flag allows escalation officer exclusivity.
- **`complaint_attachments`:** Enforces 5 MB file size limit and MIME whitelist (`application/pdf`, `image/jpeg`, `image/png`, `image/webp`).
- **`escalations`:** Requires a substantive justification (`char_length(reason) >= 30`).

### 3.7 `audit_logs` & `system_settings` (Migration 0005)
- **Immutability Triggers:** `prevent_audit_modification()` and `prevent_status_history_modification()` raise exceptions on any `UPDATE` or `DELETE` attempt.
- **Non-Repudiation:** Enforces strictly append-only audit records.
- **Dynamic Configuration:** `system_settings` stores typed JSONB for thresholds without requiring application redeployments.

### 3.8 State Machine Guard (Migration 0006)
- **Secondary Database Defense:** `validate_status_transition()` ensures only permitted transitions can be written to `complaints.status`.
- **Auto History Trigger:** `record_status_change()` guarantees a record is logged even if the application layer fails to write to `complaint_status_history`.

---

## 4. Row Level Security (RLS) Analysis (Migration 0007)

1. **Default-Deny:** `ENABLE ROW LEVEL SECURITY` is explicitly called on all 17 tables.
2. **Public (anon) Boundaries:**
   - `campuses`, `faculties`, `departments`, `complaint_categories`: SELECT allowed for active entries.
   - `complaints`: Public INSERT is permitted with strict validation (`status = 'NEW'`, `sla_status = 'NORMAL'`). Public SELECT is **BLOCKED**. Lookups are routed exclusively through server-side verified tracking tokens.
   - `complaint_identities`: Public SELECT and INSERT are **STRICTLY BLOCKED**.
   - `internal_notes`: Public access is **STRICTLY BLOCKED**.
   - `audit_logs`: Public access is **STRICTLY BLOCKED**.
3. **Role Partitioning:**
   - This describes the original `0007` architecture, not the single-receiver MVP.
   - Active `student_affairs_admin`: sole complaint reader/manager; migration `0014` is applied and the live catalog check confirmed this boundary.
   - Other staff roles remain defined for a future phase; migration `0014` removes their direct complaint-related data access and case-linked audit access.
   - `system_admin`: Access to taxonomy, profiles, and roles; no access to complaint narratives or identities.

---

## 5. Required Institutional Confirmations

Before applying to a live production database:
1. Confirm final roster of campuses, faculties, and departments (seeded with defaults in `0008_seed_data.sql`).
2. Validate default SLA hours per category.
3. Confirm escalation targets for complaints where a Dean or Department Head is named in `accused_party`.

