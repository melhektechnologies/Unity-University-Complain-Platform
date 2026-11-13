'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Search,
  AlertCircle,
  Loader2,
  Clock,
  CheckCircle2,
  Circle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn, formatDate, formatRelativeTime } from '@/lib/utils';
import {
  STATUS_BADGE,
  STATUS_LABEL,
  STATUS_TIMELINE,
  toPublicStatus,
  timelineIndex,
  type PublicComplaintStatus,
} from '@/lib/complaints/status';

const TrackSchema = z.object({
  trackingNumber: z
    .string()
    .trim()
    .min(1, 'Please enter your tracking number')
    .regex(/^UU-\d{4}-[23456789ABCDEFGHJKMNPQRSTUVWXYZ]{6}$/i, 'Invalid format — should look like UU-2026-X8M2KP'),
  passcode: z.string().trim().min(16, 'Please enter your passcode'),
});

type TrackForm = z.infer<typeof TrackSchema>;

interface StatusUpdate {
  note: string;
  createdAt: string;
}

interface TrackingResult {
  trackingNumber: string;
  status: string;
  category: string;
  submittedAt: string;
  lastUpdatedAt: string;
  publicUpdates: StatusUpdate[];
}

const STATUS_COLOR: Record<PublicComplaintStatus, string> = {
  NEW: 'text-blue-600',
  UNDER_REVIEW: 'text-violet-600',
  RESOLVED: 'text-emerald-600',
  CLOSED: 'text-gray-500',
};

