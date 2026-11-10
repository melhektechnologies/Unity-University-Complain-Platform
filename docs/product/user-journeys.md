# Software Requirements Specification (SRS) — User Journeys

**Product Name:** Unity Student Support  
**Document Version:** 1.0.0  
**Status:** Approved for Implementation Planning  

---

## Journey 1: Identified Complaint Submission

**Actor:** Enrolled Unity University Student  
**Goal:** Submit a formal grievance regarding grades or facility access with full student identity disclosed for direct resolution.

1. **Access:** Student visits `/` and clicks "Submit a Complaint" to enter `/portal/submit`.
2. **Step 1 (Submission Type):**
   - Student selects **"Identified Submission"**.
   - Interface renders explanatory guidance: *"Your name, student ID, and contact details will be shared with the investigating department to facilitate direct resolution."*
   - Student inputs: Full Legal Name, Unity Student ID (`UUR/...` or equivalent), University/Personal Email, and Ethiopian Mobile Phone Number.
   - Client validates fields; student clicks "Continue".
3. **Step 2 (Classification):**
   - Student selects Campus (e.g., Main Campus - Gerji), Faculty (e.g., Faculty of Technology), and Department (e.g., Department of Computer Science).
   - Student selects Category (e.g., "Grading & Academic Evaluation").
   - Student inputs Subject and Incident Date.
4. **Step 3 (Statement):**
   - Student provides detailed factual narrative (e.g., unexplained exam grade discrepancy).
   - Student optionally specifies the name or office of the person involved (`accused_party`).
5. **Step 4 (Evidence):**
   - Student uploads supporting file (e.g., scanned grade slip or exam attendance card, PDF format, 1.2 MB).
   - System validates file size and MIME type.
6. **Step 5 (Review & Submission):**
   - Student reviews summary card.
   - Student ticks mandatory attestation: *"I confirm that the information provided is truthful and accurate to the best of my knowledge."*
   - Student clicks "Submit Complaint".
7. **System Processing:**
   - Server validates payload with Zod schema.
   - Server commits record to PostgreSQL: `complaints` table (`privacy_type = 'IDENTIFIED'`, `status = 'NEW'`).
   - Server generates Tracking Reference `UU-2026-48192` and Passcode `w8x2-9pm4-k1r7-3za5`.
   - Server writes cryptographic hash to `tracking_hash`.
   - Files are moved to permanent private storage path.
   - System emits audit entry: `ACTION: COMPLAINT_SUBMITTED`.
8. **Outcome:** Student transitions to Success Confirmation screen (Journey 4).

---

## Journey 2: Confidential Complaint Submission

**Actor:** Student experiencing academic intimidation or unfair administrative treatment.  
**Goal:** Report an issue while ensuring their identity is known only to the central Student Affairs leadership, hidden from the department being investigated.

1. **Step 1 (Submission Type):**
   - Student selects **"Confidential Submission"**.
   - Guidance note displays: *"Your identity is securely sealed and disclosed exclusively to authorized Student Affairs leadership. The department and staff members under review will NEVER see your name or contact details."*
   - Student enters Full Name, Student ID, Email, and Mobile Phone.
2. **Steps 2 to 4 (Taxonomy, Statement, Evidence):**
   - Student completes details regarding the incident (e.g., an instructor imposing arbitrary assessment penalties).
3. **Step 5 (Confirmation & System Execution):**
   - Student reviews summary highlighting: **Privacy Status: CONFIDENTIAL (Identity Sealed from Department)**.
   - Server sets `privacy_type = 'CONFIDENTIAL'`, `is_confidential = true`.
   - In the database, the record is flagged so that Department Handler queries mask student identity fields (`student_name` replaced with `[CONFIDENTIAL COMPLAINANT]`).
4. **Outcome:** Student receives secure tracking credentials. When department staff view the complaint, identity fields are systematically masked.

---

## Journey 3: Anonymous Complaint Submission

**Actor:** Student reporting general campus fraud, safety violations, or institutional malpractice.  
**Goal:** Submit a complaint with absolute zero identity attribution.

1. **Step 1 (Submission Type):**
   - Student selects **"Anonymous Submission"**.
   - System displays reassurance: *"No name, email, student ID, or contact information will be collected. Your IP address is never stored with your grievance. You must retain your Tracking Reference and Passcode to check for updates or supply follow-up information."*
   - All identity input fields are completely removed from the UI.
