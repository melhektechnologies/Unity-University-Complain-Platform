# Unity Student Support — MVP Architecture

**Status:** Build target for the first usable release  
**Owner:** Student Affairs  
**Primary operator:** One Student Affairs staff member

This document narrows the existing foundation to the product the university needs now. It guides the CMS implementation and database changes. It does not authorize dropping or rewriting live tables.

## 1. Product decision

- The web portal is the official submission, tracking, and case-management system.
- The first audience is regular undergraduate students. Do not add program, department, campus, or study-mode routing until Student Affairs needs it.
- One authenticated Student Affairs account handles all cases.
- Telegram is not a complaint inbox and does not receive evidence. A later bot may link to the portal or send an opt-in, generic status notice, using the same case system.
- Keep the interface and database use focused on intake, review, updates, resolution, and closure.

## 2. Student journey

1. The student submits their full name, student ID, phone number, category, and issue.
2. The written description may be blank only when at least one valid attachment is present.
3. The server creates a unique tracking reference and a random secret passcode. Show both once on the confirmation page and tell the student to save them.
4. The student tracks the case using the reference and passcode.
5. Tracking returns the current public status, submission date, and Student Affairs messages. It never returns the student's name, ID, phone, internal database ID, or a public file URL.

Name, student ID, phone, category, and either written issue details or an attachment are required. Encourage a short caption even when evidence is attached.

## 3. Student Affairs workflow

The single staff account can:

- See a paginated inbox of all complaints.
- Search by tracking reference or student ID and filter by status or category.
- Open a complaint to see the student's contact details, issue, and private evidence links.
- Change status and optionally add a message visible to the student.
- Review status history.

The first release does not need staff assignments, multiple roles, internal deliberation notes, escalation routing, SLA configuration, student accounts, anonymous submissions, analytics charts, email delivery, SMS, or a Telegram complaint bot.

## 4. Four public statuses

| Database value | Student-facing label |
|---|---|
| `NEW` | Submitted |
| `UNDER_REVIEW` | On Review |
| `RESOLVED` | Solved |
| `CLOSED` | Closed |

The normal path is `NEW → UNDER_REVIEW → RESOLVED → CLOSED`. “Needs more information” is a message while the case remains On Review; it is not a separate status. Do not add `IN_PROGRESS` or `AWAITING_RESPONSE` to the first-release interface.

The live schema still permits legacy values such as `ASSIGNED`, `IN_PROGRESS`, `AWAITING_RESPONSE`, `ESCALATED`, and `REOPENED`. Before narrowing database constraints, check existing records and status history. Until a safe migration is approved, map legacy active states to “On Review” in the UI and never show raw enum values to students.

## 5. Academic issue categories

Use the active `complaint_categories` rows; do not hard-delete categories that may be referenced by existing cases. The proposed active set is:

1. Grades and exam results
2. Registration, courses, and add/drop
3. Teaching and class schedules
4. Academic records and documents
5. Fees or payments, if Student Affairs accepts these cases
6. Other academic issue

Deactivate housing, dining, and campus-life categories. Do not invent a live department/program list from older public pages. “Other academic issue” gives Student Affairs a safe catch-all.

## 6. Database arrangement

Use the current tables for the MVP. Do not add a second complaint model.

| Existing table | MVP use |
|---|---|
| `complaints` | Case narrative, category, tracking reference/hash, status, and timestamps. It contains no student contact PII. |
| `complaint_identities` | One student's name, ID, and phone per case; email remains optional and may be omitted from the form. |
| `complaint_categories` | The small active student-facing category list. |
| `complaint_status_history` | Immutable status timeline. The database trigger already adds a history row on a status change. |
| `complaint_updates` | Student-visible messages only. The database column is `message`, with `is_public = true`. |
| `complaint_attachments` | File metadata and private Storage object path; never file contents. |
| `profiles`, `user_roles` | The one active Student Affairs account with role `student_affairs_admin`. |

Keep the other existing tables and role definitions untouched for now. They may be unused by the MVP. Do not add staff-management screens for them.

### Implemented schema and code alignment

- CMS entry, the inbox, complaint detail, status changes, and public messages verify a Supabase user, active profile, and `student_affairs_admin` role. Complaint updates use the authenticated RLS client.
- The four public labels are Submitted, On Review, Solved, and Closed. Stored legacy statuses map to those labels without rewriting database rows.
- Status changes rely on the existing database trigger for exactly one history row. Student messages use the actual `message`, `author_profile_id`, and `update_type` columns and are saved separately as public updates.
- Intake resolves an active category before inserting; a missing/deactivated category returns a safe error instead of attempting a null `category_id`.
- The inbox uses 25-row server pagination, database-backed status/category filters and search, and separate exact-count queries.
- Migration `0012` and the private bucket are live. The form accepts meaningful written detail or evidence. Uploads are server-mediated, type/signature/size checked, and stored under random paths; the complaint metadata is inserted after each object succeeds. Officer links are signed for one minute.
- Migrations `0013_student_affairs_sensitive_read.sql` and `0014_student_affairs_only_receiver.sql` are applied and verified live (2026-11-14). A read-only catalog check confirmed row-level security on all nine case tables, one active Student Affairs account, Student Affairs-only complaint read/update policies, and no anonymous/public complaint read policy. Anonymous submission and passcode tracking remain server-mediated. The two sensitive categories are enabled in intake. Complaints involving the Student Dean need an out-of-platform referral procedure before any student pilot.

