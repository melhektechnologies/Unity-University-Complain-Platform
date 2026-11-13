# Software Requirements Specification (SRS) — Business Rules

**Product Name:** Unity Student Support  
**Document Version:** 1.0.0  
**Status:** Approved for Implementation Planning  

---

## 1. Complaint Categories & Department Mapping

### BR-001: Category & Faculty Taxonomy [CONFIRMED BASELINE with Placeholders]
All complaints must be classified under a primary institutional Category and mapped to the appropriate Campus, Faculty, and Department. The default seed taxonomy is configurable by the System Administrator:

| Category Code | Display Name | Default Assigned Entity | Auto-Sensitive Flag? |
| :--- | :--- | :--- | :---: |
| `ACAD_EVAL` | Grading & Academic Evaluation | Academic Department Head | No |
| `ACAD_INST` | Teaching Quality & Instructor Conduct | Academic Faculty Dean | No |
| `REG_ENROLL`| Registration, Add/Drop & Enrollment | Office of the Registrar | No |
| `FIN_TUITION`| Tuition, Billing & Finance Clearance | Finance & Student Accounts | No |
| `FAC_CAMPUS` | Facilities, Laboratories & Library | Campus Operations / Facilities | No |
| `STUD_SERV` | Student Housing, Dining & Campus Life | Student Affairs Directorate | No |
| `ETH_HARASS` | Harassment, Discrimination & Gender Issues | Dean of Students / Ethics Committee | **YES** |
| `ETH_CORRUPT`| Bribery, Fraud & Malpractice | Internal Ethics Committee | **YES** |
| `GEN_OTHER`  | General Inquiries & Other Feedback | Student Affairs Directorate | No |

### BR-002: Dynamic Taxonomy Reconfiguration [CONFIRMED BASELINE]
Departments, Faculties, and Categories must not be hardcoded in application business logic. They must be maintained in relational tables (`departments`, `faculties`, `complaint_categories`) with an `is_active` boolean flag to allow adding, renaming, or deactivating units without code deployments.

---

## 2. Form Fields & Validation Boundaries

### BR-003: Field Requirements by Submission Type [CONFIRMED BASELINE]

| Field Name | Identified | Confidential | Anonymous | Technical Constraint |
| :--- | :---: | :---: | :---: | :--- |
| **Submission Type** | Mandatory | Mandatory | Mandatory | Enum: `IDENTIFIED`, `CONFIDENTIAL`, `ANONYMOUS` |
| **Full Legal Name** | Mandatory | Mandatory | **Strictly Forbidden** | 2–100 characters |
| **Unity Student ID**| Mandatory | Mandatory | **Strictly Forbidden** | Format: `^[A-Za-z0-9/\-]{5,20}$` |
| **Complainant Email**| Mandatory| Mandatory | **Strictly Forbidden** | Valid email RFC 5322 |
| **Complainant Phone**| Mandatory| Mandatory | **Strictly Forbidden** | Format: `^(\+251\|0)[79][0-9]{8}$` |
| **Campus** | Mandatory | Mandatory | Mandatory | Foreign key to `campuses.id` |
| **Faculty / Unit** | Mandatory | Mandatory | Mandatory | Foreign key to `faculties.id` |
| **Department** | Mandatory | Mandatory | Mandatory | Foreign key to `departments.id` |
| **Category** | Mandatory | Mandatory | Mandatory | Foreign key to `complaint_categories.id` |
| **Subject / Title** | Mandatory | Mandatory | Mandatory | 5–150 characters |
| **Detailed Narrative**| Mandatory| Mandatory | Mandatory | 20–5,000 characters |
| **Incident Date** | Mandatory | Mandatory | Mandatory | ISO Date <= Current Date; >= Current Date - 365 Days [Proposed] |
| **Accused Party/Office**| Optional| Optional | Optional | Max 150 characters |
| **Attachments** | Optional | Optional | Optional | Max 3 files; max 5MB/file; PDF, PNG, JPG |

---

## 3. Privacy Modes & Identity Separation

### BR-004: Anonymous Submissions Guarantee [CONFIRMED BASELINE]
For submissions marked `ANONYMOUS`:
1. Database columns `student_name`, `student_id`, `email`, and `phone` must be strictly `NULL`.
2. The server must reject or strip any identity parameters passed in the request body.
3. The server must not log the client's public IP address in the `complaints` table. Rate limiting must use transient in-memory / cache hashing (e.g. salted SHA-256 with 24-hour expiration) rather than persistent cleartext IP storage.
4. If an anonymous student loses their Tracking Reference and Passcode, the complaint is permanently unrecoverable by staff. Staff are strictly prohibited from attempting to de-anonymize complainants.

