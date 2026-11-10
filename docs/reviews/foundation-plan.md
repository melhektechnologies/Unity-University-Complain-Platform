# Application Foundation Plan — Unity Student Support

**Document Version:** 1.0.0  
**Date:** 2026-11-05  
**Architect:** Principal Enterprise Software Architect  
**Status:** Canonical Foundation Specification  

---

## 1. Technical Stack Specification

| Component | Framework / Tool | Version Target | Architectural Justification |
| :--- | :--- | :---: | :--- |
| **Framework** | Next.js (App Router) | `14.2.x` | Native React Server Components, server actions, robust streaming, and proven enterprise stability on Node 20. |
| **Language** | TypeScript | `5.7.x` | Strict typing (`strict: true`, `noImplicitAny: true`) to ensure compile-time boundary safety. |
| **Database & Auth** | Supabase (PostgreSQL 15+) | `@supabase/ssr ^0.5.2` | Native cookie-based session management (`HttpOnly`, `Secure`), Row Level Security, relational constraints. |
| **Styling & UI** | Tailwind CSS + shadcn/ui | `^3.4.17` | Restrained institutional design system (Navy `#1B365D`, Teal `#008080`, Slate `#F1F5F9`). |
| **Validation** | Zod | `^3.24.1` | Runtime schema validation on every external mutation and environment variable. |
| **Forms** | React Hook Form | `^7.54.2` | Performant, un-controlled form state management with `@hookform/resolvers/zod`. |
| **Unit Testing** | Vitest | `^1.6.0` | Ultra-fast unit and integration testing runner natively supporting TypeScript and ESM. |
| **E2E Testing** | Playwright | `^1.43.0` | Multi-browser end-to-end journey verification across mobile and desktop viewports. |
| **Code Quality** | ESLint & Prettier | `^8.57.1`, `^3.4.2` | Strict linting with `eslint-config-next` and formatted code consistency. |

---

## 2. Directory Architecture

```
/
├── .env.example                  # Environment variable reference template
├── next.config.mjs               # Next.js runtime configuration
├── package.json                  # Dependencies and execution scripts
├── tsconfig.json                 # Strict TypeScript configuration
├── tailwind.config.ts            # Institutional styling tokens
├── vitest.config.ts              # Unit test runner setup
├── playwright.config.ts          # E2E test suite setup
│
├── docs/                         # Canonical product, architecture, security specifications
│   ├── architecture/
│   ├── product/
│   ├── security/
│   ├── testing/
│   └── reviews/                  # Audit and forensic reports
│
├── supabase/
│   ├── migrations/               # Sequential SQL migrations (0001 through 0008)
│   └── seed.sql                  # Database seed script for development
│
├── src/
│   ├── app/                      # Next.js App Router (Layouts, pages, route handlers)
│   │   ├── (auth)/               # Staff authentication route group
│   │   │   └── admin/login/
│   │   ├── (portal)/             # Student public intake and tracking routes
│   │   │   ├── submit/
│   │   │   └── track/
│   │   ├── admin/                # Authenticated staff CMS (protected via middleware)
│   │   │   ├── dashboard/
│   │   │   ├── complaints/
│   │   │   └── settings/
│   │   ├── api/                  # Dedicated REST/Webhook route handlers
│   │   ├── layout.tsx            # Global application root layout
│   │   └── page.tsx              # Public home page / environment landing banner
│   │
│   ├── components/               # Reusable UI component library (shadcn/ui primitives)
│   │   ├── ui/                   # Button, Card, Dialog, Badge, Input, Select, Table
│   │   ├── layout/               # Header, Footer, StaffNav, Breadcrumbs
│   │   └── shared/               # StatusBadge, TrackingCard, ErrorBoundary
│   │
│   ├── features/                 # Modular domain feature implementations
│   │   ├── complaints/           # Submission wizard, triage forms, detail view
│   │   ├── tracking/             # Public tracker, clarification submission
│   │   ├── assignments/          # Delegation modal, conflict-of-interest check
│   │   └── staff/                # Staff directory, role management
│   │
│   ├── lib/                      # Core cross-cutting utilities
│   │   ├── auth/                 # Role guards, session utilities, permission checks
│   │   ├── supabase/             # Browser client, server client, middleware helpers
│   │   ├── tracking/             # 128-bit entropy credential generator & hash verifier
│   │   ├── audit/                # Structured event logging service
│   │   └── validation/           # Zod domain schemas
│   │
│   └── types/                    # Ambient TypeScript interfaces and database types
│
└── tests/                        # Automated test suites
    ├── unit/                     # Business logic, tracking crypto, schema tests
    ├── integration/              # Server action authorization & mock DB tests
    └── e2e/                      # Playwright full browser user journey tests
```

---

## 3. Environment Variable Architecture

Environment variables are partitioned into client-safe and server-only secrets. Every variable is validated at runtime startup using a strict Zod schema:

```typescript
// src/lib/env.ts
import { z } from 'zod';

export const envSchema = z.object({
  // Public client variables (exposed in browser)
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(20),
  NEXT_PUBLIC_APP_URL: z.string().url().default('http://localhost:3000'),

  // Server-only private secrets (NEVER exposed to client)
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(20),
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
});
```

---

## 4. Git Branching & Staging Separation

- **`main`**: Production-ready code. Commits require passing all automated tests (unit + E2E) and signed pull request approval.
- **`staging`**: Integration branch connected to the staging Supabase project for pre-production verification.
- **`feature/*`**: Isolated feature development branches created from `staging`.
- **Commit Format:** Conventional commits (`feat:`, `fix:`, `sec:`, `docs:`, `test:`). Real credentials, secret keys, or customer PII are strictly barred from git commits.

