# Functional Test Report – Unity Student Support

**Version:** 1.0.0
**Prepared by:** Independent QA Engineer
**Date:** 2026-11-05

---

## 1. Test Scope
The functional test suite covers the complete complaint lifecycle as defined in the SRS and system architecture:
1. Complaint submission (identified, confidential, anonymous)
2. Tracking reference generation
3. Staff triage – categorization & priority assignment
4. Assignment to department handler
5. Investigation (internal notes, evidence review)
6. Communication (public updates, clarification requests)
7. Escalation to senior officer
8. Resolution & closure
9. Reopening (within allowed window)

---

## 2. Test Environment
| Component | Version/Configuration |
|---|---|
| Node.js | v20.19.6 |
| Next.js | App Router (v14) |
| Supabase | Postgres 15 (RLS enabled) |
| Browser | Chrome 129 (Desktop), Chrome Android 129 (Mobile) |
| OS | Windows 11 (development) |
| Test Runner | Playwright 1.45 (E2E), Vitest 1.4 (unit) |

*Note:* The application codebase currently contains only schema migrations and design documentation. No functional UI or API implementation is present. Consequently, **all test cases are defined but not executed**. The status column reflects `Not Executed` for every entry.

---

## 3. Test Cases
| ID | Description | Preconditions | Steps | Expected Result | Actual Result | Status | Remarks |
|---|---|---|---|---|---|---|---|
| FT‑001 | Submit **Identified** complaint via public wizard | Application deployed, landing page reachable | 1. Navigate to `/portal/submit`<br>2. Choose *Identified*<br>3. Fill all required fields (Campus, Category, Subject, Narrative, Identity) <br>4. Attach a PDF (1 MB)<br>5. Submit | New complaint stored with `privacy_type = IDENTIFIED`; tracking reference & passcode displayed | Not Executed | Not Executed | Pending implementation |
| FT‑002 | Submit **Confidential** complaint | Same as FT‑001 | Choose *Confidential*; provide identity fields | Complaint stored with `privacy_type = CONFIDENTIAL` and `is_confidential = true`; identity visible only to admin/esc. officers | Not Executed | Not Executed | Pending implementation |
| FT‑003 | Submit **Anonymous** complaint | Same as FT‑001 | Choose *Anonymous*; omit identity fields | Complaint stored with `privacy_type = ANONYMOUS`; no PII stored; tracking generated | Not Executed | Not Executed | Pending implementation |
| FT‑004 | Verify tracking credential generation | Complaint created (any type) | Record displayed reference (e.g., `UU-2026‑12345`) and 16‑char passcode | Reference unique; passcode hash stored; cleartext not persisted | Not Executed | Not Executed | Pending implementation |
| FT‑005 | Public tracking lookup – valid credentials | Complaint with known reference & passcode | 1. Go to `/portal/track`<br>2. Enter reference + passcode <br>3. Submit | Authenticated tracking session created; public status timeline displayed (no internal notes) | Not Executed | Not Executed | Pending implementation |
| FT‑006 | Public tracking – invalid credentials | Any complaint reference | Enter wrong passcode | Generic error *"No active complaint found matching these credentials"*; no info leaked | Not Executed | Not Executed | Pending implementation |
| FT‑007 | Staff login (Student Affairs Admin) | Admin account exists in Supabase Auth | Navigate to `/admin/login`, enter credentials, submit | Auth session cookie (`HttpOnly`, `Secure`) issued; redirected to dashboard | Not Executed | Not Executed | Pending implementation |
| FT‑008 | Triage – categorize & set priority | Logged‑in admin, complaint in `NEW` state | Open complaint, select different category, set priority to *HIGH*, save | Complaint status changes to `UNDER_REVIEW`; audit log entry created | Not Executed | Not Executed | Pending implementation |
| FT‑009 | Assignment – department & handler | Admin, complaint `UNDER_REVIEW` | Open assign modal, select *Department of Computer Science*, handler *Abebe Kebede*, confirm | `complaint_assignments` row created, status → `ASSIGNED`; conflict‑of‑interest guard enforced (no match with accused) | Not Executed | Not Executed | Pending implementation |
| FT‑010 | Internal note creation (air‑gapped) | Assigned handler, complaint in `IN_PROGRESS` | Add note "Interviewed witness..." | Note stored in `internal_notes`; not visible via public tracking API | Not Executed | Not Executed | Pending implementation |
| FT‑011 | Public response composition & publish | Assigned handler, `IN_PROGRESS` | Draft response, mark as *Official Update*, publish | Entry added to `complaint_updates` with `is_public = true`; appears on tracking timeline | Not Executed | Not Executed | Pending implementation |
| FT‑012 | Clarification request (staff) → student reply | Complaint status `IN_PROGRESS` | Staff clicks *Request Clarification*, writes question, publishes | Status changes to `AWAITING_RESPONSE`; tracking page shows request badge | Not Executed | Not Executed | Pending implementation |
| FT‑013 | Student submits clarification | Tracking session active, status `AWAITING_RESPONSE` | Enter text answer, optional attachment, submit | `complaint_updates` entry created (`STUDENT_REPLY`); status returns to `IN_PROGRESS` | Not Executed | Not Executed | Pending implementation |
| FT‑014 | Escalation to senior officer | Any staff (handler or admin) | Click *Escalate*, select target *Dean of Students*, provide justification, submit | Complaint status → `ESCALATED`; entry in `escalations`; notifications sent | Not Executed | Not Executed | Pending implementation |
| FT‑015 | Resolution & closure | Escalated or assigned complaint | Handler drafts resolution notice, admin approves, mark *Resolved* | Status → `RESOLVED`; public timeline shows resolution notice; audit logged | Not Executed | Not Executed | Pending implementation |
| FT‑016 | Automatic closure after grace period | Complaint in `RESOLVED` for >5 business days | Wait for cron job (`/api/cron/auto-close`) to fire | Status → `CLOSED`; system‑generated audit entry | Not Executed | Not Executed | Pending implementation |
| FT‑017 | Reopening request by student (within window) | Complaint `CLOSED` less than 10 days ago | Student uses tracking page → *Request Reopening*, supplies reason | Status → `REOPENED`; audit entry; case appears back in queue | Not Executed | Not Executed | Pending implementation |
| FT‑018 | Duplicate submission guard (same incident) | Two submissions with identical subject & incident date within 7 days | Submit second complaint | System flags as `DUPLICATE` (optional) or allows but links via `parent_complaint_id` | Not Executed | Not Executed | Pending implementation |
| FT‑019 | Attachment upload failure handling | Network interruption during file upload | Attempt to upload 6 MB file (exceeds limit) | Immediate UI error; complaint still saved without attachment | Not Executed | Not Executed | Pending implementation |
| FT‑020 | Session expiration handling | Authenticated staff session, idle >30 min | Perform any action (e.g., open queue) | Redirect to login, no data leakage | Not Executed | Not Executed | Pending implementation |

