import { createServerClient } from '@/lib/supabase/server';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatDate, formatRelativeTime } from '@/lib/utils';
import { ComplaintStatusPanel } from './status-panel';

const STATUS_BADGE: Record<string, string> = {
  NEW: 'submitted',
  UNDER_REVIEW: 'under-review',
  ASSIGNED: 'assigned',
  IN_PROGRESS: 'in-progress',
  AWAITING_RESPONSE: 'pending-info',
  ESCALATED: 'escalated',
  RESOLVED: 'resolved',
  CLOSED: 'closed',
};

const STATUS_LABEL: Record<string, string> = {
  NEW: 'New',
  UNDER_REVIEW: 'Under Review',
  ASSIGNED: 'Assigned',
  IN_PROGRESS: 'In Progress',
  AWAITING_RESPONSE: 'Awaiting Response',
  ESCALATED: 'Escalated',
  RESOLVED: 'Resolved',
  CLOSED: 'Closed',
};

export default async function ComplaintDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const supabase = await createServerClient();

  const { data: complaint, error } = await supabase
    .from('complaints')
    .select(`
      id,
      tracking_number,
      subject,
      description,
      status,
      priority,
      privacy_type,
      incident_date,
      accused_party,
      created_at,
      updated_at,
      complaint_categories(name),
      complaint_identities(
        student_name,
        student_id_number,
        email,
        phone
      ),
      complaint_updates(
        id,
        content,
        is_public,
        created_at
      ),
      complaint_status_history(
        id,
        from_status,
        to_status,
        reason,
        created_at
      )
    `)
    .eq('id', params.id)
    .single();

  if (error || !complaint) notFound();

  const identity = Array.isArray(complaint.complaint_identities)
    ? complaint.complaint_identities[0]
    : complaint.complaint_identities;

  const publicUpdates = (complaint.complaint_updates ?? []).filter(
    (u: { is_public: boolean }) => u.is_public
  );

  const internalNotes = (complaint.complaint_updates ?? []).filter(
    (u: { is_public: boolean }) => !u.is_public
  );

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Back */}
      <Link
        href="/admin/dashboard"
        className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-[#1B365D] transition-colors"
      >
        <ChevronLeft className="h-4 w-4" /> Back to Queue
      </Link>

      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <h1 className="text-lg font-bold text-[#1B365D] leading-tight">{complaint.subject}</h1>
          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
            <span className="font-mono font-medium">{complaint.tracking_number}</span>
            <span>·</span>
            <span>{(complaint.complaint_categories as unknown as { name: string } | null)?.name ?? 'Uncategorized'}</span>
            <span>·</span>
            <span>Submitted {formatRelativeTime(complaint.created_at)}</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={STATUS_BADGE[complaint.priority?.toLowerCase() === 'urgent' ? 'critical' : complaint.priority?.toLowerCase()] as Parameters<typeof Badge>[0]['variant']}>
            {complaint.priority}
          </Badge>
          <Badge variant={STATUS_BADGE[complaint.status] as Parameters<typeof Badge>[0]['variant']}>
            {STATUS_LABEL[complaint.status] ?? complaint.status}
          </Badge>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main column */}
        <div className="lg:col-span-2 space-y-4">
          {/* Description */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-slate-700">Complaint Description</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">
                {complaint.description}
              </p>
              {complaint.accused_party && (
                <div className="mt-4 pt-4 border-t border-slate-100">
                  <p className="text-xs font-semibold text-slate-500 mb-1">Person(s) Involved</p>
                  <p className="text-sm text-slate-700">{complaint.accused_party}</p>
                </div>
              )}
              <div className="mt-4 pt-4 border-t border-slate-100">
                <p className="text-xs font-semibold text-slate-500 mb-1">Incident Date</p>
                <p className="text-sm text-slate-700">
                  {complaint.incident_date
                    ? formatDate(complaint.incident_date)
                    : 'Not specified'}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Public updates */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-slate-700">
                Public Updates
                <span className="ml-2 text-xs font-normal text-slate-400">(visible to student)</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {publicUpdates.length === 0 ? (
                <p className="text-xs text-slate-400 italic">No public updates yet.</p>
              ) : (
                publicUpdates.map((u: { id: string; content: string; created_at: string }) => (
                  <div key={u.id} className="border-l-2 border-[#008080] pl-3 py-0.5">
                    <p className="text-xs text-slate-400 mb-0.5">{formatDate(u.created_at, { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                    <p className="text-sm text-slate-700">{u.content}</p>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          {/* Internal notes */}
          <Card className="border-amber-200 bg-amber-50/40">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-amber-800">
                Internal Notes
                <span className="ml-2 text-xs font-normal text-amber-600">(staff only — never shown to student)</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {internalNotes.length === 0 ? (
                <p className="text-xs text-amber-700/60 italic">No internal notes yet.</p>
              ) : (
                internalNotes.map((n: { id: string; content: string; created_at: string }) => (
                  <div key={n.id} className="border-l-2 border-amber-400 pl-3 py-0.5">
                    <p className="text-xs text-amber-700/60 mb-0.5">{formatDate(n.created_at, { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                    <p className="text-sm text-amber-900">{n.content}</p>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Status management panel (client component) */}
          <ComplaintStatusPanel
            complaintId={complaint.id}
            currentStatus={complaint.status}
          />

          {/* Student identity — only if not anonymous */}
          {identity && complaint.privacy_type !== 'ANONYMOUS' ? (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-slate-700">
                  Student Identity
                  {complaint.privacy_type === 'CONFIDENTIAL' && (
                    <span className="ml-2 text-[10px] font-normal bg-teal-100 text-teal-700 px-1.5 py-0.5 rounded">
                      Confidential
                    </span>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                {(identity as { student_name?: string }).student_name && (
                  <div>
                    <p className="text-xs text-slate-400">Name</p>
                    <p className="text-slate-700">{(identity as { student_name: string }).student_name}</p>
                  </div>
                )}
                {(identity as { student_id_number?: string }).student_id_number && (
                  <div>
                    <p className="text-xs text-slate-400">Student ID</p>
                    <p className="font-mono text-slate-700">{(identity as { student_id_number: string }).student_id_number}</p>
                  </div>
                )}
                {(identity as { email?: string }).email && (
                  <div>
                    <p className="text-xs text-slate-400">Email</p>
                    <a href={`mailto:${(identity as { email: string }).email}`} className="text-[#008080] hover:underline break-all">
                      {(identity as { email: string }).email}
                    </a>
                  </div>
                )}
                {(identity as { phone?: string }).phone && (
                  <div>
                    <p className="text-xs text-slate-400">Phone</p>
                    <p className="text-slate-700">{(identity as { phone: string }).phone}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          ) : complaint.privacy_type === 'ANONYMOUS' ? (
            <Card className="border-slate-200">
              <CardContent className="pt-4 pb-4">
                <p className="text-xs text-slate-500 italic">
                  Anonymous submission — no identity information was collected.
                </p>
              </CardContent>
            </Card>
          ) : null}

          {/* Status history */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-slate-700">Status History</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {(complaint.complaint_status_history ?? []).length === 0 ? (
                <p className="text-xs text-slate-400 italic">No history yet.</p>
              ) : (
                (complaint.complaint_status_history as Array<{
                  id: string;
                  from_status: string | null;
                  to_status: string;
                  reason: string | null;
                  created_at: string;
                }>)
                  .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
                  .map((h) => (
                    <div key={h.id} className="text-xs space-y-0.5">
                      <p className="text-slate-500">{formatRelativeTime(h.created_at)}</p>
                      <p className="text-slate-700">
                        {h.from_status
                          ? `${STATUS_LABEL[h.from_status] ?? h.from_status} → ${STATUS_LABEL[h.to_status] ?? h.to_status}`
                          : `Set to ${STATUS_LABEL[h.to_status] ?? h.to_status}`}
                      </p>
                      {h.reason && <p className="text-slate-400 italic">{h.reason}</p>}
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
