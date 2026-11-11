'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, AlertCircle, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { STATUS_LABELS, type ComplaintStatus } from '@/features/complaints/workflow';


interface Props {
  complaintId: string;
  currentStatus: string;
  availableStatuses: ComplaintStatus[];
  canWriteInternalNote: boolean;
  canPublishPublicUpdate: boolean;
}

export function ComplaintStatusPanel({
  complaintId,
  currentStatus,
  availableStatuses,
  canWriteInternalNote,
  canPublishPublicUpdate,
}: Props) {
  const router = useRouter();
  const [selectedStatus, setSelectedStatus] = useState<ComplaintStatus | ''>('');
  const [note, setNote] = useState('');
  const [publicNote, setPublicNote] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const available = availableStatuses;

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
    <Card className="border-primary/10 bg-white shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm text-slate-700">Manage Status</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {available.length === 0 ? (
          <p className="text-xs text-slate-400 italic">
              This complaint is {STATUS_LABELS[currentStatus as ComplaintStatus] ?? currentStatus} — no further actions are available to your role.
          </p>
        ) : (
          <>
            {/* Status selector */}
            <div className="space-y-1.5">
              <p id="move-to-status" className="text-xs font-medium text-slate-700">Move to status</p>
              <div role="group" aria-labelledby="move-to-status" className="flex flex-wrap gap-2">
                {available.map((s) => (
                  <button
                    key={s}
                    type="button"
                    aria-pressed={selectedStatus === s}
                    onClick={() => setSelectedStatus(s === selectedStatus ? '' : s)}
                    className={`min-h-10 px-4 text-xs rounded-full border transition-colors font-medium ${
                      selectedStatus === s
                        ? 'bg-[#302E83] text-white border-[#302E83]'
                        : 'bg-white text-slate-600 border-slate-300 hover:border-[#302E83]'
                    }`}
                  >
                    {STATUS_LABELS[s]}
                  </button>
                ))}
              </div>
            </div>

            {selectedStatus && (
              <>
                {canWriteInternalNote && (
                  <div className="space-y-1.5">
                    <Label htmlFor="note" className="text-xs">
                      Internal note{' '}
                      <span className="text-slate-400 font-normal">(staff only, optional)</span>
                    </Label>
                    <Textarea
                      id="note"
                      placeholder="Add an internal note about this status change…"
                      rows={3}
                      value={note}
                      onChange={(e) => setNote(e.target.value)}
                      className="resize-none text-sm"
                    />
                  </div>
                )}

                {canPublishPublicUpdate && (
                  <div className="space-y-1.5">
                    <Label htmlFor="publicNote" className="text-xs">
                      Public update{' '}
                      <span className="text-slate-400 font-normal">(visible to student, optional)</span>
                    </Label>
                    <Textarea
                      id="publicNote"
                      placeholder="Message to show the student on the tracking page…"
                      rows={3}
                      value={publicNote}
                      onChange={(e) => setPublicNote(e.target.value)}
                      className="resize-none border-primary/25 text-sm"
                    />
                  </div>
                )}

                {error && (
                  <div role="alert" className="flex items-start gap-2 bg-red-50 border border-red-200 rounded p-2 text-xs text-red-700">
                    <AlertCircle className="h-3.5 w-3.5 shrink-0 mt-0.5" />{error}
                  </div>
                )}

                <Button
                  type="button"
                  onClick={handleUpdate}
                  disabled={isLoading}
                  className="min-h-11 w-full bg-primary text-primary-foreground hover:bg-university-indigo-deep"
                >
                  {isLoading ? (
                    <><Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />Updating…</>
                  ) : (
                    `Move to ${STATUS_LABELS[selectedStatus]}`
                  )}
                </Button>
              </>
            )}

            {success && !selectedStatus && (
              <div role="status" className="flex items-center gap-2 text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 rounded p-2">
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