*The above list is exhaustive for the core lifecycle. Additional edge‑case tests are covered in the security and privacy sections.*

---

## 4. Summary
All functional test cases are **defined** but **not executed** because the application codebase does not yet contain the required UI, server actions, or API endpoints. Execution will be possible after implementation of Phase 4 (Backend) and Phase 5 (Frontend).

---

---

# Security Test Report – Unity Student Support

**Version:** 1.0.0
**Prepared by:** Independent Security Tester
**Date:** 2026-11-05

---

## 1. Test Scope
The security assessment validates that the system enforces defense‑in‑depth controls as described in the **Security Model** and **RLS policies**:
- Authentication & session management
- Role‑based access control (RBAC) at application and database layers
- Bearer credential generation & verification for public tracking
- Input validation, CSRF, rate limiting
- File upload validation & storage isolation
- Audit‑log immutability
- Secret handling and environment isolation

---

## 2. Test Environment
| Component | Version |
|---|---|
| Supabase Postgres | 15 (RLS enabled) |
| Node.js | v20.19.6 |
| Next.js | v14 (App Router) |
| OWASP ZAP | 2.12.0 |
| Burp Suite Community | 2024.9 |
| Axe Core | 4.7 |

*No live deployment exists; testing will be performed against a local development instance once the code is available.*

