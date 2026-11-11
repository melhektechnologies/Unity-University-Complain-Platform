import { describe, expect, it } from 'vitest';
import { getAvailableStatusTransitions } from '@/features/complaints/workflow';
import { SYSTEM_ROLES, type StaffUserContext } from '@/lib/auth/roles';

function staff(roles: StaffUserContext['roles'], isActive = true): StaffUserContext {
  return {
    id: 'staff-1',
    email: 'staff@unity.edu.et',
    fullName: 'Unity Staff',
    departmentId: null,
    isActive,
    roles,
  };
}

describe('getAvailableStatusTransitions', () => {
  it('offers only status changes permitted by the staff role', () => {
    const reviewer = staff([SYSTEM_ROLES.COMPLAINT_REVIEWER]);

    expect(getAvailableStatusTransitions('IN_PROGRESS', reviewer)).toEqual(['AWAITING_RESPONSE']);
  });

  it('allows student affairs administrators to begin review', () => {
    const administrator = staff([SYSTEM_ROLES.STUDENT_AFFAIRS_ADMIN]);

    expect(getAvailableStatusTransitions('NEW', administrator)).toEqual(['UNDER_REVIEW']);
  });

  it('does not offer actions to inactive staff or for unknown statuses', () => {
    const administrator = staff([SYSTEM_ROLES.STUDENT_AFFAIRS_ADMIN], false);

    expect(getAvailableStatusTransitions('NEW', administrator)).toEqual([]);
    expect(getAvailableStatusTransitions('UNKNOWN', staff([SYSTEM_ROLES.STUDENT_AFFAIRS_ADMIN]))).toEqual([]);
  });
});
