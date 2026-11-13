import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { notFound } from 'next/navigation';
import { formatRelativeTime } from '@/lib/utils';
import { FileText, AlertCircle, ChevronLeft, ChevronRight, Search } from 'lucide-react';
import {
  COMPLAINT_STATUSES,
  getStatusBadge,
  getStatusLabel,
  isLeanStatus,
  STATUS_LABEL,
  type PublicComplaintStatus,
} from '@/lib/complaints/status';
import { createServerClient } from '@/lib/supabase/server';
import { getStudentAffairsContext } from '@/features/staff/auth/actions';

const PAGE_SIZE = 25;
const STATUS_DATABASE_VALUES: Record<PublicComplaintStatus, string[]> = {
  NEW: ['NEW'],
  UNDER_REVIEW: ['UNDER_REVIEW', 'ASSIGNED', 'IN_PROGRESS', 'AWAITING_RESPONSE', 'ESCALATED', 'REOPENED'],
  RESOLVED: ['RESOLVED'],
  CLOSED: ['CLOSED'],
};

type ComplaintRow = {
  id: string;
  tracking_number: string;
  subject: string;
  status: string;
  created_at: string;
  complaint_categories: { name: string } | { name: string }[] | null;
  complaint_identities:
    | { student_name: string; student_id_number: string }
    | { student_name: string; student_id_number: string }[]
    | null;
};

function relatedOne<T>(value: T | T[] | null): T | null {
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

function makeHref(values: Record<string, string | undefined>): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(values)) if (value) params.set(key, value);
  const query = params.toString();
  return query ? `/admin/dashboard?${query}` : '/admin/dashboard';
}

