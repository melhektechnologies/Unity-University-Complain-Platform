'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Search, AlertCircle, Loader2, Clock, CheckCircle2, Circle, ArrowUpCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn, formatDate, formatRelativeTime } from '@/lib/utils';

const TrackSchema = z.object({
  trackingNumber: z
    .string()
    .trim()
    .min(1, 'Please enter your tracking number')
    .regex(/^UU-\d{4}-[A-Z0-9]{6}$/i, 'Invalid format — should look like UU-2026-X8M2KP'),
  passcode: z.string().trim().min(8, 'Please enter your passcode'),
});

type TrackForm = z.infer<typeof TrackSchema>;

type ComplaintStatus =
  | 'NEW'
  | 'UNDER_REVIEW'
  | 'ASSIGNED'
  | 'IN_PROGRESS'
  | 'AWAITING_RESPONSE'
  | 'ESCALATED'
  | 'RESOLVED'
  | 'CLOSED';

interface StatusUpdate {
  status: ComplaintStatus;
  note: string;
  createdAt: string;
}

interface TrackingResult {
  trackingNumber: string;
  status: ComplaintStatus;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  subject: string;
  category: string;
  submittedAt: string;
  lastUpdatedAt: string;
  publicUpdates: StatusUpdate[];
}

const STATUS_CONFIG: Record<ComplaintStatus, { label: string; color: string; badgeVariant: string }> = {
  NEW: { label: 'Received', color: 'text-blue-600', badgeVariant: 'submitted' },
  UNDER_REVIEW: { label: 'Under Review', color: 'text-violet-600', badgeVariant: 'under-review' },
  ASSIGNED: { label: 'Assigned', color: 'text-amber-600', badgeVariant: 'assigned' },
  IN_PROGRESS: { label: 'In Progress', color: 'text-sky-600', badgeVariant: 'in-progress' },
  AWAITING_RESPONSE: { label: 'Awaiting Your Response', color: 'text-orange-600', badgeVariant: 'pending-info' },
  ESCALATED: { label: 'Escalated', color: 'text-red-600', badgeVariant: 'escalated' },
  RESOLVED: { label: 'Resolved', color: 'text-emerald-600', badgeVariant: 'resolved' },
  CLOSED: { label: 'Closed', color: 'text-gray-500', badgeVariant: 'closed' },
};

const STATUS_ORDER: ComplaintStatus[] = [
  'NEW', 'UNDER_REVIEW', 'ASSIGNED', 'IN_PROGRESS', 'RESOLVED', 'CLOSED',
];