2. **Steps 2 to 4:**
   - Student fills in Department, Category, Subject, Statement, and optional non-identifying evidence.
3. **Step 5 (Submission & Zero-Knowledge Scrubbing):**
   - Student submits.
   - Server validation schema strips any accidentally submitted identity parameters.
   - Database record sets `student_name = NULL`, `student_id = NULL`, `email = NULL`, `phone = NULL`, `privacy_type = 'ANONYMOUS'`.
   - Client IP address is scrubbed from the complaint row.
4. **Outcome:** Complaint is stored anonymously. The student is issued tracking credentials and informed: *"Because this is an anonymous submission, lost credentials CANNOT be recovered by university staff."*

---

## Journey 4: Successful Submission & Tracking Credential Delivery

**Actor:** Complainant completing submission.  
**Goal:** Securely obtain and record the tracking credentials.

1. **Interface Presentation:**
   - System displays a dedicated `/portal/submit/success` confirmation page.
   - Displays prominent badge: **Complaint Successfully Submitted**.
   - Highlights Tracking Reference: `UU-2026-77319` (monospaced, large font).
   - Highlights Secret Passcode: `k9x2-4lp8-1vm6-9qa3` (masked with an eye toggle).
2. **User Actions:**
   - Student clicks "Copy Credentials to Clipboard" (copies both reference and passcode with clear explanatory labels).
   - Student clicks "Download PDF Receipt" or "Print Confirmation Slip" (generates an offline document containing reference, passcode, submission timestamp, and instructions).
3. **Explicit Warning Notice:**
   - Prominent alert box: *"IMPORTANT: University staff cannot view or reset your secret passcode. Please save these credentials immediately in a secure location. You will need both to view responses or provide clarifications."*

---

## Journey 5: Student Complaint Tracking

**Actor:** Complainant holding valid credentials.  
**Goal:** Inspect the current investigation progress and read official responses.

1. **Access:** Complainant navigates to `/portal/track`.
2. **Input:** Enters Tracking Reference (`UU-2026-77319`) and 16-character Passcode.
3. **Verification:**
   - Server queries `complaints` table by tracking reference.
   - Server verifies submitted passcode against `tracking_hash`.
   - If verified, server signs a secure session token and returns sanitized complaint payload.
4. **Display:**
   - Current Status Badge: `IN_PROGRESS` (with institutional step indicator: Received -> Under Review -> Investigating -> Awaiting Action -> Resolved).
   - Case Metadata: Reference Number, Category, Incident Date, Submission Date, Last Activity Date.
   - **Public Activity Stream:** Chronological feed of official public notices:
     - *"Case received and assigned to Academic Affairs Committee (Nov 05, 2026)"*
     - *"Investigation in progress with Department Chair (Nov 07, 2026)"*
   - **Privacy Shield:** Under no circumstances are internal notes, staff names, internal communications, or investigator comments visible.

---

## Journey 6: Student Receiving a Request for Additional Information

**Actor:** Complainant whose case requires clarification.  
**Goal:** Respond to an official request from the university investigator.

1. **Notification / Check:** Student tracks complaint at `/portal/track`.
2. **Status Display:** Status is marked **`AWAITING_RESPONSE`** with an alert banner: *"The university investigation team has requested additional clarification from you."*
3. **Official Question Display:** Card displays the official inquiry: *"Please clarify whether this grading issue pertains to the mid-term assessment or the final exam, and provide your section number."*
4. **Response Form:**
   - Textarea: "Your Clarification" (50–2,000 characters).
   - Optional file attachment (e.g., course syllabus or exam copy, max 5MB).
5. **Submission:**
   - Student submits clarification.
   - System saves update as `complaint_updates` (type: `STUDENT_REPLY`).
   - Case status automatically updates from `AWAITING_RESPONSE` to `IN_PROGRESS`.
   - A notification badge appears on the assigned handler's CMS dashboard: *"Complainant has responded to clarification request."*

---

## Journey 7: Administrative Complaint Review & Triage

**Actor:** Student Affairs Administrator / Intake Officer  
**Goal:** Triage new submissions, verify categorization, and prepare for routing.

1. **Login:** Administrator logs into `/admin/login` using university staff credentials.
2. **Inbox Inspection:** Administrator selects "New Complaints" queue (`/admin/complaints?tab=new`).
3. **Detail Inspection:** Administrator opens complaint `UU-2026-77319`.
4. **Evaluation:**
   - Evaluates narrative and evidence.
   - Checks if student correctly designated faculty and category. If misclassified (e.g., student chose "General Facilities" for a lab computer hardware issue), the administrator updates Category to "Laboratory & Computing Equipment".
   - Assigns initial Priority: `MEDIUM`.
   - Changes status from `NEW` to `UNDER_REVIEW`.
