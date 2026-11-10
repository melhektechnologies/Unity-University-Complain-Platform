import { createServerClient } from '@/lib/supabase/server';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { formatRelativeTime } from '@/lib/utils';
import { FileText, AlertCircle } from 'lucide-react';

type ComplaintRow = {
  id: string;
  tracking_number: string;
  subject: string;
  status: string;
  priority: string;
  privacy_type: string;
  created_at: string;
  updated_at: string;
  complaint_categories: { name: string } | { name: string }[] | null;
};

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

const PRIORITY_BADGE: Record<string, string> = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
  URGENT: 'critical',
};

export default async function AdminDashboardPage({
  searchParams,
}: {
  searchParams: { status?: string; priority?: string };
}) {
  const supabase = await createServerClient();

  let query = supabase
    .from('complaints')
    .select(`
      id,
      tracking_number,
      subject,
      status,
      priority,
      privacy_type,
      created_at,
      updated_at,
      complaint_categories(name)
    `)
    .order('created_at', { ascending: false })
    .limit(100);

  if (searchParams.status) query = query.eq('status', searchParams.status);
  if (searchParams.priority) query = query.eq('priority', searchParams.priority);

  const { data: complaints, error } = await query;

  const statusCounts: Record<string, number> = {};
  if (complaints) {
    for (const c of complaints) {
      statusCounts[c.status] = (statusCounts[c.status] ?? 0) + 1;
    }
  }

  return (
    <div className="space-y-6">
      {/* Page heading */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-[#1B365D]">Complaint Queue</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            {complaints?.length ?? 0} complaint{complaints?.length !== 1 ? 's' : ''} total
          </p>
        </div>
      </div>

      {/* Status filter pills */}
      <div className="flex flex-wrap gap-2">
        {(['', 'NEW', 'UNDER_REVIEW', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'] as const).map((s) => {
          const label = s === '' ? 'All' : STATUS_LABEL[s] ?? s;
          const count = s === '' ? (complaints?.length ?? 0) : (statusCounts[s] ?? 0);
          const isActive = (searchParams.status ?? '') === s;
          return (
            <Link
              key={s}
              href={s ? `/admin/dashboard?status=${s}` : '/admin/dashboard'}
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border transition-colors ${isActive
                  ? 'bg-[#1B365D] text-white border-[#1B365D]'
                  : 'bg-white text-slate-600 border-slate-300 hover:border-[#1B365D] hover:text-[#1B365D]'
                }`}
            >
              {label}
              <span className={`${isActive ? 'bg-white/20' : 'bg-slate-100'} rounded-full px-1.5 py-0 text-[10px]`}>
                {count}
              </span>
            </Link>
          );
        })}
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-md p-4 text-sm text-red-700">
          <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
          Database error: {error.message}
        </div>
      )}

      {/* Complaint list */}
      {!error && complaints && complaints.length === 0 && (
        <Card>
          <CardContent className="pt-10 pb-10 text-center">
            <FileText className="h-10 w-10 text-slate-300 mx-auto mb-3" />
            <p className="text-sm text-slate-500">No complaints found.</p>
          </CardContent>
        </Card>
      )}

      {!error && complaints && complaints.length > 0 && (
        <div className="space-y-2">
          {(complaints as ComplaintRow[]).map((c) => (
            <Link key={c.id} href={`/admin/complaints/${c.id}`}>
              <Card className="border-slate-200 hover:border-[#1B365D]/40 hover:shadow-sm transition-all cursor-pointer">
                <CardContent className="py-4 px-5">
                  <div className="flex items-start gap-3">
                    {/* Priority dot */}
                    <div
                      className={`mt-1.5 w-2 h-2 rounded-full shrink-0 ${c.priority === 'URGENT' ? 'bg-red-500' :
                          c.priority === 'HIGH' ? 'bg-amber-500' :
                            c.priority === 'MEDIUM' ? 'bg-blue-400' : 'bg-slate-300'
                        }`}
                    />

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-slate-800 line-clamp-1">{c.subject}</p>
                          <p className="text-xs text-slate-500 mt-0.5">
                            {(Array.isArray(c.complaint_categories) ? c.complaint_categories[0]?.name : c.complaint_categories?.name) ?? 'Uncategorized'} ·{' '}
                            <span className="font-mono">{c.tracking_number}</span>
                          </p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <Badge variant={PRIORITY_BADGE[c.priority] as Parameters<typeof Badge>[0]['variant']} className="text-[10px]">
                            {c.priority}
                          </Badge>
                          <Badge variant={STATUS_BADGE[c.status] as Parameters<typeof Badge>[0]['variant']}>
                            {STATUS_LABEL[c.status] ?? c.status}
                          </Badge>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 mt-2 text-xs text-slate-400">
                        <span>Submitted {formatRelativeTime(c.created_at)}</span>
                        <span>·</span>
                        <span
                          className={`px-1.5 py-0 rounded text-[10px] font-medium ${c.privacy_type === 'ANONYMOUS' ? 'bg-slate-100 text-slate-500' :
                              c.privacy_type === 'CONFIDENTIAL' ? 'bg-teal-50 text-teal-700' :
                                'bg-blue-50 text-blue-700'
                            }`}
                        >
                          {c.privacy_type}
                        </span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
