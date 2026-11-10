'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, AlertCircle, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

type Status =
  | 'NEW'
  | 'UNDER_REVIEW'
  | 'ASSIGNED'
  | 'IN_PROGRESS'
  | 'AWAITING_RESPONSE'
  | 'ESCALATED'
  | 'RESOLVED'
  | 'CLOSED';

const STATUS_LABEL: Record<Status, string> = {
  NEW: 'New',
  UNDER_REVIEW: 'Under Review',
  ASSIGNED: 'Assigned',
  IN_PROGRESS: 'In Progress',
  AWAITING_RESPONSE: 'Awaiting Response',
  ESCALATED: 'Escalated',
  RESOLVED: 'Resolved',
  CLOSED: 'Closed',
};

// Valid transitions from each status
const TRANSITIONS: Record<Status, Status[]> = {
  NEW: ['UNDER_REVIEW'],
  UNDER_REVIEW: ['IN_PROGRESS', 'AWAITING_RESPONSE', 'ESCALATED', 'CLOSED'],
  ASSIGNED: ['IN_PROGRESS', 'AWAITING_RESPONSE', 'ESCALATED'],
  IN_PROGRESS: ['AWAITING_RESPONSE', 'RESOLVED', 'ESCALATED'],
  AWAITING_RESPONSE: ['IN_PROGRESS', 'RESOLVED', 'CLOSED'],
  ESCALATED: ['IN_PROGRESS', 'RESOLVED'],
  RESOLVED: ['CLOSED'],
  CLOSED: [],
};

interface Props {
  complaintId: string;
  currentStatus: string;
}

export function ComplaintStatusPanel({ complaintId, currentStatus }: Props) {
  const router = useRouter();
  const [selectedStatus, setSelectedStatus] = useState<Status | ''>('');
  const [note, setNote] = useState('');
  const [publicNote, setPublicNote] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const available = TRANSITIONS[currentStatus as Status] ?? [];

  async function handleUpdate() {
    if (!selectedStatus) return;
    setIsLoading(true);
    setError(null);
    setSuccess(false);

    try {
      const res = await fetch(`/api/complaints/${complaintId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          toStatus: selectedStatus,
          reason: note || undefined,
          publicNote: publicNote || undefined,
        }),
      });

      const json = await res.json();

      if (!res.ok || !json.success) {
        setError(json.error ?? 'Failed to update status.');
        setIsLoading(false);
        return;
      }

      setSuccess(true);
      setSelectedStatus('');
      setNote('');
      setPublicNote('');
      router.refresh();
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Card className="border-slate-300">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm text-slate-700">Manage Status</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {available.length === 0 ? (
          <p className="text-xs text-slate-400 italic">
            This complaint is {STATUS_LABEL[currentStatus as Status] ?? currentStatus} — no further transitions available.
          </p>
        ) : (
          <>
            {/* Status selector */}
            <div className="space-y-1.5">
              <Label className="text-xs">Move to status</Label>
              <div className="flex flex-wrap gap-2">
                {available.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setSelectedStatus(s === selectedStatus ? '' : s)}
                    className={`text-xs px-3 py-1.5 rounded-full border transition-colors font-medium ${
                      selectedStatus === s
                        ? 'bg-[#1B365D] text-white border-[#1B365D]'
                        : 'bg-white text-slate-600 border-slate-300 hover:border-[#1B365D]'
                    }`}
                  >
                    {STATUS_LABEL[s]}
                  </button>
                ))}
              </div>
            </div>

            {selectedStatus && (
              <>
                {/* Internal note */}
                <div className="space-y-1.5">
                  <Label htmlFor="note" className="text-xs">
                    Internal note{' '}
                    <span className="text-slate-400 font-normal">(staff only, optional)</span>
                  </Label>
                  <Textarea
                    id="note"
                    placeholder="Add an internal note about this status change…"
                    rows={2}
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    className="text-xs resize-none"
                  />
                </div>

                {/* Public note */}
                <div className="space-y-1.5">
                  <Label htmlFor="publicNote" className="text-xs">
                    Public update{' '}
                    <span className="text-slate-400 font-normal">(visible to student, optional)</span>
                  </Label>
                  <Textarea
                    id="publicNote"
                    placeholder="Message to show the student on the tracking page…"
                    rows={2}
                    value={publicNote}
                    onChange={(e) => setPublicNote(e.target.value)}
                    className="text-xs resize-none border-[#008080]/40"
                  />
                </div>

                {error && (
                  <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded p-2 text-xs text-red-700">
                    <AlertCircle className="h-3.5 w-3.5 shrink-0 mt-0.5" />{error}
                  </div>
                )}

                <Button
                  type="button"
                  onClick={handleUpdate}
                  disabled={isLoading}
                  className="w-full bg-[#1B365D] hover:bg-[#2A4A7F] text-white text-xs h-8"
                >
                  {isLoading ? (
                    <><Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />Updating…</>
                  ) : (
                    `Move to ${STATUS_LABEL[selectedStatus]}`
                  )}
                </Button>
              </>
            )}

            {success && !selectedStatus && (
              <div className="flex items-center gap-2 text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 rounded p-2">
                <CheckCircle className="h-3.5 w-3.5 shrink-0" />
                Status updated successfully.
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}