5. **Audit Record:** System records triage timestamp, prior category, new category, and administrator ID.

---

## Journey 8: Complaint Assignment & Routing

**Actor:** Student Affairs Administrator  
**Goal:** Route complaint to the designated department case handler.

1. **Assignment Modal:** In the complaint workspace, Administrator clicks "Assign Handler".
2. **Department Selection:** Selects Department: *Department of Accounting & Finance*.
3. **Handler Selection:** Selects Staff Handler: *Abebe Kebede (Department Representative)*.
4. **Conflict Check:** System cross-references the assigned handler's name against the `accused_party` field. If no match is found, system confirms assignment.
5. **State Transition:** Status updates to `ASSIGNED`.
6. **Task Propagation:** Complaint appears in Abebe Kebede's "Assigned to Me" queue.

---

## Journey 9: Internal Investigation

**Actor:** Department-Level Case Handler  
**Goal:** Conduct departmental inquiry, consult instructors or facility staff, and collect evidence.

1. **Queue Access:** Handler accesses `/admin/complaints?tab=assigned_to_me`.
2. **Inspection:** Handler opens assigned case. If case is `Confidential`, complainant details show `[CONFIDENTIAL COMPLAINANT - IDENTITY SEALED]`.
3. **State Transition:** Handler clicks "Commence Investigation". Status transitions to `IN_PROGRESS`.
4. **Fact-Finding:** Handler contacts relevant course instructor offline or gathers examination records.
5. **Audit Logging:** System logs that handler accessed the case dossier.

---

## Journey 10: Recording Internal Notes

**Actor:** Department Handler / Student Affairs Admin  
**Goal:** Record internal findings without exposing them to the student.

1. **Note Entry:** Within the Case Workspace, Handler opens the "Internal Notes & Investigation Journal" tab.
2. **Drafting:** Handler types: *"Interviewed Instructor Tadesse on Nov 06. Midterm exam sheet was located; score was erroneously transcribed as 14/30 instead of 24/30. Instructor agreed to submit grade adjustment form."*
3. **Internal Attachment:** Optionally attaches scanned Grade Adjustment Voucher.
4. **Submission:** Handler clicks "Save Internal Note".
5. **System Storage:** Note is inserted into `internal_notes` table.
6. **Airgap Verification:** Public tracking view is completely unaware of this entry; it exists exclusively in the CMS view.

---

## Journey 11: Authorized Response to Student

**Actor:** Student Affairs Administrator / Authorized Department Handler  
**Goal:** Deliver an official formal communication to the complainant's tracking portal.

1. **Action:** Handler clicks "Send Official Response to Student".
2. **Type Selection:** Selects "Resolution Announcement" or "Status Update".
3. **Content Drafting:** Types message: *"Your grade verification has been completed. The Department of Accounting & Finance has identified an administrative data entry error on your midterm score. The correction has been submitted to the Office of the Registrar and your portal will reflect the updated grade within 48 hours."*
4. **Tone & Policy Review:** Handler checks preview.
5. **Publication:** Handler clicks "Publish Official Update".
6. **Storage:** Stored in `complaint_updates` (`is_public = true`). Visible on next student tracking query.

---

## Journey 12: Case Escalation

**Actor:** Department Handler / Student Affairs Admin  
**Goal:** Escalate an intractable, overdue, or high-risk case to Senior Leadership (Dean of Students).

1. **Trigger:** Case has stalled due to lack of cooperation from a department chair, or involves grave institutional misconduct.
2. **Action:** Officer clicks "Escalate Case".
3. **Escalation Form:**
   - Selects Escalation Target: *Dean of Students*.
   - Inputs Mandatory Justification: *"Department Head has declined to adjust the assessment without Provost intervention despite clear evidence of procedural breach."*
4. **State Transition:**
   - Status updates to `ESCALATED`.
   - Priority elevated to `URGENT`.
   - Case moves into the "Escalated Cases" high-priority view for Senior Reviewers.

---

## Journey 13: Case Resolution

**Actor:** Authorized Reviewer / Student Affairs Admin  
**Goal:** Formally mark an investigation as satisfactorily resolved.

