# Authorization Matrix & Role-Based Access Control

**Product Name:** Unity Student Support  
**Document Version:** 1.0.0  
**Status:** Approved Technical Architecture Baseline  

---

## 1. Security Context & Subject Identities

Authorization in Unity Student Support operates across seven subject identities:

1. **`public_student`**: Unauthenticated public complainant holding a valid, active tracking token session scoped to a single complaint.
2. **`complaint_reviewer`**: Student Affairs intake assistant / preliminary screener.
3. **`student_affairs_admin`**: Central intake coordinator and institutional case owner.
4. **`department_handler`**: Academic faculty or administrative unit representative.
5. **`escalation_officer`**: Senior institutional leadership (Dean of Students, Ethics Committee, Provost/VP Office).
6. **`system_admin`**: IT systems administrator managing infrastructure, taxonomy, and accounts.
7. **`auditor`**: Compliance and quality assurance inspector.

---

## 2. Granular Role-Permission Matrix

| Functional Operation | `public_student` | `complaint_reviewer` | `student_affairs_admin` | `department_handler` | `escalation_officer` | `system_admin` | `auditor` |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **Submit New Complaint** | **Allowed** | Denied (Public) | Denied (Public) | Denied (Public) | Denied (Public) | Denied | Denied |
| **Track Complaint via Key** | **Own Case Only** | Denied (Use CMS) | Denied (Use CMS) | Denied (Use CMS) | Denied (Use CMS) | Denied | Denied |
| **View Unrestricted Complaint Narrative** | **Own Case via verified tracking** | Denied | **Full Access (CMS)** | Denied | Denied | Denied | Denied |
| **View Restricted / Sensitive Cases** | Denied | Denied | **Full Access (CMS)** | Denied | Denied | Denied | Denied |
| **View Complainant PII (Identified)** | **Own details not shown in tracking** | Denied | **Authorized** | Denied | Denied | Denied | Denied |
| **View Complainant PII (Confidential)**| Denied | Denied | **Authorized** | Denied | Denied | Denied | Denied |
| **View Complainant PII (Anonymous)** | N/A (None) | None Exists | None Exists | None Exists | None Exists | None Exists | None Exists |
| **Triage / Categorize Case** | Denied | Denied | **Authorized** | Denied | Denied | Denied | Denied |
| **Assign / Reassign Department** | Denied | Denied | **Authorized** | Denied | Denied | Denied | Denied |
| **Assign Individual Case Handler** | Denied | Denied | **Authorized** | **Within Own Dept** | **Override** | Denied | Denied |
| **Read Internal Investigation Notes** | **STRICTLY BLOCKED** | Denied | Read All | Denied | Denied | Denied | Denied |
| **Write Internal Investigation Notes** | Denied | Denied | Write | Denied | Denied | Denied | Denied |
| **Draft Student-Facing Response** | Denied | Denied | Draft & Publish | Denied | Denied | Denied | Denied |
| **Publish Student-Facing Response** | Denied | Denied | **Authorized** | Denied | Denied | Denied | Denied |
| **Submit Clarification (as Student)** | **If Awaiting** | Denied | Denied | Denied | Denied | Denied | Denied |
| **Escalate Case to Senior Leadership** | Denied | Propose | **Authorized** | **Authorized** | **Authorized** | Denied | Denied |
| **Resolve Case** | Denied | Denied | **Authorized** | Propose Resolution | **Authorized** | Denied | Denied |
| **Formally Close Case** | Denied | Denied | **Authorized** | Denied | **Authorized** | Denied | Denied |
| **Reopen Closed Case** | Request Only | Denied | **Authorized** | Denied | **Authorized** | Denied | Denied |
| **Manage Staff Roles & Profiles** | Denied | Denied | Denied | Denied | Denied | **Authorized** | Denied |
| **Manage Categories & Taxonomy** | Denied | Denied | Denied | Denied | Denied | **Authorized** | Denied |
| **View Operational Reports & Metrics** | Denied | Basic | Full | Department Only | Full Executive | System Level | Full Audit |
| **Inspect System Audit Logs** | Denied | Denied | Case Level Only | Denied | Denied | Non-case only | Non-case only |

*\*Note: Publishing rights for department handlers are governed by `system_settings.require_admin_approval_for_responses`.*

**MVP policy (verified live 2026-11-14):** The Student Dean is the only complaint receiver through the Student Affairs CMS. Migration `0014` removes legacy direct case access for other staff roles. Live catalog checks confirmed row-level security on all nine case tables, one active Student Affairs account, Student Affairs-only complaint read/update policies, and no anonymous/public complaint read policy. The CMS has no second recipient or recusal workflow, so the university needs an out-of-platform procedure for complaints involving the Student Dean.

---

## 3. Enforcement Layers

Every access attempt is evaluated through two independent, non-bypassable barriers:

1. **Application Server-Side Guards (`/src/lib/auth/guards.ts`):**
   - Evaluated before executing any Next.js Server Action or route handler.
   - Verifies the user's role assignment against the required capability.
   - Throws `AuthorizationError` on failure, returning structured error messages.
2. **PostgreSQL Row Level Security (RLS):**
   - Direct database policy enforcement guaranteeing that even if a server action contains an authorization flaw, the database query engine rejects unauthorized reads or writes.