---

## 3. Security Test Cases
| ID | Test Description | Preconditions | Steps | Expected Outcome | Actual Result | Status | Remarks |
|---|---|---|---|---|---|---|---|
| SEC‑001 | Verify **Supabase Auth** password policy enforcement | Admin account created via migration script | Attempt to set password <12 characters or without required character classes | Registration fails with validation error; weak passwords rejected | Not Executed | Not Executed | Policy defined in architecture but not verified in code |
| SEC‑002 | Ensure **session cookie** is `HttpOnly` & `Secure` | Successful staff login | Inspect Set‑Cookie header | Flags `HttpOnly; Secure; SameSite=Lax` present | Not Executed | Not Executed | Implementation pending |
| SEC‑003 | Test **CSRF protection** on server actions | Authenticated staff session | Submit a POST request to `/api/complaint/assign` with missing/invalid Origin header | Server returns 403 Forbidden, rejects request | Not Executed | Not Executed | Need to confirm server‑side CSRF checks exist |
| SEC‑004 | **Rate limiting** on public tracking endpoint | None | Issue >5 failed credential lookups from same IP within 15 min | 429 Too Many Requests returned; subsequent attempts blocked for 15 min | Not Executed | Not Executed | Rate limiter defined in design, not verified |
| SEC‑005 | **RLS – Department Handler cannot read other department complaints** | Handler `dept_handler_cs` logged in; complaint belongs to Finance dept | Direct GET `/api/complaints/{id}` where id is Finance complaint | 403 Forbidden; audit log records unauthorized access attempt | Not Executed | Not Executed | RLS policy written but not exercised |
| SEC‑006 | **RLS – Confidential identity hidden from Department Handlers** | Confidential complaint assigned to Faculty of Technology; handler from same faculty logged in | GET `/api/complaint/{id}/identity` | Response omits PII fields; only markers like `[CONFIDENTIAL COMPLAINANT]` returned | Not Executed | Not Executed | Confirmed in design, needs test |
| SEC‑007 | **RLS – Student Affairs is the sole complaint reader** | Test records; active Student Affairs admin and other staff roles available | GET `/api/complaints/{id}` as each role | Only Student Affairs admin can read; all other staff roles receive 403/Not Found | Not Executed | Not Executed | Migration `0014` is live; role-by-role API test remains outstanding |
| SEC‑008 | **Public tracking does not expose internal notes** | Complaint with internal notes created | GET `/portal/track/{reference}` with valid credentials | Timeline contains only public updates; no `internal_notes` fields present | Not Executed | Not Executed | Air‑gap validated once implementation exists |
| SEC‑009 | **Attachment MIME type validation** | Authenticated staff; attempt to upload `script.sh` via FileUploader | POST file to signed upload URL | Server rejects upload with error `Unsupported file type` | Not Executed | Not Executed | Ensure MIME sniffing enforced |
| SEC‑010 | **Signed URL expiration** | Upload successful, generated signed download URL (15 min validity) | Wait 16 min, request URL | 403 Forbidden / URL expired | Not Executed | Not Executed | Verify short‑lived nature |
| SEC‑011 | **Audit log immutability** | Insert a normal audit entry, then attempt `UPDATE audit_logs SET action='tampered' WHERE id=...` | Execute SQL via client | Database raises error; update blocked | Not Executed | Not Executed | Trigger defined in migration `0005_audit_and_settings.sql` |
| SEC‑012 | **Secret handling – Service role key never sent to client** | Load any public page | Inspect bundled JavaScript for presence of `SUPABASE_SERVICE_ROLE_KEY` | Key absent; only `NEXT_PUBLIC_SUPABASE_ANON_KEY` present | Not Executed | Not Executed | Lint/scan needed |
| SEC‑013 | **Brute‑force protection on login** | Several failed login attempts with wrong password | Observe lockout after 5 attempts (IP or account) | Account locked for configured period; further attempts denied | Not Executed | Not Executed | Supabase Auth provides this; need verification |
| SEC‑014 | **SQL Injection protection** | Authenticated staff, craft malicious payload in `categoryId` parameter | Send request with `categoryId=1; DROP TABLE complaints;--` | Server sanitizes input; DB returns error or rejects; no tables dropped | Not Executed | Not Executed | Zod strict schemas should prevent; test required |
| SEC‑015 | **Information leakage in error messages** | Trigger a server error (e.g., malformed JSON) | Observe HTTP response body | Generic error returned; no stack trace or internal details | Not Executed | Not Executed | Ensure error middleware masks details |
| SEC‑016 | **Logging does not contain PII** | Perform normal operations (submission, login) | Inspect audit logs | No student names, emails, or phone numbers present in `before_state`/`after_state` for public actions | Not Executed | Not Executed | Verify logging implementation |
| SEC‑017 | **File storage bucket public access disabled** | Attempt direct GET to `https://...supabase.co/storage/v1/object/public/complaint-attachments/...` | Request returns 403 Forbidden | Not Executed | Not Executed | Bucket configuration to be validated |
| SEC‑018 | **Cross‑origin resource sharing (CORS)** | Browser fetch from a different origin | Observe response headers | `Access-Control-Allow-Origin` set to allowed domains only; no wildcard |
| SEC‑019 | **Password reset token security** | Initiate password reset flow | Verify token is single‑use, expires within 1 hour, delivered via email only | Not Executed | Not Executed | Supabase Auth handles; confirm configuration |

