# Software Requirements Specification (SRS) — Functional Requirements

**Product Name:** Unity Student Support  
**Document Version:** 1.0.0  
**Status:** Approved for Implementation Planning  

---

## 1. Domain 1: Public Portal & Complaint Intake

### FR-001: Multi-Step Public Complaint Submission
- **Description:** Allow any student or complainant to submit a structured complaint through an accessible, mobile-first wizard without creating a platform account.
- **User Role:** Public Student / Complainant
- **Preconditions:** The public portal is accessible; complainant has internet connectivity.
- **Expected Behavior:**
  1. The user navigates through 5 sequential steps: (1) Submission Type, (2) Grievance Taxonomy, (3) Statement, (4) Evidence, (5) Confirmation.
  2. The system maintains progress in client state until final submission.
  3. Upon submission, the server validates inputs, generates tracking credentials, persists the record, and displays the success screen.
- **Validation Rules:**
  - Submission Type must be one of: `IDENTIFIED`, `CONFIDENTIAL`, `ANONYMOUS`.
  - Category must match an active category ID from the database.
  - Campus must be a valid Unity University campus identifier.
  - Title/Subject must be between 5 and 150 characters.
  - Description must be between 20 and 5,000 characters.
  - Incident Date must be on or before the current date and not older than 365 days [Proposed].
- **Error Conditions:**
  - Validation error: Highlight invalid fields with localized inline error messages.
  - Network interruption: Retain step state in session memory; display a non-destructive retry banner.
  - Rate limit exceeded: Return HTTP 429 with user-friendly retry-after notification.
- **Acceptance Criteria:**
  - Form successfully submits with all valid inputs.
  - Database stores complaint with initial status `NEW`.
  - User receives a generated tracking reference and passcode on the confirmation screen.

---

### FR-002: Submission Privacy Modes (Identified, Confidential, Anonymous)
- **Description:** Provide distinct privacy levels that enforce identity collection and downstream visibility according to student preference.
- **User Role:** Public Student / Complainant
- **Preconditions:** User is on Step 1 of the submission wizard.
- **Expected Behavior:**
  - **Identified:** System requires Full Name, Student ID Number, University/Personal Email, and Phone Number. All assigned reviewers and department handlers can see this information.
  - **Confidential:** System requires Full Name, Student ID Number, Email, and Phone Number. System stores a flag `is_confidential = true`. Only Student Affairs Admins and Escalation Officers can view complainant PII. Department Handlers see `[CONFIDENTIAL COMPLAINANT - IDENTITY SEALED]`.
  - **Anonymous:** System hides all identity fields. Server ensures `student_name`, `student_id`, `email`, and `phone` are recorded as `NULL`. Client IP is hashed/salted or discarded from the complaint table.
- **Validation Rules:**
  - If `IDENTIFIED` or `CONFIDENTIAL`:
    - Full Name: 2–100 characters.
    - Student ID: Valid Unity University format (regex: `^[A-Za-z0-9/\-]{5,20}$`).
    - Email: Valid RFC 5322 email string.
    - Phone: Valid Ethiopian mobile number format (`+2519...`, `+2517...`, or `09...`, `07...`).
  - If `ANONYMOUS`:
    - Any identity fields sent in payload are forcefully discarded by the server validation schema.
- **Error Conditions:**
  - Missing student details when Identified or Confidential is selected triggers validation block.
- **Acceptance Criteria:**
  - Anonymous submissions contain zero personally identifiable traces in the database.
  - Confidential submissions hide identity attributes from Department Handler queries.

---

### FR-003: Supporting Evidence Upload
- **Description:** Allow complainants to optionally attach documents or images supporting their complaint.
- **User Role:** Public Student / Complainant
- **Preconditions:** User is on Step 4 of the submission wizard.
- **Expected Behavior:**
  - Complainant selects up to 3 files.
  - Client validates file size and MIME type prior to upload.
  - Files are uploaded to a private Supabase Storage bucket (`complaint-attachments`) under an isolated, unguessable path: `complaints/{complaint_id}/{uuid}-{filename}`.
  - Public users cannot access raw storage URLs directly.
- **Validation Rules:**
  - Maximum 3 files per submission.
  - Maximum file size: 5 MB per file.
  - Permitted MIME types: `application/pdf`, `image/jpeg`, `image/png`, `image/webp`.
  - Executable files (`.exe`, `.sh`, `.bat`), archives (`.zip`), or script files are strictly blocked.