1. **Action:** Officer initiates "Resolve Case".
2. **Resolution Dossier:**
   - Selects Resolution Outcome Category (e.g., *Corrective Action Taken*, *Administrative Policy Clarified*, *Unsubstantiated*).
   - Enters Formal Resolution Summary for institutional records.
   - Enters Student-Facing Resolution Statement.
3. **State Transition:**
   - Status transitions to `RESOLVED`.
   - Timestamp `resolved_at` recorded.
   - Public tracking updates to show: Status: `Resolved` with resolution details.

---

## Journey 14: Formal Case Closure

**Actor:** Student Affairs Administrator  
**Goal:** Formally close the file after the standard confirmation grace period has elapsed without appeal.

1. **Trigger:** Complaint has remained in `RESOLVED` status for 5 working days [Proposed Baseline].
2. **Verification:** Administrator confirms no further student clarification or appeal request was lodged.
3. **Action:** Admin clicks "Close Complaint File".
4. **State Transition:**
   - Status transitions to `CLOSED`.
   - Timestamp `closed_at` recorded.
   - The complaint is locked for routine edits. Further internal notes require explicit administrative override.

---

## Journey 15: Case Reopening Protocol

**Actor:** Complainant / Student Affairs Admin  
**Goal:** Reopen a resolved/closed complaint due to newly emerged evidence or failure to enact promised remedy.

1. **Trigger:** Student observes that 10 days have passed and the agreed grade change was never processed by the registrar.
2. **Request:** Student navigates to `/portal/track` and clicks "Request Case Reopening".
   - Inputs Reopening Reason: *"Grade is still unchanged on the university portal as of Nov 18."*
3. **Administrative Triage:**
   - Student Affairs Admin reviews reopening request in the "Reopened / Contested" queue.
   - Admin approves reopening with reason: *"Investigating failure of department to file change with registrar."*
4. **State Transition:**
   - Status shifts to `REOPENED` (treated with `HIGH` priority).
   - Re-assigned to department liaison with an urgent SLA timer.

---

## Journey 16: Restricted / Sensitive Complaint Handling

**Actor:** Student reporting sexual harassment, bribery, or ethics violation involving faculty leadership.  
**Goal:** Ensure the complaint is completely invisible to standard department handlers and accessible only to the Authorized Ethics Committee / Dean of Students.

1. **Intake:** Student submits complaint under Category "Ethics & Staff Misconduct" or "Harassment".
2. **Auto-Quarantine:** The system recognizes the sensitive category and automatically flags `is_restricted_sensitive = true`.
3. **Access Enforcement:**
   - Standard Department Handlers and general Reviewers querying `/admin/complaints` cannot see this record.
   - The case does NOT route to the accused department.
   - The case routes exclusively to the "Restricted Grievance Committee" (Senior Escalation Officers).
4. **Investigation:** Conducted under strict privacy; all internal notes and evidence are partitioned.

---

## Journey 17: Failed Submission & Recovery

**Actor:** Complainant on a weak 3G mobile network connection.  
**Goal:** Prevent data loss when network drops during multi-step submission.

1. **Interruption:** Student is on Step 3 (Detailed Statement) and clicks "Continue" to Step 4 when internet connection drops.
2. **Client Handling:**
   - Next.js client detects failed network request.
   - System keeps all entered field data in local component/session state.
   - System presents a friendly alert: *"Connection interrupted. Your entered details have been saved in your browser. Click 'Retry' when your network reconnects."*
3. **Recovery:** Network restores; student clicks "Retry". The wizard resumes seamlessly without re-typing.

---

## Journey 18: Invalid or Excessive Tracking Attempts

**Actor:** Malicious actor or unauthorized third party attempting to brute-force a tracking passcode.  
**Goal:** Prevent enumeration and unauthorized disclosure of student complaint records.

1. **Brute Force Attempt:** An automated script submits repeated passcode guesses to `/portal/track` for reference `UU-2026-48192`.
2. **Defensive Response:**
   - Attempts 1–4: System returns generic error: *"No active complaint found matching these credentials."*
   - Attempt 5: Rate limiter flags client IP address.
   - Attempt 6+: Endpoint immediately responds with HTTP 429 Too Many Requests: *"Too many failed lookup attempts. This IP address has been temporarily blocked from tracking lookups for 15 minutes."*
3. **Audit Event:** System writes a security alert event to `audit_logs` (`EVENT: EXCESSIVE_FAILED_TRACKING_ATTEMPTS`, `IP: x.x.x.x`).