---

## 4. Summary
The security test suite is fully defined but **cannot be executed** until functional endpoints, UI components, and server actions are implemented. The architecture documents indicate that required controls (RLS, rate limiting, CSRF defenses, audit immutability) have been designed; however, lack of concrete implementation leaves the current risk level **high** for unverified security controls.

---

---

# Role‑Based Authorization Test Report – Unity Student Support

**Version:** 1.0.0
**Prepared by:** Independent QA Engineer
**Date:** 2026-11-05

---

## 1. Test Scope
Validate that each role (`public_student`, `complaint_reviewer`, `student_affairs_admin`, `department_handler`, `escalation_officer`, `system_admin`, `auditor`) can only perform the actions listed in the **Authorization Matrix** and is prevented from all others, both at the application layer and via PostgreSQL Row‑Level Security.

---

## 2. Test Cases
| ID | Role | Attempted Operation | Endpoint / UI | Expected Result | Actual Result | Status | Remarks |
|---|---|---|---|---|---|---|---|
| AUTH‑001 | `public_student` | Access admin dashboard (`/admin/dashboard`) | Direct URL navigation | 302 redirect to login OR 403 Forbidden | Not Executed | Not Executed | Verify guard middleware blocks unauthenticated access |
| AUTH‑002 | `public_student` | View another student's complaint via tracking reference (guess) | `/portal/track/UU-2026‑XXXXX` with wrong passcode | Generic error, no data revealed | Not Executed | Not Executed | Rate limiting & uniform error message needed |
| AUTH‑003 | `complaint_reviewer` | Assign complaint to a department handler (requires admin) | POST `/api/complaint/assign` | 403 Forbidden | Not Executed | Not Executed | Assignment should be admin‑only |
| AUTH‑004 | `student_affairs_admin` | View confidential complainant identity | GET `/api/complaint/{id}/identity` where complaint is CONFIDENTIAL | Full identity fields returned | Not Executed | Not Executed | Ensure RLS permits admin only |
| AUTH‑005 | `department_handler` | View confidential identity | Same endpoint as above | Masked placeholder `[CONFIDENTIAL COMPLAINANT]` | Not Executed | Not Executed | Verify air‑gap enforcement |
| AUTH‑006 | `department_handler` | Access restricted‑sensitive complaint | GET `/api/complaints/{sensitive-id}` | 403 / Not Found | Not Executed | Not Executed | RLS should block |
| AUTH‑007 | `escalation_officer` | View restricted‑sensitive complaint | Same as above | 403 / Not Found; this role is not a receiver in the MVP | Not Executed | Not Executed | Migration `0014` is live; role-by-role API test remains outstanding |
| AUTH‑007A | `student_affairs_admin` | View restricted‑sensitive complaint | Same as above | Full complaint data returned under active-staff policy `0013` | Not Executed | Not Executed | Verify the one-officer MVP grant |
| AUTH‑008 | `system_admin` | Create new complaint via public endpoint | POST `/api/complaint/create` without auth | 401 Unauthorized | Not Executed | Not Executed | System admin should not have public complaint creation rights |
| AUTH‑009 | `auditor` | Read audit logs | GET `/api/audit` | Paginated list of audit entries, no PII leakage | Not Executed | Not Executed | Verify read‑only access |
| AUTH‑010 | `auditor` | Delete an audit log entry | DELETE `/api/audit/{id}` | 403 Forbidden (or 405) | Not Executed | Not Executed | Ensure immutable policy enforced |
| AUTH‑011 | `system_admin` | Modify system settings (`/admin/settings/system`) | PATCH `/api/settings` | Settings updated; audit entry recorded | Not Executed | Not Executed | Confirm setting update endpoint exists and is admin‑only |
| AUTH‑012 | `department_handler` | Publish public response without approval (when `require_admin_approval_for_responses = true`) | POST `/api/complaint/{id}/public-response` | 403 Forbidden with message *"Approval required"* | Not Executed | Not Executed | Verify config flag enforcement |
| AUTH‑013 | `student_affairs_admin` | Escalate a case to senior officer | POST `/api/complaint/{id}/escalate` | Escalation record created; status → `ESCALATED` | Not Executed | Not Executed | Ensure escalation permission granted |
| AUTH‑014 | `public_student` | Submit clarification when status not `AWAITING_RESPONSE` | POST `/api/complaint/{id}/clarification` | 400 Bad Request *"Not awaiting clarification"* | Not Executed | Not Executed | Verify status guard |
| AUTH‑015 | `department_handler` | Reassign a case to another department (cross‑dept) | POST `/api/complaint/{id}/reassign` with different department_id | 403 Forbidden (conflict‑of‑interest) | Not Executed | Not Executed | Cross‑dept reassignment should be blocked unless admin |