- **Error Conditions:**
  - File exceeds 5 MB: Immediate inline warning; file rejected.
  - Unsupported file type: Immediate inline warning; file rejected.
  - Storage upload failure: Inform user that text complaint was saved but attachments failed, providing an option to re-upload.
- **Acceptance Criteria:**
  - Valid files upload successfully and are linked in the `complaint_attachments` table.
  - Bucket permissions prohibit public anonymous reads.

---

### FR-004: Cryptographic Tracking Reference & Passcode Issuance
- **Description:** Generate an institutional tracking reference code and a high-entropy secret passcode for every submitted complaint.
- **User Role:** Public Student / Complainant
- **Preconditions:** Complaint payload passes all server validations and is committed to the database.
- **Expected Behavior:**
  1. System generates an institutional reference code formatted as: `UU-YYYY-XXXXX` (e.g., `UU-2026-89412`), where `YYYY` is the current Gregorian year and `XXXXX` is a random, collision-resistant 5-digit alphanumeric identifier.
  2. System generates a 16-character alphanumeric secret tracking passcode formatted as `xxxx-xxxx-xxxx-xxxx` (e.g., `k9m2-8vb4-7pq1-w3x8`).
  3. The server computes a secure hash (Argon2id/bcrypt) of the secret passcode and stores it in `complaints.tracking_hash`. The plain passcode is NEVER stored in the database.
  4. The plain tracking number and passcode are rendered on the confirmation screen once, accompanied by a "Copy Credentials" button and an option to "Download Tracking Receipt (PDF/Text)".
- **Validation Rules:**
  - Tracking numbers must be strictly unique across the system.
  - Passcode must have minimum 64 bits of entropy.
- **Error Conditions:**
  - Database collision on tracking reference: Retry generation up to 3 times with new entropy before aborting.
- **Acceptance Criteria:**
  - Complainant can copy both credentials.
  - Only the hash of the passcode is stored in the database.

---

## 2. Domain 2: Public Complaint Tracking & Two-Way Clarification

### FR-005: Secure Case Tracking Lookup
- **Description:** Allow a student to track the real-time status of their complaint by providing their Tracking Reference and Secret Passcode.
- **User Role:** Public Student / Complainant
- **Preconditions:** Complainant has their reference code and passcode.
- **Expected Behavior:**
  1. Student enters Tracking Reference and Passcode into `/portal/track`.
  2. Server verifies the tracking reference exists and verifies the passcode against `tracking_hash`.
  3. Upon verification, server issues a short-lived tracking session token (JWT/cookie, valid for 30 minutes) scoped solely to that single complaint ID.
  4. The tracking dashboard displays: Public Status, Current Phase, Submission Date, Last Updated Date, Sanitized Category, and Approved Public Timeline Updates.
- **Validation Rules:**
  - Reference must match format `UU-YYYY-XXXXX`.
  - Passcode must be exactly 16 characters (hyphens optional).
- **Error Conditions:**
  - Invalid reference or passcode: Return generic error: *"No active complaint found matching these credentials. Please verify your reference number and passcode."*
  - 5 consecutive failed attempts from an IP within 15 minutes: Enforce a 15-minute cooldown.
- **Acceptance Criteria:**
  - Valid credentials grant read access exclusively to the target complaint's public attributes.
  - Zero internal notes or staff identities are exposed in the returned JSON payload.

---

### FR-006: Student Clarification Submission (Awaiting Response)
- **Description:** Enable a student to submit additional information or uploaded evidence when the university sets the status to `Awaiting Response`.
- **User Role:** Public Student / Complainant
- **Preconditions:** Complaint is in status `AWAITING_RESPONSE`; student is authenticated with a valid tracking session token.
- **Expected Behavior:**
  1. The tracking interface displays a dedicated "University Request for Clarification" card detailing the official question sent by the handler.
  2. A text response input (50–2,000 characters) and optional file uploader (1 file, max 5MB) become active.
  3. Upon student submission, the message is stored in `complaint_updates` (type: `STUDENT_REPLY`).
  4. System automatically transitions the complaint status back to `IN_PROGRESS` or `UNDER_REVIEW`.
  5. The assigned handler is notified in their CMS dashboard.