### BR-005: Confidential Submissions Identity Partitioning [CONFIRMED BASELINE]
For submissions marked `CONFIDENTIAL`:
1. Complainant details are captured in the database with `is_confidential = true`.
2. Access to complainant PII is restricted exclusively to `student_affairs_admin` and `escalation_officer` roles.
3. Department Handlers (`department_handler`) querying or viewing the case must receive masked placeholders:
   - Name: `[CONFIDENTIAL COMPLAINANT - IDENTITY SEALED]`
   - Student ID: `[REDACTED]`
   - Email: `[REDACTED]`
   - Phone: `[REDACTED]`
4. If a Department Handler needs to interview or clarify with a confidential complainant, they must submit a formal clarification request via the platform or request Student Affairs to act as intermediary.

---

## 4. Complaint Ownership, Routing & Conflict of Interest

### BR-006: Primary Custody & Ownership [CONFIRMED BASELINE]
- The **Student Affairs Directorate** acts as the institutional owner and initial custodian of all incoming complaints.
- When assigned to a Department Handler, that handler becomes the **Operational Assignee**, responsible for investigation and resolution delivery within SLA thresholds.
- Overall institutional authority remains with Student Affairs and Senior Leadership (Escalation Officers).

### BR-007: Conflict of Interest Safeguards [CONFIRMED BASELINE]
1. Under no circumstance may a complaint be assigned to an individual whose name or office is cited as an accused party (`accused_party`).
2. If a complaint is lodged against a Department Head, the system must prohibit assigning the complaint to that Department Head or within that department's standard handler queue; it must automatically escalate to the Faculty Dean or Student Affairs Admin.
3. If a complaint is lodged against a Faculty Dean, the case must route exclusively to the Dean of Students / Provost Office.
4. Any staff user who realizes they have a personal or familial conflict of interest with a case must recuse themselves by triggering "Recusal / Reassign" with a documented reason.

---

## 5. Status State Machine & Permitted Transitions

### BR-008: Formal Status Definition & Transition Graph [CONFIRMED BASELINE]

The complaint lifecycle is governed by an explicit state machine. Arbitrary status skipping is prohibited by database trigger and server action guards.

```
       [NEW]
         │
         ▼
  [UNDER_REVIEW] ───────────────┐
         │                      │
         ▼                      ▼
    [ASSIGNED] ──────────► [ESCALATED]
         │                      ▲
         ▼                      │
   [IN_PROGRESS] ───────────────┤
     ▲       │                  │
     │       ▼                  │
     └── [AWAITING_RESPONSE]    │
             │                  │
             ▼                  │
        [RESOLVED] ◄────────────┘
             │
             ▼
          [CLOSED] ──────► [REOPENED] ──► [UNDER_REVIEW]
```

### BR-009: Allowed Status Transitions Table [CONFIRMED BASELINE]

| Current Status | Permitted Next Statuses | Authorized Roles | Mandatory Requirements |
| :--- | :--- | :--- | :--- |
| **NEW** | `UNDER_REVIEW`, `ESCALATED` | Student Affairs Admin, Escalation Officer | Initial triage note or department designation. |
| **UNDER_REVIEW** | `ASSIGNED`, `ESCALATED`, `RESOLVED` (if trivial/duplicate) | Student Affairs Admin, Escalation Officer | Target department/handler selected. |
| **ASSIGNED** | `IN_PROGRESS`, `ESCALATED`, `UNDER_REVIEW` (rejection) | Assigned Handler, Student Affairs Admin | Case accepted or investigation begun. |
| **IN_PROGRESS** | `AWAITING_RESPONSE`, `ESCALATED`, `RESOLVED` | Assigned Handler, Escalation Officer | Investigation ongoing or clarification needed. |
| **AWAITING_RESPONSE**| `IN_PROGRESS`, `ESCALATED`, `CLOSED` (abandoned) | Public Student (via reply), Assigned Handler | Student reply received or timeout reached. |
| **ESCALATED** | `IN_PROGRESS`, `RESOLVED`, `CLOSED` | Escalation Officer | Senior resolution directive issued. |
| **RESOLVED** | `CLOSED`, `REOPENED` | Student Affairs Admin, Escalation Officer | Resolution summary and public notice published. |
| **CLOSED** | `REOPENED` | Student Affairs Admin, Escalation Officer | Documented reopening justification. |
| **REOPENED** | `UNDER_REVIEW`, `ASSIGNED` | Student Affairs Admin | Treated as urgent active case in the one-receiver MVP. |

---

## 6. Service Level Agreements (SLAs) & Escalation Triggers

### BR-010: Standard SLA Timelines [PROPOSED - REQUIRES UNIVERSITY CONFIRMATION]

