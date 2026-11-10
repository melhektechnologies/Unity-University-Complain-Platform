import { describe, it, expect } from 'vitest';
import {
  CreateComplaintSchema,
  TrackingVerificationSchema,
  StatusTransitionSchema,
} from '../../src/lib/validation/schemas';

describe('CreateComplaintSchema Validation', () => {
  const validUuid = '123e4567-e89b-12d3-a456-426614174000';

  it('validates a correct Identified complaint payload', () => {
    const payload = {
      privacyType: 'IDENTIFIED',
      campusId: validUuid,
      facultyId: validUuid,
      departmentId: validUuid,
      categoryId: validUuid,
      subject: 'Discrepancy in Final Examination Grade Calculation',
      description: 'The mid-term exam marks were calculated with a 10% penalty that was never announced in syllabus.',
      incidentDate: '2026-05-10',
      accusedParty: 'Instructor Kebede',
      studentName: 'Abebe Bikila',
      studentIdNumber: 'UU/12345/18',
      email: 'abebe.b@unity.edu.et',
      phone: '+251911223344',
    };

    const result = CreateComplaintSchema.safeParse(payload);
    expect(result.success).toBe(true);
  });

  it('validates a correct Anonymous complaint without student identity fields', () => {
    const payload = {
      privacyType: 'ANONYMOUS',
      campusId: validUuid,
      facultyId: validUuid,
      departmentId: validUuid,
      categoryId: validUuid,
      subject: 'Broken Equipment in Computer Science Laboratory',
      description: 'Multiple workstations in Lab 2 are missing functional power adapters, preventing coursework.',
      incidentDate: '2026-05-01',
    };

    const result = CreateComplaintSchema.safeParse(payload);
    expect(result.success).toBe(true);
  });

  it('rejects Identified complaint when student name or ID is missing', () => {
    const payload = {
      privacyType: 'IDENTIFIED',
      campusId: validUuid,
      facultyId: validUuid,
      departmentId: validUuid,
      categoryId: validUuid,
      subject: 'Tuition Fee Payment System Error',
      description: 'The banking slip was submitted three days ago but the registration hold remains active.',
      incidentDate: '2026-05-01',
      // Missing studentName, studentIdNumber, email, phone
    };

    const result = CreateComplaintSchema.safeParse(payload);
    expect(result.success).toBe(false);
  });

  it('rejects incident dates in the future', () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 2);
    const dateStr = tomorrow.toISOString().split('T')[0];

    const payload = {
      privacyType: 'ANONYMOUS',
      campusId: validUuid,
      facultyId: validUuid,
      departmentId: validUuid,
      categoryId: validUuid,
      subject: 'Future Incident Test Case',
      description: 'This incident supposedly happened in the future which violates chronological constraints.',
      incidentDate: dateStr,
    };

    const result = CreateComplaintSchema.safeParse(payload);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toContain('future');
    }
  });

  it('rejects descriptions shorter than 20 characters', () => {
    const payload = {
      privacyType: 'ANONYMOUS',
      campusId: validUuid,
      facultyId: validUuid,
      departmentId: validUuid,
      categoryId: validUuid,
      subject: 'Valid Subject Line',
      description: 'Too short',
      incidentDate: '2026-05-01',
    };

    const result = CreateComplaintSchema.safeParse(payload);
    expect(result.success).toBe(false);
  });
});

describe('TrackingVerificationSchema Validation', () => {
  it('accepts valid tracking reference and passcode', () => {
    const result = TrackingVerificationSchema.safeParse({
      trackingNumber: 'UU-2026-X8M2KP',
      passcode: 'a7f2-9c1e-3b4d-8e6f',
    });
    expect(result.success).toBe(true);
  });

  it('rejects malformed tracking references', () => {
    const badRefs = ['12345', 'UU-20-ABC', 'COMPLAINT-999', 'UU-2026-'];
    for (const ref of badRefs) {
      const result = TrackingVerificationSchema.safeParse({
        trackingNumber: ref,
        passcode: 'a7f2-9c1e-3b4d-8e6f',
      });
      expect(result.success).toBe(false);
    }
  });
});

describe('StatusTransitionSchema Validation', () => {
  it('accepts valid UUID and recognized status enum', () => {
    const result = StatusTransitionSchema.safeParse({
      complaintId: '123e4567-e89b-12d3-a456-426614174000',
      toStatus: 'UNDER_REVIEW',
      reason: 'Preliminary screening completed by Student Affairs intake coordinator.',
    });
    expect(result.success).toBe(true);
  });

  it('rejects unrecognized lifecycle status strings', () => {
    const result = StatusTransitionSchema.safeParse({
      complaintId: '123e4567-e89b-12d3-a456-426614174000',
      toStatus: 'DELETED',
    });
    expect(result.success).toBe(false);
  });
});