export default function TrackComplaintPage() {
  const [result, setResult] = useState<TrackingResult | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const form = useForm<TrackForm>({
    resolver: zodResolver(TrackSchema),
    defaultValues: { trackingNumber: '', passcode: '' },
  });

  const { formState: { errors } } = form;

  async function onSubmit(data: TrackForm) {
    setIsLoading(true);
    setResult(null);
    setNotFound(false);
    setServerError(null);

    try {
      const res = await fetch('/api/complaints/track', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      const json = await res.json();

      if (res.status === 404 || (!json.success && json.notFound)) {
        setNotFound(true);
      } else if (!res.ok || !json.success) {
        setServerError(json.error ?? 'Could not look up your complaint. Please try again.');
      } else {
        setResult(json.data as TrackingResult);
      }
    } catch {
      setServerError('A network error occurred. Please check your connection and try again.');
    } finally {
      setIsLoading(false);
    }
  }

  const statusConfig = result ? STATUS_CONFIG[result.status] : null;

  return (
    <div className="space-y-6 max-w-lg mx-auto">
      <div>
        <h1 className="text-xl font-bold text-[#1B365D]">Track Your Complaint</h1>
        <p className="text-sm text-slate-500 mt-1">
          Enter the tracking number and passcode from your submission confirmation.
        </p>
      </div>

      {/* Lookup form */}
      <Card>
        <CardContent className="pt-5 space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="trackingNumber">Tracking Number</Label>
            <Input
              id="trackingNumber"
              placeholder="UU-2026-XXXXXX"
              className={cn('font-mono uppercase', errors.trackingNumber && 'border-red-400')}
              {...form.register('trackingNumber', {
                onChange: (e) => {
                  e.target.value = e.target.value.toUpperCase();
                },
              })}
            />
            {errors.trackingNumber && (
              <p className="text-xs text-red-600 flex items-center gap-1">
                <AlertCircle className="h-3 w-3" />{errors.trackingNumber.message}
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="passcode">Passcode</Label>
            <Input
              id="passcode"
              type="password"
              placeholder="Enter your passcode"
              className={errors.passcode ? 'border-red-400' : ''}
              {...form.register('passcode')}
            />
            {errors.passcode && (
              <p className="text-xs text-red-600 flex items-center gap-1">
                <AlertCircle className="h-3 w-3" />{errors.passcode.message}
              </p>
            )}
          </div>

          {serverError && (
            <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-md p-3 text-sm text-red-700">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              {serverError}
            </div>
          )}

          <Button
            type="button"
            onClick={form.handleSubmit(onSubmit)}
            disabled={isLoading}
            className="w-full bg-[#1B365D] hover:bg-[#2A4A7F] text-white"
          >
            {isLoading ? (
              <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Looking up…</>
            ) : (
              <><Search className="mr-2 h-4 w-4" />Look Up Complaint</>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Not found */}
      {notFound && (
        <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-lg p-4">
          <AlertCircle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-amber-800">No complaint found</p>
            <p className="text-xs text-amber-700 mt-0.5">
              Please double-check your tracking number and passcode exactly as they appeared on your confirmation page.
              Contact the Office of Student Affairs if you believe this is an error.
            </p>
          </div>
        </div>
      )}

      {/* Result */}
      {result && statusConfig && (
        <div className="space-y-4 animate-fade-in">
          {/* Status header */}
          <Card className="border-slate-200">
            <CardContent className="pt-5 pb-4">
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1 flex-1 min-w-0">
                  <p className="text-xs text-slate-500 font-mono">{result.trackingNumber}</p>
                  <p className="text-sm font-semibold text-slate-800 line-clamp-2">{result.subject}</p>
                  <p className="text-xs text-slate-500">{result.category}</p>
                </div>
                <Badge variant={statusConfig.badgeVariant as Parameters<typeof Badge>[0]['variant']}>
                  {statusConfig.label}
                </Badge>
              </div>
              <div className="mt-3 pt-3 border-t border-slate-100 flex flex-wrap gap-4 text-xs text-slate-500">
                <span>Submitted {formatRelativeTime(result.submittedAt)}</span>
                <span>Last updated {formatRelativeTime(result.lastUpdatedAt)}</span>
              </div>
            </CardContent>
          </Card>

          {/* Progress timeline */}
          <Card className="border-slate-200">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-slate-700">Case Progress</CardTitle>
            </CardHeader>
            <CardContent className="space-y-0">
              {STATUS_ORDER.map((s, i) => {
                const cfg = STATUS_CONFIG[s];
                const isCurrentStatus = s === result.status;
                const statusIdx = STATUS_ORDER.indexOf(result.status);
                const isPast = i < statusIdx;
                const isFuture = i > statusIdx;

                return (
                  <div key={s} className="flex gap-3">
                    {/* Timeline line + dot */}
                    <div className="flex flex-col items-center">
                      <div
                        className={cn(
                          'w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5',
                          isPast && 'bg-emerald-100 text-emerald-600',
                          isCurrentStatus && 'bg-[#1B365D] text-white',
                          isFuture && 'bg-slate-100 text-slate-300'
                        )}
                      >
                        {isPast ? (
                          <CheckCircle2 className="h-3 w-3" />
                        ) : isCurrentStatus ? (
                          <Clock className="h-3 w-3" />
                        ) : (
                          <Circle className="h-3 w-3" />
                        )}
                      </div>
                      {i < STATUS_ORDER.length - 1 && (
                        <div className={cn('w-0.5 flex-1 my-1 min-h-[16px]', isPast ? 'bg-emerald-200' : 'bg-slate-100')} />
                      )}
                    </div>
                    {/* Label */}
                    <div className="pb-4">
                      <p
                        className={cn(
                          'text-sm font-medium leading-tight',
                          isCurrentStatus ? cfg.color : isFuture ? 'text-slate-300' : 'text-slate-500'
                        )}
                      >
                        {cfg.label}
                        {isCurrentStatus && (
                          <span className="ml-2 text-xs font-normal text-slate-400">← Current</span>
                        )}
                      </p>
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>

          {/* Public updates */}
          {result.publicUpdates.length > 0 && (
            <Card className="border-slate-200">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-slate-700">Updates from Student Affairs</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {result.publicUpdates.map((update, i) => (
                  <div key={i} className="border-l-2 border-[#008080] pl-3 py-0.5">
                    <p className="text-xs text-slate-500 mb-0.5">{formatDate(update.createdAt, { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                    <p className="text-sm text-slate-700">{update.note}</p>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Awaiting response notice */}
          {result.status === 'AWAITING_RESPONSE' && (
            <div className="flex items-start gap-3 bg-orange-50 border border-orange-200 rounded-lg p-4">
              <ArrowUpCircle className="h-5 w-5 text-orange-600 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-orange-800">Your response is needed</p>
                <p className="text-xs text-orange-700 mt-0.5">
                  The Office of Student Affairs has requested additional information. Please check your
                  institutional email or contact the office directly with your tracking number.
                </p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