---

## 3. Summary
All role‑based authorization tests are **defined** but **not executed** due to missing functional code. The matrix and RLS policies are present in the design, but verification is pending. Current risk: **High** until tests confirm enforcement.

---

---

# End‑to‑End (E2E) Test Report – Unity Student Support

**Version:** 1.0.0
**Prepared by:** Independent QA Engineer
**Date:** 2026-11-05

---

## 1. Scope
Full‑stack E2E scenarios using Playwright covering the typical student journey and administrative workflow, including UI interactions, network calls, and data persistence.

---

## 2. Test Scenarios
| ID | Scenario | Steps (high level) | Expected UI/Network Result | Actual Result | Status |
|---|---|---|---|---|---|
| E2E‑001 | **Student submits identified complaint and tracks status** | 1. Visit `/`<br>2. Click *Submit Complaint* → wizard<br>3. Choose *Identified*<br>4. Fill campus, faculty, department, category, subject, description, identity fields<br>5. Upload a PDF<br>6. Submit<br>7. Capture displayed reference & passcode<br>8. Navigate to `/portal/track`<br>9. Enter captured credentials<br>10. Verify timeline shows *"Complaint received"* | Success badge, tracking UI shows status `NEW` | Not Executed | Not Executed |
| E2E‑002 | **Student submits anonymous complaint; verify no PII stored** | Same as above but select *Anonymous* and omit identity fields | After submission, inspect network response payload – no `student_name`, `email`, `phone` fields | Not Executed | Not Executed |
| E2E‑003 | **Staff logs in, triages complaint, assigns handler** | 1. Go to `/admin/login`<br>2. Login as admin<br>3. Open queue → New tab<br>4. Click complaint → Edit → Change category & priority → Save<br>5. Open Assign modal, select department & handler, confirm<br>6. Verify status badge changes to `ASSIGNED` | UI reflects new status; audit entry appears in network log | Not Executed | Not Executed |
| E2E‑004 | **Department handler adds internal note, ensures not visible to public** | 1. Login as handler<br>2. Open assigned complaint<br>3. Add internal note "Interviewed staff"<br>4. Save<br>5. Open new incognito window, track complaint with credentials
6. Verify note absent from public timeline | Internal note stored (network response `POST /internal-notes` 201) ; public view shows no note | Not Executed | Not Executed |
| E2E‑005 | **Escalation flow** | 1. Handler clicks *Escalate*<br>2. Fill justification, select *Dean of Students*
3. Submit<br>4. Verify status badge `ESCALATED` and notification appears in Escalation Officer queue | Escalation record created, status updated, UI shows urgent badge | Not Executed | Not Executed |
| E2E‑006 | **Resolution & auto‑closure** | 1. Admin marks complaint as *Resolved* with resolution text<br>2. Wait for cron job (simulate by invoking `/api/cron/auto-close`)
3. Verify status changes to *Closed* in UI | Resolution displayed, later automatically shows *Closed* badge | Not Executed | Not Executed |
| E2E‑007 | **Rate‑limit tracking endpoint** | 1. From same IP, submit 6 invalid tracking attempts
2. Observe response on 6th attempt | 429 Too Many Requests with appropriate message | Not Executed | Not Executed |
| E2E‑008 | **Responsive layout test** | Resize viewport to 375 px (mobile) and 1024 px (tablet) while on submission wizard | Form fields stack vertically, buttons full width, no horizontal overflow | Not Executed | Not Executed |
| E2E‑009 | **Keyboard navigation** | Tab through the entire *Submit* wizard, ensuring focus ring visible and order logical | All interactive elements reachable, focus ring `--color-accent` shown | Not Executed | Not Executed |
| E2E‑010 | **Error handling – upload too large** | Attempt to upload 7 MB file in step 4 | Inline error *"File size exceeds 5 MB"*; wizard remains on same step | Not Executed | Not Executed |

