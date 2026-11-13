/**
 * One-shot migration runner for Supabase Postgres.
 * Usage:
 *   set SUPABASE_DB_PASSWORD=... && node scripts/apply-migrations.mjs
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import pg from 'pg';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const migrationsDir = path.join(root, 'supabase', 'migrations');

const password = process.env.SUPABASE_DB_PASSWORD;
const projectRef = process.env.SUPABASE_PROJECT_REF || 'plmxjohcuqxnzpypzddt';

if (!password) {
  console.error('Missing SUPABASE_DB_PASSWORD');
  process.exit(1);
}

const region = process.env.SUPABASE_REGION || 'eu-west-1';

const candidates = [
  {
    name: `pooler-${region}-5432`,
    connectionString: `postgresql://postgres.${projectRef}:${encodeURIComponent(password)}@aws-0-${region}.pooler.supabase.com:5432/postgres`,
    ssl: { rejectUnauthorized: false },
  },
  {
    name: `pooler-${region}-6543`,
    connectionString: `postgresql://postgres.${projectRef}:${encodeURIComponent(password)}@aws-0-${region}.pooler.supabase.com:6543/postgres`,
    ssl: { rejectUnauthorized: false },
  },
  {
    name: 'direct-5432',
    connectionString: `postgresql://postgres:${encodeURIComponent(password)}@db.${projectRef}.supabase.co:5432/postgres`,
    ssl: { rejectUnauthorized: false },
  },
];

async function tryConnect() {
  let lastError;
  for (const candidate of candidates) {
    const client = new pg.Client({
      connectionString: candidate.connectionString,
      ssl: candidate.ssl,
      connectionTimeoutMillis: 15000,
    });
    try {
      console.log(`Trying ${candidate.name}...`);
      await client.connect();
      console.log(`Connected via ${candidate.name}`);
      return client;
    } catch (err) {
      lastError = err;
      console.log(`  failed: ${err.message}`);
      try {
        await client.end();
      } catch {
        /* ignore */
      }
    }
  }
  throw lastError ?? new Error('All connection candidates failed');
}

async function main() {
  const client = await tryConnect();

  await client.query(`
    CREATE TABLE IF NOT EXISTS public.schema_migrations (
      filename TEXT PRIMARY KEY,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
    );
  `);

  const files = fs
    .readdirSync(migrationsDir)
    .filter((f) => f.endsWith('.sql'))
    .sort();

  for (const file of files) {
    const { rows } = await client.query(
      'SELECT 1 FROM public.schema_migrations WHERE filename = $1',
      [file]
    );
    if (rows.length) {
      console.log(`SKIP  ${file}`);
      continue;
    }

    const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
    // Some migrations manage their own transaction and record themselves in
    // the ledger so they can also be run safely from Supabase SQL Editor.
    const migrationHasOwnTransaction = /^\s*(?:--[^\r\n]*\r?\n\s*)*BEGIN\s*;/i.test(sql);
    console.log(`APPLY ${file}...`);
    try {
      if (!migrationHasOwnTransaction) await client.query('BEGIN');
      await client.query(sql);
      const { rows: appliedRows } = await client.query(
        'SELECT 1 FROM public.schema_migrations WHERE filename = $1',
        [file]
      );
      if (!appliedRows.length) {
        await client.query(
          'INSERT INTO public.schema_migrations (filename) VALUES ($1) ON CONFLICT (filename) DO NOTHING',
          [file]
        );
      }
      if (!migrationHasOwnTransaction) await client.query('COMMIT');
      console.log(`  OK   ${file}`);
    } catch (err) {
      await client.query('ROLLBACK');
      console.error(`  FAIL ${file}: ${err.message}`);
      await client.end();
      process.exit(1);
    }
  }

  const tables = await client.query(`
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
    ORDER BY table_name;
  `);
  console.log('\nPublic tables:');
  for (const row of tables.rows) console.log(` - ${row.table_name}`);

  await client.end();
  console.log('\nMigrations complete.');
}

main().catch((err) => {
  console.error('Migration runner failed:', err.message);
  process.exit(1);
});
