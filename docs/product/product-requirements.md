# Software Requirements Specification (SRS) — Product Requirements

**Product Name:** Unity Student Support  
**Institutional Context:** Unity University, Ethiopia  
**Project Sponsor & Engineering Partner:** Melhek Technologies  
**Document Version:** 1.0.0 (Implementation-Ready Baseline)  
**Status:** Approved for Implementation Planning  

---

## 1. Product Mission & Executive Summary

Unity Student Support is a secure, trustworthy, accessible, mobile-first institutional complaint and feedback management platform engineered specifically for Unity University, Ethiopia. 

The platform bridges students, administrative bodies, academic faculties, and institutional leadership by providing:
1. **Frictionless, Account-Free Student Intake:** An intuitive public portal where students submit legitimate academic, administrative, and facility complaints without requiring account creation, with strict identity privacy controls (Identified, Confidential, Anonymous).
2. **Cryptographically Secure Tracking:** Tamper-proof, zero-credential tracking mechanisms permitting complainants to monitor case status, supply requested clarifications, and receive formal administrative responses without exposing student identity or case data across boundaries.
3. **Structured Administrative Workflow (CMS):** A role-gated case management system enabling authorized staff to triage, categorize, investigate, collaborate via internal notes, escalate, and resolve student grievances under strict conflict-of-interest safeguards.
4. **Institutional Integrity & Accountability:** An immutable, comprehensive audit trail of every status mutation, staff assignment, identity unmasking event, and response publication, ensuring transparency and institutional compliance.

---

## 2. Stakeholders & Organizational Context

| Stakeholder Group | Organizational Role | Core Needs & Expectations |
| :--- | :--- | :--- |
| **Unity University Students** | Complainants / End Users | Fear-free submission channels (especially for sensitive cases), rapid mobile access on low-bandwidth networks, transparent status tracking, definitive resolution notifications. |
| **Student Affairs Directorate** | Primary Triage & Intake Authority | Centralized inbox, rapid duplicate detection, accurate categorization, department routing, SLA monitoring. |
| **Academic Faculties & Administrative Departments** | Department Handlers / Investigators | Clear task queues, contextual evidence review, private internal collaboration, auditable response drafting. |
| **University Executive Leadership / Dean of Students** | Escalation & Oversight Officers | High-priority escalation visibility, sensitive grievance handling (harassment, corruption, ethics), aggregate analytical reporting on recurring campus bottlenecks. |
| **ICT & Systems Administration** | Technical Administrators | Role-based access provisioning, system availability, backup integrity, tenant security, audit log preservation. |
| **Internal Audit & Quality Assurance** | Compliance & Quality Assurance | Unalterable audit trail inspection, procedural SLA compliance verification, fair complaint resolution monitoring. |
| **Melhek Technologies** | Sponsor & Technology Partner | Enterprise-grade architecture, high security standards, adherence to zero-knowledge PII safeguards for anonymous submissions, deliverable on modern stack. |

---

## 3. User Roles & Permission Matrix (Action & Data Level)

Access to complaint data is strictly partitioned. General university employees possess zero default access to complaint records. Roles are enforced at the database level (PostgreSQL RLS) and the server execution layer.

### 3.1 Role Definitions

1. **Public Student / Complainant (`role: public_student`):**
   - No login session. Access is granted solely via a cryptographic complaint tracking reference (`tracking_number` + secure `tracking_passcode` hash).
   - Read permissions: Only public status, approved public responses, approved public timeline events, and their own uploaded attachment metadata for that specific complaint.
   - Write permissions: Create initial complaint; submit follow-up response/evidence if the complaint status is `Awaiting Response`.
   - Data restrictions: Zero access to internal notes, staff assignments, internal reviewer names, or other complaints.

2. **Student Affairs Administrator / Intake Officer (`role: student_affairs_admin`):**
   - Central triage coordinator.
   - Read permissions: All standard non-restricted complaints across all departments; full complainant PII (if identified or confidential, excluding restricted sensitive cases); internal notes.
   - Write permissions: Triage, categorize, re-title, assign department/handler, add internal notes, request clarification from student, escalate, flag as restricted.
   - Data restrictions: Cannot view complaints designated as `restricted_sensitive` unless explicitly added as an authorized reviewer.

