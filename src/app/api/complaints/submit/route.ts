import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import {
  generateTrackingReference,
  generateTrackingPasscode,
  hashPasscode,
} from '@/lib/tracking/credentials';
import { recordAuditLog } from '@/lib/audit/logger';
import { CreateComplaintSchema } from '@/lib/validation/schemas';
import { TrackingRateLimiter } from '@/lib/tracking/credentials';

const BUCKET = 'complaint-attachments';
const MAX_FILE_BYTES = 5 * 1024 * 1024;
const MAX_FILES = 3;
const submissionLimiter = new TrackingRateLimiter(5, 15 * 60 * 1000, 15 * 60 * 1000);
const MIME_EXTENSIONS: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'audio/ogg': 'ogg',
  'audio/webm': 'webm',
  'audio/mp4': 'm4a',
  'audio/mpeg': 'mp3',
};

function buildSubject(category: string, description: string): string {
  const cleaned = description.replace(/\s+/g, ' ').trim();
  if (!cleaned) return `${category}: Evidence submitted`.slice(0, 200);
  const snippet = cleaned.length > 80 ? `${cleaned.slice(0, 77)}…` : cleaned;
  return `${category}: ${snippet}`.slice(0, 200);
}

function safeFileName(name: string): string {
  const baseName = name.split(/[\\/]/).pop() || 'evidence';
  return baseName.replace(/[^A-Za-z0-9._ -]/g, '_').slice(0, 255) || 'evidence';
}

function hasValidSignature(mimeType: string, bytes: Uint8Array): boolean {
  if (mimeType === 'image/jpeg') return bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  if (mimeType === 'image/png') {
    return [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a].every((byte, i) => bytes[i] === byte);
  }
  if (mimeType === 'image/webp') {
    return String.fromCharCode(...bytes.slice(0, 4)) === 'RIFF' &&
      String.fromCharCode(...bytes.slice(8, 12)) === 'WEBP';
  }
  if (mimeType === 'audio/ogg') return String.fromCharCode(...bytes.slice(0, 4)) === 'OggS';
  if (mimeType === 'audio/webm') return bytes[0] === 0x1a && bytes[1] === 0x45 && bytes[2] === 0xdf && bytes[3] === 0xa3;
  if (mimeType === 'audio/mp4') return String.fromCharCode(...bytes.slice(4, 8)) === 'ftyp';
  if (mimeType === 'audio/mpeg') {
    return String.fromCharCode(...bytes.slice(0, 3)) === 'ID3' ||
      (bytes[0] === 0xff && (bytes[1] & 0xe0) === 0xe0);
  }
  return false;
}

function invalidEvidence(files: File[]): string | null {
  if (files.length > MAX_FILES) return 'Attach no more than 3 files.';
  let voiceCount = 0;
  for (const file of files) {
    if (!MIME_EXTENSIONS[file.type]) return 'Use JPEG, PNG, or WebP photos, or an approved audio file.';
    if (file.size <= 0 || file.size > MAX_FILE_BYTES) return 'Each attachment must be smaller than 5 MB.';
    if (file.type.startsWith('audio/')) voiceCount += 1;
  }
  if (voiceCount > 1) return 'Attach no more than one voice recording.';
  return null;
}

