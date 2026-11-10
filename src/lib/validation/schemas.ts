import { z } from 'zod';

export const PrivacyTypeEnum = z.enum(['IDENTIFIED', 'CONFIDENTIAL', 'ANONYMOUS']);
export type PrivacyType = z.infer<typeof PrivacyTypeEnum>;

export const ComplaintStatusEnum = z.enum([
  'NEW',
  'UNDER_REVIEW',
  'ASSIGNED',
  'IN_PROGRESS',
  'AWAITING_RESPONSE',
  'ESCALATED',
  'RESOLVED',
  'CLOSED',
  'REOPENED',
]);
export type ComplaintStatus = z.infer<typeof ComplaintStatusEnum>;

export const PriorityEnum = z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']);
export type Priority = z.infer<typeof PriorityEnum>;

/**
 * Validates complaint submission payload.
 * Anonymous submissions cannot have PII; Identified/Confidential must provide PII.
 */
export const CreateComplaintSchema = z
  .object({
    privacyType: PrivacyTypeEnum,
    campusId: z.string().uuid('Invalid campus identifier'),
    facultyId: z.string().uuid('Invalid faculty identifier'),
    departmentId: z.string().uuid('Invalid department identifier'),
    categoryId: z.string().uuid('Invalid category identifier'),
    subject: z.string().min(5, 'Subject must be at least 5 characters').max(200),
    description: z.string().min(20, 'Description must be at least 20 characters').max(5000),
    incidentDate: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, 'Incident date must be in YYYY-MM-DD format')
      .refine(
        (dateStr) => {
          const date = new Date(dateStr);
          const today = new Date();
          today.setHours(23, 59, 59, 999);
          return date <= today;
        },
        { message: 'Incident date cannot be in the future' }
      ),
    accusedParty: z.string().max(200).optional().nullable(),

    // Conditional student identity fields
    studentName: z.string().min(2).max(150).optional(),
    studentIdNumber: z.string().min(5).max(50).optional(),
    email: z.string().email('Invalid institutional email').optional(),
    phone: z.string().min(9).max(50).optional(),
  })
  .refine(
    (data) => {
      if (data.privacyType === 'IDENTIFIED' || data.privacyType === 'CONFIDENTIAL') {
        return !!data.studentName && !!data.studentIdNumber && !!data.email && !!data.phone;
      }
      return true;
    },
    {
      message: 'Student name, ID number, email, and phone are required for Identified and Confidential complaints',
      path: ['studentName'],
    }
  );

export type CreateComplaintInput = z.infer<typeof CreateComplaintSchema>;

/**
 * Schema for verifying public tracking bearer credentials
 */
export const TrackingVerificationSchema = z.object({
  trackingNumber: z
    .string()
    .trim()
    .regex(/^UU-\d{4}-[23456789ABCDEFGHJKMNPQRSTUVWXYZ]{6}$/i, 'Invalid tracking reference format (e.g. UU-2026-X8M2KP)'),
  passcode: z
    .string()
    .trim()
    .min(16, 'Passcode must be at least 16 characters')
    .max(36),
});

export type TrackingVerificationInput = z.infer<typeof TrackingVerificationSchema>;

/**
 * Schema for transitioning complaint lifecycle status
 */
export const StatusTransitionSchema = z.object({
  complaintId: z.string().uuid(),
  toStatus: ComplaintStatusEnum,
  reason: z.string().min(5, 'Reason must be provided').max(1000).optional(),
});

