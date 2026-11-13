import { createAdminClient } from '../../lib/supabase/admin';
import {
  TrackingVerificationSchema,
  type TrackingVerificationInput,
} from '../../lib/validation/schemas';
import {
  verifyPasscode,
  defaultTrackingLimiter,
} from '../../lib/tracking/credentials';
import { toPublicStatus } from '../../lib/complaints/status';

export interface PublicComplaintUpdate {
  message: string;
  createdAt: string;
}

export interface PublicComplaintDetails {
  trackingNumber: string;
  status: string;
  category: string;
  createdAt: string;
  updatedAt: string;
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
      .select('id, tracking_number, tracking_hash, status, created_at, updated_at, complaint_categories(name)')
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
      .select('message, created_at')
      .eq('complaint_id', complaint.id)
      .eq('is_public', true)
      .order('created_at', { ascending: true });

    const publicUpdates: PublicComplaintUpdate[] = (updates || []).map((u) => ({
      message: u.message,
      createdAt: u.created_at,
    }));

    const category = Array.isArray(complaint.complaint_categories)
      ? complaint.complaint_categories[0]
      : complaint.complaint_categories;

    return {
      success: true,
      data: {
        trackingNumber: complaint.tracking_number,
        status: toPublicStatus(complaint.status),
        category: category?.name ?? 'General',
        createdAt: complaint.created_at,
        updatedAt: complaint.updated_at,
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

