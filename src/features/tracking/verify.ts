import { createAdminClient } from '../../lib/supabase/admin';
import {
  TrackingVerificationSchema,
  type TrackingVerificationInput,
} from '../../lib/validation/schemas';
import {
  verifyPasscode,
  defaultTrackingLimiter,
} from '../../lib/tracking/credentials';

export interface PublicComplaintUpdate {
  id: string;
  updateType: string;
  message: string;
  createdAt: string;
}

export interface PublicComplaintDetails {
  trackingNumber: string;
  status: string;
  privacyType: string;
  subject: string;
  incidentDate: string;
  createdAt: string;
  slaStatus: string;
  updates: PublicComplaintUpdate[];
}

export interface VerifyTrackingResult {
  success: boolean;
  data?: PublicComplaintDetails;
  error?: string;
  retryAfterSeconds?: number;
}

const GENERIC_NOT_FOUND_ERROR = 'No active complaint found matching these credentials.';

export async function verifyTrackingCredentialsAction(
  rawInput: unknown,
  clientIp = 'unknown-client'
): Promise<VerifyTrackingResult> {
  // 1. Rate Limiting Barrier (Max 5 attempts per 15 min window)
  const rateLimit = defaultTrackingLimiter.check(clientIp);
  if (!rateLimit.allowed) {
    return {
      success: false,
      error: `Too many failed tracking attempts. Please wait ${rateLimit.retryAfterSeconds || 900} seconds before trying again.`,
      retryAfterSeconds: rateLimit.retryAfterSeconds,
    };
  }

  // 2. Input Schema Validation
  const parseResult = TrackingVerificationSchema.safeParse(rawInput);
  if (!parseResult.success) {
    defaultTrackingLimiter.recordFailure(clientIp);
    return {
      success: false,
      error: GENERIC_NOT_FOUND_ERROR,
    };
  }

  const input: TrackingVerificationInput = parseResult.data;
  const admin = createAdminClient();

  try {
    // 3. Lookup Complaint by tracking_number (Airgapped from PII and internal notes)
    const { data: complaint, error } = await admin
      .from('complaints')
      .select('id, tracking_number, tracking_hash, status, privacy_type, subject, incident_date, created_at, sla_status')
      .eq('tracking_number', input.trackingNumber.toUpperCase())
      .single();

    if (error || !complaint) {
      defaultTrackingLimiter.recordFailure(clientIp);
      return {
        success: false,
        error: GENERIC_NOT_FOUND_ERROR,
      };
    }

    // 4. Constant-Time Passcode Cryptographic Hash Verification
    const isValid = verifyPasscode(input.passcode, complaint.tracking_hash);
    if (!isValid) {
      defaultTrackingLimiter.recordFailure(clientIp);
      return {
        success: false,
        error: GENERIC_NOT_FOUND_ERROR,
      };
    }

    // 5. Success — Reset Rate Limit Failure Counter
    defaultTrackingLimiter.recordSuccess(clientIp);

    // 6. Fetch Approved Public Updates Only (AIRGAP: Never fetch internal_notes)
    const { data: updates } = await admin
      .from('complaint_updates')
      .select('id, update_type, message, created_at')
      .eq('complaint_id', complaint.id)
      .eq('is_public', true)
      .order('created_at', { ascending: true });

    const publicUpdates: PublicComplaintUpdate[] = (updates || []).map((u) => ({
      id: u.id,
      updateType: u.update_type,
      message: u.message,
      createdAt: u.created_at,
    }));

    return {
      success: true,
      data: {
        trackingNumber: complaint.tracking_number,
        status: complaint.status,
        privacyType: complaint.privacy_type,
        subject: complaint.subject,
        incidentDate: complaint.incident_date,
        createdAt: complaint.created_at,
        slaStatus: complaint.sla_status,
        updates: publicUpdates,
      },
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown tracking error';
    console.error('[TRACKING_VERIFY_ERROR]', message);
    return {
      success: false,
      error: GENERIC_NOT_FOUND_ERROR,
    };
  }
}