3. **Complaint Reviewer (`role: complaint_reviewer`):**
   - Triage assistant within Student Affairs or Quality Assurance.
   - Read permissions: Non-restricted complaint queue; case evidence; historical public responses.
   - Write permissions: Preliminary categorization, validation of basic details, drafting internal notes. Cannot perform final closure without administrator sign-off.

4. **Department-Level Case Handler (`role: department_handler`):**
   - Designated faculty/department representative (e.g., Head of Accounting Department, Registrar Officer, Campus Facilities Lead).
   - Read permissions: **Only complaints assigned directly to their specific department and assigned to them or unassigned within their department.** Cannot view complaints outside their department.
   - Complainant PII visibility: Can see PII for `Identified` cases; **cannot see student identity for `Confidential` cases** (identity is held by Student Affairs/Escalation Officers). Cannot see identity for `Anonymous` cases.
   - Write permissions: Internal investigation notes, request follow-up info, propose resolution, submit draft response for approval.

5. **Authorized Senior Reviewer / Escalation Officer (`role: escalation_officer`):**
   - Senior leadership (Dean of Students, University Vice President, Ethics Committee Chair).
   - Read permissions: Full access across all categories, including `restricted_sensitive` cases (e.g., academic corruption, harassment, staff misconduct). Full access to confidential complainant PII when authorized.
   - Write permissions: Override assignments, reassign conflicting parties, approve sensitive responses, direct investigation commands, perform formal closure, handle appeals.

6. **System Administrator (`role: system_admin`):**
   - Technical administrator responsible for infrastructure, taxonomy configuration, and account lifecycle.
   - Read permissions: System metrics, configuration tables (faculties, departments, categories, SLAs), audit logs.
   - Write permissions: User role provisioning/deactivation, taxonomy updates, system parameter settings.
   - **Data restrictions:** Zero operational access to complaint content or complainant PII. Admin UI separates technical management from case investigation to prevent administrative snooping.

7. **Read-Only Auditor (`role: auditor`):**
   - Internal compliance, accreditation, or quality assurance evaluator.
   - Read permissions: Anonymized/de-identified complaint data, aggregate reports, immutable audit logs, SLA performance statistics.
   - Write permissions: None (strictly read-only). Cannot alter complaints, notes, or user accounts.

### 3.2 Granular Action- and Data-Level Matrix

| Action / Data Resource | Public Student | Complaint Reviewer | Student Affairs Admin | Department Handler | Escalation Officer | System Admin | Read-Only Auditor |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **Submit New Complaint** | Full | No | No (via public) | No | No | No | No |
| **Track Complaint via Key** | Own Record Only | No | No | No | No | No | No |
| **View Unrestricted Complaint Queue** | No | Read | Read / Triage | Department Only | Read / Oversee | No | Anonymized |
| **View Restricted / Sensitive Cases** | No | No | No | No | Read / Full | No | No |
| **View Complainant PII (Identified)** | Own Info | Read | Read | Read (Assigned) | Read | No | Masked |
| **View Complainant PII (Confidential)**| Own Info | No | Read (Authorized) | **Masked / Hidden** | Read (Authorized) | No | Masked |
| **View Complainant PII (Anonymous)** | N/A (None) | None Exists | None Exists | None Exists | None Exists | None | None |
| **Add Internal Investigation Notes** | No | Yes | Yes | Yes (Assigned) | Yes | No | No |
| **View Internal Notes** | **Forbidden (Never)**| Yes | Yes | Yes (Assigned) | Yes | No | Read |
| **Draft / Publish Public Response** | No (Reply only) | Draft | Publish | Draft / Publish* | Publish / Override | No | No |
| **Assign / Reassign Case** | No | Propose | Yes | Delegate inside Dept | Override All | No | No |
| **Mutate Status to Resolved / Closed**| No | No | Yes | Propose Resolution | Yes | No | No |
| **Reopen Closed Complaint** | Request Only | No | Yes | No | Yes | No | No |
| **Manage Staff Roles & Taxonomy** | No | No | No | No | No | Yes | No |
| **Inspect System Audit Logs** | No | No | Limited (Cases) | No | Case Audits | Full System | Full System |

