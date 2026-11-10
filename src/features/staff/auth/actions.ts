import { createServerSupabaseClient } from '../../../lib/supabase/server';
import { createAdminClient } from '../../../lib/supabase/admin';
import { recordAuditLog } from '../../../lib/audit/logger';
import type { StaffUserContext, SystemRole } from '../../../lib/auth/roles';

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

  // 2. Disabled Account Handling (Query profile.is_active)
  const admin = createAdminClient();
  const { data: profile, error: profileError } = await admin
    .from('profiles')
    .select('id, full_name, is_active, department_id')
    .eq('id', authData.user.id)
    .single();

  if (profileError || !profile || !profile.is_active) {
    // Immediately invalidate session for deactivated accounts
    await supabase.auth.signOut();
    return {
      success: false,
      error: 'Your staff account has been deactivated. Please contact the System Administrator.',
    };
  }

  // 3. Update last_login_at
  await admin
    .from('profiles')
    .update({ last_login_at: new Date().toISOString() })
    .eq('id', profile.id);

  // 4. Audit Successful Login
  await recordAuditLog({
    actorProfileId: profile.id,
    actorRole: 'staff',
    action: 'STAFF_LOGIN_SUCCESS',
    entityTable: 'profiles',
    entityId: profile.id,
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
 * Returns null if not authenticated or if the profile is deactivated.
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

  const { data: userRoles } = await admin
    .from('user_roles')
    .select('role_id')
    .eq('profile_id', profile.id);

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

