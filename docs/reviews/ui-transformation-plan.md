# UI Transformation Plan — Unity Student Support

**Status:** Proposed; implementation awaits user approval

**Scope:** UI/UX transformation of the existing Next.js/Supabase application

**Repository branch:** `v0/ui-transformation-plan`

## 1. Current interface structure

Verified from the current checkout (not inferred from older architecture documents):

| Surface | Current route(s) | Current implementation |
|---|---|---|
| Student entry | `/` | Public portal home page in `src/app/(portal)/page.tsx`. |
| Complaint intake | `/submit` | Single-page form in `src/app/(portal)/submit/page.tsx`; posts to `/api/complaints/submit`. Taxonomy fields and attachment upload are not present in the observed form. |
| Submission receipt | `/submit/confirmation` | Reads one-time tracking credentials from `sessionStorage`, offers copy/print actions, and links to tracking. |
| Tracking | `/track` | Credential-entry form in `src/app/(portal)/track/page.tsx`; calls `/api/complaints/track`. A separate public case-detail route is not present in the checked-in route tree. |
| Staff authentication | `/admin/login` | Email/password form calls `/api/auth/signin`. |
| Staff dashboard | `/admin/dashboard` | Server-rendered complaint metrics/listing in `src/app/admin/dashboard/page.tsx`. |
| Staff complaint detail | `/admin/complaints/[id]` | Server-rendered detail and status panel. |
| Staff shell | `/admin/*` | Shared header and sign-out form in `src/app/admin/layout.tsx`; route-level middleware also redirects unauthenticated visitors. |
| API routes | `/api/auth/*`, `/api/complaints/*` | Sign-in/sign-out, submission, tracking, and staff status mutation handlers. |

Shared UI primitives currently include Button, Card, Badge, Input, Label, Select, and Textarea. The application uses Next.js 14 App Router, React 18, TypeScript, Tailwind CSS, shadcn-style tokens, Lucide icons, React Hook Form, Zod, and Supabase SSR/Postgres. Existing CSS variables provide navy/slate and teal tokens, but the documented palette differs across repository documents and the brief asks for university blue/yellow. No official emblem asset was found in the current repository's public asset tree or the supplied text attachment.

## 2. Existing functionality to preserve

- Public complaint submission with identified, confidential, and anonymous privacy modes; generated tracking reference and passcode; hashed passcode storage; and one-time receipt display.
- Public credential verification that returns a restricted case summary and filters updates to public entries.
- Staff Supabase email/password sign-in, sign-out, and authenticated route redirects.
- Dashboard complaint information sourced from Supabase, rather than invented metrics.
- Staff complaint detail and existing status-transition UI/API, status history writes, optional student-facing update, and audit logging.
- Database migrations, RLS policies, privacy separation, sensitivity restrictions, immutable history/audit intent, role/capability helpers, and existing tests.
- Existing route URLs and API request/response shapes unless a separately verified defect requires an approved change.

No schema or migration changes are proposed as part of the visual transformation.

## 3. Current UX and implementation concerns

These are observations from the live source reviewed for this plan; they are not a claim that every documented feature is implemented.

1. The portal and staff views use several repeated hard-coded color values; shared tokens and page treatments are not yet consistently applied.
2. Intake is currently a single page, not the multi-stage flow described in product documents; several expected taxonomy and attachment controls are absent from the observed UI. The redesign must not imply unsupported behavior.
3. Tracking currently presents credential entry; no public tracking detail/timeline page was found in the checked-in route tree.
4. Staff navigation currently exposes a single Complaints link; the wider queue, assignment, reporting, team, and settings destinations described in architecture docs are not implemented in the route tree and must not be represented as working navigation.
5. There is a material authorization gap to resolve before expanding staff workflows: the status PATCH route checks for a session but then reads and mutates complaint data with the service-role client without applying role/capability or complaint-level authorization. The UI must not treat hidden controls as a security boundary. Any relevant correction should be a separately scoped, tested security change before or alongside staff UI actions—not a reason to weaken RLS.
6. The layout uses `getSession()` for its server-side check while middleware uses `getUser()`. Confirm and align the server trust boundary as part of security review; do not change the sign-in model.
7. Existing documentation contains stale inventory/stack statements that conflict with the checked-out code (for example, claims that no frontend exists, and differing design tokens/routes). Update only directly affected documentation after implementation is approved.
8. The current submission handler and UI have differing validation/data expectations from shared schemas and product documents. Preserve backend contracts during visual work; any contract discrepancy needs focused verification and must not be silently “fixed” by changing UI payloads.
9. No official logo/emblem file is present in the inspected repository asset tree or supplied attachment. Do not approximate it with text or CSS; obtain the approved original before adding it.

## 4. Proposed design system

