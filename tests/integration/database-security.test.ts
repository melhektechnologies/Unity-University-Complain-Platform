import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import { sanitizeAuditState } from '../../src/lib/audit/logger';

describe('Database Security Architecture & RLS Migration Verification', () => {
  const migrationsDir = path.resolve(__dirname, '../../supabase/migrations');
  const rlsMigrationPath = path.join(migrationsDir, '0007_row_level_security.sql');
  const auditMigrationPath = path.join(migrationsDir, '0005_audit_and_settings.sql');
  const coreMigrationPath = path.join(migrationsDir, '0003_complaints_core.sql');

  const rlsSql = fs.readFileSync(rlsMigrationPath, 'utf8');
  const auditSql = fs.readFileSync(auditMigrationPath, 'utf8');
  const coreSql = fs.readFileSync(coreMigrationPath, 'utf8');

  const ALL_17_TABLES = [
    'campuses',
    'faculties',
    'departments',
    'complaint_categories',
    'roles',
    'profiles',
    'user_roles',
    'complaints',
    'complaint_identities',
    'complaint_assignments',
    'complaint_status_history',
    'complaint_updates',
    'internal_notes',
    'complaint_attachments',
    'escalations',
    'audit_logs',
    'system_settings',
  ];

  it('enforces that Row Level Security is explicitly enabled on all 17 tables', () => {
    for (const table of ALL_17_TABLES) {
      const regex = new RegExp(`ALTER\\s+TABLE\\s+public\\.${table}\\s+ENABLE\\s+ROW\\s+LEVEL\\s+SECURITY`, 'i');
      expect(regex.test(rlsSql), `Table [${table}] must have ENABLE ROW LEVEL SECURITY`).toBe(true);
    }
  });

  it('strictly prohibits generic public SELECT policies on complaints (Rule C)', () => {
    // Prohibits any policy allowing unrestricted SELECT to anon on complaints
    expect(rlsSql).not.toMatch(/CREATE\s+POLICY.*ON\s+public\.complaints\s+FOR\s+SELECT\s+TO\s+anon\s+USING\s*\(\s*true\s*\)/i);
    expect(rlsSql).not.toMatch(/CREATE\s+POLICY.*ON\s+public\.complaints\s+FOR\s+SELECT\s+TO\s+public\s+USING\s*\(\s*true\s*\)/i);

    // Verify complaints SELECT policies are restricted to authenticated roles
    expect(rlsSql).toContain('CREATE POLICY "complaints_triage_staff_read" ON public.complaints');
    expect(rlsSql).toContain('CREATE POLICY "complaints_dept_handler_read" ON public.complaints');
    expect(rlsSql).toContain('CREATE POLICY "complaints_escalation_officer_read" ON public.complaints');
    expect(rlsSql).toContain('CREATE POLICY "complaints_auditor_read" ON public.complaints');
  });

  it('strictly prohibits public (anon) access to internal notes and identity tables', () => {
    // anon must NEVER be granted access to internal_notes or complaint_identities
    expect(rlsSql).not.toMatch(/ON\s+public\.internal_notes.*TO\s+anon/i);
    expect(rlsSql).not.toMatch(/ON\s+public\.complaint_identities.*TO\s+anon/i);
  });

  it('enforces conflict of interest protection in department handler RLS policies', () => {
    // Handler read policy must check accused_party
    expect(rlsSql).toContain('accused_party IS NULL');
    expect(rlsSql).toContain('LOWER(accused_party) ILIKE');
    expect(rlsSql).toContain('public.my_full_name()');
  });

  it('enforces audit_logs and status_history immutability triggers', () => {
    expect(auditSql).toContain('prevent_audit_modification');
    expect(auditSql).toContain('audit_logs_immutable_trigger');
    expect(auditSql).toContain('BEFORE UPDATE OR DELETE ON public.audit_logs');

    expect(auditSql).toContain('prevent_status_history_modification');
    expect(auditSql).toContain('status_history_immutable_trigger');
    expect(auditSql).toContain('BEFORE UPDATE OR DELETE ON public.complaint_status_history');
  });

  it('enforces database-level anonymous PII prevention trigger', () => {
    expect(coreSql).toContain('enforce_no_identity_for_anonymous');
    expect(coreSql).toContain('BEFORE INSERT ON public.complaint_identities');
    expect(coreSql).toContain("v_privacy_type = 'ANONYMOUS'");
    expect(coreSql).toContain('SECURITY VIOLATION: Identity record cannot be inserted for ANONYMOUS complaint');
  });

  it('sanitizes audit log states to prevent leaking cleartext passcodes or credentials', () => {
    const rawState = {
      tracking_number: 'UU-2026-X8M2KP',
      tracking_hash: 'scrypt$12345$abcdef',
      student_passcode: 'm9w2-8vk4-7pq1-x3z8',
      secret_token: 'super-secret-jwt',
      category: 'ACAD_EVAL',
    };

    const sanitized = sanitizeAuditState(rawState);
    expect(sanitized?.tracking_number).toBe('UU-2026-X8M2KP');
    expect(sanitized?.category).toBe('ACAD_EVAL');

    // Sensitive keys must be scrubbed
    expect(sanitized?.tracking_hash).toBe('[REDACTED]');
    expect(sanitized?.student_passcode).toBe('[REDACTED]');
    expect(sanitized?.secret_token).toBe('[REDACTED]');
  });
});