*\*Note: Department handler direct publishing of public responses is subject to institutional review rule (see Business Rules).*

---

## 4. Product Scope (MVP Boundaries)

### 4.1 In-Scope (Phase 1 MVP)

1. **Public Intake Engine:**
   - Multi-step mobile-optimized submission wizard.
   - Category, Campus/Faculty/Department selector.
   - Submission Privacy Modes: Identified (Full Name, Student ID, Email, Phone), Confidential (Identity collected but sealed from department handlers), Anonymous (No identity collected; IP/User-Agent zeroed/hashed for rate limiting only).
   - Supporting evidence upload (PDF, JPG, PNG; max 5MB/file, up to 3 files; stored in private bucket, accessible via short-lived signed URLs).
   - Instant tracking credential generation: Custom format `UU-YYYY-XXXXX` + cryptographic 16-character tracking passcode.
2. **Public Status & Clarification Portal:**
   - Tracking lookup using tracking reference + passcode.
   - Display of sanitized progress timeline (Status, Status Date, Authorized Message to Student).
   - Two-way clarification: If status is `Awaiting Response`, complainant can post a single message and supplementary attachment.
3. **Administrative Case Management System (CMS):**
   - Supabase Auth session for university staff with MFA readiness.
   - Role-based dashboard with status counts, overdue SLA indicators, and unassigned queue.
   - Conflict-of-interest assignment safeguards (cannot assign case to an individual named as respondent).
   - Strict dual-timeline detail view: Internal Timeline (internal notes, assignment history, audit logs) vs. Public Timeline (messages delivered to student).
   - Status transition state machine enforcement.
   - Escalation trigger to Dean/Senior Reviewer with mandatory justification note.
4. **Security & Auditing:**
   - Database-level RLS policies on all operational tables.
   - Rate limiting on public submissions and tracking lookups.
   - Comprehensive audit log recording `actor_id`, `ip_address`, `action`, `resource_id`, `before_state`, and `after_state`.

### 4.2 Out-of-Scope (Deferred to Post-MVP)

- Integration with Unity University's legacy Student Information System (SIS) / ERP via live API.
- Automated SMS gateway integration (Ethio Telecom / Safaricom Ethiopia SMS). Public tracking will rely on on-screen credentials and student-initiated lookup.
- Native mobile applications (iOS/Android) — mobile responsive web will serve as primary client.
- Multi-language localization (Amharic, Oromo) — MVP English baseline with internationalization-ready token architecture.

---

## 5. Information Architecture & Navigation Hierarchy

### 5.1 Public Student Surface (`/portal`)
```
/ (Root Landing Page)
├── /portal/submit
│   ├── Step 1: Privacy & Complainant Type (Identified / Confidential / Anonymous)
│   ├── Step 2: Grievance Details (Campus, Faculty, Department, Category, Subject, Incident Date)
│   ├── Step 3: Detailed Statement & Accused Parties (if applicable)
│   ├── Step 4: Evidence Upload (Optional files)
│   ├── Step 5: Review & Formal Confirmation
│   └── /portal/submit/success (Displays Tracking Number + Secret Passcode + Download/Print Slip)
├── /portal/track
│   ├── Form: Tracking Reference & Secret Passcode
│   └── /portal/track/[referenceId] (Sanitized Case Status, Official Response, Clarification Channel)
└── /portal/help (FAQ, Student Rights & Whistleblower Protections at Unity University)
```