export default async function AdminDashboardPage({
  searchParams,
}: {
  searchParams: { status?: string; q?: string; category?: string; page?: string };
}) {
  const staff = await getStudentAffairsContext();
  if (!staff) notFound();
  const supabase = await createServerClient();
  const requestedStatus = searchParams.status ?? '';
  const activeStatus: PublicComplaintStatus | '' = isLeanStatus(requestedStatus) ? requestedStatus : '';
  const queryText = (searchParams.q ?? '').trim().slice(0, 80);
  const safeSearch = queryText.replace(/[%_,]/g, '');
  const categoryId = (searchParams.category ?? '').trim();
  const parsedPage = Number.parseInt(searchParams.page ?? '1', 10);
  const page = Number.isFinite(parsedPage) && parsedPage > 0 ? parsedPage : 1;

  const categoriesPromise = supabase
    .from('complaint_categories')
    .select('id, name')
    .eq('is_active', true)
    .order('name');

  const countStatuses = [...COMPLAINT_STATUSES];
  const statusCountsPromise = Promise.all(
    countStatuses.map(async (status) => {
      const { count, error } = await supabase
        .from('complaints')
        .select('id', { count: 'exact', head: true })
        .in('status', STATUS_DATABASE_VALUES[status]);
      return [status, count ?? 0, Boolean(error)] as const;
    })
  );
  const totalCountPromise = supabase
    .from('complaints')
    .select('id', { count: 'exact', head: true });

  let matchingIds: string[] | null = null;
  let searchError = false;
  if (queryText) {
    if (!safeSearch) {
      matchingIds = [];
    } else {
    const [trackingMatches, identityMatches] = await Promise.all([
      supabase
        .from('complaints')
        .select('id')
        .ilike('tracking_number', `${safeSearch}%`)
        .limit(1000),
      supabase
        .from('complaint_identities')
        .select('complaint_id')
        .eq('student_id_number', safeSearch)
        .limit(1000),
    ]);
    searchError = Boolean(trackingMatches.error || identityMatches.error);
    matchingIds = [
      ...(trackingMatches.data ?? []).map((row) => row.id),
      ...(identityMatches.data ?? []).map((row) => row.complaint_id),
    ];
    matchingIds = [...new Set(matchingIds)];
    }
  }

  let query = supabase
    .from('complaints')
    .select(
      `
      id,
      tracking_number,
      subject,
      status,
      created_at,
      complaint_categories(name),
      complaint_identities(student_name, student_id_number)
    `,
      { count: 'exact' }
    )
    .order('created_at', { ascending: false })
    .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);

  if (activeStatus) query = query.in('status', STATUS_DATABASE_VALUES[activeStatus]);
  if (categoryId) query = query.eq('category_id', categoryId);
  if (matchingIds) {
    query = matchingIds.length
      ? query.in('id', matchingIds)
      : query.eq('id', '00000000-0000-0000-0000-000000000000');
  }

  const [queue, categoriesResult, statusCountEntries, totalCount] = await Promise.all([
    query,
    categoriesPromise,
    statusCountsPromise,
    totalCountPromise,
  ]);
  const complaints = (queue.data ?? []) as ComplaintRow[];
  const totalFiltered = queue.count ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalFiltered / PAGE_SIZE));
  const statusCounts = Object.fromEntries(
    statusCountEntries.map(([status, count]) => [status, count])
  ) as Record<PublicComplaintStatus, number>;
  const filters: Array<'' | PublicComplaintStatus> = ['', ...COMPLAINT_STATUSES];
  const hasError = Boolean(
    queue.error || categoriesResult.error || searchError || totalCount.error || statusCountEntries.some(([, , error]) => error)
  );
  const keepFilters = { q: queryText || undefined, category: categoryId || undefined };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-[#302E83]">Complaint queue</h1>
        <p className="mt-0.5 text-sm text-slate-500">
          Student Affairs · {activeStatus || categoryId || queryText ? totalFiltered : totalCount.count ?? 0} complaint
          {(activeStatus || categoryId || queryText ? totalFiltered : totalCount.count ?? 0) !== 1 ? 's' : ''}
        </p>
      </div>

      <form action="/admin/dashboard" method="GET" className="grid gap-3 rounded-lg border border-slate-200 bg-white p-3 sm:grid-cols-[1fr_220px_auto]">
        {activeStatus && <input type="hidden" name="status" value={activeStatus} />}
        <Input
          name="q"
          defaultValue={queryText}
          placeholder="Tracking reference or exact student ID"
          aria-label="Search tracking reference or student ID"
          maxLength={80}
        />
        <select
          name="category"
          defaultValue={categoryId}
          aria-label="Filter by category"
          className="h-9 rounded-md border border-input bg-white px-3 text-sm"
        >
          <option value="">All active categories</option>
          {(categoriesResult.data ?? []).map((category) => (
            <option key={category.id} value={category.id}>{category.name}</option>
          ))}
        </select>
        <Button type="submit" className="bg-[#302E83] text-white hover:bg-[#252367]">
          <Search className="mr-2 size-4" />Search
        </Button>
      </form>

      <div className="flex flex-wrap gap-2">
        {filters.map((status) => {
          const label = status === '' ? 'All' : STATUS_LABEL[status];
          const count = status === '' ? (totalCount.count ?? 0) : statusCounts[status];
          const isActive = activeStatus === status;
          return (
            <Link
              key={status || 'all'}
              href={makeHref({ ...keepFilters, status: status || undefined })}
              className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                isActive
                  ? 'border-[#302E83] bg-[#302E83] text-white'
                  : 'border-slate-300 bg-white text-slate-600 hover:border-[#302E83] hover:text-[#302E83]'
              }`}
            >
              {label}
              <span className={`${isActive ? 'bg-white/20' : 'bg-slate-100'} rounded-full px-1.5 text-[10px]`}>
                {count}
              </span>
            </Link>
          );
        })}
      </div>

      {hasError && (
        <div className="flex items-start gap-2 rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <AlertCircle className="mt-0.5 size-4 shrink-0" />
          The queue could not be loaded. Refresh the page or try again shortly.
        </div>
      )}

      {!hasError && complaints.length === 0 && (
        <Card><CardContent className="pb-10 pt-10 text-center">
          <FileText className="mx-auto mb-3 size-10 text-slate-300" />
          <p className="text-sm text-slate-500">No complaints match these filters.</p>
        </CardContent></Card>
      )}

      {!hasError && complaints.length > 0 && (
        <div className="space-y-2">
          {complaints.map((complaint) => {
            const identity = relatedOne(complaint.complaint_identities);
            const category = relatedOne(complaint.complaint_categories);
            return (
              <Link key={complaint.id} href={`/admin/complaints/${complaint.id}`}>
                <Card className="cursor-pointer border-slate-200 transition-all hover:border-[#302E83]/40 hover:shadow-sm">
                  <CardContent className="px-5 py-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <p className="line-clamp-1 text-sm font-semibold text-slate-800">{identity?.student_name ?? 'Student'}</p>
                        <p className="mt-0.5 line-clamp-1 text-xs text-slate-500">
                          {identity?.student_id_number ?? 'ID unavailable'} · {category?.name ?? 'Uncategorized'} · <span className="font-mono">{complaint.tracking_number}</span>
                        </p>
                        <p className="mt-2 line-clamp-1 text-xs text-slate-400">{complaint.subject}</p>
                      </div>
                      <div className="flex shrink-0 flex-col items-end gap-2">
                        <Badge variant={getStatusBadge(complaint.status) as Parameters<typeof Badge>[0]['variant']}>
                          {getStatusLabel(complaint.status)}
                        </Badge>
                        <span className="text-[11px] text-slate-400">{formatRelativeTime(complaint.created_at)}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      )}

      {!hasError && totalFiltered > 0 && (
        <nav aria-label="Complaint pages" className="flex items-center justify-between border-t border-slate-200 pt-4 text-sm">
          <span className="text-slate-500">Page {page} of {totalPages} · {totalFiltered} results</span>
          <div className="flex gap-2">
            <Link
              aria-disabled={page <= 1}
              className={`inline-flex items-center rounded border px-3 py-1.5 ${page <= 1 ? 'pointer-events-none opacity-40' : 'hover:border-[#302E83]'}`}
              href={makeHref({ ...keepFilters, status: activeStatus || undefined, page: page > 2 ? String(page - 1) : undefined })}
            ><ChevronLeft className="mr-1 size-4" />Previous</Link>
            <Link
              aria-disabled={page >= totalPages}
              className={`inline-flex items-center rounded border px-3 py-1.5 ${page >= totalPages ? 'pointer-events-none opacity-40' : 'hover:border-[#302E83]'}`}
              href={makeHref({ ...keepFilters, status: activeStatus || undefined, page: String(page + 1) })}
            >Next<ChevronRight className="ml-1 size-4" /></Link>
          </div>
        </nav>
      )}
    </div>
  );
}
