import { z } from 'zod';
import { COMPLAINT_CATEGORIES } from '@/lib/complaints/categories';
import { COMPLAINT_STATUSES } from '@/lib/complaints/status';

export const ComplaintStatusEnum = z.enum(COMPLAINT_STATUSES);
export type ComplaintStatus = z.infer<typeof ComplaintStatusEnum>;

/**
 * Lean student intake: contact, category, and either meaningful text or evidence.
 * Email is optional — useful for follow-up, not required.
 */
export const CreateComplaintSchema = z.object({
  studentName: z
    .string()
    .trim()
    .min(2, 'Enter your full name')
    .max(150),
  studentId: z
    .string()
    .trim()
    .min(3, 'Enter your student ID')
    .max(50),
  phone: z
    .string()
    .trim()
    .min(9, 'Enter a valid phone number')
    .max(50),
  email: z
    .string()
    .trim()
    .email('Enter a valid email')
    .max(255)
    .optional()
    .or(z.literal('')),
  category: z.enum(COMPLAINT_CATEGORIES, {
    errorMap: () => ({ message: 'Please select a category' }),
  }),
  description: z.string().trim().max(5000).optional().default(''),
  evidenceCount: z.number().int().min(0).max(3).default(0),
}).superRefine((data, ctx) => {
  if (data.description && data.description.length > 0 && data.description.length < 20) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['description'],
      message: 'Add at least 20 characters, or leave this blank and attach evidence.',
    });
  }
  if (!data.description && data.evidenceCount === 0) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['description'],
      message: 'Describe the issue or attach a photo/voice recording.',
    });
  }
});

export type CreateComplaintInput = z.infer<typeof CreateComplaintSchema>;

export const TrackingVerificationSchema = z.object({
  trackingNumber: z
    .string()
    .trim()
    .regex(
      /^UU-\d{4}-[23456789ABCDEFGHJKMNPQRSTUVWXYZ]{6}$/i,
      'Invalid tracking reference format (e.g. UU-2026-X8M2KP)'
    ),
  passcode: z.string().trim().min(16, 'Passcode must be at least 16 characters').max(36),
});

export type TrackingVerificationInput = z.infer<typeof TrackingVerificationSchema>;

export const StatusTransitionSchema = z.object({
  complaintId: z.string().uuid(),
  toStatus: ComplaintStatusEnum,
  reason: z.string().min(5).max(1000).optional(),
});
