/**
 * Create the single Student Affairs staff account + profile/role.
 * Usage: node --env-file=.env.local scripts/bootstrap-staff.mjs
 */
import pg from 'pg';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const dbPassword = process.env.SUPABASE_DB_PASSWORD || 'melhek@2026';
const projectRef = process.env.SUPABASE_PROJECT_REF || 'plmxjohcuqxnzpypzddt';
const region = process.env.SUPABASE_REGION || 'eu-west-1';

const STAFF_EMAIL = process.env.STAFF_EMAIL || 'student.affairs@unity.edu.et';
const STAFF_PASSWORD = process.env.STAFF_PASSWORD || 'UnityAffairs@2026';
const STAFF_NAME = process.env.STAFF_NAME || 'Student Affairs Officer';

if (!url || !serviceKey) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const authHeaders = {
  apikey: serviceKey,
  Authorization: `Bearer ${serviceKey}`,
  'Content-Type': 'application/json',
};

async function createOrFindUser() {
  const createRes = await fetch(`${url}/auth/v1/admin/users`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({
      email: STAFF_EMAIL,
      password: STAFF_PASSWORD,
      email_confirm: true,
      user_metadata: { full_name: STAFF_NAME },
    }),
  });

  const createBody = await createRes.json();
  if (createRes.ok && createBody.id) {
    console.log('Created auth user:', createBody.id);
    return createBody.id;
  }

  console.log('createUser note:', createBody.msg || createBody.message || JSON.stringify(createBody));

  const listRes = await fetch(`${url}/auth/v1/admin/users?page=1&per_page=200`, {
    headers: authHeaders,
  });
  const listBody = await listRes.json();
  if (!listRes.ok) {
    throw new Error(`listUsers failed: ${JSON.stringify(listBody)}`);
  }

  const existing = (listBody.users || []).find(
    (u) => (u.email || '').toLowerCase() === STAFF_EMAIL.toLowerCase()
  );
  if (!existing) {
    throw new Error(`Could not create or find staff user: ${JSON.stringify(createBody)}`);
  }

  console.log('Using existing auth user:', existing.id);
  return existing.id;
}

async function main() {
  console.log('Creating staff auth user via Auth Admin API...');
  const userId = await createOrFindUser();

  const pgClient = new pg.Client({
    connectionString: `postgresql://postgres.${projectRef}:${encodeURIComponent(dbPassword)}@aws-0-${region}.pooler.supabase.com:5432/postgres`,
    ssl: { rejectUnauthorized: false },
  });
  await pgClient.connect();

  await pgClient.query(
    `
    INSERT INTO public.profiles (id, full_name, email, is_active)
    VALUES ($1, $2, $3, true)
    ON CONFLICT (id) DO UPDATE
      SET full_name = EXCLUDED.full_name,
          email = EXCLUDED.email,
          is_active = true
  `,
    [userId, STAFF_NAME, STAFF_EMAIL]
  );

  await pgClient.query(
    `
    INSERT INTO public.user_roles (profile_id, role_id)
    VALUES ($1, 'student_affairs_admin')
    ON CONFLICT (profile_id, role_id) DO NOTHING
  `,
    [userId]
  );

  const cats = await pgClient.query(
    'select count(*)::int as n from public.complaint_categories'
  );

  await pgClient.end();

  console.log('Staff ready:');
  console.log('  email   :', STAFF_EMAIL);
  console.log('  password:', STAFF_PASSWORD);
  console.log('  role    : student_affairs_admin');
  console.log('Categories seeded:', cats.rows[0].n);
}

main().catch((err) => {
  console.error('Bootstrap failed:', err.message || err);
  process.exit(1);
});
