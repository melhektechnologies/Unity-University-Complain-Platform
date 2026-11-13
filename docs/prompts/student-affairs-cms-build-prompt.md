# Prompt: Build the Unity Student Affairs CMS

Copy the prompt below into the coding AI working on this repository.

---

You are a senior product engineer working in the existing **Unity Student Support** repository. Build a small, production-minded CMS for **one Student Affairs officer** managing regular undergraduate complaints.

## Read before changing code

1. Read `docs/architecture/mvp-architecture.md` first. It is the MVP product and architecture source of truth.
2. Inspect the current Next.js app, Supabase migrations, authentication, RLS, and git status before editing.
3. The working tree already contains user work. Preserve it. Do not reset, revert, clean, stage, or commit unrelated changes.
4. Do not read `.env.local` into output, copy keys/passwords into files, or apply migrations to the live Supabase project. Produce local forward migrations and clearly state that they still need review/application.

## Product scope

- The public portal is the source of truth. Telegram is not an intake channel.
- One active `student_affairs_admin` account manages all cases.
- Intake: student name, student ID, phone, category, optional written details when at least one valid attachment exists, and optional photo/short voice evidence.
- Student-facing statuses are exactly **Submitted**, **On Review**, **Solved**, and **Closed**.
- No housing/dining categories, department routing, case assignments, multi-role staff screens, internal-notes feature, escalation workflow, SLA dashboards, student login, Telegram bot, or unrelated feature expansion.
- Keep the interface clear, mobile-friendly, accessible, and appropriate for a simple one-person queue.

## Existing code and database constraints

Use existing project conventions and tables. Do not invent a parallel schema.

- Stack: Next.js 14 App Router, TypeScript, React, Tailwind, Supabase SSR/JS, Zod.
- Existing CMS routes are under `src/app/admin/(cms)/`; current staff sign-in is under `src/app/admin/login/` and `src/features/staff/auth/`.
- Use `complaints`, `complaint_identities`, `complaint_categories`, `complaint_status_history`, `complaint_updates`, and `complaint_attachments` for case operations. Use `profiles` and `user_roles` for the single officer.
- `complaints` holds the case narrative and tracking hash, not student PII. Student name, student ID, phone, and optional email are in `complaint_identities`.
- SQL defines `complaint_updates.message`, `author_profile_id`, and required `update_type`. Current code uses these fields and stores only student-visible updates.
- `complaint_status_history` has an automatic status-change trigger. Current code relies on the trigger for one history event and does not write a duplicate row.
- CMS pages and mutations require a verified Supabase user, active profile, and `student_affairs_admin` role. Complaint mutations use the authenticated RLS client.
- `complaints.category_id` is still `NOT NULL`, but the current submission action may pass `NULL` when category lookup fails. Resolve the selected category against an active database row and return a safe validation error if no match exists.
- The staff/student UI uses four agreed labels and maps legacy stored values safely; do not silently rewrite records.
- Migration `0012` is applied live: `complaints.description` is nullable, but any supplied description must be at least 20 characters. Enforce “meaningful description OR verified attachment” in server validation.
- Migration `0012` added OGG/WebM/MP4/MP3 audio MIME types to the attachment check. The live private bucket allows JPEG/PNG/WebP and those audio types, with a 5 MB per-object limit. Store metadata in Postgres and bytes in private Storage.
- Existing stored statuses and database checks include legacy values beyond the four MVP states. Inspect current values and map legacy states safely; never display raw database status codes to students. Do not silently rewrite existing cases.
- Migrations `0013_student_affairs_sensitive_read.sql` and `0014_student_affairs_only_receiver.sql` are applied and verified live. The CMS accepts only an active `student_affairs_admin` account. A read-only live catalog check confirmed the one-receiver boundary and blocked anonymous/public complaint reads. Do not reapply migration `0014`. Keep both sensitive categories in intake. Complaints involving the Student Dean require an out-of-platform referral path.
- The CMS layout and protected pages verify the Supabase user, active `profiles` row, and `student_affairs_admin` role server-side. Session presence alone is insufficient.
- The database status history trigger and role/RLS policies are security boundaries; do not bypass them with client-side access or expose the service-role key.

## Required CMS behavior

### 1. Authentication

- Keep the existing login route and Supabase Auth flow where practical.
- Reject inactive profiles and accounts without `student_affairs_admin`.
- Protect every CMS page and every server mutation, not only the dashboard route.
- No public staff sign-up or role-management page.

### 2. Complaint inbox

- Show cases newest first with server-side pagination (25 per page).
- Display tracking reference, student name/ID, category, status, and submitted time.
- Provide filters for the four public statuses and active categories.
- Provide search by tracking reference or student ID. Search and filters must run against the database, not only the currently loaded page.
- Show accurate status totals from separate count queries; do not derive global totals from the visible page or the latest 100 cases.
- Include clean empty, loading, and database-error states without exposing raw SQL/provider errors to students.

### 3. Complaint detail