export async function POST(req: NextRequest) {
  const clientKey =
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    req.headers.get('x-real-ip') ||
    'unknown';
  const rateLimit = submissionLimiter.check(clientKey);
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { success: false, error: 'Too many submissions. Please wait before trying again.' },
      { status: 429 }
    );
  }
  submissionLimiter.recordFailure(clientKey);

  const contentLength = Number(req.headers.get('content-length') ?? '0');
  if (contentLength > 16 * 1024 * 1024) {
    return NextResponse.json({ success: false, error: 'The submission is too large.' }, { status: 413 });
  }

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json({ success: false, error: 'Invalid form submission.' }, { status: 400 });
  }

  const evidence = formData.getAll('evidence').filter((value): value is File => value instanceof File);
  const declaredEvidenceCount = Number(formData.get('evidenceCount') ?? evidence.length);
  const parsed = CreateComplaintSchema.safeParse({
    studentName: formData.get('studentName'),
    studentId: formData.get('studentId'),
    phone: formData.get('phone'),
    email: formData.get('email') ?? '',
    category: formData.get('category'),
    description: formData.get('description') ?? '',
    evidenceCount: declaredEvidenceCount,
  });

  if (!parsed.success || declaredEvidenceCount !== evidence.length) {
    return NextResponse.json(
      {
        success: false,
        error: 'Validation failed. Please review the highlighted fields.',
        fieldErrors: parsed.success ? {} : parsed.error.flatten().fieldErrors,
      },
      { status: 422 }
    );
  }

  const fileError = invalidEvidence(evidence);
  if (fileError) {
    return NextResponse.json({ success: false, error: fileError }, { status: 422 });
  }

  const filePayloads: Array<{ file: File; bytes: Uint8Array; extension: string; name: string }> = [];
  for (const file of evidence) {
    const bytes = new Uint8Array(await file.arrayBuffer());
    if (!hasValidSignature(file.type, bytes)) {
      return NextResponse.json(
        { success: false, error: 'An attachment does not match its declared file type.' },
        { status: 422 }
      );
    }
    filePayloads.push({
      file,
      bytes,
      extension: MIME_EXTENSIONS[file.type],
      name: safeFileName(file.name),
    });
  }

  const data = parsed.data;
  const admin = createAdminClient();
  const { data: categoryRow, error: categoryError } = await admin
    .from('complaint_categories')
    .select('id')
    .eq('name', data.category)
    .eq('is_active', true)
    .maybeSingle();

  if (categoryError || !categoryRow) {
    return NextResponse.json(
      { success: false, error: 'That category is not currently available. Choose another category.' },
      { status: 422 }
    );
  }

  const trackingNumber = generateTrackingReference();
  const { cleartextPasscode } = generateTrackingPasscode();
  const trackingHash = hashPasscode(cleartextPasscode);
  const description = data.description || null;

  const { data: complaint, error: insertError } = await admin
    .from('complaints')
    .insert({
      tracking_number: trackingNumber,
      tracking_hash: trackingHash,
      privacy_type: 'IDENTIFIED',
      status: 'NEW',
      priority: 'MEDIUM',
      category_id: categoryRow.id,
      subject: buildSubject(data.category, data.description),
      description,
      incident_date: new Date().toISOString().slice(0, 10),
      accused_party: null,
      sla_status: 'NORMAL',
    })
    .select('id')
    .single();

  if (insertError || !complaint) {
    console.error('[submit] complaint creation failed', insertError?.code ?? 'unknown');
    return NextResponse.json(
      { success: false, error: 'Failed to record your complaint. Please try again.' },
      { status: 500 }
    );
  }

  const { error: identityError } = await admin.from('complaint_identities').insert({
    complaint_id: complaint.id,
    student_name: data.studentName,
    student_id_number: data.studentId,
    email: data.email?.trim() || null,
    phone: data.phone,
    is_confidential: false,
  });

  if (identityError) {
    console.error('[submit] identity creation failed', identityError.code ?? 'unknown');
    await admin.from('complaints').delete().eq('id', complaint.id);
    return NextResponse.json(
      { success: false, error: 'Failed to record your contact details. Please try again.' },
      { status: 500 }
    );
  }

  const storedPaths: string[] = [];
  const attachmentRows = [];
  for (const { file, bytes, extension, name } of filePayloads) {
    const storagePath = `complaints/${complaint.id}/${crypto.randomUUID()}.${extension}`;
    const { error: uploadError } = await admin.storage.from(BUCKET).upload(storagePath, bytes, {
      contentType: file.type,
      cacheControl: '3600',
      upsert: false,
    });
    if (uploadError) {
      if (storedPaths.length) await admin.storage.from(BUCKET).remove(storedPaths);
      await admin.from('complaints').delete().eq('id', complaint.id);
      return NextResponse.json(
        { success: false, error: 'An attachment could not be saved. Please try again.' },
        { status: 500 }
      );
    }
    storedPaths.push(storagePath);
    attachmentRows.push({
      complaint_id: complaint.id,
      storage_path: storagePath,
      file_name: name,
      file_size_bytes: file.size,
      mime_type: file.type,
      is_internal_only: false,
    });
  }

  if (attachmentRows.length) {
    const { error: attachmentError } = await admin.from('complaint_attachments').insert(attachmentRows);
    if (attachmentError) {
      await admin.storage.from(BUCKET).remove(storedPaths);
      await admin.from('complaints').delete().eq('id', complaint.id);
      console.error('[submit] attachment metadata creation failed', attachmentError.code ?? 'unknown');
      return NextResponse.json(
        { success: false, error: 'The evidence could not be linked to your complaint. Please try again.' },
        { status: 500 }
      );
    }
  }

  await recordAuditLog({
    action: 'COMPLAINT_SUBMITTED',
    entityTable: 'complaints',
    entityId: complaint.id,
    actorRole: 'public_student',
    afterState: {
      trackingNumber,
      status: 'NEW',
      category: data.category,
      attachment_count: attachmentRows.length,
    },
    ipAddress: req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || undefined,
  });

  return NextResponse.json({ success: true, trackingNumber, passcode: cleartextPasscode });
}
