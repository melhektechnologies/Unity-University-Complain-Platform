# Entity Relationship Diagram (ERD)

**Product Name:** Unity Student Support  
**Document Version:** 1.0.0  
**Target RDBMS:** PostgreSQL 15+ (Supabase)  

---

## 1. Relational Entity Relationship Diagram

```mermaid
erDiagram
    campuses ||--o{ faculties : "houses"
    faculties ||--o{ departments : "contains"
    departments ||--o{ profiles : "employs"
    departments ||--o{ complaints : "assigned to"
    departments ||--o{ complaint_assignments : "routes to"

    complaint_categories ||--o{ complaints : "classifies"
    campuses ||--o{ complaints : "originates at"
    faculties ||--o{ complaints : "falls under"

    profiles ||--o{ user_roles : "has"
    roles ||--o{ user_roles : "assigned to"

    complaints ||--o| complaint_identities : "has (if identified/confidential)"
    complaints ||--o{ complaint_assignments : "delegated via"
    complaints ||--o{ complaint_status_history : "tracks lifecycle"
    complaints ||--o{ complaint_updates : "communicates via"
    complaints ||--o{ internal_notes : "investigated via"
    complaints ||--o{ complaint_attachments : "backed by"
    complaints ||--o{ escalations : "escalated via"

    profiles ||--o{ complaint_assignments : "assigned by/to"
    profiles ||--o{ complaint_status_history : "changed by"
    profiles ||--o{ complaint_updates : "authored by"
    profiles ||--o{ internal_notes : "written by"
    profiles ||--o{ complaint_attachments : "uploaded by"
    profiles ||--o{ escalations : "escalated by"
    profiles ||--o{ audit_logs : "triggered by"
    profiles ||--o{ system_settings : "modified by"

    internal_notes ||--o{ complaint_attachments : "links internal"

    campuses {
        uuid id PK
        varchar name
        varchar code
        boolean is_active
        timestamptz created_at
    }

    faculties {
        uuid id PK
        uuid campus_id FK
        varchar name
        varchar code
        boolean is_active
        timestamptz created_at
    }

    departments {
        uuid id PK
        uuid faculty_id FK
        varchar name
        varchar code
        boolean is_active
        varchar head_title
        timestamptz created_at
    }

    complaint_categories {
        uuid id PK
        varchar name
        varchar code
        text description
        varchar default_priority
        boolean is_sensitive
        integer sla_triage_hours
        integer sla_resolution_hours
        boolean is_active
        timestamptz created_at
    }

    roles {
        varchar id PK
        varchar name
        text description
        timestamptz created_at
    }

    profiles {
        uuid id PK
        varchar full_name
        varchar email
        varchar phone
        uuid department_id FK
        boolean is_active
        timestamptz last_login_at
        timestamptz created_at
        timestamptz updated_at
    }

    user_roles {
        uuid id PK
        uuid profile_id FK
        varchar role_id FK
        uuid assigned_by FK
        timestamptz created_at
    }

    complaints {
        uuid id PK
        varchar tracking_number UK
        varchar tracking_hash
        varchar privacy_type
        varchar status
        varchar priority
        uuid campus_id FK
        uuid faculty_id FK
        uuid department_id FK
        uuid category_id FK
        varchar subject
        text description
        date incident_date
        varchar accused_party
        boolean is_restricted_sensitive
        varchar sla_status
        timestamptz triage_due_at
        timestamptz resolution_due_at
        timestamptz resolved_at
        timestamptz closed_at
        timestamptz reopened_at
        timestamptz created_at
        timestamptz updated_at
    }

    complaint_identities {
        uuid id PK
        uuid complaint_id FK
        varchar student_name
        varchar student_id_number
        varchar email
        varchar phone
        boolean is_confidential
        timestamptz created_at
    }

    complaint_assignments {
        uuid id PK
        uuid complaint_id FK
        uuid assigned_to_profile_id FK
        uuid assigned_by_profile_id FK
        uuid department_id FK
        text assignment_note
        boolean is_active
        timestamptz created_at
        timestamptz unassigned_at
    }

    complaint_status_history {
        uuid id PK
        uuid complaint_id FK
        varchar from_status
        varchar to_status
        text reason
        uuid changed_by_profile_id FK
        boolean is_system_automated
        timestamptz created_at
    }

    complaint_updates {
        uuid id PK
        uuid complaint_id FK
        uuid author_profile_id FK
        varchar update_type
        text message
        boolean is_public
        timestamptz created_at
    }

    internal_notes {
        uuid id PK
        uuid complaint_id FK
        uuid author_profile_id FK
        text note
        boolean is_restricted
        timestamptz created_at
        timestamptz updated_at
    }

    complaint_attachments {
        uuid id PK
        uuid complaint_id FK
        uuid internal_note_id FK
        varchar storage_path UK
        varchar file_name
        integer file_size_bytes
        varchar mime_type
        boolean is_internal_only
        uuid uploaded_by_profile_id FK
        timestamptz created_at
    }

    escalations {
        uuid id PK
        uuid complaint_id FK
        uuid escalated_by_profile_id FK
        varchar target_role
        text reason
        text action_taken
        timestamptz resolved_at
        timestamptz created_at
    }

    audit_logs {
        uuid id PK
        uuid actor_profile_id FK
        varchar actor_role
        varchar action
        varchar entity_table
        uuid entity_id
        jsonb before_state
        jsonb after_state
        varchar ip_address
        varchar user_agent
        timestamptz created_at
    }

    system_settings {
        varchar key PK
        jsonb value
        text description
        uuid updated_by_profile_id FK
        timestamptz updated_at
    }
```

---

## 2. Key Architectural Invariants Enforced by Schema

1. **Airgap Invariant:** The table `internal_notes` does not join to `complaint_updates`. Public queries are restricted by RLS to select exclusively from `complaints`, `complaint_updates`, and non-internal rows of `complaint_attachments`.
2. **Identity Decoupling Invariant:** Table `complaints` has zero direct personal student fields. For `ANONYMOUS` complaints, no corresponding row in `complaint_identities` exists. For `CONFIDENTIAL` complaints, RLS policies prevent Department Handlers from reading `complaint_identities`.
3. **Audit Immutability Invariant:** A PostgreSQL trigger blocks `UPDATE` or `DELETE` statements on `audit_logs` and `complaint_status_history`.

