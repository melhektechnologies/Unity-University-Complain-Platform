import { describe, it, expect } from 'vitest';
import {
  SYSTEM_ROLES,
  CAPABILITIES,
  type StaffUserContext,
} from '../../src/lib/auth/roles';
import {
  hasCapability,
  requireCapability,
  canAccessComplaint,
  canAccessIdentity,
  canAccessInternalNotes,
  isHandlerAccused,
  AuthorizationError,
} from '../../src/lib/auth/guards';

describe('Role-Based Access Control & Capability Matrix', () => {
  const adminUser: StaffUserContext = {
    id: 'user-admin-01',
    email: 'admin@unity.edu.et',
    fullName: 'Sara Haile',
    departmentId: null,
    isActive: true,
    roles: [SYSTEM_ROLES.STUDENT_AFFAIRS_ADMIN],
  };

  const reviewerUser: StaffUserContext = {
    id: 'user-rev-01',
    email: 'reviewer@unity.edu.et',
    fullName: 'Yonas Tadesse',
    departmentId: null,
    isActive: true,
    roles: [SYSTEM_ROLES.COMPLAINT_REVIEWER],
  };

  const handlerCs: StaffUserContext = {
    id: 'user-handler-cs',
    email: 'cs.handler@unity.edu.et',
    fullName: 'Dr. Girma Bekele',
    departmentId: 'dept-computer-science',
    isActive: true,
    roles: [SYSTEM_ROLES.DEPARTMENT_HANDLER],
  };

  const escalationOfficer: StaffUserContext = {
    id: 'user-esc-01',
    email: 'dean.students@unity.edu.et',
    fullName: 'Dr. Almaz Tefera',
    departmentId: null,
    isActive: true,
    roles: [SYSTEM_ROLES.ESCALATION_OFFICER],
  };

  const systemAdmin: StaffUserContext = {
    id: 'user-sysadmin',
    email: 'sysadmin@unity.edu.et',
    fullName: 'Tekle Wolde',
    departmentId: null,
    isActive: true,
    roles: [SYSTEM_ROLES.SYSTEM_ADMIN],
  };

  const auditor: StaffUserContext = {
    id: 'user-auditor',
    email: 'audit@unity.edu.et',
    fullName: 'Meron Assefa',
    departmentId: null,
    isActive: true,
    roles: [SYSTEM_ROLES.AUDITOR],
  };

  const deactivatedUser: StaffUserContext = {
    id: 'user-deactivated',
    email: 'former.staff@unity.edu.et',
    fullName: 'Former Staff Member',
    departmentId: 'dept-computer-science',
    isActive: false, // DEACTIVATED
    roles: [SYSTEM_ROLES.DEPARTMENT_HANDLER],
  };

  it('rejects all capabilities immediately for deactivated staff accounts', () => {
    expect(hasCapability(deactivatedUser, CAPABILITIES.VIEW_UNRESTRICTED_COMPLAINTS)).toBe(false);
    expect(() => requireCapability(deactivatedUser, CAPABILITIES.VIEW_UNRESTRICTED_COMPLAINTS)).toThrowError(
      AuthorizationError
    );
  });

  it('enforces System Admin zero-access policy to complaint narratives', () => {
    const complaint = {
      id: 'c-01',
      departmentId: 'dept-computer-science',
      isRestrictedSensitive: false,
      accusedParty: null,
    };

    expect(canAccessComplaint(systemAdmin, complaint)).toBe(false);
    expect(hasCapability(systemAdmin, CAPABILITIES.VIEW_UNRESTRICTED_COMPLAINTS)).toBe(false);
    expect(hasCapability(systemAdmin, CAPABILITIES.MANAGE_TAXONOMY)).toBe(true);
    expect(hasCapability(systemAdmin, CAPABILITIES.MANAGE_STAFF_ROLES)).toBe(true);
  });

  it('permits Student Affairs Admin and Reviewer to view all unrestricted complaints', () => {
    const complaint = {
      id: 'c-02',
      departmentId: 'dept-finance',
      isRestrictedSensitive: false,
      accusedParty: null,
    };

    expect(canAccessComplaint(adminUser, complaint)).toBe(true);
    expect(canAccessComplaint(reviewerUser, complaint)).toBe(true);
    expect(canAccessComplaint(auditor, complaint)).toBe(true);
  });

  it('enforces Department Handler cross-department isolation', () => {
    const csComplaint = {
      id: 'c-cs-01',
      departmentId: 'dept-computer-science', // Matches handlerCs.departmentId
      isRestrictedSensitive: false,
      accusedParty: null,
    };

    const financeComplaint = {
      id: 'c-fin-01',
      departmentId: 'dept-finance', // Different department
      isRestrictedSensitive: false,
      accusedParty: null,
    };

    expect(canAccessComplaint(handlerCs, csComplaint)).toBe(true);
    expect(canAccessComplaint(handlerCs, financeComplaint)).toBe(false);
  });

  it('enforces Conflict of Interest: Handler cannot view complaints citing them as accused', () => {
    const complaintAgainstGirma = {
      id: 'c-conflict-01',
      departmentId: 'dept-computer-science',
      isRestrictedSensitive: false,
      accusedParty: 'Dr. Girma Bekele', // Handler's exact name
    };

    expect(isHandlerAccused(handlerCs, complaintAgainstGirma.accusedParty)).toBe(true);
    expect(canAccessComplaint(handlerCs, complaintAgainstGirma)).toBe(false);

    // Other authorized staff (Admin, Escalation Officer) CAN still access
    expect(canAccessComplaint(adminUser, complaintAgainstGirma)).toBe(true);
    expect(canAccessComplaint(escalationOfficer, complaintAgainstGirma)).toBe(true);
  });

  it('quarantines Sensitive/Restricted complaints strictly to Escalation Officers', () => {
    const sensitiveHarassmentCase = {
      id: 'c-sens-01',
      departmentId: 'dept-computer-science',
      isRestrictedSensitive: true, // Sensitive auto-quarantine flag
      accusedParty: 'Senior Professor',
    };

    expect(canAccessComplaint(handlerCs, sensitiveHarassmentCase)).toBe(false);
    expect(canAccessComplaint(reviewerUser, sensitiveHarassmentCase)).toBe(false);
    expect(canAccessComplaint(adminUser, sensitiveHarassmentCase)).toBe(false);
    expect(canAccessComplaint(auditor, sensitiveHarassmentCase)).toBe(false);
    expect(canAccessComplaint(systemAdmin, sensitiveHarassmentCase)).toBe(false);

    // ONLY Escalation Officer has access
    expect(canAccessComplaint(escalationOfficer, sensitiveHarassmentCase)).toBe(true);
  });

  it('enforces Confidential Student Identity protection', () => {
    const complaint = {
      departmentId: 'dept-computer-science',
      isRestrictedSensitive: false,
      accusedParty: null,
    };

    const confidentialIdentity = { isConfidential: true };
    const identifiedIdentity = { isConfidential: false };

    // Identified: Admin, Escalation Officer, Reviewer, and assigned Handler can see
    expect(canAccessIdentity(adminUser, complaint, identifiedIdentity)).toBe(true);
    expect(canAccessIdentity(escalationOfficer, complaint, identifiedIdentity)).toBe(true);
    expect(canAccessIdentity(reviewerUser, complaint, identifiedIdentity)).toBe(true);
    expect(canAccessIdentity(handlerCs, complaint, identifiedIdentity)).toBe(true);

    // Confidential: Handler and Reviewer are STRICTLY BLOCKED; only Admin and Escalation Officer can see
    expect(canAccessIdentity(handlerCs, complaint, confidentialIdentity)).toBe(false);
    expect(canAccessIdentity(reviewerUser, complaint, confidentialIdentity)).toBe(false);
    expect(canAccessIdentity(adminUser, complaint, confidentialIdentity)).toBe(true);
    expect(canAccessIdentity(escalationOfficer, complaint, confidentialIdentity)).toBe(true);
  });

  it('enforces Internal Notes Airgap and restricted note protections', () => {
    const complaint = {
      departmentId: 'dept-computer-science',
      isRestrictedSensitive: false,
      accusedParty: null,
    };

    const standardNote = { isRestricted: false };
    const restrictedNote = { isRestricted: true };

    // Standard internal note: Admin, Escalation, Auditor, and Department Handler can view
    expect(canAccessInternalNotes(adminUser, complaint, standardNote)).toBe(true);
    expect(canAccessInternalNotes(escalationOfficer, complaint, standardNote)).toBe(true);
    expect(canAccessInternalNotes(handlerCs, complaint, standardNote)).toBe(true);

    // Restricted internal note (e.g. legal deliberations): ONLY Escalation Officer can view
    expect(canAccessInternalNotes(adminUser, complaint, restrictedNote)).toBe(false);
    expect(canAccessInternalNotes(handlerCs, complaint, restrictedNote)).toBe(false);
    expect(canAccessInternalNotes(escalationOfficer, complaint, restrictedNote)).toBe(true);
  });
});

