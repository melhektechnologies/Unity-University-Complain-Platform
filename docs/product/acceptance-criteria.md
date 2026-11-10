# Software Requirements Specification (SRS) — Acceptance Criteria & Verification Matrix

**Product Name:** Unity Student Support  
**Document Version:** 1.0.0  
**Status:** Approved for Implementation Planning  

---

## 1. Public Portal & Intake Engine

### AC-001: Anonymous Complaint Submission
```gherkin
Feature: Anonymous Complaint Submission
  Scenario: Student submits a grievance anonymously
    Given a public user is on "/portal/submit"
    When the user selects "Anonymous Submission"
    Then all identity fields (Name, Student ID, Email, Phone) are removed from the form
    And the user completes Campus, Faculty, Department, Category, Subject, and Narrative
    And the user clicks "Submit Complaint"
    Then the server returns HTTP 201 Created
    And the database record has "privacy_type" set to "ANONYMOUS"
    And the columns "student_name", "student_id", "email", and "phone" are strictly NULL
    And the response payload includes a valid Tracking Reference (format: "UU-YYYY-XXXXX") and a 16-character Passcode
    And the database stores only the salted cryptographic hash of the passcode
```

### AC-002: Confidential Submission Privacy Protection
```gherkin
Feature: Confidential Submission Identity Separation
  Scenario: Department Handler queries a confidential complaint
    Given a complaint submitted with privacy_type = "CONFIDENTIAL"
    And the complaint contains complainant name "Hiwot Tadesse" and student ID "UUR/1234/14"
    When an authenticated user with role "department_handler" loads the complaint record
    Then the API response masks the complainant's identity
    And the UI renders "Complainant: [CONFIDENTIAL COMPLAINANT - IDENTITY SEALED]"
    And the student ID, email, and phone are completely omitted from the network payload
    When an authenticated user with role "student_affairs_admin" loads the same complaint record
    Then the UI renders "Hiwot Tadesse" and "UUR/1234/14"
```

### AC-003: Supporting Evidence Upload Restrictions
```gherkin
Feature: Attachment Upload Constraints
  Scenario: Student attempts to upload an unsupported executable file
    Given a user is on Step 4 of the submission wizard
    When the user selects a file named "malicious_script.exe"
    Then the client immediately rejects the file
    And displays the error "Unsupported file type. Permitted formats: PDF, JPG, PNG, WEBP"
    And the upload button remains disabled

  Scenario: Student attempts to upload a file exceeding 5MB
    Given a user is on Step 4 of the submission wizard
    When the user selects a PDF file of size 7.2 MB
    Then the client rejects the file
    And displays the error "File size exceeds the 5MB maximum limit"
```

---

## 2. Public Tracking & Clarification Channel

### AC-004: Complaint Tracking Authentication & Airgap Enforcement
```gherkin
Feature: Complaint Tracking Security & Airgap
  Scenario: Complainant enters valid tracking reference and passcode
    Given a complaint exists with reference "UU-2026-10294"
    When the user submits the correct reference and passcode to "/portal/track"
    Then the system establishes a secure 30-minute tracking session
    And displays the public status, submission date, and public updates
    And does NOT render any internal notes, investigator names, or staff comments
    And inspecting the network payload confirms zero records from "internal_notes"

  Scenario: Attacker attempts to brute-force a tracking passcode
    Given an IP address submits 5 consecutive invalid passcodes for reference "UU-2026-10294"
    When the 6th attempt is submitted within a 15-minute window
    Then the server returns HTTP 429 Too Many Requests
    And an audit event "EXCESSIVE_FAILED_TRACKING_ATTEMPTS" is logged
```

### AC-005: Student Clarification Workflow
```gherkin
Feature: Two-way Student Clarification
  Scenario: Student responds to a university clarification request
    Given a complaint is in status "AWAITING_RESPONSE"
    And the student is authenticated on "/portal/track"
    When the student submits a clarification message of 120 characters
    Then the server saves the message in "complaint_updates" with type "STUDENT_REPLY"
    And the complaint status automatically transitions to "IN_PROGRESS"
    And the assigned staff member sees the update in their dashboard queue
```

