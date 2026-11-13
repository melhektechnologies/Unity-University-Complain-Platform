import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getStudentAffairsContext } from '@/features/staff/auth/actions';
import { recordAuditLog } from '@/lib/audit/logger';
import { createServerClient } from '@/lib/supabase/server';

const PublicUpdateSchema = z.object({
  message: z.string().trim().min(10).max(2000),
});

export async function POST(
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

  const parsed = PublicUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: 'Write a message of at least 10 characters.' },
      { status: 422 }
    );
  }

  const supabase = await createServerClient();
  const { data: complaint, error: complaintError } = await supabase
    .from('complaints')
    .select('id, status')
    .eq('id', params.id)
    .maybeSingle();

  if (complaintError || !complaint) {
    return NextResponse.json({ success: false, error: 'Complaint not found.' }, { status: 404 });
  }
  if (complaint.status === 'CLOSED') {
    return NextResponse.json(
      { success: false, error: 'This complaint is closed and cannot receive new updates.' },
      { status: 409 }
    );
  }

  const { data: update, error: insertError } = await supabase
    .from('complaint_updates')
    .insert({
      complaint_id: params.id,
      author_profile_id: staff.id,
      update_type: 'OFFICIAL_UPDATE',
      message: parsed.data.message,
      is_public: true,
    })
    .select('id')
    .single();

  if (insertError || !update) {
    return NextResponse.json(
      { success: false, error: 'The message could not be saved. Please try again.' },
      { status: 500 }
    );
  }

  await recordAuditLog({
    actorProfileId: staff.id,
    actorRole: 'student_affairs_admin',
    action: 'PUBLIC_UPDATE_SENT',
    entityTable: 'complaint_updates',
    entityId: update.id,
    afterState: { complaint_id: params.id },
  });

  return NextResponse.json({ success: true });
}
