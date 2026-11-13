import pg from 'pg';

const password = process.env.SUPABASE_DB_PASSWORD || 'melhek@2026';
const projectRef = process.env.SUPABASE_PROJECT_REF || 'plmxjohcuqxnzpypzddt';

const candidates = [
  {
    name: 'pooler-eu-west-1-5432',
    connectionString: `postgresql://postgres.${projectRef}:${encodeURIComponent(password)}@aws-0-eu-west-1.pooler.supabase.com:5432/postgres`,
  },
  {
    name: 'pooler-eu-west-1-6543',
    connectionString: `postgresql://postgres.${projectRef}:${encodeURIComponent(password)}@aws-0-eu-west-1.pooler.supabase.com:6543/postgres`,
  },
  {
    name: 'pooler-eu-central-1-5432',
    connectionString: `postgresql://postgres.${projectRef}:${encodeURIComponent(password)}@aws-0-eu-central-1.pooler.supabase.com:5432/postgres`,
  },
  {
    name: 'pooler-us-east-1-5432',
    connectionString: `postgresql://postgres.${projectRef}:${encodeURIComponent(password)}@aws-0-us-east-1.pooler.supabase.com:5432/postgres`,
  },
  {
    name: 'ipv6-direct',
    config: {
      host: '2a05:d018:cb1:bb00:83ab:872:b2ad:6c22',
      port: 5432,
      user: 'postgres',
      password,
      database: 'postgres',
      ssl: {
        rejectUnauthorized: false,
        servername: `db.${projectRef}.supabase.co`,
      },
      connectionTimeoutMillis: 20000,
    },
  },
];

for (const c of candidates) {
  const client = c.config
    ? new pg.Client(c.config)
    : new pg.Client({
        connectionString: c.connectionString,
        ssl: { rejectUnauthorized: false },
        connectionTimeoutMillis: 20000,
      });

  try {
    console.log(`Trying ${c.name}...`);
    await client.connect();
    const r = await client.query(
      'select current_database() as db, current_user as usr, inet_server_addr()::text as addr'
    );
    console.log('SUCCESS', c.name, JSON.stringify(r.rows[0]));
    await client.end();
    process.exit(0);
  } catch (e) {
    console.log(`FAIL ${c.name}: ${e.message}`);
    try {
      await client.end();
    } catch {
      /* ignore */
    }
  }
}

process.exit(1);