| Lifecycle Phase | Target SLA Duration | Clock Trigger | Breach Action |
| :--- | :--- | :--- | :--- |
| **Initial Triage** | 48 Business Hours | Complaint submitted (`NEW`) | Flagged as *Triage Overdue* on Admin Dashboard. |
| **Department Assignment**| 24 Business Hours | Status set to `UNDER_REVIEW` | Notification to Student Affairs Intake Lead. |
| **First Substantive Action**| 72 Business Hours | Status set to `ASSIGNED` | Notification to Department Head. |
| **Standard Investigation**| 10 Business Days | Status set to `IN_PROGRESS` | Automated alert; eligible for auto-escalation. |
| **Student Clarification Wait**| 7 Calendar Days | Status set to `AWAITING_RESPONSE` | Reminder notice; eligible for administrative closure if unresponsive. |
| **Resolution Grace Period**| 5 Business Days | Status set to `RESOLVED` | Automatic eligibility for transition to `CLOSED`. |

### BR-011: Escalation Triggers [CONFIRMED BASELINE]
A complaint must be escalated to Senior Leadership (`role: escalation_officer`) if:
1. An operational SLA is breached by more than 100% without an active investigation note.
2. The complaint is classified under an auto-sensitive category (`ETH_HARASS`, `ETH_CORRUPT`).
3. The complainant names a Department Chair, Dean, or Director as the respondent.
4. The investigating handler formally flags the complaint as intractable.

---

## 7. Public versus Internal Information Separation

### BR-012: The Airgap Doctrine [CONFIRMED BASELINE]
1. **Public Tracking View (`/portal/track`):**
   - Displays ONLY: Tracking Reference, Sanitized Category Name, Submission Date, Current Public Status, and records from `complaint_updates` where `is_public = true`.
   - Never exposes staff names, staff emails, department internal remarks, or records from the `internal_notes` table.
2. **Administrative CMS View (`/admin/complaints/[id]`):**
   - Maintains two strictly decoupled timelines:
     - **Internal Journal:** All internal notes, witness records, departmental deliberations, and audit history.
     - **Public Communication Log:** Exact messages transmitted to the complainant.
3. Every public response requires deliberate authoring and confirmation before it is flagged `is_public = true`.

---

## 8. Supporting Attachments & Storage Security

### BR-013: Attachment Security & Retention [CONFIRMED BASELINE]
1. All files are uploaded into private Supabase Storage buckets. Direct public read permissions on the storage bucket are disabled (`public = false`).
2. Complainants and staff access attachments exclusively through short-lived signed URLs (maximum validity: 15 minutes).
3. Files must be checked for disallowed extensions. Permitted MIME types are restricted to `application/pdf`, `image/jpeg`, `image/png`, and `image/webp`.
4. File sizes are capped at 5 MB per file, with a maximum of 3 files per complaint.
5. In Phase 1, virus and malware scanning is acknowledged as a security dependency to be handled via cloud storage hooks or edge workers prior to long-term archiving [Proposed].

---

## 9. Duplicate Submissions Handling

### BR-014: Duplicate Identification & Linking [PROPOSED - REQUIRES UNIVERSITY CONFIRMATION]
1. If a student submits multiple complaints regarding the exact same incident within a 7-day period:
   - The Student Affairs Administrator may designate subsequent submissions as `DUPLICATE`.
   - The administrator must select the **Parent Complaint Reference**.
   - The duplicate complaint transitions directly to `CLOSED` with resolution note: *"Merged with primary complaint [Parent Reference]. Track progress under the primary reference."*
2. System must not delete the duplicate record; it must maintain the duplicate row linked via `parent_complaint_id` for audit transparency.

---

## 10. Case Closure & Reopening Rules

### BR-015: Closure Criteria [CONFIRMED BASELINE]
1. A case cannot move directly from `IN_PROGRESS` or `ASSIGNED` to `CLOSED`. It MUST pass through `RESOLVED`.
2. A case can only be formally `CLOSED` after:
   - A written Resolution Summary is recorded.
   - An official Student Resolution Notice has been published to the student portal.
   - The 5-day grace period has elapsed without dispute, or the student acknowledges closure.

### BR-016: Reopening Limits [PROPOSED - REQUIRES UNIVERSITY CONFIRMATION]
1. Complainants may request reopening via `/portal/track` within **10 business days** of case resolution.
2. Reopening requires a documented justification stating either:
   - The agreed corrective action was not fulfilled.
   - Significant new evidence has emerged that was previously unavailable.
3. A closed case may only be reopened **once** via the student portal. Subsequent appeals must be conducted through direct administrative appeal to the Office of the Dean of Students.

