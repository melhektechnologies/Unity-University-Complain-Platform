# Documentation Discrepancies & Resolutions — Unity Student Support

**Document Version:** 1.0.0  
**Date:** 2026-11-05  
**Auditor:** Principal Enterprise Software Architect  
**Status:** Approved Review  

---

## 1. Executive Summary

This forensic review cross-references the Product Requirements Document (PRD), Functional Requirements Specification (FRS), Business Rules, System Architecture, Database Design, Authorization Matrix, and Security Model. It identifies ambiguities, contradictions, and institutional gaps, and records the architectural resolutions implemented.

---

## 2. Identified Discrepancies & Architectural Resolutions

### D-01: Public Tracking Access Control (Database RLS vs. Server-Side Scoped Lookup)
- **Discrepancy:** The database design originally proposed a public RLS policy on `complaints` matching `tracking_number = current_setting('request.jwt.claims', true)::json->>'tracking_number'`, while the system architecture and security model dictate that the public client is unauthenticated (`anon`) and should **never** directly query `complaints` over the Supabase REST endpoint.
- **Risk:** If `anon` is granted SELECT on `complaints`, malicious actors could attempt parameter probing or reference scanning.
- **Resolution:** Strict server-side mediation. Public clients have **ZERO SELECT** permissions on `complaints` at the PostgreSQL RLS tier. The public tracking portal accesses complaint data exclusively through an isolated Next.js Server Action (`verifyTrackingSession`) that:
  1. Enforces client-IP rate limiting (maximum 5 attempts per 15 minutes).
  2. Verifies the secret passcode against `complaints.tracking_hash` using constant-time cryptographic verification.
  3. Returns only the public-safe subset of fields (`tracking_number`, `status`, `subject`, `incident_date`, `created_at`, `sla_status`, and approved public `complaint_updates`).

---

### D-02: Handling Accused Staff & Conflict-of-Interest Disqualification
- **Discrepancy:** Business Rule `BR-007` states that a complaint must not be accessible to or handled by a staff member cited as the `accused_party`. However, `0007_row_level_security.sql` initially granted read access to all department handlers in that department without checking if the handler's identity matches `accused_party`.
- **Risk:** An accused faculty member with the `department_handler` role could view an active grievance or evidence filed against them.
- **Resolution:** 
  1. The RLS policy for `department_handler` is augmented to exclude cases where `LOWER(complaints.accused_party) ILIKE '%' || LOWER(public.profiles.full_name) || '%'`.
  2. The application assignment service (`assignment.service.ts`) executes a server-side pre-assignment barrier that prevents delegating a complaint to any staff member whose name or profile ID matches `accused_party`.
  3. Cases where a Department Chair or Dean is named automatically elevate to `is_restricted_sensitive = true`, excluding department handlers. Migration `0014` now restricts case-data access to the Student Affairs CMS role. Conflict referrals remain out of platform.

---

### D-03: Dean of Faculty vs. Dean of Students Escalation Routing
- **Discrepancy:** In `BR-007`, complaints against a Faculty Dean route to the "Dean of Students / Provost Office". However, `roles` only provides an aggregate `escalation_officer` role.
- **Risk:** The Student Dean is the sole CMS receiver; if a complaint concerns that office, in-platform routing would expose it to the subject of the complaint.
- **Resolution:**
  1. The MVP has no in-platform alternate recipient or recusal flag.
  2. The university must define an out-of-platform referral route for complaints involving the Student Dean before launching the student intake.
  3. Migration `0014` is applied and the live catalog check confirms the active Student Affairs officer is the sole direct case-data reader. OQ-05 records the external referral decision needed before rollout.

---

### D-04: Anonymous Submissions and Reopening Rights
- **Discrepancy:** Functional requirements permit students to "Request Reopening" within 10 days of case closure. For anonymous submissions, students possess only their tracking reference and passcode, with no verified email or phone to receive notifications.
- **Risk:** Anonymous complainants may assume they will be notified when a case is resolved, or may miss the 10-day reopening window.
- **Resolution:**
  1. The tracking portal prominently warns anonymous submitters that the university has no contact details on file and that the student must manually check the tracking portal periodically.
  2. If an anonymous complaint is closed, the tracking portal enables the "Request Reopening" action during the 10-day window, requiring the student to input substantive new evidence (minimum 50 characters).

---

### D-05: Department Response Authority (Direct Publishing vs. Admin Approval)
- **Discrepancy:** FRS implies department handlers can directly publish official updates to students, whereas institutional governance documents recommend central oversight by the Student Affairs Directorate.
- **Resolution:**
  1. Implemented a dynamic runtime setting in `system_settings`: `require_admin_approval_for_responses` (default: `false`).
  2. If `require_admin_approval_for_responses = true`, department handlers can only create drafts (`is_public = false`). The Student Affairs Administrator must approve the draft, mutating `is_public = true` before it appears on the student's tracking timeline.
  3. If `false`, department handlers can publish directly, while all actions remain auditable in `audit_logs`.

---

### D-06: File Storage Quarantine & Virus Scanning Hook
- **Discrepancy:** The security model specifies 5 MB limit and MIME whitelisting, but does not specify how files are quarantined prior to malware scanning.
- **Resolution:**
  1. Files are uploaded exclusively to a private bucket (`complaint-attachments`) via short-lived (60s) pre-signed URLs.
  2. File extensions are sanitized and validated against allowed MIME signatures.
  3. Files are stored under UUID keys (`complaints/{complaint_id}/{uuid}-{filename}`).
  4. Pre-signed download URLs generated for staff or students expire in 15 minutes and include `Content-Disposition: attachment; filename=...` headers to prevent in-browser execution of arbitrary files.

---

## 3. Summary of Status
All technical discrepancies have been resolved at the architecture and database level. Open operational policies are documented and tracked with configurable defaults in `docs/product/open-questions.md`.