- **Validation Rules:**
  - Action is disabled if status is anything other than `AWAITING_RESPONSE`.
  - Message must be 10–2,000 characters.
- **Error Conditions:**
  - Submission attempt while status is not `AWAITING_RESPONSE`: Rejection with code 400 (*"This complaint is not currently awaiting clarification."*).
- **Acceptance Criteria:**
  - Student response appends to case history.
  - Case status shifts away from `AWAITING_RESPONSE` automatically.

---

## 3. Domain 3: Staff Authentication & Role-Based Access Control

### FR-007: Staff Authentication & Session Security
- **Description:** Authenticate university staff members via secure credentials with strict session lifecycle enforcement.
- **User Role:** All Staff Roles (`student_affairs_admin`, `complaint_reviewer`, `department_handler`, `escalation_officer`, `system_admin`, `auditor`)
- **Preconditions:** Staff user has an active record in `staff_profiles` linked to Supabase Auth.
- **Expected Behavior:**
  1. Staff logs in via `/admin/login` using institutional email and password.
  2. Server verifies credentials, checks `is_active = true`, and retrieves role and department associations.
  3. Session cookies are issued with `HttpOnly`, `Secure`, and `SameSite=Lax` flags.
  4. Users with inactive accounts (`is_active = false`) are denied access immediately.
- **Validation Rules:**
  - Passwords must be at least 12 characters, including uppercase, lowercase, numbers, and symbols.
- **Error Conditions:**
  - Invalid credentials: Return generic *"Invalid email or password"*.
  - Account deactivated: Return *"Account disabled. Contact the System Administrator."*
- **Acceptance Criteria:**
  - Successful login redirects to `/admin/dashboard`.
  - Inactive staff are completely blocked.

---

### FR-008: Role-Based Route & Data Guarding
- **Description:** Enforce server-side role authorization on every administrative page route, server action, and API endpoint.
- **User Role:** All Roles
- **Preconditions:** User requests an administrative resource.
- **Expected Behavior:**
  - Department handlers can only fetch complaints where `department_id = staff.department_id`.
  - Only `system_admin` can access `/admin/settings` and `/admin/team`.
  - Only `escalation_officer` and `system_admin` can view `restricted_sensitive` cases.
  - Direct URL access to unauthorized pages returns HTTP 403 Forbidden or redirects to `/admin/dashboard` with an error toast.
- **Acceptance Criteria:**
  - Attempting to query another department's complaint ID as a `department_handler` fails with 403 / Not Found.

---

## 4. Domain 4: Complaint Triage, Categorization & Assignment

### FR-009: Unified Complaint Queue & Filtering
- **Description:** Provide staff with a real-time, filterable queue of complaints tailored to their role.
- **User Role:** Staff Affairs Admin, Reviewer, Department Handler, Escalation Officer
- **Preconditions:** Staff is authenticated.
- **Expected Behavior:**
  - Displays complaints in paginated tables (25 per page).
  - Filters available: Status, Category, Department, Date Range, Privacy Type, SLA Status (Normal, Approaching Breach, Breached).
  - Search bar allows searching by Tracking Reference, Subject, or Student ID (where permitted).
  - Visual badges indicate Priority, Status, and Confidentiality.
- **Acceptance Criteria:**
  - Queue loads within 800ms.
  - Queries strictly respect user role and department boundaries.

---

### FR-010: Complaint Triage & Categorization
- **Description:** Allow triage officers to review new complaints, verify category accuracy, and assign priority.
- **User Role:** Student Affairs Admin, Escalation Officer
- **Preconditions:** Complaint is in status `NEW`.
- **Expected Behavior:**
  1. Officer inspects complaint details.
  2. Officer may adjust Category, Campus, Faculty, or Department if misclassified by student.
  3. Officer sets initial Priority (`LOW`, `MEDIUM`, `HIGH`, `URGENT`).
  4. System transitions status from `NEW` to `UNDER_REVIEW`.
  5. Audit log records the triage action and any field adjustments.
- **Acceptance Criteria:**
  - Changes to category are recorded in the audit trail.
  - Status updates to `UNDER_REVIEW`.

---

