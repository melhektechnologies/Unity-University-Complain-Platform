# Unity Student Support – Current Project Status

**Date:** 2026-11-14
**Source of truth:** repository root (nested zip duplicates removed)

---

## 1. Project Summary
Unity Student Support is a secure, mobile-first complaint and feedback platform for Unity University. The repository now contains a runnable Next.js 14 App Router foundation: public portal, staff admin shell, API routes, Supabase migrations (including RLS), Zod validation, and Vitest coverage for core domain logic.

---

## 2. Repository Layout (canonical)

```
docs/                  Product, architecture, security, testing docs
public/                Static assets
src/
  app/
    (portal)/          Public landing, submit, confirmation, track
    admin/             Staff login, dashboard, complaint detail
    api/               Auth + complaints APIs
  components/ui/       shadcn-based primitives
  config/              App configuration
  features/            complaints, staff/auth, tracking
  lib/                 auth, supabase, validation, audit, tracking
  middleware.ts        Route protection / session gate
supabase/migrations/   0001–0014 (schema, RLS, seed, and MVP extensions)
tests/                 unit + integration (+ e2e placeholders)
```

---

## 3. Current Development State

| Area | Status | Comments |
|------|--------|----------|
| **Functional Code** | **MVP wired** | Student intake, passcode tracking, one-officer CMS queue and case detail |
| **Authentication** | **Role-gated** | CMS pages and mutations verify an active profile with `student_affairs_admin` |
| **Database Schema** | **Live and verified** | Migrations `0001`–`0014` are live; the active Student Affairs account is the only authenticated case reader, and anonymous/public complaint reads are blocked |
| **Public Tracking** | **Implemented** | Returns four public statuses and student-visible messages only |
| **Admin CMS** | **MVP implemented** | 25-row pagination, database filters/search/counts, status changes and public messages |
| **File Upload** | **MVP implemented** | Private image/voice storage, server signature/size checks, one-minute officer download links |
| **Validation** | **Implemented** | Zod checks category, contact fields, optional detail/evidence, and status inputs |
| **Automated Tests** | **Not run in this work** | Existing test files were not executed |
| **CI/CD & Deployment** | **Absent** | No pipeline yet |
| **Documentation** | **Strong (design)** | Ops/runbooks still thin; this status file updated |

---

## 4. Next Phase
1. Define and approve an out-of-platform referral path for complaints involving the Student Dean or Student Affairs office; the MVP has no second CMS receiver.
2. Run the app locally with private environment settings and complete a staff-only smoke check of login, inbox, case detail, status update, and student tracking.
3. Before production, replace in-memory rate limiting with a shared limiter and validate voice duration server-side.
4. Deploy a private staging pilot only after the referral procedure and smoke check are complete; do not put secrets in chat or source files.

---

## 5. Outstanding Institutional Decisions
1. Final campuses / faculties / departments for seed data
2. SLA durations (triage, resolution, reopen windows)
3. Confidential visibility rules for department handlers
4. Out-of-platform referral path if a sensitive case involves the Student Dean or exceeds the office's remit
5. MFA / password policy for staff
6. SMS gateway for tracking notifications
7. Retention periods for complaints and audit logs
8. Backup strategy
9. Monitoring tooling and alert thresholds
10. Pilot → production sign-off workflow

---

## 6. Release Decision
**MVP IMPLEMENTATION READY FOR PRIVATE REVIEW** — migrations `0001`–`0014` are applied. A read-only live check confirmed the 0014 ledger record, row-level security on all nine case tables, one active Student Affairs account, Student Affairs-only complaint access policies, and no anonymous/public complaint read policy. Do not open a student pilot until the university defines how complaints about the Student Dean are handled outside this CMS and the app smoke check is complete.

---

*Updated 2026-11-14 after applying and verifying the one-receiver policy in `0014`.*
