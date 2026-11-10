import {
  SYSTEM_ROLES,
  ROLE_CAPABILITIES,
  type SystemRole,
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
  complaint: {
    id: string;
    departmentId: string;
    isRestrictedSensitive: boolean;
    accusedParty: string | null;
  }
): boolean {
  if (!user.isActive) {
    return false;
  }

  // System admin has zero access to complaint contents by design
  if (user.roles.length === 1 && user.roles[0] === SYSTEM_ROLES.SYSTEM_ADMIN) {
    return false;
  }

  // Restricted Sensitive: ONLY escalation officers
  if (complaint.isRestrictedSensitive) {
    return user.roles.includes(SYSTEM_ROLES.ESCALATION_OFFICER);
  }

  // Escalation Officer, Admin, Reviewer, Auditor can view all non-restricted
  const unrestrictedRoles: SystemRole[] = [
    SYSTEM_ROLES.ESCALATION_OFFICER,
    SYSTEM_ROLES.STUDENT_AFFAIRS_ADMIN,
    SYSTEM_ROLES.COMPLAINT_REVIEWER,
    SYSTEM_ROLES.AUDITOR,
  ];
  if (user.roles.some((r) => unrestrictedRoles.includes(r))) {
    return true;
  }

  // Department Handler: only assigned department, AND not cited as accused party
  if (user.roles.includes(SYSTEM_ROLES.DEPARTMENT_HANDLER)) {
    if (user.departmentId !== complaint.departmentId) {
      return false;
    }
    if (isHandlerAccused(user, complaint.accusedParty)) {
      return false; // Conflict of interest quarantine
    }
    return true;
  }

  return false;
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
  if (!user.isActive) {
    return false;
  }

  // Confidential complaints: ONLY Student Affairs Admin and Escalation Officer
  const confidentialRoles: SystemRole[] = [
    SYSTEM_ROLES.STUDENT_AFFAIRS_ADMIN,
    SYSTEM_ROLES.ESCALATION_OFFICER,
  ];
  if (identity.isConfidential) {
    return user.roles.some((r) => confidentialRoles.includes(r));
  }

  // Non-confidential (Identified):
  // Admins, Escalation Officers, and Reviewers can view
  const identifiedRoles: SystemRole[] = [
    SYSTEM_ROLES.STUDENT_AFFAIRS_ADMIN,
    SYSTEM_ROLES.ESCALATION_OFFICER,
    SYSTEM_ROLES.COMPLAINT_REVIEWER,
  ];
  if (user.roles.some((r) => identifiedRoles.includes(r))) {
    return true;
  }

  // Department Handler can view ONLY if non-restricted, matches department, and NOT accused
  if (user.roles.includes(SYSTEM_ROLES.DEPARTMENT_HANDLER)) {
    if (complaint.isRestrictedSensitive) {
      return false;
    }
    if (user.departmentId !== complaint.departmentId) {
      return false;
    }
    if (isHandlerAccused(user, complaint.accusedParty)) {
      return false;
    }
    return true;
  }

  return false;
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
  if (!user.isActive) {
    return false;
  }

  // If the note itself is restricted: ONLY escalation officers
  if (note.isRestricted) {
    return user.roles.includes(SYSTEM_ROLES.ESCALATION_OFFICER);
  }

  // If the complaint is sensitive: ONLY escalation officers
  if (complaint.isRestrictedSensitive) {
    return user.roles.includes(SYSTEM_ROLES.ESCALATION_OFFICER);
  }

  // Admins, Escalation Officers, Reviewers, Auditors see all non-restricted notes
  const notesRoles: SystemRole[] = [
    SYSTEM_ROLES.STUDENT_AFFAIRS_ADMIN,
    SYSTEM_ROLES.ESCALATION_OFFICER,
    SYSTEM_ROLES.COMPLAINT_REVIEWER,
    SYSTEM_ROLES.AUDITOR,
  ];
  if (user.roles.some((r) => notesRoles.includes(r))) {
    return true;
  }

  // Department Handlers see notes for their department if not accused
  if (user.roles.includes(SYSTEM_ROLES.DEPARTMENT_HANDLER)) {
    if (user.departmentId !== complaint.departmentId) {
      return false;
    }
    if (isHandlerAccused(user, complaint.accusedParty)) {
      return false;
    }
    return true;
  }

  return false;
}
