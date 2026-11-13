import pg from 'pg';

const password = process.env.SUPABASE_DB_PASSWORD || 'melhek@2026';
const client = new pg.Client({
  connectionString: `postgresql://postgres.plmxjohcuqxnzpypzddt:${encodeURIComponent(password)}@aws-0-eu-west-1.pooler.supabase.com:5432/postgres`,
  ssl: { rejectUnauthorized: false },
});

await client.connect();

const cols = await client.query(`
  select column_name, is_nullable
  from information_schema.columns
  where table_name = 'complaints'
    and column_name in ('campus_id','faculty_id','department_id','category_id')
  order by 1
`);
console.log('complaints columns:', cols.rows);

const cats = await client.query('select name from complaint_categories order by name');
console.log(
  'categories:',
  cats.rows.map((r) => r.name)
);

const emailCol = await client.query(`
  select is_nullable
  from information_schema.columns
  where table_name = 'complaint_identities' and column_name = 'email'
`);
console.log('identity.email nullable:', emailCol.rows[0]);

const staff = await client.query(`
  select p.email, ur.role_id
  from profiles p
  left join user_roles ur on ur.profile_id = p.id
`);
console.log('staff:', staff.rows);

await client.end();