### FR-011: Department & Handler Assignment with Conflict-of-Interest Guard
- **Description:** Assign a complaint to a specific department and individual case handler, preventing assignment to accused parties.
- **User Role:** Student Affairs Admin, Department Handler (delegating within dept), Escalation Officer
- **Preconditions:** Complaint is in `UNDER_REVIEW` or `ASSIGNED`.
- **Expected Behavior:**
  1. Officer selects target Department and Handler from filtered dropdowns.
  2. System checks if the selected handler's name matches any text in the `accused_party` field.
  3. If a potential conflict is detected, the system displays a prominent warning modal: *"Conflict Warning: Selected handler matches or is associated with the accused party in this case. Assignment requires senior override."*
  4. Upon confirmed assignment, status transitions to `ASSIGNED`.
  5. Assigned handler receives in-app notification.
- **Validation Rules:**
  - Department Handler can only assign/delegate within their own department.
- **Acceptance Criteria:**
  - Case is successfully assigned and appears in the handler's "Assigned to Me" queue.
  - Conflict warning prevents accidental self-investigation.

---

## 5. Domain 5: Investigation & Internal Collaboration

### FR-012: Air-Gapped Internal Investigation Notes
- **Description:** Enable investigating staff to record private investigative notes, witness statements, and internal documents that are strictly hidden from public tracking.
- **User Role:** Assigned Department Handler, Student Affairs Admin, Escalation Officer
- **Preconditions:** Case is open (`ASSIGNED`, `IN_PROGRESS`, `UNDER_REVIEW`, `ESCALATED`).
- **Expected Behavior:**
  1. Staff posts an internal note (up to 5,000 characters).
  2. Note is written to `internal_notes` table with author ID, timestamp, and optional internal attachment.
  3. Note appears in the administrative Internal Timeline with author name and timestamp.
  4. **Absolute Isolation:** Under no circumstances does this record sync to `complaint_updates` or public tracking queries.
- **Acceptance Criteria:**
  - Note appears immediately in CMS internal timeline.
  - API call from public tracking endpoint returns zero records from `internal_notes`.

---

## 6. Domain 6: Student Communication & Public Response

### FR-013: Official Student-Facing Response Authoring & Approval
- **Description:** Draft, review, and formally publish official updates or requests for clarification to the student complainant.
- **User Role:** Department Handler (Drafter/Publisher*), Student Affairs Admin (Approver/Publisher), Escalation Officer
- **Preconditions:** Case is `IN_PROGRESS` or `ESCALATED`.
- **Expected Behavior:**
  1. Handler drafts response to student.
  2. Response type is selected: `OFFICIAL_UPDATE`, `CLARIFICATION_REQUEST`, or `RESOLUTION_NOTICE`.
  3. If institutional policy requires approval, the draft is marked `PENDING_APPROVAL` until signed off by Student Affairs Admin.
  4. Once published, the record is inserted into `complaint_updates` with `is_public = true`.
  5. If response type is `CLARIFICATION_REQUEST`, case status automatically updates to `AWAITING_RESPONSE`.
- **Validation Rules:**
  - Message must be between 20 and 3,000 characters.
  - Must not contain sensitive staff email or internal phone numbers unless explicitly authorized.
- **Acceptance Criteria:**
  - Published response is immediately visible to student upon tracking lookup.
  - Status updates appropriately.

---

## 7. Domain 7: Escalation & Sensitive Case Management

### FR-014: Case Escalation Management
- **Description:** Escalate stalled, complex, or high-risk complaints to senior leadership (Dean of Students / Escalation Officers).
- **User Role:** Department Handler, Student Affairs Admin, Escalation Officer
- **Preconditions:** Case is in any active state prior to `RESOLVED`.
- **Expected Behavior:**
  1. Staff clicks "Escalate Case".
  2. System prompts for mandatory Escalation Reason (minimum 30 characters) and Escalation Target (Dean of Students, Ethics Committee, Provost Office).
  3. Case status transitions to `ESCALATED`.
  4. Case is highlighted with an URGENT badge and moved to the Escalation Officer priority queue.
- **Acceptance Criteria:**
  - Case status updates to `ESCALATED`.
  - Audit trail logs the escalation reason, initiating staff member, and timestamp.

---