---

## 3. Administrative CMS & Workflow Engine

### AC-006: Role-Based Access Control (Departmental Partitioning)
```gherkin
Feature: Departmental Queue Isolation
  Scenario: Department Handler attempts to access another department's complaint
    Given an authenticated user "handler_cs" belongs to "Department of Computer Science"
    And a complaint "UU-2026-99120" belongs to "Department of Accounting & Finance"
    When "handler_cs" navigates to "/admin/complaints/[id-of-UU-2026-99120]"
    Then the server returns HTTP 403 Forbidden or HTTP 404 Not Found
    And the case details are never rendered
```

### AC-007: Conflict-of-Interest Assignment Guard
```gherkin
Feature: Conflict-of-Interest Prevention
  Scenario: Administrator attempts to assign a complaint to the accused staff member
    Given a complaint where the accused party is noted as "Dr. Solomon Bekele"
    When the administrator attempts to assign the case to staff handler "Dr. Solomon Bekele"
    Then the system halts the assignment and displays a prominent warning modal
    And informs the administrator that assigning to the named respondent is restricted
    And requires an explicit senior administrative override or selection of an alternate handler
```

### AC-008: Air-Gapped Internal Notes
```gherkin
Feature: Internal Notes Confidentiality
  Scenario: Handler adds an internal investigation note
    Given an authenticated handler is viewing assigned case "UU-2026-55112"
    When the handler posts an internal note: "Interviewed witness. Confirmed grading formula error."
    Then the note is saved in the "internal_notes" table
    And appears in the administrative Internal Timeline
    When a student queries tracking for "UU-2026-55112"
    Then the note does NOT appear anywhere on the public interface
    And direct inspection of the public API response confirms the internal note is absent
```

### AC-009: Status State Machine Transition Validity
```gherkin
Feature: Strict State Machine Enforcement
  Scenario: Staff attempts an invalid status transition
    Given a complaint is in status "NEW"
    When a staff user attempts to mutate the status directly to "RESOLVED"
    Then the server action rejects the mutation with an "Invalid Status Transition" error
    And the status remains "NEW"
    And an audit warning is generated
```

### AC-010: Case Escalation to Senior Reviewer
```gherkin
Feature: Case Escalation
  Scenario: Case handler escalates an intractable case
    Given a complaint in status "IN_PROGRESS"
    When the handler clicks "Escalate Case"
    And provides mandatory justification "Department Head unwilling to adjust exam score"
    And selects target "Dean of Students"
    Then the complaint status updates to "ESCALATED"
    And priority changes to "URGENT"
    And the case appears in the Senior Escalation Officer priority queue
```

### AC-011: Formal Resolution and Closure Protocol
```gherkin
Feature: Resolution and Closure Lifecycle
  Scenario: Admin closes a resolved case after grace period
    Given a complaint has been in status "RESOLVED" for 5 business days
    When the administrator clicks "Formally Close Case"
    Then the complaint status updates to "CLOSED"
    And the timestamp "closed_at" is populated
    And standard handlers can no longer edit the case dossier
```

---

## 4. Audit Trail & System Integrity

### AC-012: Comprehensive Immutable Audit Trail
```gherkin
Feature: Immutable Audit Logging
  Scenario: Critical case action triggers audit entry
    When any of the following events occur:
      | Event |
      | Complaint Submitted |
      | Status Mutated |
      | Case Assigned |
      | Confidential PII Viewed |
      | Internal Note Created |
      | Public Response Published |
      | Case Escalated |
    Then a record is appended to the "audit_logs" table
    And the record includes: actor_id, timestamp, action_type, before_state, after_state, ip_address
    And attempting to execute an "UPDATE" or "DELETE" on "audit_logs" triggers a database error
```