## 7. Evidence uploads

- Store evidence in the private Supabase bucket, `complaint-attachments` (created live on 2026-11-12).
- The live bucket is private, limited to 5 MB per object, and allows JPEG/PNG/WebP plus OGG/WebM/MP4/MP3 audio MIME types. It is empty; no files were uploaded.
- Accept at most 3 files per complaint, 5 MB each, and at most one short audio clip (recommended maximum 90 seconds).
- Allowlist common photo types and a small set of audio types (`audio/ogg`, `audio/webm`, `audio/mp4`, `audio/mpeg`). No video or automatic transcription in the MVP.
- Keep the bucket private. Intake uploads pass through the server; only an authenticated Student Affairs officer can request one-minute signed download links. The public tracking page does not link to evidence.
- Use random storage paths without student names or IDs. Validate file signature, declared MIME type, count, and byte size on the server; the bucket enforces the 5 MB limit and MIME allowlist.
- Store file metadata only after the Storage upload succeeds. On a handled database error, remove uploaded objects and the incomplete complaint. The current upload flow does not create temporary draft objects.
- The form checks audio duration in the browser (90 seconds maximum); the server validates audio type and size but does not independently parse duration. Add a server-side media duration check before broad production rollout if the 90-second limit must be tamper-proof.
- If the student submits no written detail, require an attachment and show a prompt encouraging a short explanatory caption.

## 8. Access and privacy rules

- Supabase Auth is for the single staff user; do not offer public staff registration.
- Check `auth.getUser()`, `profiles.is_active`, and the `student_affairs_admin` role server-side on every CMS page/action/API mutation. Middleware is an early redirect, not the authorization boundary.
- Keep `SUPABASE_SERVICE_ROLE_KEY` server-only. Never import the admin client into client components or return it, its token, or tracking hashes in API responses.
- Anonymous clients may submit only through validated server endpoints. They receive no direct `SELECT` access to `complaints`, `complaint_identities`, `complaint_updates`, or attachment metadata.
- Public tracking requires both tracking reference and passcode, uses a generic failure response, and returns only student-facing fields.
- Apply modest rate limits to public submissions and tracking attempts; keep tracking failures generic so the endpoint does not reveal whether a reference exists. The current limiter is in-memory per app process, so replace it with shared rate limiting before a multi-instance production deployment.
- Do not log student descriptions, names, IDs, phone numbers, passcodes, upload tokens, or file URLs.
- Do not send complaint content, passcodes, or media through Telegram. If Telegram notifications are added later, they must be opt-in and generic.

## 9. Verified live baseline and safe rollout

- A read-only preflight ran in Supabase on 2026-11-12. Migrations `0001–0010` were recorded; no complaint, identity, status-history, update, or attachment rows existed. One active `student_affairs_admin` profile was assigned.
- `0011_lock_migration_ledger.sql` was applied and verified live. RLS is enabled on `schema_migrations`; `anon` and `authenticated` cannot select or insert, while `service_role` can select and insert.
- `0012_mvp_optional_evidence.sql` was applied and verified live. Description is nullable, voice MIME types are accepted by the attachment constraint, and the `STUD_SERV` housing/dining/campus-life category is inactive.
- The private `complaint-attachments` bucket was created live with a 5 MB limit and the approved image/audio MIME allowlist. It currently contains no objects.
- The nine seeded categories had no complaint references at preflight. No category rows were deleted.
- Sensitive category rows remain active in the database and are enabled in student intake. Migrations `0013_student_affairs_sensitive_read.sql` and `0014_student_affairs_only_receiver.sql` are applied. The 0014 read-only live verification confirmed the ledger record, row-level security on all nine case tables, one active `student_affairs_admin` account, Student Affairs-only case read/update policies, and no `anon`/`public` complaint SELECT policies. No complaint records were inspected during that check.
- Preserve all future complaint, identity, history, and attachment rows. Keep a no-PII preflight before subsequent production migrations.
- Every database change must be a new forward migration. Preserve complaint, identity, status-history, and attachment rows. Do not drop tables or reset the project.
- Apply migrations through a reviewed SQL Editor run or an approved database connection. Never claim a local migration has been applied to production without live verification.
