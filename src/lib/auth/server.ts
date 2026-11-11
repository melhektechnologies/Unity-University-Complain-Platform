import type { StaffUserContext, SystemRole } from './roles';
import { SYSTEM_ROLES } from './roles';
import { createServerClient } from '@/lib/supabase/server';

type ServerSupabaseClient = Awaited<ReturnType<typeof createServerClient>>;

const validRoles = new Set<string>(Object.values(SYSTEM_ROLES));

export async function loadStaffUserContext(
  supabase: ServerSupabaseClient,
  userId: string
): Promise<StaffUserContext | null> {
  const [profileResult, roleResult] = await Promise.all([
    supabase
      .from('profiles')
      .select('id, full_name, email, department_id, is_active')
      .eq('id', userId)
      .maybeSingle(),
    supabase
      .from('user_roles')
      .select('role_id')
      .eq('profile_id', userId),
  ]);

  const profile = profileResult.data;
  if (profileResult.error || roleResult.error || !profile?.is_active) {
    return null;
  }

  const roles = (roleResult.data ?? [])
    .map(({ role_id }) => role_id)
    .filter((roleId): roleId is SystemRole => validRoles.has(roleId));

  if (roles.length === 0) {
    return null;
  }

  return {
    id: profile.id,
    email: profile.email,
    fullName: profile.full_name,
    departmentId: profile.department_id,
    isActive: profile.is_active,
    roles,
  };
}

export async function getCurrentStaffUserContext() {
  const supabase = await createServerClient();
  const { data: { user }, error } = await supabase.auth.getUser();

  if (error || !user) {
    return null;
  }

  const staff = await loadStaffUserContext(supabase, user.id);
  if (!staff) {
    return null;
  }

  return { supabase, user, staff };
}
