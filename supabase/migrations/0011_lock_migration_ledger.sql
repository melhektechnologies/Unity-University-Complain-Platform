-- Keep the migration ledger private to database administrators.
-- The ledger contains deployment metadata only; this does not modify case data.
BEGIN;

DO $migration$
BEGIN
  IF to_regclass('public.schema_migrations') IS NOT NULL THEN
    EXECUTE 'ALTER TABLE public.schema_migrations ENABLE ROW LEVEL SECURITY';
    EXECUTE 'REVOKE ALL PRIVILEGES ON TABLE public.schema_migrations FROM PUBLIC, anon, authenticated';
    EXECUTE 'GRANT SELECT, INSERT ON TABLE public.schema_migrations TO service_role';

    INSERT INTO public.schema_migrations (filename)
    SELECT '0011_lock_migration_ledger.sql'
    WHERE NOT EXISTS (
      SELECT 1
      FROM public.schema_migrations
      WHERE filename = '0011_lock_migration_ledger.sql'
    );
  END IF;
END;
$migration$;

COMMIT;
