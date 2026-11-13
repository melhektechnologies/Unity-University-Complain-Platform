import { createServerSupabaseClient } from '../../../lib/supabase/server';
import { createAdminClient } from '../../../lib/supabase/admin';
import { recordAuditLog } from '../../../lib/audit/logger';
import { SYSTEM_ROLES, type StaffUserContext, type SystemRole } from '../../../lib/auth/roles';

export interface SignInResult {
  success: boolean;
  error?: string;
  redirectTo?: string;
}

export async function signInStaffAction(
  formData: FormData,
  clientIp?: string
): Promise<SignInResult> {
  const email = (formData.get('email') as string)?.trim().toLowerCase();
  const password = formData.get('password') as string;

  if (!email || !password) {
    return { success: false, error: 'Email and password are required.' };
  }

  const supabase = await createServerSupabaseClient();

  // 1. Authenticate with Supabase Auth
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (authError || !authData.user) {
    return {
      success: false,
      error: 'Invalid institutional credentials. Please check your email and password.',
    };
  }

  // Active profile and Student Affairs role are both required for the CMS.
  const staff = await getStudentAffairsContext();
  if (!staff) {
    await supabase.auth.signOut();
    return {
      success: false,
      error: 'This account is not authorized for the Student Affairs workspace.',
    };
  }

  const admin = createAdminClient();

  // 3. Update last_login_at
  await admin
    .from('profiles')
    .update({ last_login_at: new Date().toISOString() })
    .eq('id', staff.id);

  // 4. Audit Successful Login
  await recordAuditLog({
    actorProfileId: staff.id,
    actorRole: SYSTEM_ROLES.STUDENT_AFFAIRS_ADMIN,
    action: 'STAFF_LOGIN_SUCCESS',
    entityTable: 'profiles',
    entityId: staff.id,
    ipAddress: clientIp || null,
  });

  return {
    success: true,
    redirectTo: '/admin/dashboard',
  };
}

export async function signOutStaffAction(profileId?: string): Promise<{ success: boolean }> {
  const supabase = await createServerSupabaseClient();
  await supabase.auth.signOut();

  if (profileId) {
    await recordAuditLog({
      actorProfileId: profileId,
      actorRole: 'staff',
      action: 'STAFF_LOGOUT',
      entityTable: 'profiles',
      entityId: profileId,
    });
  }

  return { success: true };
}

/**
 * Server-side helper to load the active authenticated staff profile and roles.
 * Use getStudentAffairsContext for every CMS page and mutation.
 */
export async function getCurrentStaffContext(): Promise<StaffUserContext | null> {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  const admin = createAdminClient();

  const { data: profile } = await admin
    .from('profiles')
    .select('id, full_name, email, department_id, is_active')
    .eq('id', user.id)
    .single();

  if (!profile || !profile.is_active) {
    return null;
  }

  const { data: userRoles, error: rolesError } = await admin
    .from('user_roles')
    .select('role_id')
    .eq('profile_id', profile.id);

  if (rolesError) return null;

  const roles = (userRoles || []).map((r) => r.role_id as SystemRole);

  return {
    id: profile.id,
    email: profile.email,
    fullName: profile.full_name,
    departmentId: profile.department_id,
    isActive: profile.is_active,
    roles,
  };
}

/** Return a context only for an active profile assigned to the MVP CMS role. */
export async function getStudentAffairsContext(): Promise<StaffUserContext | null> {
  const staff = await getCurrentStaffContext();
  if (!staff || !staff.roles.includes(SYSTEM_ROLES.STUDENT_AFFAIRS_ADMIN)) return null;
  return staff;
}

