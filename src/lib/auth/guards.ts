import {
  SYSTEM_ROLES,
  ROLE_CAPABILITIES,
  type Capability,
  type StaffUserContext,
} from './roles';

export class AuthorizationError extends Error {
  public readonly code: string;
  public readonly status: number;

  constructor(message: string, code = 'FORBIDDEN', status = 403) {
    super(message);
    this.name = 'AuthorizationError';
    this.code = code;
    this.status = status;
  }
}

/**
 * Validates whether a staff member has a specific capability.
 */
export function hasCapability(user: StaffUserContext, capability: Capability): boolean {
  if (!user.isActive) {
    return false;
  }

  for (const role of user.roles) {
    const roleCaps = ROLE_CAPABILITIES[role];
    if (roleCaps && roleCaps.includes(capability)) {
      return true;
    }
  }

  return false;
}

/**
 * Throws AuthorizationError if user does not have the capability.
 */
export function requireCapability(user: StaffUserContext, capability: Capability): void {
  if (!user.isActive) {
    throw new AuthorizationError('Account is deactivated. Access revoked.', 'ACCOUNT_DEACTIVATED', 401);
  }

  if (!hasCapability(user, capability)) {
    throw new AuthorizationError(
      `Access denied: Missing required capability [${capability}]`,
      'INSUFFICIENT_PRIVILEGES',
      403
    );
  }
}

/**
 * Checks whether a handler has a conflict of interest with a complaint.
 */
export function isHandlerAccused(user: StaffUserContext, accusedParty: string | null): boolean {
  if (!accusedParty || !user.fullName) {
    return false;
  }

  const cleanAccused = accusedParty.toLowerCase().trim();
  const cleanName = user.fullName.toLowerCase().trim();

  return cleanAccused.includes(cleanName) || cleanName.includes(cleanAccused);
}

/**
 * Determines whether a staff user can view a specific complaint record.
 */
export function canAccessComplaint(
  user: StaffUserContext,
  _complaint: {
    id: string;
    departmentId: string;
    isRestrictedSensitive: boolean;
    accusedParty: string | null;
  }
): boolean {
  // The one-officer MVP keeps every complaint inside the Student Affairs CMS.
  return user.isActive && user.roles.includes(SYSTEM_ROLES.STUDENT_AFFAIRS_ADMIN);
}

/**
 * Determines whether a staff user can view the decoupled PII identity for a complaint.
 */
export function canAccessIdentity(
  user: StaffUserContext,
  complaint: {
    departmentId: string;
    isRestrictedSensitive: boolean;
    accusedParty: string | null;
  },
  identity: {
    isConfidential: boolean;
  }
): boolean {
  void complaint;
  void identity;
  // Student Affairs is the sole CMS receiver in this MVP.
  return user.isActive && user.roles.includes(SYSTEM_ROLES.STUDENT_AFFAIRS_ADMIN);
}

/**
 * Determines whether a staff user can view an internal note (Airgap Rule).
 */
export function canAccessInternalNotes(
  user: StaffUserContext,
  complaint: {
    departmentId: string;
    isRestrictedSensitive: boolean;
    accusedParty: string | null;
  },
  note: {
    isRestricted: boolean;
  }
): boolean {
  void complaint;
  void note;
  // The one-officer MVP has no reviewer or department-handler case access.
  return user.isActive && user.roles.includes(SYSTEM_ROLES.STUDENT_AFFAIRS_ADMIN);
}