export default function TrackComplaintPage() {
  const [result, setResult] = useState<TrackingResult | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const form = useForm<TrackForm>({
    resolver: zodResolver(TrackSchema),
    defaultValues: { trackingNumber: '', passcode: '' },
  });

  const {
    formState: { errors },
  } = form;

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

      if (res.status === 429) {
        setServerError(json.error ?? 'Too many attempts. Please wait and try again.');
      } else if (res.status === 404 || (!json.success && json.notFound)) {
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

  const currentStatus = result ? toPublicStatus(result.status) : null;
  const currentTimelineIdx = currentStatus ? timelineIndex(currentStatus) : -1;

  return (
    <div className="mx-auto max-w-lg space-y-7 sm:space-y-8">
      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary/70">
          Student Affairs · Case lookup
        </p>
        <h1 className="text-2xl font-semibold tracking-tight text-[#302E83] sm:text-3xl">
          Track your complaint
        </h1>
        <p className="text-sm leading-6 text-slate-600">
          Enter the tracking number and passcode from your confirmation page to see the latest
          status.
        </p>
      </div>

      <Card className="border-primary/10 bg-white shadow-sm">
        <CardContent className="pt-5">
          <form className="space-y-4" onSubmit={form.handleSubmit(onSubmit)} noValidate>
          <div className="space-y-1.5">
            <Label htmlFor="trackingNumber">Tracking number</Label>
            <Input
              id="trackingNumber"
              placeholder="UU-2026-XXXXXX"
              autoComplete="off"
              className={cn('font-mono uppercase', errors.trackingNumber && 'border-red-400')}
              aria-invalid={!!errors.trackingNumber}
              {...form.register('trackingNumber', {
                onChange: (e) => {
                  e.target.value = e.target.value.toUpperCase();
                },
              })}
            />
            {errors.trackingNumber && (
              <p className="flex items-center gap-1 text-xs text-red-600">
                <AlertCircle className="size-3" />
                {errors.trackingNumber.message}
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="passcode">Passcode</Label>
            <Input
              id="passcode"
              type="password"
              autoComplete="off"
              placeholder="Enter your passcode"
              className={errors.passcode ? 'border-red-400' : ''}
              aria-invalid={!!errors.passcode}
              {...form.register('passcode')}
            />
            {errors.passcode && (
              <p className="flex items-center gap-1 text-xs text-red-600">
                <AlertCircle className="size-3" />
                {errors.passcode.message}
              </p>
            )}
          </div>

          {serverError && (
            <div className="flex items-start gap-2 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              <AlertCircle className="mt-0.5 size-4 shrink-0" />
              {serverError}
            </div>
          )}

          <Button
            type="submit"
            disabled={isLoading}
            className="w-full bg-[#302E83] text-white hover:bg-[#252367]"
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 size-4 animate-spin" />
                Looking up…
              </>
            ) : (
              <>
                <Search className="mr-2 size-4" />
                Look up complaint
              </>
            )}
          </Button>
          </form>
        </CardContent>
      </Card>

      {notFound && (
        <div className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 p-4">
          <AlertCircle className="mt-0.5 size-5 shrink-0 text-amber-600" />
          <div>
            <p className="text-sm font-semibold text-amber-800">No complaint found</p>
            <p className="mt-0.5 text-xs text-amber-700">
              Double-check your tracking number and passcode. If you still cannot find your case,
              contact Student Affairs through the university’s official contact page.
            </p>
            <a href="https://uu.edu.et/FOE/index.php/contact-us/" target="_blank" rel="noreferrer" className="mt-2 inline-flex min-h-10 items-center text-xs font-semibold text-amber-900 underline underline-offset-4">University contact details</a>
          </div>
        </div>
      )}

      {result && currentStatus && (
        <div className="animate-fade-in space-y-4">
          <Card className="border-slate-200">
            <CardContent className="pb-4 pt-5">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1 space-y-1">
                  <p className="font-mono text-xs text-slate-500">{result.trackingNumber}</p>
                  <p className="text-xs text-slate-500">{result.category}</p>
                </div>
                <Badge
                  variant={
                    STATUS_BADGE[currentStatus] as Parameters<typeof Badge>[0]['variant']
                  }
                >
                  {STATUS_LABEL[currentStatus]}
                </Badge>
              </div>
              <div className="mt-3 flex flex-wrap gap-4 border-t border-slate-100 pt-3 text-xs text-slate-500">
                <span>Submitted {formatRelativeTime(result.submittedAt)}</span>
                <span>Last updated {formatRelativeTime(result.lastUpdatedAt)}</span>
              </div>
            </CardContent>
          </Card>

          <Card className="border-slate-200">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-slate-700">Progress</CardTitle>
            </CardHeader>
            <CardContent className="space-y-0">
              {STATUS_TIMELINE.map((status, index) => {
                const isCurrent = status === currentStatus;
                const isPast = index < currentTimelineIdx;
                const isFuture = index > currentTimelineIdx;

                return (
                  <div key={status} className="flex gap-3">
                    <div className="flex flex-col items-center">
                      <div
                        className={cn(
                          'mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full',
                          isPast && 'bg-emerald-100 text-emerald-600',
                          isCurrent && 'bg-[#302E83] text-white',
                          isFuture && 'bg-slate-100 text-slate-300'
                        )}
                      >
                        {isPast ? (
                          <CheckCircle2 className="size-3" />
                        ) : isCurrent ? (
                          <Clock className="size-3" />
                        ) : (
                          <Circle className="size-3" />
                        )}
                      </div>
                      {index < STATUS_TIMELINE.length - 1 && (
                        <div
                          className={cn(
                            'my-1 min-h-[16px] w-0.5 flex-1',
                            isPast ? 'bg-emerald-200' : 'bg-slate-100'
                          )}
                        />
                      )}
                    </div>
                    <div className="pb-4">
                      <p
                        className={cn(
                          'text-sm font-medium leading-tight',
                          isCurrent
                            ? STATUS_COLOR[currentStatus]
                            : isFuture
                              ? 'text-slate-300'
                              : 'text-slate-500'
                        )}
                      >
                        {STATUS_LABEL[status]}
                        {isCurrent && (
                          <span className="ml-2 text-xs font-normal text-slate-400">
                            ←{' '}
                            Current
                          </span>
                        )}
                      </p>
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>

          {result.publicUpdates.length > 0 && (
            <Card className="border-slate-200">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-slate-700">
                  Updates from Student Affairs
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {result.publicUpdates.map((update, i) => (
                  <div key={i} className="border-l-2 border-[#008080] py-0.5 pl-3">
                    <p className="mb-0.5 text-xs text-slate-500">
                      {formatDate(update.createdAt, {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </p>
                    <p className="text-sm text-slate-700">{update.note}</p>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
