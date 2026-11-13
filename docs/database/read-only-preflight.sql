-- Unity Student Support: production preflight before any forward migration.
-- This is one SELECT-only query so Supabase SQL Editor returns one report.
-- It deliberately excludes student names, IDs, phones, emails, tracking
-- numbers, complaint text, storage paths, filenames, and file contents.

WITH
migration_ledger AS (
  SELECT COALESCE(
    jsonb_agg(jsonb_build_object('filename', filename, 'applied_at', applied_at)
              ORDER BY filename), '[]'::jsonb) AS data
  FROM public.schema_migrations
),
columns AS (
  SELECT COALESCE(
    jsonb_agg(jsonb_build_object(
      'table', table_name, 'column', column_name, 'type', data_type,
      'nullable', is_nullable, 'default', column_default
    ) ORDER BY table_name, ordinal_position), '[]'::jsonb) AS data
  FROM information_schema.columns
  WHERE table_schema = 'public'
    AND table_name = ANY (ARRAY[
      'complaints', 'complaint_identities', 'complaint_categories',
      'complaint_status_history', 'complaint_updates', 'complaint_attachments',
      'profiles', 'user_roles', 'roles'
    ]::text[])
),
row_counts AS (
  SELECT jsonb_agg(jsonb_build_object('table', table_name, 'rows', row_count)
                   ORDER BY table_name) AS data
  FROM (
    SELECT 'complaint_attachments' AS table_name, COUNT(*)::bigint AS row_count FROM public.complaint_attachments
    UNION ALL SELECT 'complaint_categories', COUNT(*)::bigint FROM public.complaint_categories
    UNION ALL SELECT 'complaint_identities', COUNT(*)::bigint FROM public.complaint_identities
    UNION ALL SELECT 'complaint_status_history', COUNT(*)::bigint FROM public.complaint_status_history
    UNION ALL SELECT 'complaint_updates', COUNT(*)::bigint FROM public.complaint_updates
    UNION ALL SELECT 'complaints', COUNT(*)::bigint FROM public.complaints
  ) AS counts
),
statuses AS (
  SELECT COALESCE(jsonb_agg(jsonb_build_object('status', status, 'complaints', n)
                            ORDER BY status), '[]'::jsonb) AS data
  FROM (
    SELECT status, COUNT(*)::bigint AS n
    FROM public.complaints GROUP BY status
  ) AS grouped_statuses
),
categories AS (
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'code', code, 'name', name, 'active', is_active,
    'sensitive', is_sensitive, 'complaints', complaint_count
  ) ORDER BY name), '[]'::jsonb) AS data
  FROM (
    SELECT c.code, c.name, c.is_active, c.is_sensitive, COUNT(co.id)::bigint AS complaint_count
    FROM public.complaint_categories AS c
    LEFT JOIN public.complaints AS co ON co.category_id = c.id
    GROUP BY c.code, c.name, c.is_active, c.is_sensitive
  ) AS grouped_categories
),
constraints AS (
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'table', rel.relname, 'name', con.conname, 'definition', pg_get_constraintdef(con.oid)
  ) ORDER BY rel.relname, con.conname), '[]'::jsonb) AS data
  FROM pg_constraint AS con
  JOIN pg_class AS rel ON rel.oid = con.conrelid
  JOIN pg_namespace AS ns ON ns.oid = rel.relnamespace
  WHERE ns.nspname = 'public'
    AND rel.relname = ANY (ARRAY[
      'complaints', 'complaint_identities', 'complaint_status_history',
      'complaint_updates', 'complaint_attachments'
    ]::text[])
),
staff_roles AS (
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'role', role_id, 'assigned_profiles', assigned_profiles, 'active_profiles', active_profiles
  ) ORDER BY role_id), '[]'::jsonb) AS data
  FROM (
    SELECT ur.role_id, COUNT(*)::bigint AS assigned_profiles,
           COUNT(*) FILTER (WHERE p.is_active)::bigint AS active_profiles
    FROM public.user_roles AS ur
    JOIN public.profiles AS p ON p.id = ur.profile_id
    GROUP BY ur.role_id
  ) AS role_counts
),
policies AS (
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'table', tablename, 'policy', policyname, 'roles', roles,
    'command', cmd, 'using', qual, 'check', with_check
  ) ORDER BY tablename, policyname), '[]'::jsonb) AS data
  FROM pg_policies
  WHERE schemaname = 'public'
    AND tablename = ANY (ARRAY[
      'complaints', 'complaint_identities', 'complaint_status_history',
      'complaint_updates', 'complaint_attachments'
    ]::text[])
),
attachment_mimes AS (
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'mime_type', mime_type, 'files', file_count, 'largest_bytes', largest_file_bytes
  ) ORDER BY mime_type), '[]'::jsonb) AS data
  FROM (
    SELECT mime_type, COUNT(*)::bigint AS file_count,
           MAX(file_size_bytes)::bigint AS largest_file_bytes
    FROM public.complaint_attachments GROUP BY mime_type
  ) AS mime_counts
),
storage_bucket AS (
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'bucket', b.id, 'public', b.public, 'file_size_limit', b.file_size_limit,
    'allowed_mime_types', b.allowed_mime_types, 'object_count', COALESCE(o.object_count, 0)
  )), '[]'::jsonb) AS data
  FROM storage.buckets AS b
  LEFT JOIN (
    SELECT bucket_id, COUNT(*)::bigint AS object_count
    FROM storage.objects
    WHERE bucket_id = 'complaint-attachments'
    GROUP BY bucket_id
  ) AS o ON o.bucket_id = b.id
  WHERE b.id = 'complaint-attachments'
),
duplicate_transitions AS (
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'from_status', from_status, 'to_status', to_status, 'duplicate_groups', group_count
  ) ORDER BY from_status, to_status), '[]'::jsonb) AS data
  FROM (
    SELECT from_status, to_status, COUNT(*)::bigint AS group_count
    FROM (
      SELECT complaint_id, from_status, to_status
      FROM public.complaint_status_history
      GROUP BY complaint_id, from_status, to_status
      HAVING COUNT(*) > 1
    ) AS repeated
    GROUP BY from_status, to_status
  ) AS grouped_duplicates
)
SELECT jsonb_pretty(jsonb_build_object(
  'migration_ledger', migration_ledger.data,
  'columns', columns.data,
  'table_row_counts', row_counts.data,
  'status_counts', statuses.data,
  'categories', categories.data,
  'constraints', constraints.data,
  'staff_role_counts', staff_roles.data,
  'rls_policies', policies.data,
  'attachment_mime_counts', attachment_mimes.data,
  'complaint_attachment_bucket', storage_bucket.data,
  'duplicate_status_transitions', duplicate_transitions.data
)) AS preflight_report
FROM migration_ledger
CROSS JOIN columns
CROSS JOIN row_counts
CROSS JOIN statuses
CROSS JOIN categories
CROSS JOIN constraints
CROSS JOIN staff_roles
CROSS JOIN policies
CROSS JOIN attachment_mimes
CROSS JOIN storage_bucket
CROSS JOIN duplicate_transitions;