---

## 3. Summary
The E2E suite is fully specified but cannot be run until the full stack (frontend pages, API routes, server actions, Supabase integration) is implemented. Current risk: **High** – no verification that UI/UX flows match design or that security controls survive real‑world interaction.

---

---

# Defect Register – Unity Student Support (Pre‑Implementation)

**Version:** 1.0.0
**Date:** 2026-11-05

| ID | Title | Description | Severity | Status | Owner | Remarks |
|---|---|---|---|---|---|---|
| D‑001 | Missing backend implementation for public submission wizard | Design documents exist, but no server actions or API endpoints to accept complaint payloads. | Critical | Open | Development Team | Must be built before any functional testing can proceed. |
| D‑002 | No authentication middleware for admin routes | Architecture specifies Supabase Auth guard, but no code present. | Critical | Open | Development Team | Prevents all role‑based testing. |
| D‑003 | RLS policies defined but not applied to tables (migrations missing RLS enable statements) | Current migration files create tables but do not include `ALTER TABLE ... ENABLE ROW LEVEL SECURITY;`. | High | Open | DB Engineer | Add RLS enable statements and policies. |
| D‑004 | Rate‑limiting middleware absent | Design requires per‑IP request throttling on tracking endpoint & submission endpoint. | High | Open | Development Team | Implement token bucket or Redis‑based limiter. |
| D‑005 | CSRF protection not implemented on server actions | No anti‑CSRF token verification in API endpoints. | High | Open | Development Team | Add SameSite/Lax cookie enforcement and Origin header checks. |
| D‑006 | Audit log immutable trigger missing for `audit_logs` table | Migration `0005_audit_and_settings.sql` includes trigger creation, verify it exists. | Medium | Open | DB Engineer | Confirm trigger compiled and active. |
| D‑007 | File storage bucket configuration not defined (public = false) | Supabase bucket creation script missing; may default to public. | Medium | Open | DevOps | Ensure bucket is private and signed URLs are required. |
| D‑008 | No UI components scaffolded (shadcn/ui wrappers) | Design system lists components, but source directory `src/components/ui/` is empty. | Medium | Open | Frontend Team | Generate component library before UI testing. |
| D‑009 | Missing environment variable segregation (`NEXT_PUBLIC_` vs secret) | No check that `SUPABASE_SERVICE_ROLE_KEY` is excluded from client bundle. | Low | Open | Security Engineer | Add lint rule to prevent accidental exposure. |
| D‑010 | No automated test harness (Vitest/Playwright config) | No `package.json` scripts or config files for unit/E2E tests. | Medium | Open | QA Lead | Set up test runner infrastructure. |

