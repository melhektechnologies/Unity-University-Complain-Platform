-- =============================================================================
-- Migration: 0005_audit_and_settings
-- Purpose:   System-wide immutable audit trail and runtime configuration table.
--
-- DESIGN INVARIANTS:
--  - audit_logs is APPEND-ONLY. UPDATE and DELETE are blocked by trigger.
--  - Sensitive field values in before_state/after_state must be scrubbed
--    at the application layer before logging (never log passcodes, PII).
--  - system_settings uses a typed key-value JSONB store to allow SLA
--    thresholds and policy flags to be configured without code deployments.
--
-- Security: RLS on audit_logs (admin/auditor read). system_settings
--           (system_admin write, all authenticated read).
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. Audit Logs (Immutable System-Wide Accountability Ledger)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_profile_id  UUID        NULL REFERENCES public.profiles(id) ON DELETE SET NULL,
  actor_role        VARCHAR(50) NOT NULL DEFAULT 'system',
  action            VARCHAR(100) NOT NULL,
  entity_table      VARCHAR(50)  NOT NULL,
  entity_id         UUID         NOT NULL,
  before_state      JSONB        NULL,
  after_state       JSONB        NULL,
  ip_address        INET         NULL,
  user_agent        VARCHAR(500) NULL,
  created_at        TIMESTAMPTZ  NOT NULL DEFAULT clock_timestamp()
);

CREATE INDEX idx_audit_entity     ON public.audit_logs (entity_table, entity_id);
CREATE INDEX idx_audit_actor      ON public.audit_logs (actor_profile_id);
CREATE INDEX idx_audit_action     ON public.audit_logs (action);
CREATE INDEX idx_audit_created_at ON public.audit_logs (created_at DESC);

COMMENT ON TABLE  public.audit_logs             IS 'Immutable compliance and forensic ledger. Append-only enforced by trigger below.';
COMMENT ON COLUMN public.audit_logs.ip_address  IS 'Client IP. Never store in audit_logs for ANONYMOUS complaint submissions (use NULL).';
COMMENT ON COLUMN public.audit_logs.before_state IS 'JSON snapshot of entity state before mutation. Must be scrubbed of cleartext PII before logging.';
COMMENT ON COLUMN public.audit_logs.after_state  IS 'JSON snapshot of entity state after mutation. Must be scrubbed of cleartext PII before logging.';

-- ---------------------------------------------------------------------------
-- 2. Immutability Trigger — Prevents UPDATE or DELETE on audit_logs
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.prevent_audit_modification()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION
    'SECURITY VIOLATION: audit_logs is append-only. UPDATE and DELETE are strictly prohibited. Action: %, Table: audit_logs',
    TG_OP;
END;
$$;

CREATE TRIGGER audit_logs_immutable_trigger
BEFORE UPDATE OR DELETE ON public.audit_logs
FOR EACH ROW EXECUTE FUNCTION public.prevent_audit_modification();

COMMENT ON FUNCTION public.prevent_audit_modification() IS 'Hard database guard: any UPDATE or DELETE on audit_logs raises an exception, ensuring non-repudiation of all recorded events.';

-- ---------------------------------------------------------------------------
-- 3. Immutability Trigger — Prevents UPDATE or DELETE on complaint_status_history
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.prevent_status_history_modification()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION
    'SECURITY VIOLATION: complaint_status_history is append-only. Operation: %, ID: %',
    TG_OP, OLD.id;
END;
$$;

CREATE TRIGGER status_history_immutable_trigger
BEFORE UPDATE OR DELETE ON public.complaint_status_history
FOR EACH ROW EXECUTE FUNCTION public.prevent_status_history_modification();

-- ---------------------------------------------------------------------------
-- 4. System Settings (Runtime Configuration Key-Value Store)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.system_settings (
  key                     VARCHAR(100) PRIMARY KEY,
  value                   JSONB        NOT NULL,
  description             TEXT         NOT NULL,
  updated_by_profile_id   UUID         NULL REFERENCES public.profiles(id) ON DELETE SET NULL,
  updated_at              TIMESTAMPTZ  NOT NULL DEFAULT clock_timestamp()
);

COMMENT ON TABLE  public.system_settings     IS 'Runtime configuration store. Allows SLA thresholds and operational policies to be changed without code deployments.';
COMMENT ON COLUMN public.system_settings.key IS 'Namespaced configuration key. Convention: lowercase_snake_case.';

-- ---------------------------------------------------------------------------
-- 5. Auto-update system_settings.updated_at on change
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.set_system_settings_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = clock_timestamp();
  RETURN NEW;
END;
$$;

CREATE TRIGGER system_settings_updated_at_trigger
BEFORE UPDATE ON public.system_settings
FOR EACH ROW EXECUTE FUNCTION public.set_system_settings_updated_at();
