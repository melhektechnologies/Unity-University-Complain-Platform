import { createServerClient } from '@/lib/supabase/server';
import Link from 'next/link';
import { AlertCircle, ArrowUpRight, FileText, Search } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { formatRelativeTime } from '@/lib/utils';

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
  UNDER_REVIEW: 'Under review',
  ASSIGNED: 'Assigned',
  IN_PROGRESS: 'In progress',
  AWAITING_RESPONSE: 'Awaiting response',
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

const FILTER_STATUSES = ['', 'NEW', 'UNDER_REVIEW', 'ASSIGNED', 'IN_PROGRESS', 'AWAITING_RESPONSE', 'ESCALATED', 'RESOLVED', 'CLOSED'];

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
  const complaintRows = (complaints ?? []) as ComplaintRow[];
  const selectedStatus = searchParams.status ?? '';
  const visibleCount = complaintRows.length;

  return (
    <div className="mx-auto max-w-6xl space-y-7 sm:space-y-9">
      <section className="flex flex-col gap-5 border-b border-border pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary/70">Student Affairs · Case management</p>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">Complaint queue</h1>
          <p className="mt-2 max-w-xl text-sm leading-6 text-muted-foreground">Review recent submissions and open a case for details and available actions.</p>
        </div>
        <div className="flex items-center gap-3 rounded-xl border border-primary/10 bg-white px-4 py-3 shadow-sm">
          <span className="inline-flex size-10 items-center justify-center rounded-lg bg-university-gold-soft text-primary">
            <FileText aria-hidden="true" className="size-5" />
          </span>
          <div>
            <p className="text-lg font-semibold leading-5 text-slate-900">{visibleCount}</p>
            <p className="mt-1 text-xs text-muted-foreground">{selectedStatus ? 'matching cases in latest results' : 'recent cases shown'}</p>
          </div>
        </div>
      </section>

      <section aria-labelledby="queue-filters" className="space-y-3">
        <div className="flex items-center gap-2">
          <h2 id="queue-filters" className="text-sm font-semibold text-slate-800">Filter by status</h2>
          <span className="text-xs text-muted-foreground">· Latest 100 records</span>
        </div>
        <nav aria-label="Filter complaints by status" className="flex gap-2 overflow-x-auto pb-1">
          {FILTER_STATUSES.map((status) => {
            const label = status ? STATUS_LABEL[status] : 'All recent';
            const isActive = selectedStatus === status;
            return (
              <Link
                key={status || 'all'}
                href={status ? `/admin/dashboard?status=${status}` : '/admin/dashboard'}
                aria-current={isActive ? 'page' : undefined}
                className={`inline-flex min-h-9 shrink-0 items-center rounded-full border px-3 text-xs font-medium transition ${isActive
                  ? 'border-primary bg-primary text-white shadow-sm'
                  : 'border-slate-200 bg-white text-slate-600 hover:border-primary/30 hover:text-primary'
                }`}
              >
                {label}
              </Link>
            );
          })}
        </nav>
      </section>

      {error && (
        <div role="alert" className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <AlertCircle aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
          <div>
            <p className="font-semibold">The queue could not be loaded.</p>
            <p className="mt-1 text-xs">Please try again or contact your system administrator if the issue continues.</p>
          </div>
        </div>
      )}

      {!error && complaintRows.length === 0 && (
        <Card className="border-dashed border-primary/20 bg-white shadow-none">
          <CardContent className="flex flex-col items-center px-6 py-14 text-center">
            <span className="inline-flex size-12 items-center justify-center rounded-xl bg-university-gold-soft text-primary">
              {selectedStatus ? <Search aria-hidden="true" className="size-5" /> : <FileText aria-hidden="true" className="size-5" />}
            </span>
            <h2 className="mt-4 text-base font-semibold text-slate-900">{selectedStatus ? 'No matching complaints' : 'No complaints to review'}</h2>
            <p className="mt-1 max-w-sm text-sm leading-6 text-muted-foreground">{selectedStatus ? 'Try another status filter to see recent cases.' : 'New submissions will appear here when they are received.'}</p>
          </CardContent>
        </Card>
      )}

      {!error && complaintRows.length > 0 && (
        <section aria-label="Recent complaints" className="space-y-3">
          {complaintRows.map((complaint) => {
            const category = Array.isArray(complaint.complaint_categories)
              ? complaint.complaint_categories[0]?.name
              : complaint.complaint_categories?.name;
            const priorityColor = complaint.priority === 'URGENT'
              ? 'bg-red-500'
              : complaint.priority === 'HIGH'
                ? 'bg-amber-500'
                : complaint.priority === 'MEDIUM'
                  ? 'bg-blue-500'
                  : 'bg-slate-300';

            return (
              <Link key={complaint.id} href={`/admin/complaints/${complaint.id}`} className="group block rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2">
                <Card className="border-slate-200 bg-white shadow-none transition duration-200 group-hover:-translate-y-0.5 group-hover:border-primary/25 group-hover:shadow-md">
                  <CardContent className="flex items-start gap-4 p-4 sm:p-5">
                    <span className={`mt-1.5 size-2.5 shrink-0 rounded-full ${priorityColor}`} aria-label={`${complaint.priority.toLowerCase()} priority`} />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div className="min-w-0">
                          <h3 className="line-clamp-2 text-sm font-semibold leading-6 text-slate-900 transition group-hover:text-primary sm:text-base">{complaint.subject}</h3>
                          <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
                            <span>{category ?? 'Uncategorized'}</span>
                            <span aria-hidden="true">·</span>
                            <span className="font-mono">{complaint.tracking_number}</span>
                          </p>
                        </div>
                        <div className="flex shrink-0 flex-wrap gap-2">
                          <Badge variant={PRIORITY_BADGE[complaint.priority] as Parameters<typeof Badge>[0]['variant']}>
                            {complaint.priority.toLowerCase()}
                          </Badge>
                          <Badge variant={STATUS_BADGE[complaint.status] as Parameters<typeof Badge>[0]['variant']}>
                            {STATUS_LABEL[complaint.status] ?? complaint.status}
                          </Badge>
                        </div>
                      </div>
                      <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-2 border-t border-slate-100 pt-3 text-xs text-muted-foreground">
                        <span>Submitted {formatRelativeTime(complaint.created_at)}</span>
                        <span className={`rounded-full px-2 py-1 font-medium ${complaint.privacy_type === 'ANONYMOUS'
                          ? 'bg-slate-100 text-slate-600'
                          : complaint.privacy_type === 'CONFIDENTIAL'
                            ? 'bg-teal-50 text-teal-800'
                            : 'bg-university-gold-soft text-primary'
                        }`}>{complaint.privacy_type.toLowerCase()}</span>
                        <span className="ml-auto inline-flex items-center gap-1 font-medium text-primary opacity-0 transition group-hover:opacity-100 group-focus-visible:opacity-100">
                          Open case <ArrowUpRight aria-hidden="true" className="size-3.5" />
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </section>
      )}
    </div>
  );
}