---

## 5. Regression Test Results
No regression tests applicable at this stage – codebase lacks previous stable releases.

---

---

# Unresolved‑Risk Register – Unity Student Support

| Risk ID | Description | Impact | Likelihood | Mitigation Plan | Owner |
|---|---|---|---|---|---|
| R‑001 | **Functional gaps** – core complaint submission, tracking, and admin workflows not yet implemented. | System cannot deliver primary business value. | Certain (since no code). | Prioritize development of submission API, tracking verification, and admin CRUD actions. | Development Lead |
| R‑002 | **RLS misconfiguration** – tables may be accessible without policies. | Potential data leakage of confidential PII. | Medium (depends on migration correctness). | Review and test each RLS policy; add unit tests that attempt unauthorized SELECTs. | DB Engineer |
| R‑003 | **Rate‑limit bypass** – if limiter is omitted, attackers could enumerate tracking numbers. | privacy breach, denial‑of‑service. | High (no implementation). | Implement per‑IP token bucket; add integration test for 429 response. | Security Engineer |
| R‑004 | **Missing CSRF protection** – could allow cross‑site request forgery on state‑changing endpoints. | Unauthorized state changes. | Medium (design mentions but not coded). | Add SameSite=Lax cookies and server‑side Origin validation; test with OWASP ZAP. | Backend Engineer |
| R‑005 | **Attachment virus/malware** – no scanning service integrated yet. | Potential host compromise if malicious file is later downloaded. | Medium | Integrate Supabase Storage hook to invoke a virus‑scan microservice (e.g., ClamAV) before finalizing upload. | DevOps |
| R‑006 | **Audit log exposure** – if logs are sent to a third‑party logging service without redaction, PII could leak. | Compliance violation. | Low (depends on future logging config). | Enforce structured JSON logging with PII scrubber; audit log destination must be secured. | Ops Lead |
| R‑007 | **Session expiration handling** – no explicit session timeout defined. | Stale sessions could be hijacked. | Medium | Set JWT/refresh token TTL to 30 min; implement silent re‑auth flow. | Auth Engineer |
| R‑008 | **Accessibility compliance** – design meets WCAG AA on paper, but implementation may omit ARIA attributes. | Legal risk, usability barrier. | Medium | Use Axe Core during CI; conduct manual screen‑reader testing. | QA Lead |

---

## 6. Next Steps
1. **Implement core API endpoints and server actions** (submission, tracking, admin CRUD).  
2. **Apply RLS policies** to all tables and verify with automated DB tests.  
3. **Set up rate‑limiting and CSRF middleware** in the Next.js API layer.  
4. **Create component library** based on the design system, then run UI unit tests.  
5. **Execute the functional, security, and E2E test suites** defined above once code is available.  
6. **Address all Critical/High defects** before any release candidate.

---

*All reports are generated based on the existing architecture and design documentation. No live test execution was possible because the application implementation has not yet been completed.*
