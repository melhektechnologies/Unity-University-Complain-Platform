'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { CheckCircle, Copy, Printer, AlertTriangle, ArrowRight, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface Credentials {
  trackingNumber: string;
  passcode: string;
  submittedAt: string;
}

const STORAGE_KEY = 'uss_credentials';

export default function ConfirmationPage() {
  const router = useRouter();
  const [creds, setCreds] = useState<Credentials | null>(null);
  const [copied, setCopied] = useState<'ref' | 'pass' | 'both' | null>(null);
  const [copyError, setCopyError] = useState(false);

  useEffect(() => {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) {
      router.replace('/submit');
      return;
    }
    try {
      setCreds(JSON.parse(raw) as Credentials);
    } catch {
      sessionStorage.removeItem(STORAGE_KEY);
      router.replace('/submit');
    }
  }, [router]);

  async function copy(text: string, field: 'ref' | 'pass' | 'both') {
    setCopyError(false);
    try {
      await navigator.clipboard.writeText(text);
      setCopied(field);
      setTimeout(() => setCopied(null), 2000);
    } catch {
      setCopyError(true);
    }
  }

  function clearAndGoTrack() {
    sessionStorage.removeItem(STORAGE_KEY);
    router.push('/track');
  }

  if (!creds) {
    return (
      <div className="flex min-h-[200px] items-center justify-center text-sm text-slate-400">
        Loading…
      </div>
    );
  }

  const bothText = `Tracking number: ${creds.trackingNumber}\nPasscode: ${creds.passcode}`;

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <div className="flex items-start gap-3 rounded-lg border border-emerald-200 bg-emerald-50 p-4">
        <CheckCircle className="mt-0.5 size-5 shrink-0 text-emerald-600" />
        <div>
          <p className="text-sm font-semibold text-emerald-800">Complaint submitted successfully</p>
          <p className="mt-0.5 text-xs text-emerald-700">
            Student Affairs has received your case. Save your tracking details below to check
            status later.
          </p>
        </div>
      </div>

      <div className="flex items-start gap-3 rounded-lg border border-amber-300 bg-amber-50 p-4">
        <AlertTriangle className="mt-0.5 size-5 shrink-0 text-amber-600" />
        <div>
          <p className="text-sm font-semibold text-amber-800">Save these now</p>
          <p className="mt-0.5 text-xs text-amber-700">
            You need both the tracking number and passcode to track your complaint. Write them
            down, copy them, or print this page.
          </p>
        </div>
      </div>

      <Card className="border-slate-300 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-sm font-semibold text-slate-700">
            <ShieldCheck className="size-4 text-primary" aria-hidden="true" />
            Your tracking credentials
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <p className="mb-1 text-xs font-medium text-slate-500">Tracking number</p>
            <div className="flex items-center gap-2 rounded-md border border-slate-200 bg-slate-50 px-3 py-2.5">
              <span className="flex-1 font-mono text-base font-bold tracking-widest text-[#302E83]">
                {creds.trackingNumber}
              </span>
              <button
                type="button"
                onClick={() => copy(creds.trackingNumber, 'ref')}
                aria-label="Copy tracking number"
                className="inline-flex size-10 shrink-0 items-center justify-center rounded-md text-slate-500 transition-colors hover:bg-white hover:text-slate-900"
              >
                <Copy className="size-4" />
              </button>
            </div>
            {copied === 'ref' && <p className="mt-1 text-xs text-emerald-600">Copied!</p>}
          </div>

          <div>
            <p className="mb-1 text-xs font-medium text-slate-500">Passcode</p>
            <div className="flex items-center gap-2 rounded-md border border-slate-200 bg-slate-50 px-3 py-2.5">
              <span className="flex-1 break-all font-mono text-sm text-slate-700">
                {creds.passcode}
              </span>
              <button
                type="button"
                onClick={() => copy(creds.passcode, 'pass')}
                aria-label="Copy passcode"
                className="inline-flex size-10 shrink-0 items-center justify-center rounded-md text-slate-500 transition-colors hover:bg-white hover:text-slate-900"
              >
                <Copy className="size-4" />
              </button>
            </div>
            {copied === 'pass' && <p className="mt-1 text-xs text-emerald-600">Copied!</p>}
          </div>

          <Button
            type="button"
            variant="outline"
            className="w-full border-slate-300 text-slate-700"
            onClick={() => copy(bothText, 'both')}
          >
            <Copy className="mr-2 size-4" />
            {copied === 'both' ? 'Copied both!' : 'Copy number + passcode'}
          </Button>
          {copyError && (
            <p role="status" className="text-center text-xs text-amber-700">
              Copy was unavailable. Select the tracking details and copy them manually.
            </p>
          )}

          <div className="border-t border-slate-100 pt-3 text-xs text-slate-400">
            Submitted on {new Date(creds.submittedAt).toLocaleString('en-ET')}
          </div>
        </CardContent>
      </Card>

      <div className="flex flex-col gap-3 sm:flex-row">
        <Button
          type="button"
          variant="outline"
          className="border-slate-300 text-slate-600 no-print"
          onClick={() => window.print()}
        >
          <Printer className="mr-2 size-4" />
          Print this page
        </Button>
        <Button
          type="button"
          onClick={clearAndGoTrack}
          className="ml-auto w-full bg-[#302E83] text-white hover:bg-[#252367] sm:w-auto"
        >
          Track my complaint <ArrowRight className="ml-2 size-4" />
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
