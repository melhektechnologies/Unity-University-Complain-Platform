import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createAdminClient } from '@/lib/supabase/admin';
import { verifyPasscode } from '@/lib/tracking/credentials';

const TrackSchema = z.object({
  trackingNumber: z.string().trim().min(1),
  passcode: z.string().trim().min(1),
});

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ success: false, error: 'Invalid request.' }, { status: 400 });
  }

  const parsed = TrackSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ success: false, error: 'Invalid input.' }, { status: 422 });
  }

  const { trackingNumber, passcode } = parsed.data;
  const admin = createAdminClient();

  // Fetch complaint by tracking number (admin bypasses RLS intentionally here)
  const { data: complaint } = await admin
    .from('complaints')
    .select(`
      id,
      tracking_number,
      tracking_hash,
      subject,
      status,
      priority,
      privacy_type,
      created_at,
      updated_at,
      complaint_categories(name),
      complaint_updates(
        id,
        content,
        is_public,
        created_at
      )
    `)
    .eq('tracking_number', trackingNumber.toUpperCase())
    .maybeSingle();

  if (!complaint) {
    // Return 200 with notFound to avoid timing oracle (don't distinguish not-found vs wrong passcode)
    return NextResponse.json({ success: false, notFound: true }, { status: 200 });
  }

  // Verify passcode (timing-safe)
  const valid = verifyPasscode(passcode, complaint.tracking_hash as string);
  if (!valid) {
    return NextResponse.json({ success: false, notFound: true }, { status: 200 });
  }

  // Return only public-safe data — never return tracking_hash, internal notes
  const publicUpdates = ((complaint.complaint_updates as Array<{
    id: string;
    content: string;
    is_public: boolean;
    created_at: string;
  }>) ?? [])
    .filter((u) => u.is_public)
    .map((u) => ({
      status: complaint.status,
      note: u.content,
      createdAt: u.created_at,
    }));

  return NextResponse.json({
    success: true,
    data: {
      trackingNumber: complaint.tracking_number,
      status: complaint.status,
      priority: complaint.priority,
      subject: complaint.subject,
      category: (complaint.complaint_categories as unknown as { name: string } | null)?.name ?? 'General',
      submittedAt: complaint.created_at,
      lastUpdatedAt: complaint.updated_at,
      publicUpdates,
    },
  });
}
