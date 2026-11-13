'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, AlertCircle, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  availableStatusTransitions,
  getStatusLabel,
  isLeanStatus,
  STATUS_HINT,
  STATUS_LABEL,
  type LeanComplaintStatus,
} from '@/lib/complaints/status';

interface Props {
  complaintId: string;
  currentStatus: string;
}

export function ComplaintStatusPanel({ complaintId, currentStatus }: Props) {
  const router = useRouter();
  const [selectedStatus, setSelectedStatus] = useState<LeanComplaintStatus | ''>('');
  const [publicMessage, setPublicMessage] = useState('');
  const [statusLoading, setStatusLoading] = useState(false);
  const [messageLoading, setMessageLoading] = useState(false);
  const [statusError, setStatusError] = useState<string | null>(null);
  const [messageError, setMessageError] = useState<string | null>(null);
  const [statusSaved, setStatusSaved] = useState(false);
  const [messageSaved, setMessageSaved] = useState(false);

  const available = availableStatusTransitions(currentStatus);

  async function handleStatusUpdate() {
    if (!selectedStatus) return;
    setStatusLoading(true);
    setStatusError(null);
    setStatusSaved(false);
    try {
      const res = await fetch(`/api/complaints/${complaintId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ toStatus: selectedStatus }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        setStatusError(json.error ?? 'Failed to update status.');
        return;
      }
      setStatusSaved(true);
      setSelectedStatus('');
      router.refresh();
    } catch {
      setStatusError('Network error. Please try again.');
    } finally {
      setStatusLoading(false);
    }
  }

  async function handlePublicMessage() {
    setMessageLoading(true);
    setMessageError(null);
    setMessageSaved(false);
    try {
      const res = await fetch(`/api/complaints/${complaintId}/updates`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: publicMessage }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        setMessageError(json.error ?? 'Failed to send the message.');
        return;
      }
      setMessageSaved(true);
      setPublicMessage('');
      router.refresh();
    } catch {
      setMessageError('Network error. Please try again.');
    } finally {
      setMessageLoading(false);
    }
  }

  return (
    <Card className="border-slate-300">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm text-slate-700">Manage complaint</CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        <section className="space-y-3">
          <div className="space-y-0.5 text-xs text-slate-500">
            <p>
              Current:{' '}
              <span className="font-medium text-slate-700">{getStatusLabel(currentStatus)}</span>
            </p>
            {isLeanStatus(currentStatus) ? (
              <p className="text-slate-400">{STATUS_HINT[currentStatus]}</p>
            ) : (
              <p className="text-slate-400">
                This case uses an older workflow state. Its saved value stays unchanged until you
                choose a supported next step.
              </p>
            )}
          </div>

          {available.length === 0 ? (
            <p className="text-xs italic text-slate-400">
              {currentStatus === 'CLOSED'
                ? 'This complaint is closed.'
                : 'This older workflow value has no supported transition in the current database rules.'}
            </p>
          ) : (
            <>
              <div className="space-y-1.5">
                <Label className="text-xs">Move to</Label>
                <div className="flex flex-wrap gap-2">
                  {available.map((status) => (
                    <button
                      key={status}
                      type="button"
                      onClick={() => setSelectedStatus(status === selectedStatus ? '' : status)}
                      className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
                        selectedStatus === status
                          ? 'border-[#302E83] bg-[#302E83] text-white'
                          : 'border-slate-300 bg-white text-slate-600 hover:border-[#302E83]'
                      }`}
                    >
                      {STATUS_LABEL[status]}
                    </button>
                  ))}
                </div>
              </div>

              {selectedStatus && (
                <Button
                  type="button"
                  onClick={handleStatusUpdate}
                  disabled={statusLoading}
                  className="h-8 w-full bg-[#302E83] text-xs text-white hover:bg-[#252367]"
                >
                  {statusLoading ? (
                    <><Loader2 className="mr-1.5 size-3.5 animate-spin" />Updating…</>
                  ) : (
                    `Move to ${STATUS_LABEL[selectedStatus]}`
                  )}
                </Button>
              )}
              {statusError && <InlineMessage error>{statusError}</InlineMessage>}
              {statusSaved && <InlineMessage>Complaint status updated.</InlineMessage>}
            </>
          )}
        </section>

        {currentStatus !== 'CLOSED' && (
          <section className="space-y-2 border-t border-slate-100 pt-4">
            <Label htmlFor="publicMessage" className="text-xs">
              Message to student <span className="font-normal text-slate-400">(optional)</span>
            </Label>
            <Textarea
              id="publicMessage"
              placeholder="This message will appear in the student’s tracking page."
              rows={3}
              maxLength={2000}
              value={publicMessage}
              onChange={(event) => setPublicMessage(event.target.value)}
              className="resize-none border-[#008080]/40 text-xs"
            />
            {messageError && <InlineMessage error>{messageError}</InlineMessage>}
            {messageSaved && <InlineMessage>Message sent to the student.</InlineMessage>}
            <Button
              type="button"
              variant="outline"
              onClick={handlePublicMessage}
              disabled={messageLoading || publicMessage.trim().length < 10}
              className="h-8 w-full text-xs"
            >
              {messageLoading ? (
                <><Loader2 className="mr-1.5 size-3.5 animate-spin" />Sending…</>
              ) : 'Send student message'}
            </Button>
          </section>
        )}
      </CardContent>
    </Card>
  );
}

function InlineMessage({
  children,
  error = false,
}: {
  children: React.ReactNode;
  error?: boolean;
}) {
  return (
    <div
      className={`flex items-center gap-2 rounded border p-2 text-xs ${
        error
          ? 'border-red-200 bg-red-50 text-red-700'
          : 'border-emerald-200 bg-emerald-50 text-emerald-700'
      }`}
    >
      {error ? <AlertCircle className="size-3.5 shrink-0" /> : <CheckCircle className="size-3.5 shrink-0" />}
      {children}
    </div>
  );
}
