import { createAdminClient } from '../supabase/admin';

export interface AuditLogEntry {
  actorProfileId?: string | null;
  actorRole: string;
  action: string;
  entityTable: string;
  entityId: string;
  beforeState?: Record<string, unknown> | null;
  afterState?: Record<string, unknown> | null;
  ipAddress?: string | null;
  userAgent?: string | null;
}

/**
 * Strips sensitive credentials and unmasked PII from audit state snapshots
 */
export function sanitizeAuditState(state: Record<string, unknown> | null | undefined): Record<string, unknown> | null {
  if (!state) return null;

  const sanitized: Record<string, unknown> = { ...state };
  const sensitiveKeys = ['tracking_hash', 'passcode', 'password', 'token', 'secret'];

  for (const key of Object.keys(sanitized)) {
    if (sensitiveKeys.some((s) => key.toLowerCase().includes(s))) {
      sanitized[key] = '[REDACTED]';
    }
  }

  return sanitized;
}

/**
 * Writes an append-only audit record to public.audit_logs.
 * Uses the privileged admin client on the server.
 */
export async function recordAuditLog(entry: AuditLogEntry): Promise<{ success: boolean; id?: string; error?: string }> {
  try {
    const admin = createAdminClient();

    const payload = {
      actor_profile_id: entry.actorProfileId || null,
      actor_role: entry.actorRole,
      action: entry.action,
      entity_table: entry.entityTable,
      entity_id: entry.entityId,
      before_state: sanitizeAuditState(entry.beforeState),
      after_state: sanitizeAuditState(entry.afterState),
      ip_address: entry.ipAddress || null,
      user_agent: entry.userAgent ? entry.userAgent.slice(0, 300) : null,
    };

    const { data, error } = await admin
      .from('audit_logs')
      .insert(payload)
      .select('id')
      .single();

    if (error) {
      console.error('[AUDIT_LOG_ERROR] Failed to commit audit record:', error.message);
      return { success: false, error: error.message };
    }

    return { success: true, id: data.id };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown audit logging error';
    console.error('[AUDIT_LOG_FATAL]', message);
    return { success: false, error: message };
  }
}

