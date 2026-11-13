import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getStudentAffairsContext } from '@/features/staff/auth/actions';
import { recordAuditLog } from '@/lib/audit/logger';
import { availableStatusTransitions, COMPLAINT_STATUSES } from '@/lib/complaints/status';
import { createServerClient } from '@/lib/supabase/server';

const StatusSchema = z.object({ toStatus: z.enum(COMPLAINT_STATUSES) });

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const staff = await getStudentAffairsContext();
  if (!staff) {
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
    return NextResponse.json({ success: false, error: 'Invalid status.' }, { status: 422 });
  }

  const supabase = await createServerClient();
  const { data: complaint, error: readError } = await supabase
    .from('complaints')
    .select('id, status')
    .eq('id', params.id)
    .maybeSingle();

  if (readError || !complaint) {
    return NextResponse.json({ success: false, error: 'Complaint not found.' }, { status: 404 });
  }

  if (!availableStatusTransitions(complaint.status).includes(parsed.data.toStatus)) {
    return NextResponse.json(
      { success: false, error: 'That status change is not available for this complaint.' },
      { status: 409 }
    );
  }

  // The database trigger writes exactly one immutable status-history row.
  // The authenticated client keeps the update inside the officer's RLS scope.
  const { data: updated, error: updateError } = await supabase
    .from('complaints')
    .update({ status: parsed.data.toStatus })
    .eq('id', params.id)
    .eq('status', complaint.status)
    .select('id')
    .maybeSingle();

  if (updateError || !updated) {
    return NextResponse.json(
      { success: false, error: 'The complaint changed before this update. Refresh and try again.' },
      { status: 409 }
    );
  }

  await recordAuditLog({
    actorProfileId: staff.id,
    actorRole: 'student_affairs_admin',
    action: 'STATUS_CHANGED',
    entityTable: 'complaints',
    entityId: params.id,
    beforeState: { status: complaint.status },
    afterState: { status: parsed.data.toStatus },
  });

  return NextResponse.json({ success: true });
}
