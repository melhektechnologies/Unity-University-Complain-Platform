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
  const admin = createAdminClient();

  // Generate bearer tracking credentials with 128 bits of entropy
  const trackingNumber = generateTrackingReference();
  const { cleartextPasscode } = generateTrackingPasscode();
  const trackingHash = hashPasscode(cleartextPasscode);

  try {
    // 1. Insert core complaint record (ZERO PII)
    const { data: complaint, error: complaintError } = await admin
      .from('complaints')
      .insert({
        tracking_number: trackingNumber,
        tracking_hash: trackingHash,
        privacy_type: input.privacyType,
        status: 'NEW',
        priority: 'MEDIUM',
        campus_id: input.campusId,
        faculty_id: input.facultyId,
        department_id: input.departmentId,
        category_id: input.categoryId,
        subject: input.subject,
        description: input.description,
        incident_date: input.incidentDate,
        accused_party: input.accusedParty || null,
        sla_status: 'NORMAL',
      })
      .select('id, tracking_number')
      .single();

    if (complaintError || !complaint) {
      console.error('[SUBMISSION_ERROR] Failed to insert complaint:', complaintError?.message);
      return {
        success: false,
        error: 'An unexpected database error occurred while creating your complaint. Please try again.',
      };
    }

    // 2. Decoupled Identity Storage (PII Airgap)
    if (input.privacyType === 'IDENTIFIED' || input.privacyType === 'CONFIDENTIAL') {
      const { error: identityError } = await admin
        .from('complaint_identities')
        .insert({
          complaint_id: complaint.id,
          student_name: input.studentName!,
          student_id_number: input.studentIdNumber!,
          email: input.email!,
          phone: input.phone!,
          is_confidential: input.privacyType === 'CONFIDENTIAL',
        });

      if (identityError) {
        console.error('[IDENTITY_INSERT_ERROR] Failed to insert decoupled PII:', identityError.message);
        // Rollback complaint record if identity insertion fails
        await admin.from('complaints').delete().eq('id', complaint.id);
        return {
          success: false,
          error: 'Failed to record student identity. Submission aborted to protect data integrity.',
        };
      }
    }

    // 3. Append-only Audit Log
    await recordAuditLog({
      actorRole: 'public_student',
      action: 'COMPLAINT_SUBMITTED',
      entityTable: 'complaints',
      entityId: complaint.id,
      afterState: {
        tracking_number: trackingNumber,
        privacy_type: input.privacyType,
        category_id: input.categoryId,
        department_id: input.departmentId,
      },
      // Never store IP address for anonymous complaints
      ipAddress: input.privacyType === 'ANONYMOUS' ? null : clientIp || null,
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

