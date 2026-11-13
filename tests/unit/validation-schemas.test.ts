import { describe, it, expect } from 'vitest';
import {
  CreateComplaintSchema,
  TrackingVerificationSchema,
  StatusTransitionSchema,
} from '../../src/lib/validation/schemas';

describe('CreateComplaintSchema Validation', () => {
  it('validates a lean identified campus complaint', () => {
    const payload = {
      studentName: 'Abebe Bikila',
      studentId: 'UU/12345/18',
      phone: '+251911223344',
      email: 'abebe@unity.edu.et',
      category: 'Grading & Academic Evaluation',
      description:
        'The mid-term exam marks were calculated with a 10% penalty that was never announced in the syllabus.',
    };

    const result = CreateComplaintSchema.safeParse(payload);
    expect(result.success).toBe(true);
  });

  it('allows omitting optional email', () => {
    const payload = {
      studentName: 'Abebe Bikila',
      studentId: 'UU/12345/18',
      phone: '+251911223344',
      email: '',
      category: 'Facilities, Laboratories & Library',
      description: 'Multiple workstations in Lab 2 are missing functional power adapters today.',
    };

    const result = CreateComplaintSchema.safeParse(payload);
    expect(result.success).toBe(true);
  });

  it('rejects missing student contact fields', () => {
    const payload = {
      studentName: '',
      studentId: '',
      phone: '',
      category: 'Facilities, Laboratories & Library',
      description: 'Multiple workstations in Lab 2 are missing functional power adapters.',
    };

    const result = CreateComplaintSchema.safeParse(payload);
    expect(result.success).toBe(false);
  });

  it('rejects unknown categories', () => {
    const payload = {
      studentName: 'Abebe Bikila',
      studentId: 'UU/12345/18',
      phone: '+251911223344',
      category: 'Not a real category',
      description: 'This should fail because the category is not in the approved campus list.',
    };

    const result = CreateComplaintSchema.safeParse(payload);
    expect(result.success).toBe(false);
  });

  it('rejects descriptions that are too short', () => {
    const payload = {
      studentName: 'Abebe Bikila',
      studentId: 'UU/12345/18',
      phone: '+251911223344',
      category: 'General Feedback & Other Inquiries',
      description: 'Too short',
    };

    const result = CreateComplaintSchema.safeParse(payload);
    expect(result.success).toBe(false);
  });
});

describe('TrackingVerificationSchema', () => {
  it('accepts a valid tracking pair', () => {
    const result = TrackingVerificationSchema.safeParse({
      trackingNumber: 'UU-2026-X8M2KP',
      passcode: 'abcdefghijklmnop',
    });
    expect(result.success).toBe(true);
  });

  it('rejects a malformed tracking number', () => {
    const result = TrackingVerificationSchema.safeParse({
      trackingNumber: 'BAD-REF',
      passcode: 'abcdefghijklmnop',
    });
    expect(result.success).toBe(false);
  });
});

describe('StatusTransitionSchema', () => {
  it('accepts lean status values', () => {
    const result = StatusTransitionSchema.safeParse({
      complaintId: '123e4567-e89b-12d3-a456-426614174000',
      toStatus: 'UNDER_REVIEW',
      reason: 'Starting review',
    });
    expect(result.success).toBe(true);
  });

  it('rejects removed complex statuses', () => {
    const result = StatusTransitionSchema.safeParse({
      complaintId: '123e4567-e89b-12d3-a456-426614174000',
      toStatus: 'ESCALATED',
    });
    expect(result.success).toBe(false);
  });
});
