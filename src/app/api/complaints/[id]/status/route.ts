import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createAdminClient } from '@/lib/supabase/admin';
import { getCurrentStaffUserContext } from '@/lib/auth/server';
import { canAccessComplaint, hasCapability } from '@/lib/auth/guards';
import { CAPABILITIES } from '@/lib/auth/roles';
import {
  COMPLAINT_STATUSES,
  STATUS_CAPABILITIES,
  STATUS_TRANSITIONS,
  type ComplaintStatus,
} from '@/features/complaints/workflow';
import { recordAuditLog } from '@/lib/audit/logger';

const StatusSchema = z.object({
  toStatus: z.enum(COMPLAINT_STATUSES),
  reason: z.string().max(1000).optional(),
  publicNote: z.string().max(2000).optional(),
});


export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
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

  const staffSession = await getCurrentStaffUserContext();
  if (!staffSession) {
    return NextResponse.json({ success: false, error: 'Unauthorized.' }, { status: 401 });
  }

  const { staff } = staffSession;
  const { toStatus, reason, publicNote } = parsed.data;

  if (!hasCapability(staff, STATUS_CAPABILITIES[toStatus])) {
    return NextResponse.json({ success: false, error: 'You are not allowed to make this status change.' }, { status: 403 });
  }
  if (reason?.trim() && !hasCapability(staff, CAPABILITIES.WRITE_INTERNAL_NOTES)) {
    return NextResponse.json({ success: false, error: 'You are not allowed to add an internal note.' }, { status: 403 });
  }
  if (publicNote?.trim() && !hasCapability(staff, CAPABILITIES.PUBLISH_PUBLIC_UPDATE)) {
    return NextResponse.json({ success: false, error: 'You are not allowed to publish a student update.' }, { status: 403 });
  }

  const admin = createAdminClient();
  const { data: complaint, error: complaintError } = await admin
    .from('complaints')
    .select('id, status, department_id, is_restricted_sensitive, accused_party')
    .eq('id', params.id)
    .maybeSingle();

  if (complaintError) {
    return NextResponse.json({ success: false, error: 'Could not load the complaint.' }, { status: 500 });
  }
  if (!complaint) {
    return NextResponse.json({ success: false, error: 'Complaint not found.' }, { status: 404 });
  }

  const canAccess = canAccessComplaint(staff, {
    id: complaint.id,
    departmentId: complaint.department_id,
    isRestrictedSensitive: complaint.is_restricted_sensitive,
    accusedParty: complaint.accused_party,
  });
  if (!canAccess) {
    return NextResponse.json({ success: false, error: 'You are not allowed to access this complaint.' }, { status: 403 });
  }

  const currentStatus = complaint.status as ComplaintStatus;
  if (!STATUS_TRANSITIONS[currentStatus]?.includes(toStatus)) {
    return NextResponse.json(
      { success: false, error: `Cannot transition from ${currentStatus} to ${toStatus}.` },
      { status: 422 }
    );
  }

  const { error: updateError } = await admin
    .from('complaints')
    .update({ status: toStatus, updated_at: new Date().toISOString() })
    .eq('id', params.id);

  if (updateError) {
    return NextResponse.json({ success: false, error: 'Failed to update status.' }, { status: 500 });
  }

  const { error: historyError } = await admin.from('complaint_status_history').insert({
    complaint_id: params.id,
    from_status: currentStatus,
    to_status: toStatus,
    reason: reason || null,
    changed_by: staff.id,
  });
  if (historyError) {
    return NextResponse.json({ success: false, error: 'Status changed, but the history could not be recorded. Contact an administrator.' }, { status: 500 });
  }

  if (publicNote?.trim()) {
    await admin.from('complaint_updates').insert({
      complaint_id: params.id,
      content: publicNote.trim(),
      is_public: true,
      author_id: staff.id,
    });
  }

  if (reason?.trim()) {
    await admin.from('complaint_updates').insert({
      complaint_id: params.id,
      content: reason.trim(),
      is_public: false,
      author_id: staff.id,
    });
  }

  await recordAuditLog({
    actorProfileId: staff.id,
    actorRole: 'staff',
    action: 'STATUS_CHANGED',
    entityTable: 'complaints',
    entityId: params.id,
    beforeState: { status: currentStatus },
    afterState: { status: toStatus },
  });

  return NextResponse.json({ success: true });
}
