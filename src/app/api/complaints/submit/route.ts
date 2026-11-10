import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createAdminClient } from '@/lib/supabase/admin';
import {
  generateTrackingReference,
  generateTrackingPasscode,
  hashPasscode,
} from '@/lib/tracking/credentials';
import { recordAuditLog } from '@/lib/audit/logger';

const SubmitSchema = z.object({
  privacyType: z.enum(['IDENTIFIED', 'CONFIDENTIAL', 'ANONYMOUS']),
  category: z.string().min(1),
  subject: z.string().min(5).max(200),
  description: z.string().min(20).max(5000),
  incidentDate: z.string().min(1),
  accusedParty: z.string().max(200).optional(),
  studentName: z.string().optional(),
  studentId: z.string().optional(),
  email: z.string().optional(),
  phone: z.string().optional(),
});

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ success: false, error: 'Invalid JSON body.' }, { status: 400 });
  }

  const parsed = SubmitSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: 'Validation failed.', fieldErrors: parsed.error.flatten().fieldErrors },
      { status: 422 }
    );
  }

  const data = parsed.data;
  const isAnonymous = data.privacyType === 'ANONYMOUS';
  const admin = createAdminClient();

  // Validate identity fields for non-anonymous
  if (!isAnonymous && (!data.studentName || !data.studentId || !data.email)) {
    return NextResponse.json(
      { success: false, error: 'Name, student ID, and email are required.' },
      { status: 422 }
    );
  }

  const trackingNumber = generateTrackingReference();
  const { cleartextPasscode } = generateTrackingPasscode();
  const trackingHash = hashPasscode(cleartextPasscode);

  // Find or create category by name
  const { data: categoryRow } = await admin
    .from('complaint_categories')
    .select('id')
    .eq('name', data.category)
    .maybeSingle();

  const categoryId = categoryRow?.id ?? null;

  // Insert complaint record
  const { data: complaint, error: insertError } = await admin
    .from('complaints')
    .insert({
      tracking_number: trackingNumber,
      tracking_hash: trackingHash,
      privacy_type: data.privacyType,
      status: 'NEW',
      priority: 'MEDIUM',
      category_id: categoryId,
      subject: data.subject,
      description: data.description,
      incident_date: data.incidentDate,
      accused_party: data.accusedParty || null,
      sla_status: 'NORMAL',
    })
    .select('id')
    .single();

  if (insertError || !complaint) {
    console.error('[submit] insert error:', insertError);
    return NextResponse.json(
      { success: false, error: 'Failed to record your complaint. Please try again.' },
      { status: 500 }
    );
  }

  // Insert identity if not anonymous
  if (!isAnonymous && data.studentName && data.studentId && data.email) {
    await admin.from('complaint_identities').insert({
      complaint_id: complaint.id,
      student_name: data.studentName,
      student_id_number: data.studentId,
      email: data.email,
      phone: data.phone || null,
    });
  }

  // Audit log
  await recordAuditLog({
    action: 'COMPLAINT_SUBMITTED',
    entityTable: 'complaints',
    entityId: complaint.id,
    actorRole: 'anonymous',
    afterState: { trackingNumber, privacyType: data.privacyType, status: 'NEW' },
    ipAddress: req.headers.get('x-forwarded-for') ?? undefined,
  });

  return NextResponse.json({
    success: true,
    trackingNumber,
    passcode: cleartextPasscode,
  });
}
