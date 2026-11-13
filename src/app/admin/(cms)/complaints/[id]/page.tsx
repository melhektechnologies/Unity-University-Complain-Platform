import { createServerClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getStudentAffairsContext } from '@/features/staff/auth/actions';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatDate, formatRelativeTime } from '@/lib/utils';
import { ComplaintStatusPanel } from '@/components/admin/complaint-status-panel';
import {
  getStatusBadge,
  getStatusLabel,
} from '@/lib/complaints/status';

export default async function ComplaintDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const supabase = await createServerClient();
  const staff = await getStudentAffairsContext();
  if (!staff) notFound();

  const { data: complaint, error } = await supabase
    .from('complaints')
    .select(
      `
      id,
      tracking_number,
      subject,
      description,
      status,
      created_at,
      updated_at,
      complaint_categories(name),
      complaint_identities(
        student_name,
        student_id_number,
        phone,
        email
      ),
      complaint_updates(
        id,
        message,
        is_public,
        created_at
      ),
      complaint_status_history(
        id,
        from_status,
        to_status,
        created_at
      ),
      complaint_attachments(
        file_name,
        file_size_bytes,
        mime_type,
        storage_path,
        is_internal_only
      )
    `
    )
    .eq('id', params.id)
    .eq('complaint_updates.is_public', true)
    .eq('complaint_attachments.is_internal_only', false)
    .single();

  if (error || !complaint) notFound();

  const identity = Array.isArray(complaint.complaint_identities)
    ? complaint.complaint_identities[0]
    : complaint.complaint_identities;

  const category = Array.isArray(complaint.complaint_categories)
    ? complaint.complaint_categories[0]
    : complaint.complaint_categories;
  const admin = createAdminClient();
  const attachments = await Promise.all(
    (complaint.complaint_attachments ?? []).map(async (attachment: {
      file_name: string;
      file_size_bytes: number;
      mime_type: string;
      storage_path: string;
    }) => {
      const { data } = await admin.storage
        .from('complaint-attachments')
        .createSignedUrl(attachment.storage_path, 60);
      return { ...attachment, signedUrl: data?.signedUrl ?? null };
    })
  );

  const publicUpdates = (complaint.complaint_updates ?? []).filter(
    (u: { is_public: boolean }) => u.is_public
  );

  return (
    <div className="max-w-4xl space-y-6">
      <Link
        href="/admin/dashboard"
        className="inline-flex items-center gap-1 text-sm text-slate-500 transition-colors hover:text-[#302E83]"
      >
        <ChevronLeft className="size-4" /> Back to queue
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <h1 className="text-lg font-bold leading-tight text-[#302E83]">
            {(identity as { student_name?: string } | null)?.student_name ?? 'Complaint'}
          </h1>
          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
            <span className="font-mono font-medium">{complaint.tracking_number}</span>
            <span>·</span>
            <span>{(category as { name?: string } | null)?.name ?? 'Uncategorized'}</span>
            <span>·</span>
            <span>Submitted {formatRelativeTime(complaint.created_at)}</span>
          </div>
        </div>
        <Badge
          variant={
            getStatusBadge(complaint.status) as Parameters<typeof Badge>[0]['variant']
          }
        >
          {getStatusLabel(complaint.status)}
        </Badge>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-slate-700">Issue details</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-700">
                {complaint.description}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-slate-700">Evidence</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {attachments.length === 0 ? (
                <p className="text-xs italic text-slate-400">No evidence attached.</p>
              ) : (
                attachments.map((attachment, index) => (
                  <div key={`${attachment.storage_path}-${index}`} className="flex items-center justify-between gap-3 text-xs">
                    <span className="min-w-0 truncate text-slate-600">
                      {attachment.file_name} · {(attachment.file_size_bytes / (1024 * 1024)).toFixed(1)} MB
                    </span>
                    {attachment.signedUrl ? (
                      <a href={attachment.signedUrl} target="_blank" rel="noreferrer" className="shrink-0 font-medium text-primary underline">
                        Open
                      </a>
                    ) : (
                      <span className="shrink-0 text-slate-400">Unavailable</span>
                    )}
                  </div>
                ))
              )}
              <p className="text-[10px] text-slate-400">Evidence links expire after one minute.</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-slate-700">
                Updates to student
                <span className="ml-2 text-xs font-normal text-slate-400">
                  (visible when they track)
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {publicUpdates.length === 0 ? (
                <p className="text-xs italic text-slate-400">No updates yet.</p>
              ) : (
                publicUpdates.map((u: { id: string; message: string; created_at: string }) => (
                  <div key={u.id} className="border-l-2 border-primary/50 py-0.5 pl-3">
                    <p className="mb-0.5 text-xs text-slate-400">
                      {formatDate(u.created_at, {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </p>
                    <p className="text-sm text-slate-700">{u.message}</p>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

        </div>

        <div className="space-y-4">
          <ComplaintStatusPanel
            complaintId={complaint.id}
            currentStatus={complaint.status}
          />

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-slate-700">Student contact</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div>
                <p className="text-xs text-slate-400">Name</p>
                <p className="text-slate-700">
                  {(identity as { student_name?: string } | null)?.student_name ?? '—'}
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-400">Student ID</p>
                <p className="font-mono text-slate-700">
                  {(identity as { student_id_number?: string } | null)?.student_id_number ??
                    '—'}
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-400">Phone</p>
                {(identity as { phone?: string | null } | null)?.phone ? (
                  <a
                    href={`tel:${(identity as { phone: string }).phone}`}
                    className="text-primary hover:underline"
                  >
                    {(identity as { phone: string }).phone}
                  </a>
                ) : (
                  <p className="text-slate-700">—</p>
                )}
              </div>
              <div>
                <p className="text-xs text-slate-400">Email</p>
                {(identity as { email?: string | null } | null)?.email ? (
                  <a
                    href={`mailto:${(identity as { email: string }).email}`}
                    className="break-all text-primary hover:underline"
                  >
                    {(identity as { email: string }).email}
                  </a>
                ) : (
                  <p className="text-slate-700">—</p>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-slate-700">Status history</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {(complaint.complaint_status_history ?? []).length === 0 ? (
                <p className="text-xs italic text-slate-400">No history yet.</p>
              ) : (
                (
                  complaint.complaint_status_history as Array<{
                    id: string;
                    from_status: string | null;
                    to_status: string;
                    created_at: string;
                  }>
                )
                  .sort(
                    (a, b) =>
                      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
                  )
                  .map((history) => (
                    <div key={history.id} className="space-y-0.5 text-xs">
                      <p className="text-slate-500">
                        {formatRelativeTime(history.created_at)}
                      </p>
                      <p className="text-slate-700">
                        {history.from_status
                          ? `${getStatusLabel(history.from_status)} → ${getStatusLabel(history.to_status)}`
                          : `Set to ${getStatusLabel(history.to_status)}`}
                      </p>
                    </div>
                  ))
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
