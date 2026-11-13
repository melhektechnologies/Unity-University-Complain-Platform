import { createAdminClient } from '../../lib/supabase/admin';
import {
  CreateComplaintSchema,
  type CreateComplaintInput,
} from '../../lib/validation/schemas';
import {
  generateTrackingReference,
  generateTrackingPasscode,
  hashPasscode,
} from '../../lib/tracking/credentials';
import { recordAuditLog } from '../../lib/audit/logger';

export interface SubmitComplaintResult {
  success: boolean;
  trackingNumber?: string;
  passcode?: string;
  error?: string;
  fieldErrors?: Record<string, string[]>;
}

function buildSubject(category: string, description: string): string {
  const cleaned = description.replace(/\s+/g, ' ').trim();
  const snippet = cleaned.length > 80 ? `${cleaned.slice(0, 77)}…` : cleaned;
  return `${category}: ${snippet}`.slice(0, 200);
}

export async function submitComplaintAction(
  rawInput: unknown,
  clientIp?: string
): Promise<SubmitComplaintResult> {
  const parseResult = CreateComplaintSchema.safeParse(rawInput);
  if (!parseResult.success) {
    return {
      success: false,
      error: 'Validation failed. Please review the highlighted fields.',
      fieldErrors: parseResult.error.flatten().fieldErrors,
    };
  }

  const input: CreateComplaintInput = parseResult.data;
  if (input.evidenceCount > 0 || !input.description) {
    return {
      success: false,
      error: 'Please submit attachments through the complaint evidence form.',
    };
  }
  const admin = createAdminClient();

  const trackingNumber = generateTrackingReference();
  const { cleartextPasscode } = generateTrackingPasscode();
  const trackingHash = hashPasscode(cleartextPasscode);

  try {
    const { data: categoryRow, error: categoryError } = await admin
      .from('complaint_categories')
      .select('id')
      .eq('name', input.category)
      .eq('is_active', true)
      .maybeSingle();

    if (categoryError || !categoryRow) {
      return { success: false, error: 'That category is not currently available. Choose another category.' };
    }

    const today = new Date().toISOString().slice(0, 10);

    const { data: complaint, error: complaintError } = await admin
      .from('complaints')
      .insert({
        tracking_number: trackingNumber,
        tracking_hash: trackingHash,
        privacy_type: 'IDENTIFIED',
        status: 'NEW',
        priority: 'MEDIUM',
        category_id: categoryRow.id,
        subject: buildSubject(input.category, input.description),
        description: input.description,
        incident_date: today,
        accused_party: null,
        sla_status: 'NORMAL',
      })
      .select('id, tracking_number')
      .single();

    if (complaintError || !complaint) {
      console.error('[SUBMISSION_ERROR]', complaintError?.message);
      return {
        success: false,
        error: 'An unexpected database error occurred while creating your complaint. Please try again.',
      };
    }

    const { error: identityError } = await admin.from('complaint_identities').insert({
      complaint_id: complaint.id,
      student_name: input.studentName,
      student_id_number: input.studentId,
      email: input.email?.trim() || '',
      phone: input.phone,
      is_confidential: false,
    });

    if (identityError) {
      console.error('[IDENTITY_INSERT_ERROR]', identityError.message);
      await admin.from('complaints').delete().eq('id', complaint.id);
      return {
        success: false,
        error: 'Failed to record student contact details. Submission aborted.',
      };
    }

    await recordAuditLog({
      actorRole: 'public_student',
      action: 'COMPLAINT_SUBMITTED',
      entityTable: 'complaints',
      entityId: complaint.id,
      afterState: {
        tracking_number: trackingNumber,
        category: input.category,
        status: 'NEW',
      },
      ipAddress: clientIp || null,
    });

    return {
      success: true,
      trackingNumber,
      passcode: cleartextPasscode,
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error during submission';
    console.error('[SUBMIT_ACTION_EXCEPTION]', message);
    return {
      success: false,
      error: 'Internal service error. Please try again later.',
    };
  }
}