- Show the student contact fields, category, full issue details, submission date, tracking reference, current status, and verified attachments.
- Provide a simple status control with allowed path `NEW → UNDER_REVIEW → RESOLVED → CLOSED`.
- Provide one optional message field for a **student-visible** update. Store it in `complaint_updates.message` with `is_public = true`.
- If status and message are submitted together, make the operation atomic (for example, a narrowly scoped database function); otherwise make them separate actions with separate success/error feedback.
- Do not build internal notes. Do not query non-public updates as if they were notes.
- Show the automatic status-history timeline once. Do not duplicate trigger-generated rows.
- For legacy statuses, show a safe display label and give the officer a documented path to move the case into the MVP workflow. Never silently change the stored status just to render the page.

### 4. Evidence

- Use a private `complaint-attachments` Supabase Storage bucket.
- Target no more than 3 files per complaint, 5 MB per file, and no more than one short voice clip (90 seconds maximum).
- Allow only common image types and approved audio types. No video or automatic transcription.
- Generate random storage paths with no student name/ID. Validate file count, byte size, MIME type, and actual file signature on the server.
- Current intake sends evidence in the final multipart submission. Save validated files to private Storage and then insert metadata. On handled failures, remove uploaded objects and the incomplete complaint; do not add temporary draft objects unless implementing their cleanup too.
- The browser checks a 90-second audio limit, but the server does not parse duration. Add server-side duration validation before treating this limit as tamper-proof.
- Create short-lived signed download URLs only after verifying the current officer's role. Never expose a public bucket URL.
- The student tracking API must not expose attachment paths or download links in this release.

### 5. Public tracking and intake compatibility

- Preserve the existing tracking reference plus passcode flow. The passcode is displayed once, stored only as a hash, and never logged or returned by tracking endpoints.
- Keep generic error responses for missing case and incorrect passcode.
- Public tracking may return tracking reference, public status label, category, submission/last-update time, and public messages only. Never return name, student ID, phone, staff details, or internal IDs.
- Update submission validation so contact fields and category remain required, and at least one of non-empty issue text or a verified attachment is required.
- Make only the intake changes needed for optional evidence (upload, submit, and confirmation); do not redesign unrelated public portal pages.
- Keep the category set focused on grades/exams, registration/course changes, teaching/class schedules, academic records, optional fees/payments if Student Affairs accepts them, and other academic issues. `STUD_SERV` is already inactive; do not delete category rows.

## Database changes and safety

- Add forward-only migration files for any required schema or RLS changes. No `DROP TABLE`, reset, truncate, or data rewrite without a read-only preflight and explicit approval.
- Before narrowing status/category constraints, inspect complaint counts, current statuses, and foreign-key references. Preserve all rows and provide a safe legacy status mapping.
- Ensure the designated Student Affairs officer can read all complaint and identity records required by the workflow; keep anonymous access blocked with RLS.
- Ensure service-role use stays on the server. Check error handling so a failed status update or message write is visible and does not claim success.
- The local migration runner was adjusted to recognize self-transactional migrations and avoid duplicate ledger inserts. Do not use it against production; apply only reviewed SQL through the dashboard after required approvals.
- Public submission and tracking rate limits are currently in-memory per app process. Replace them with shared rate limiting before multi-instance production deployment.
- Do not modify Supabase Storage system tables directly. Manage bucket/files through the Storage API.
- Do not add sample student PII.
- Live preflight on 2026-11-12 confirmed migrations `0001–0010`, zero complaint data, and one active `student_affairs_admin` profile. Migrations `0011` and `0012` have since been applied and verified live.
- The private `complaint-attachments` bucket has been created live with a 5 MB limit and the approved image/audio MIME types. It contains no files.
- Migrations `0013_student_affairs_sensitive_read.sql` and `0014_student_affairs_only_receiver.sql` have been applied and verified live. Do not reapply either migration. Preserve the active-staff plus `student_affairs_admin` restriction and the block on anonymous/public complaint reads.

## Implementation discipline

- Reuse the existing UI components and project styles. Do not add dependencies unless a necessary gap is documented.
- Keep the work within the CMS, the necessary complaint intake/tracking integration, its server actions/API, matching validation/status utilities, and required forward migrations/docs.
- Do not redesign unrelated public portal pages.
- Avoid hardcoded claims about current Unity University departments/programs. Do not add dormitory or food-service options.
- Do not print secret environment values, student PII, tracking passcodes, or file URLs in logs.
- Do not add or run tests unless requested. Summarize files changed, security decisions, and any unresolved database preflight required before applying future migrations.

## Completion checklist

Before finishing, confirm from the code (without applying anything to production) that:

- Only active Student Affairs staff can open CMS pages or mutate complaints.
- The queue is paginated and its counts/search/filtering are database-backed.
- CMS queries use the actual database column names.
- A status change creates one history row, not two.
- A public update is stored once and appears in the tracking response.
- Student PII and evidence paths never appear in public tracking responses.
- Evidence is private and opened only with an authorized short-lived link.
- The visible workflow has the four agreed statuses and no housing/dining categories.
- All existing complaint/category/history rows remain preserved.

At the end, give a concise report of the implementation, migrations applied or prepared, and any live preflight/application steps still requiring the project owner.
