# Threat Model & Risk Analysis (STRIDE)

**Product Name:** Unity Student Support  
**Document Version:** 1.0.0  
**Status:** Approved Security Architecture Baseline  
**Methodology:** Microsoft STRIDE Threat Modeling Framework  

---

## 1. Threat Modeling Overview

The STRIDE model categorizes security threats into six domains:
- **S**poofing
- **T**ampering
- **R**epudiation
- **I**nformation Disclosure
- **D**enial of Service
- **E**levation of Privilege

The analysis below evaluates the threat surface across the Public Portal, Administrative CMS, Storage Buckets, and PostgreSQL Database.

---

## 2. Structured Threat Analysis Matrix

| Threat # | Threat Scenario & Vector | STRIDE Category | Potential Impact | Security Mitigation Controls | Residual Risk Level |
| :---: | :--- | :---: | :--- | :--- | :---: |
| **TM-01** | **Unauthorized Student Access to Other Complaints:** A student or attacker guesses a tracking code to read another student's complaint narrative or official response. | Information Disclosure | High. Breach of student privacy, potential retaliation or social harassment. | 1. Two-factor bearer credential: `tracking_number` + 70-bit secret `tracking_passcode`.<br>2. Passcode is stored as an Argon2id/bcrypt salted hash.<br>3. Rate limiter restricts failed lookups to 5 per 15 minutes per IP.<br>4. Uniform error messages prevent enumeration. | **Very Low** |
| **TM-02** | **Complaint Enumeration via Predictable IDs:** An attacker attempts to iterate through complaint IDs (e.g., sequentially or guessing UUIDs). | Information Disclosure | High. Mass harvesting of institutional complaint records. | 1. Public tracking endpoints never accept database UUIDs as query parameters.<br>2. Access is mediated strictly via `tracking_number` AND passcode.<br>3. Database queries require matching both credentials. | **Very Low** |
| **TM-03** | **Malicious Staff Snooping on Unauthorized Cases:** A department handler attempts to inspect complaints filed against other departments or colleagues. | Elevation of Privilege / Information Disclosure | High. Gossip, bias, or interference in external department investigations. | 1. PostgreSQL RLS policies restrict Department Handlers to `department_id = staff.department_id`.<br>2. Server-side authorization guards reject cross-department route access with 403 Forbidden.<br>3. All case access events are recorded in `audit_logs`. | **Low** |
| **TM-04** | **Privilege Escalation by Staff Member:** A reviewer or department handler modifies request payloads to grant themselves admin or escalation officer permissions. | Elevation of Privilege | Critical. Full unauthorized control over system configuration, user accounts, and sensitive cases. | 1. User roles are stored in database junction table `user_roles`, inaccessible via public API.<br>2. Role assignment requires `system_admin` privileges.<br>3. Role changes are validated server-side on every request via `auth.uid()`. | **Very Low** |
| **TM-05** | **Insider Threat (System Admin Snooping Sensitive Cases):** An IT administrator uses technical access to read sensitive harassment or corruption complaints. | Information Disclosure | Critical. Exposure of whistleblower identities in executive complaints. | 1. Administrative UI physically separates System Management (`/admin/team`, `/admin/settings`) from Case Queues.<br>2. System Admin role is denied `SELECT` on `complaints` in RLS policies (only operational roles possess access).<br>3. Any direct database inspection requires direct DB superuser access, governed by infrastructure audit controls. | **Low** |
| **TM-06** | **Sensitive Complaint Routed to Accused Party:** A student files a grievance involving a senior official, and the wrong person could access the case. | Tampering / Information Disclosure | Critical. Retaliation against complainant, destruction of evidence, white-washing of grievance. | 1. The CMS admits only an active Student Affairs account. <br>2. Migration `0014` is applied and the live catalog check confirmed the single-receiver read boundary. <br>3. The CMS has no second recipient; complaints involving the Student Dean require a university referral process outside the platform. | **Database boundary verified; referral procedure remains open** |
| **TM-07** | **Malicious File Upload (Attachment Attack):** An attacker uploads an executable payload (`.exe`, `.php`, `.svg` with embedded XSS) disguised as supporting evidence. | Tampering / Elevation of Privilege | Critical. Remote code execution or Cross-Site Scripting in staff browsers. | 1. Client and server validate MIME types (`application/pdf`, `image/jpeg`, `image/png`, `image/webp`).<br>2. Strict file extension whitelist.<br>3. Files stored in private Supabase Storage buckets under randomized UUID paths.<br>4. Files served with `Content-Disposition: attachment` and `X-Content-Type-Options: nosniff`. Direct execution in browser context is blocked. | **Low** |
| **TM-08** | **Public Endpoint Abuse / Denial of Service:** An automated bot floods `/portal/submit` with thousands of bogus complaints to crash the server or overwhelm triage staff. | Denial of Service | High. Operational exhaustion, storage quota depletion, service degradation. | 1. IP rate limiting (max 5 submissions per 10 minutes per IP).<br>2. Zod validation enforces minimum character lengths (narrative >= 20 chars).<br>3. Optional Cloudflare Turnstile / CAPTCHA on submission.<br>4. Database-level constraints prevent oversized payloads. | **Low** |
| **TM-09** | **Data Leakage Through Application Logs:** Server logs inadvertently record cleartext student names, contact numbers, or secret passcodes. | Information Disclosure | High. Exposure of confidential student data to log management services or developers. | 1. Application logger employs a strict PII masking filter.<br>2. Passcodes, student names, phone numbers, and emails are scrubbed before writing to stdout.<br>3. Production log retention capped at 30 days. | **Very Low** |
| **TM-10** | **Database Credential Theft / Exposure:** A developer commits `.env` containing `SUPABASE_SERVICE_ROLE_KEY` or database connection strings to a public Git repository. | Information Disclosure / Elevation of Privilege | Catastrophic. Full database takeover bypassing all RLS policies. | 1. `.gitignore` strictly excludes all `.env*` files.<br>2. Automated pre-commit hooks scan for credential patterns.<br>3. Service-role key is never referenced in client-side code (`NEXT_PUBLIC_*`). | **Very Low** |
| **TM-11** | **Audit Trail Tampering (Repudiation):** A corrupt staff handler alters or deletes audit log entries to conceal unauthorized case modification. | Repudiation | Critical. Inability to establish legal or institutional accountability. | 1. Database trigger `prevent_audit_modification()` intercepts and aborts any `UPDATE` or `DELETE` statement on `audit_logs`.<br>2. Audit logs are strictly append-only.<br>3. Supabase service role cannot alter rows without disabling triggers (which itself generates an alert). | **Very Low** |
| **TM-12** | **Accidental Exposure of Internal Notes on Public Portal:** A developer inadvertently joins `internal_notes` in a public tracking query. | Information Disclosure | Critical. Exposes confidential internal investigator opinions and staff remarks to the complainant. | 1. **Airgap Doctrine:** `internal_notes` is stored in a separate table.<br>2. RLS policy on `internal_notes` explicitly denies access to `anon` and unauthenticated roles.<br>3. Automated regression integration tests verify that public API queries return zero internal note records. | **Very Low** |

---

## 3. Residual Risk Management & Continuous Verification

While architectural controls reduce risks to low levels, the following residual operational risks require continuous institutional enforcement:
1. **Phishing of Staff Credentials:** Addressed by enforcing complex passwords and preparing for Multi-Factor Authentication (MFA) in Phase 2.
2. **Social Engineering of Tracking Credentials:** If a student willingly shares their tracking reference and passcode with peers, the platform cannot prevent those peers from viewing the public status. Clear guidance is provided on the tracking receipt.
3. **Physical Device Sharing:** Students using public campus lab computers must be reminded to close browser tabs after checking tracking status.

