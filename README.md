# Unity Student Support

> **A secure, accessible, mobile-first Student Complaint & Feedback Management Platform for Unity University, Ethiopia.**  
> Developed on behalf of **Melhek Technologies** (Project Sponsor & Technical Partner).

---

## ⚠️ Important Environment Notice
This repository represents the initial development and staging foundation for **Unity Student Support**.  
**Never submit real student personal data, live institutional passwords, or production secrets to this environment.**

---

## 1. Technical Stack

- **Framework:** Next.js 14 (App Router)
- **Language:** TypeScript 5 (Strict Mode: `noImplicitAny`, strict null checks)
- **Database & Auth:** PostgreSQL 15+ & Supabase SSR (`@supabase/ssr`, `@supabase/supabase-js`)
- **Security:** PostgreSQL Row Level Security (RLS) on all 17 tables, air-gapped internal deliberations, 128-bit cryptographic bearer tracking credentials
- **Styling:** Tailwind CSS (Navy `#1B365D`, Teal `#008080`, Slate `#F8FAFC`)
- **Validation:** Zod schemas on all server mutations
- **Testing:** Vitest (Unit & Integration)

---

## 2. Getting Started

### Prerequisites
- Node.js `v20.x` or higher
- npm `v10.x` or higher

### Local Development Setup

1. **Clone the repository and install dependencies:**
   ```bash
   git clone <repository-url>
   cd "Unity University Complain Platform"
   npm install
   ```

2. **Configure environment variables:**
   Copy the example environment configuration:
   ```bash
   cp .env.example .env.local
   ```
   Populate `.env.local` with your Supabase development credentials:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
   NEXT_PUBLIC_APP_URL=http://localhost:3000
   SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
   NODE_ENV=development
   ```

3. **Database Migrations:**
   Apply sequential migrations from `supabase/migrations/`:
   - `0001_institutional_taxonomy.sql` — Campuses, Faculties, Departments, Categories
   - `0002_staff_profiles_and_roles.sql` — Profiles (1:1 with auth.users), Roles, User_Roles
   - `0003_complaints_core.sql` — Complaints (Zero-PII), Decoupled Identities
   - `0004_complaint_lifecycle.sql` — Assignments, Status History, Public Updates, Air-gapped Notes, Attachments, Escalations
   - `0005_audit_and_settings.sql` — Append-only Audit Logs, Runtime System Settings
   - `0006_state_machine_guard.sql` — Transition validation trigger, Auto-status history
   - `0007_row_level_security.sql` — Complete RLS policies on all 17 tables with conflict of interest guards
   - `0008_seed_data.sql` — Role enumeration, default categories, initial taxonomy
   - `0009_lean_student_affairs.sql` — Lean Student Affairs lifecycle and optional student email
   - `0010_lean_nullable_taxonomy.sql` — Makes intake taxonomy optional for the lean submission flow
   - `0011_lock_migration_ledger.sql` — Restricts public access to migration metadata
   - `0012_mvp_optional_evidence.sql` — Allows optional detail with evidence, adds audio types, deactivates housing/dining
   - `0013_student_affairs_sensitive_read.sql` — Grants the designated Student Affairs role access to sensitive complaints

   **Live project note:** migrations `0011` and `0012` are already applied to the connected Supabase project. `0013` is a reviewed local draft and requires the project owner's explicit approval before it is applied because it expands access to sensitive complaint details.

4. **Run the automated test suite:**
   ```bash
   npm test
   ```

5. **Typecheck & Production Build:**
   ```bash
   npx tsc --noEmit
   npm run build
   ```

6. **Start the local development server:**
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 3. Security & Access Control Model

| Role | Narrative Access | Confidential PII | Internal Notes | Triage & Assignment |
| :--- | :---: | :---: | :---: | :---: |
| **`public_student`** | Own Case via Key Only | N/A | **BLOCKED** | Denied |
| **`department_handler`** | Assigned Dept Only* | **BLOCKED** | Assigned Cases Only* | Denied |
| **`complaint_reviewer`** | All Non-Restricted | **BLOCKED** | Read / Write | Preliminary |
| **`student_affairs_admin`** | All Non-Restricted | **Authorized** | Read / Write | **Authorized** |
| **`escalation_officer`** | All + Sensitive Cases | **Authorized** | All Notes | **Override** |
| **`system_admin`** | **BLOCKED** | **BLOCKED** | **BLOCKED** | Taxonomy & Accounts |
| **`auditor`** | De-identified | Masked | Read Only | Denied |

*\*Note: Conflict of interest safeguards strictly block department handlers from viewing or updating complaints where they are cited as the accused party.*

---

## 4. Documentation Index

- [Database Design & Data Model](docs/architecture/database-design.md)
- [Lean MVP Architecture](docs/architecture/mvp-architecture.md)
- [CMS Build Prompt](docs/prompts/student-affairs-cms-build-prompt.md)
- [Read-only database preflight](docs/database/read-only-preflight.sql)
- [Authorization Matrix & RBAC](docs/architecture/authorization-matrix.md)
- [Security Model & Threat Mitigation](docs/security/security-model.md)
- [Functional Requirements Specification](docs/product/functional-requirements.md)
- [Business Rules & Lifecycle State Machine](docs/product/business-rules.md)
- [Open Questions & Policy Gaps](docs/product/open-questions.md)
- [Forensic Migration Review](docs/reviews/migration-review.md)
- [Documentation Discrepancies & Resolutions](docs/reviews/documentation-discrepancies.md)

