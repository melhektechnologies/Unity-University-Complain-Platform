import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { defaultTrackingLimiter, verifyPasscode } from '@/lib/tracking/credentials';
import { toPublicStatus } from '@/lib/complaints/status';
import { TrackingVerificationSchema } from '@/lib/validation/schemas';

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ success: false, error: 'Invalid request.' }, { status: 400 });
  }

  const parsed = TrackingVerificationSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ success: false, error: 'Invalid input.' }, { status: 422 });
  }

  const clientKey =
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    req.headers.get('x-real-ip') ||
    'unknown';

  const limit = defaultTrackingLimiter.check(clientKey);
  if (!limit.allowed) {
    return NextResponse.json(
      {
        success: false,
        error: `Too many attempts. Try again in ${limit.retryAfterSeconds ?? 900} seconds.`,
      },
      { status: 429 }
    );
  }

  const { trackingNumber, passcode } = parsed.data;
  const admin = createAdminClient();

  const { data: complaint } = await admin
    .from('complaints')
    .select(
      `
      id,
      tracking_number,
      tracking_hash,
      status,
      created_at,
      updated_at,
      complaint_categories(name),
      complaint_updates(
        id,
        message,
        is_public,
        created_at
      )
    `
    )
    .eq('tracking_number', trackingNumber.toUpperCase())
    .maybeSingle();

  // Same response for missing case / wrong passcode (no timing oracle).
  if (!complaint) {
    defaultTrackingLimiter.recordFailure(clientKey);
    return NextResponse.json({ success: false, notFound: true }, { status: 200 });
  }

  const valid = verifyPasscode(passcode, complaint.tracking_hash as string);
  if (!valid) {
    defaultTrackingLimiter.recordFailure(clientKey);
    return NextResponse.json({ success: false, notFound: true }, { status: 200 });
  }

  defaultTrackingLimiter.recordSuccess(clientKey);

  const category = Array.isArray(complaint.complaint_categories)
    ? complaint.complaint_categories[0]
    : complaint.complaint_categories;

  const publicUpdates = (
    (complaint.complaint_updates as Array<{
      id: string;
      message: string;
      is_public: boolean;
      created_at: string;
    }>) ?? []
  )
    .filter((u) => u.is_public)
    .sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    )
    .map((u) => ({
      note: u.message,
      createdAt: u.created_at,
    }));

  return NextResponse.json({
    success: true,
    data: {
      trackingNumber: complaint.tracking_number,
      status: toPublicStatus(complaint.status),
      category: (category as { name?: string } | null)?.name ?? 'General',
      submittedAt: complaint.created_at,
      lastUpdatedAt: complaint.updated_at,
      publicUpdates,
    },
  });
}
