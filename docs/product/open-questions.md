# Software Requirements Specification (SRS) — Open Questions & Institutional Policy Gaps

**Product Name:** Unity Student Support  
**Document Version:** 1.0.0  
**Status:** Approved for Implementation Planning  

---

## 1. Executive Summary

This document captures all operational, procedural, and regulatory policies that require formal written confirmation from **Unity University leadership** and **Melhek Technologies project sponsors**. 

To maintain momentum without building on unsafe assumptions, the engineering architecture implements configurable defaults for all pending decisions.

---

## 2. Institutional Policy Questions & Clarifications

| Ref # | Category | Question for University Leadership | Proposed Engineering Default (Configurable) | Impact if Changed |
| :--- | :--- | :--- | :--- | :--- |
| **OQ-01** | **Campus & Faculty Taxonomy** | What is the definitive, up-to-date roster of Unity University campuses, faculties, academic departments, and administrative service units? | Seeded with known structure: Main Campus (Gerji), Faculty of Technology, Faculty of Business, Faculty of Health Sciences, Registrar, Finance, Facilities. | Updating the taxonomy is supported via database seeding and admin UI; zero code refactoring needed. |
| **OQ-02** | **SLA Timelines** | What are the mandatory resolution windows for complaints (e.g., academic vs. administrative vs. facilities)? | Proposed: 48h initial triage; 72h first action; 10 business days standard resolution. | Configurable via `system_settings` table. |
| **OQ-03** | **Department Response Authority** | Are department case handlers permitted to publish public responses directly to students, or must all student-facing communications be approved by the Student Affairs Directorate? | Proposed: Dual mode. Department handlers draft responses; direct publishing requires a configurable `require_admin_approval_for_responses = false/true` flag. | Defaulting to direct publishing for handlers with administrative oversight, toggleable to mandatory pre-approval. |
| **OQ-04** | **Reopening Grace Period** | What is the maximum duration after a case is marked `RESOLVED` during which a student can request reopening or dispute the outcome? | Proposed: 10 business days. After 10 days, the case automatically transitions to `CLOSED` and disputes require a formal administrative appeal. | Configurable threshold in system configuration. |
| **OQ-05** | **Sensitive Case Referral** | What university process handles a complaint involving the Student Dean or Student Affairs office, given that the CMS receiver is only the Student Dean? | The CMS has one receiver: the active `student_affairs_admin` account. The university must name an out-of-platform referral authority for conflicts. | No second CMS role or in-platform recusal workflow is planned for the MVP. |
| **OQ-06** | **Anonymous Complaint Follow-up Policy** | If an anonymous complaint lacks sufficient detail to investigate (e.g., "An instructor took money" with no course code or date), what is the university policy for closing unsubstantiated anonymous claims? | Proposed: Case handler posts a clarification request; if no response is received via tracking within 7 calendar days, case may be closed with status note: *"Closed due to insufficient information on anonymous report."* | Clarifies workflow states and prevents indefinite stagnation in the triage queue. |
| **OQ-07** | **Legacy SIS / ID Verification** | Does Unity University have an active API or database endpoint for validating Student ID numbers, or should the platform rely on regex syntax validation and scanned ID cards? | Proposed (MVP): Strict regex validation + optional scanned student ID attachment. Future phase can integrate an LDAP/SIS verification API. | Decouples MVP delivery from legacy IT dependencies. |
| **OQ-08** | **SMS Gateway Integration** | Does Melhek Technologies or Unity University possess an existing SMS gateway contract (Ethio Telecom or Safaricom Ethiopia) to send tracking credentials and status updates via SMS? | Proposed (MVP): Zero-SMS baseline. Tracking references and passcodes are issued on-screen with print/download receipts. SMS notification hooks are architected as modular event emitters for Phase 2. | Eliminates SMS delivery costs and telecom gateway integration delays in MVP. |

---

## 3. Risk Assessment & Architectural Mitigation

| Risk Identified | Potential Impact | Architectural Mitigation Strategy |
| :--- | :--- | :--- |
| **Student loses tracking passcode for an Anonymous complaint.** | Student cannot view updates or provide requested clarification. | 1. Confirmation screen enforces explicit copy/download prompt.<br>2. Clear on-screen warning: *"Lost anonymous credentials cannot be recovered."*<br>3. Student is permitted to submit a new complaint referencing their earlier incident if necessary. |
| **Department Head is accused in a complaint.** | Compromised inquiry, retaliation, or conflict of interest. | 1. Intake form captures `accused_party`.<br>2. Automated conflict-of-interest check blocks assignment to that party.<br>3. Department Head bypass: Complaints citing department leadership route directly to Dean of Faculty or Dean of Students. |
| **Public exposure of internal notes due to developer error.** | Severe institutional liability and breach of student/staff trust. | 1. Airgap Doctrine: `internal_notes` stored in a separate table with strict PostgreSQL RLS.<br>2. Public tracking endpoints never query `internal_notes`.<br>3. Automated end-to-end integration tests verify zero leakage in API responses. |
| **Spam / Denial of Service via automated complaint submission.** | Triage queue flooded with junk entries; database exhaustion. | 1. IP-based and session-based rate limiting.<br>2. Cloudflare Turnstile / Honeypot field integration.<br>3. Zod schema validation blocks malformed or automated submissions. |