### FR-015: Restricted Sensitive Case Quarantine
- **Description:** Quarantine highly sensitive grievances (e.g., sexual harassment, fraud, severe misconduct) into a restricted silo accessible only by designated senior officers.
- **User Role:** Student Affairs Admin, Escalation Officer
- **Preconditions:** Complaint exists in the system.
- **Expected Behavior:**
  1. Authorized officer toggles `is_restricted_sensitive = true`.
  2. The complaint is immediately removed from general queues and department views.
  3. Only users with `role: escalation_officer` or specific access grants can view the dossier.
- **Acceptance Criteria:**
  - Standard department handlers receive 404/403 when querying a restricted case.
  - Case appears only in the "Restricted Cases" tab for authorized leadership.

---

## 8. Domain 8: Case Resolution, Closure & Reopening

### FR-016: Formal Case Resolution
- **Description:** Record official investigation findings and propose/apply formal case resolution.
- **User Role:** Department Handler (Propose), Student Affairs Admin (Apply), Escalation Officer (Apply)
- **Preconditions:** Investigation is complete.
- **Expected Behavior:**
  1. Staff submits Resolution Summary, Corrective Actions Taken, and Official Student Resolution Notice.
  2. Status transitions to `RESOLVED`.
  3. Public tracking displays the resolution message and notifies student that the case is resolved.
- **Acceptance Criteria:**
  - Status updates to `RESOLVED`.
  - Resolved timestamp recorded.

---

### FR-017: Case Formal Closure & Grace Period
- **Description:** Formally close a resolved complaint after an institutional review or student confirmation period.
- **User Role:** Student Affairs Admin, Escalation Officer
- **Preconditions:** Complaint has been in `RESOLVED` status for a configurable period (Default: 5 business days [Proposed]).
- **Expected Behavior:**
  1. Admin executes "Formal Closure".
  2. Status transitions from `RESOLVED` to `CLOSED`.
  3. Case is archived from active operational queues into historical records.
- **Acceptance Criteria:**
  - Status transitions to `CLOSED`. Case becomes read-only for standard handlers.

---

### FR-018: Case Reopening Protocol
- **Description:** Allow reopening of a resolved or closed complaint if new compelling evidence is submitted or resolution was inadequate.
- **User Role:** Student Affairs Admin, Escalation Officer (Staff initiated); Public Student (Request initiated via tracking page within 10 days of resolution)
- **Preconditions:** Case is `RESOLVED` or `CLOSED` within the permitted reopening window.
- **Expected Behavior:**
  1. Reopening justification is recorded (mandatory).
  2. Status transitions to `REOPENED` (treated operationally as `UNDER_REVIEW`).
  3. Case is flagged as `REOPENED_CASE` in the triage queue with previous history intact.
- **Acceptance Criteria:**
  - Case transitions to `REOPENED`.
  - Complete history of initial resolution remains preserved in the audit log.

---

## 9. Domain 9: Reporting, Analytics & Audit Trail

### FR-019: Operational Reporting Dashboard
- **Description:** Provide aggregate statistical dashboards on complaint volumes, categories, resolution rates, and SLA performance.
- **User Role:** Student Affairs Admin, Escalation Officer, Auditor, System Admin
- **Preconditions:** Authenticated user with reporting permissions.
- **Expected Behavior:**
  - Displays KPI cards: Total Complaints (MTD/YTD), Active Cases, Average Days to Resolution, SLA Compliance Rate (%).
  - Charts: Complaints by Faculty/Department, Complaints by Category, Resolution Breakdown.
  - De-identifies all student data in aggregate views.
- **Acceptance Criteria:**
  - Metrics calculate dynamically based on date range filters.
  - Zero PII leaks into aggregated reporting APIs.

---

### FR-020: Comprehensive Immutable Audit Trail
- **Description:** Record an immutable log of every significant user action, status transition, data access, and configuration change.
- **User Role:** System automated / Auditor & System Admin (Viewer)
- **Preconditions:** Any state-altering action is triggered in the system.
- **Expected Behavior:**
  1. The system creates a row in `audit_logs` containing: `timestamp`, `actor_id` (or `'system'`/`'public_student'`), `actor_role`, `action_type`, `resource_table`, `resource_id`, `before_state`, `after_state`, and `ip_address`.
  2. The table is append-only; database permissions prevent `UPDATE` or `DELETE` on `audit_logs`.
- **Acceptance Criteria:**
  - Every status change, assignment, note creation, and PII unmasking event generates an audit entry.
  - Database prevents alteration of existing log rows.

