import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createServerClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { recordAuditLog } from '@/lib/audit/logger';

const StatusSchema = z.object({
  toStatus: z.enum([
    'NEW', 'UNDER_REVIEW', 'ASSIGNED', 'IN_PROGRESS',
    'AWAITING_RESPONSE', 'ESCALATED', 'RESOLVED', 'CLOSED',
  ]),
  reason: z.string().max(1000).optional(),
  publicNote: z.string().max(2000).optional(),
});

// Valid state machine transitions
const TRANSITIONS: Record<string, string[]> = {
  NEW: ['UNDER_REVIEW'],
  UNDER_REVIEW: ['IN_PROGRESS', 'AWAITING_RESPONSE', 'ESCALATED', 'CLOSED'],
  ASSIGNED: ['IN_PROGRESS', 'AWAITING_RESPONSE', 'ESCALATED'],
  IN_PROGRESS: ['AWAITING_RESPONSE', 'RESOLVED', 'ESCALATED'],
  AWAITING_RESPONSE: ['IN_PROGRESS', 'RESOLVED', 'CLOSED'],
  ESCALATED: ['IN_PROGRESS', 'RESOLVED'],
  RESOLVED: ['CLOSED'],
  CLOSED: [],
};

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  // Auth check — must be signed-in staff
  const supabase = await createServerClient();
  const { data: { session } } = await supabase.auth.getSession();

  if (!session) {
    return NextResponse.json({ success: false, error: 'Unauthorized.' }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ success: false, error: 'Invalid JSON.' }, { status: 400 });
  }

  const parsed = StatusSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ success: false, error: 'Invalid input.' }, { status: 422 });
  }

  const { toStatus, reason, publicNote } = parsed.data;
  const admin = createAdminClient();

  // Fetch current status
  const { data: complaint } = await admin
    .from('complaints')
    .select('id, status')
    .eq('id', params.id)
    .single();

  if (!complaint) {
    return NextResponse.json({ success: false, error: 'Complaint not found.' }, { status: 404 });
  }

  // Validate transition
  const allowed = TRANSITIONS[complaint.status] ?? [];
  if (!allowed.includes(toStatus)) {
    return NextResponse.json(
      { success: false, error: `Cannot transition from ${complaint.status} to ${toStatus}.` },
      { status: 422 }
    );
  }

  // Update status
  const { error: updateError } = await admin
    .from('complaints')
    .update({ status: toStatus, updated_at: new Date().toISOString() })
    .eq('id', params.id);

  if (updateError) {
    return NextResponse.json({ success: false, error: 'Failed to update status.' }, { status: 500 });
  }

  // Record status history
  await admin.from('complaint_status_history').insert({
    complaint_id: params.id,
    from_status: complaint.status,
    to_status: toStatus,
    reason: reason || null,
    changed_by: session.user.id,
  });

  // Add public note if provided
  if (publicNote?.trim()) {
    await admin.from('complaint_updates').insert({
      complaint_id: params.id,
      content: publicNote.trim(),
      is_public: true,
      author_id: session.user.id,
    });
  }

  // Add internal note if reason provided (also save as internal note)
  if (reason?.trim()) {
    await admin.from('complaint_updates').insert({
      complaint_id: params.id,
      content: reason.trim(),
      is_public: false,
      author_id: session.user.id,
    });
  }

  // Audit
  await recordAuditLog({
    actorProfileId: session.user.id,
    actorRole: 'staff',
    action: 'STATUS_CHANGED',
    entityTable: 'complaints',
    entityId: params.id,
    beforeState: { status: complaint.status },
    afterState: { status: toStatus },
  });

  return NextResponse.json({ success: true });
}