- Establish one semantic token layer in the existing CSS-variable/Tailwind architecture, retaining accessible light surfaces, deep institutional blue, dark readable text, neutral borders, and clear interaction/focus states.
- Use university yellow only as a controlled accent after the official brand asset or approved brand guidance confirms the correct color. Do not invent an official hex value, slogan, policy, or endorsement. Until then, keep the existing palette as a provisional implementation reference and isolate the eventual color choice in tokens.
- Define typography, spacing, radii, border, shadow, focus, and status tokens once; map status to text/icon as well as color.
- Reuse installed Lucide and existing UI primitives; add or change primitives only when an actual route needs them. Keep server rendering by default and isolate client interactivity.
- Keep motion restrained and honor `prefers-reduced-motion`; meet WCAG 2.2 AA contrast and visible focus expectations.

## 5. Proposed student portal experience

- Keep the portal a service interface, not a marketing landing page: clear service purpose, one primary submit action, one secondary tracking action, concise process and privacy explanations, and practical help.
- Explain identified, confidential, and anonymous options accurately and consistently with existing policy. Anonymous submissions must not imply contact-based follow-up.
- Improve the existing form with explicit labels, field-level errors, progress/section cues, preserved values on validation failure, loading/duplicate-submit feedback, and a review/confirmation step only where the existing data contract supports it.
- Restyle the existing one-time receipt and tracker without changing credential generation, storage, or response exposure. Show only approved public fields and public updates.
- Do not introduce taxonomy selection, attachment upload, clarification messaging, or a public case timeline unless the backend route/data contract is implemented and verified first.

## 6. Proposed staff workspace

- Replace the current minimal header with a responsive, role-aware shell only for destinations and actions that exist and are authorized.
- Prioritize the real, database-backed complaint queue/dashboard and case detail. Use factual empty/error/loading states; do not fabricate notifications, assignment queues, roles, activity, or case counts.
- Organize detail information into clear case metadata, complaint content, permitted identity information, public updates, internal notes/history, and authorized actions—strictly preserving their security boundaries.
- Do not add links for unimplemented reports, escalations, staff management, or settings. Do not rely on client-side role checks to secure data.
- Before enabling privileged mutations or displaying sensitive sections, verify server-side capability and record-level access checks against the role policy and RLS. Security enforcement belongs in trusted server code/database policy, not visual conditionals.

## 7. Mobile and responsive behavior

Design mobile-first and verify at 360, 390, 768, 1024, 1440, and 1920 CSS pixels. Use a compact public header; make forms single-column, readable, and touch-friendly; allow staff navigation to collapse without hiding the current location; transform dense tables into readable stacked case rows on narrow screens; ensure long references and complaint text wrap; and prevent horizontal overflow. Interactive targets should be comfortably usable (aim for 44×44 CSS pixels where practical). Dialogs, if actually needed, must remain keyboard-operable and viewport-safe.

## 8. Accessibility requirements

- Use semantic landmarks and heading hierarchy, skip navigation, and descriptive links/buttons.
- Associate labels, help text, and errors with fields; announce asynchronous form outcomes and status changes accessibly.
- Maintain keyboard operation, visible focus, logical focus order, and appropriate dialog semantics/focus handling.
- Do not use color alone for complaint status or privacy classification; pair text and/or icons.
- Check contrast, zoom/reflow, reduced motion, and screen-reader names; do not claim conformance without running the relevant checks.

## 9. Controlled implementation sequence (after approval)

1. **Foundation and brand confirmation:** obtain the original official emblem and approved brand color values; reconcile current tokens; implement shared tokens and low-risk primitives. No logo recreation.
2. **Student entry and navigation:** update the public shell/home and route links, preserving existing URLs and real actions.
3. **Submission and receipt:** refine the current form and success/credential receipt against the actual server contract; defer unsupported steps/features.
4. **Tracking:** refine credential-entry feedback and public-safe result presentation; add no new data or actions without backend authorization/contracts.
5. **Staff shell and dashboard:** build a responsive shell and improve only existing data-backed pages, with no dead links or invented metrics.
6. **Complaint detail and security gate:** verify/close server-side authorization gaps before exposing sensitive fields or privileged actions; then refine detail presentation and role-appropriate actions.
7. **Accessibility, responsive QA, and docs:** validate all implemented routes/viewports, update only documentation that is demonstrably stale, and report remaining gaps.

For every stage, run targeted TypeScript, lint, and relevant existing tests; then browser-check the affected route at mobile and desktop sizes. Expand validation only where a code or security change warrants it. No database migration is planned.

## 10. Approval and prerequisites

Please approve this staged scope before UI implementation. Two project inputs are unresolved and materially affect branding: the repository and supplied attachment currently contain no original emblem, and no verified official yellow value/guideline is available. Provide the original emblem and approved color reference (or explicitly authorize proceeding with the current navy/slate tokens and no emblem until they are available). Any scope expansion into missing backend workflows or security changes will be isolated and reported rather than disguised as UI work.
