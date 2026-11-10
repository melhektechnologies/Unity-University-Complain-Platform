'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { CheckCircle, Copy, Printer, AlertTriangle, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface Credentials {
  trackingNumber: string;
  passcode: string;
  submittedAt: string;
}

export default function ConfirmationPage() {
  const router = useRouter();
  const [creds, setCreds] = useState<Credentials | null>(null);
  const [copied, setCopied] = useState<'ref' | 'pass' | null>(null);

  useEffect(() => {
    const raw = sessionStorage.getItem('uss_credentials');
    if (!raw) {
      // Guard: no credentials means someone navigated here directly
      router.replace('/submit');
      return;
    }
    try {
      const parsed = JSON.parse(raw) as Credentials;
      setCreds(parsed);
      // Clear from sessionStorage — credentials are shown exactly once
      sessionStorage.removeItem('uss_credentials');
    } catch {
      router.replace('/submit');
    }
  }, [router]);

  async function copy(text: string, field: 'ref' | 'pass') {
    await navigator.clipboard.writeText(text);
    setCopied(field);
    setTimeout(() => setCopied(null), 2000);
  }

  if (!creds) {
    return (
      <div className="flex items-center justify-center min-h-[200px] text-slate-400 text-sm">
        Loading…
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-lg mx-auto">
      {/* Success banner */}
      <div className="flex items-start gap-3 bg-emerald-50 border border-emerald-200 rounded-lg p-4">
        <CheckCircle className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-semibold text-emerald-800">Complaint submitted successfully</p>
          <p className="text-xs text-emerald-700 mt-0.5">
            Your complaint has been received by the Office of Student Affairs and will be reviewed shortly.
          </p>
        </div>
      </div>

      {/* Warning — save credentials */}
      <div className="flex items-start gap-3 bg-amber-50 border border-amber-300 rounded-lg p-4">
        <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-semibold text-amber-800">Save these credentials now</p>
          <p className="text-xs text-amber-700 mt-0.5">
            These will <strong>not</strong> be shown again. Without them you cannot track your complaint.
            Write them down or print this page.
          </p>
        </div>
      </div>

      {/* Credentials card */}
      <Card className="border-slate-300 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold text-slate-700">Your Tracking Credentials</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Tracking reference */}
          <div>
            <p className="text-xs text-slate-500 mb-1 font-medium">Tracking Reference</p>
            <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-md px-3 py-2.5">
              <span className="font-mono text-base font-bold tracking-widest text-[#1B365D] flex-1">
                {creds.trackingNumber}
              </span>
              <button
                onClick={() => copy(creds.trackingNumber, 'ref')}
                className="text-slate-400 hover:text-slate-600 transition-colors"
                title="Copy tracking number"
              >
                <Copy className="h-4 w-4" />
              </button>
            </div>
            {copied === 'ref' && (
              <p className="text-xs text-emerald-600 mt-1">Copied!</p>
            )}
          </div>

          {/* Passcode */}
          <div>
            <p className="text-xs text-slate-500 mb-1 font-medium">Passcode</p>
            <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-md px-3 py-2.5">
              <span className="font-mono text-sm text-slate-700 flex-1 break-all">
                {creds.passcode}
              </span>
              <button
                onClick={() => copy(creds.passcode, 'pass')}
                className="text-slate-400 hover:text-slate-600 transition-colors shrink-0"
                title="Copy passcode"
              >
                <Copy className="h-4 w-4" />
              </button>
            </div>
            {copied === 'pass' && (
              <p className="text-xs text-emerald-600 mt-1">Copied!</p>
            )}
          </div>

          <div className="text-xs text-slate-400 border-t border-slate-100 pt-3">
            Submitted on {new Date(creds.submittedAt).toLocaleString('en-ET')}
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex flex-col sm:flex-row gap-3">
        <Button
          variant="outline"
          className="border-slate-300 text-slate-600 no-print"
          onClick={() => window.print()}
        >
          <Printer className="mr-2 h-4 w-4" />
          Print this page
        </Button>
        <Button asChild className="bg-[#1B365D] hover:bg-[#2A4A7F] text-white ml-auto w-full sm:w-auto">
          <Link href="/track">
            Track My Complaint <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
        </Button>
      </div>

      <p className="text-center text-xs text-slate-400">
        Return to{' '}
        <Link href="/" className="underline hover:text-slate-600">
          Student Portal
        </Link>
      </p>
    </div>
  );
}