### 5.2 Protected Administrative CMS (`/admin`)
```
/admin/login (Staff Authentication via Email & Password / Supabase Auth)
/admin/reset-password
├── /admin/dashboard (Operational Overview, SLA Breaches, Quick Metrics)
├── /admin/complaints (Unified Case Queue)
│   ├── ?tab=new (Unassigned / Triage)
│   ├── ?tab=assigned_to_me (Active Investigations)
│   ├── ?tab=department (Departmental Queue)
│   ├── ?tab=escalated (Urgent / Escalated cases)
│   └── ?tab=restricted (Restricted Sensitive Cases - Restricted to Authorized Roles)
├── /admin/complaints/[id] (Master Case Workspace)
│   ├── Section A: Case Header & Status State-Machine Selector
│   ├── Section B: Complainant Dossier (Role-gated PII visibility)
│   ├── Section C: Evidence & Attachments (Signed URL viewer)
│   ├── Section D: Assignment & Department Routing Module
│   ├── Section E: Internal Investigation Notes (Air-gapped)
│   ├── Section F: Student-Facing Communications (Draft / Publish)
│   └── Section G: Immutable Audit Trail
├── /admin/reports (SLA Adherence, Category Breakdown, Campus Trends)
├── /admin/team (Staff Directory, Role Assignment, Department Affiliations - Admin Only)
└── /admin/settings (Category Taxonomy, Department List, Configurable SLA Hours - Admin Only)
```

---

## 6. Non-Functional Requirements (NFRs)

### 6.1 Security
- **Data Protection at Rest & in Transit:** TLS 1.3 enforced for all web traffic; AES-256 encryption at rest for database and private object storage.
- **Passcode Storage:** The tracking passcode provided to the student is generated as a secure random string (high entropy); only its Argon2id or bcrypt cryptographic hash is stored in the database.
- **Row-Level Security (RLS):** All database operations execute through Supabase RLS policies. The public role can never execute `SELECT * FROM complaints` without matching both the tracking number and the verified passcode.
- **Rate Limiting:** Public submission endpoints limited to 5 submissions per IP per 10 minutes; tracking endpoint limited to 10 attempts per IP per 10 minutes (with exponential backoff on repeated failures).
- **Zero-Service-Role in Client:** Next.js client bundles must never contain `SUPABASE_SERVICE_ROLE_KEY`.

### 6.2 Privacy & Confidentiality
- **Air-Gapped Notes:** Internal investigation notes must be physically stored in a separate table (`internal_notes`) with RLS policies granting access solely to authenticated staff. Under no circumstances may API routes returning data to `/portal/track` query or return this table.
- **Identity Redaction:** Complainant details for `Confidential` complaints must be masked at the database query level for `department_handler` roles.
- **Anonymous Integrity:** For `Anonymous` complaints, database columns `student_name`, `student_id`, `email`, and `phone` must be strictly `NULL`. Server routes must strip client IP addresses from the stored complaint payload.

### 6.3 Performance & Reliability
- **Core Web Vitals:** First Contentful Paint (FCP) < 1.2s; Largest Contentful Paint (LCP) < 2.0s on standard 3G/4G connections.
- **Payload Limits:** Maximum initial page bundle size < 200KB gzipped.
- **Availability Target:** 99.9% uptime during active academic semesters.
- **Graceful Offline Degradation:** If network drops during form submission, the wizard preserves entered draft content locally in browser memory (cleared upon submission or manual reset).

### 6.4 Accessibility & Device Compatibility
- **WCAG Compliance:** Adherence to WCAG 2.1 Level AA standards (contrast ratio >= 4.5:1 for standard text, 3:1 for large text).
- **Responsive Viewports:** 100% functional across screen widths from 360px (entry-level Android smartphones popular among Ethiopian university students) to 2560px (desktop monitors).
- **Touch Targets:** Minimum 44x44px for all mobile interactive controls.

### 6.5 Maintainability & Auditability
- **TypeScript Strict Mode:** Mandatory `strict: true` across all Next.js code; zero `any` types permitted.
- **Database Migrations:** All schema modifications committed as versioned SQL migration scripts in `/supabase/migrations`.
- **System Logging:** Structured JSON logging for all server actions, capturing request correlation IDs, timestamps, and execution context.

