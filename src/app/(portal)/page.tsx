import Link from 'next/link';
import { ArrowRight, Check, Clock3, FileText, LockKeyhole, Search, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

const steps = [
  {
    number: '01',
    title: 'Choose how to be identified',
    description: 'Review the privacy options and select the one that fits your situation.',
    icon: ShieldCheck,
  },
  {
    number: '02',
    title: 'Explain what happened',
    description: 'Share the details you feel comfortable providing to Student Affairs.',
    icon: FileText,
  },
  {
    number: '03',
    title: 'Keep your tracking details',
    description: 'Save your reference and passcode so you can check for updates later.',
    icon: Search,
  },
];

const privacyOptions = [
  { title: 'Identified', description: 'Your identity is visible to the case handler.' },
  { title: 'Confidential', description: 'Your identity is known only to senior staff, not the accused person or other handlers.' },
  { title: 'Anonymous', description: 'No personal identity information is collected; follow-up contact is not possible.' },
];

export default function PortalLandingPage() {
  return (
    <div className="mx-auto max-w-6xl space-y-14 sm:space-y-20">
      <section className="grid items-center gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(300px,0.76fr)] lg:gap-14">
        <div className="space-y-6">
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/10 bg-white px-3 py-1.5 text-xs font-semibold tracking-wide text-primary shadow-sm">
            <span className="size-2 rounded-full bg-university-gold ring-2 ring-university-gold/30" />
            UNITY UNIVERSITY · STUDENT AFFAIRS
          </div>
          <div className="space-y-4">
            <h1 className="max-w-2xl text-4xl font-semibold leading-[1.08] tracking-tight text-primary sm:text-5xl lg:text-6xl">
              A clear path to be heard.
            </h1>
            <p className="max-w-xl text-base leading-7 text-muted-foreground sm:text-lg">
              Share a concern with the Office of Student Affairs, then use your private tracking details to follow its progress.
            </p>
          </div>
          <div className="flex flex-col gap-3 pt-1 sm:flex-row">
            <Button asChild size="lg" className="min-h-12 bg-primary px-5 text-primary-foreground shadow-sm hover:bg-university-indigo-deep">
              <Link href="/submit">
                <FileText aria-hidden="true" className="mr-2 size-4" />
                Submit a complaint
                <ArrowRight aria-hidden="true" className="ml-2 size-4" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="min-h-12 border-primary/25 bg-white px-5 text-primary hover:bg-university-gold-soft">
              <Link href="/track">
                <Search aria-hidden="true" className="mr-2 size-4" />
                Track a complaint
              </Link>
            </Button>
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <LockKeyhole aria-hidden="true" className="size-3.5 text-primary" />
            Your tracking passcode is shown once. Keep it somewhere private.
          </div>
        </div>

        <Card className="relative overflow-hidden border-primary/10 bg-white shadow-[0_20px_60px_-35px_rgba(49,46,129,0.45)]">
          <div className="absolute inset-x-0 top-0 h-1 bg-university-gold" aria-hidden="true" />
          <CardContent className="p-6 sm:p-8">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary/70">Student support</p>
                <h2 className="mt-2 text-xl font-semibold tracking-tight text-slate-900">What happens next?</h2>
              </div>
              <span className="inline-flex size-11 shrink-0 items-center justify-center rounded-xl bg-university-gold-soft text-primary">
                <Clock3 aria-hidden="true" className="size-5" />
              </span>
            </div>
            <div className="mt-7 space-y-0">
              {steps.map(({ number, title, description, icon: Icon }, index) => (
                <div key={number} className="relative flex gap-4 pb-6 last:pb-0">
                  {index < steps.length - 1 && <span className="absolute left-[17px] top-9 h-[calc(100%-1rem)] w-px bg-primary/15" aria-hidden="true" />}
                  <span className="relative z-[1] inline-flex size-9 shrink-0 items-center justify-center rounded-full border border-primary/15 bg-white text-primary">
                    <Icon aria-hidden="true" className="size-4" />
                  </span>
                  <div className="min-w-0 pt-0.5">
                    <p className="text-sm font-semibold text-slate-900">{title}</p>
                    <p className="mt-1 text-sm leading-6 text-muted-foreground">{description}</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-7 rounded-lg border border-primary/10 bg-slate-50 p-4">
              <div className="flex gap-3">
                <span className="inline-flex size-8 shrink-0 items-center justify-center rounded-full bg-university-gold-soft text-primary">
                  <Check aria-hidden="true" className="size-4" />
                </span>
                <p className="text-xs leading-5 text-slate-600">
                  You can review your complaint status using the reference and passcode provided after submission.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </section>

      <section aria-labelledby="privacy-heading" className="space-y-5">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary/70">Before you begin</p>
            <h2 id="privacy-heading" className="mt-2 text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">Choose the privacy level that feels right</h2>
          </div>
          <p className="max-w-md text-sm leading-6 text-muted-foreground">Read each option carefully. Your choice affects what identifying information is collected and who may see it.</p>
        </div>
        <div className="grid gap-3 md:grid-cols-3">
          {privacyOptions.map(({ title, description }, index) => (
            <Card key={title} className="border-border bg-white shadow-none transition hover:border-primary/20 hover:shadow-sm">
              <CardContent className="flex gap-4 p-5">
                <span className={`inline-flex size-9 shrink-0 items-center justify-center rounded-lg ${index === 1 ? 'bg-university-gold-soft text-primary' : 'bg-slate-100 text-primary'}`}>
                  {index === 1 ? <LockKeyhole aria-hidden="true" className="size-4" /> : <ShieldCheck aria-hidden="true" className="size-4" />}
                </span>
                <div>
                  <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
                  <p className="mt-1.5 text-sm leading-6 text-muted-foreground">{description}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section className="flex flex-col gap-5 rounded-2xl border border-primary/10 bg-primary px-6 py-7 text-white sm:flex-row sm:items-center sm:justify-between sm:px-8 sm:py-8">
        <div className="max-w-2xl">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-white/65">Already submitted?</p>
          <h2 className="mt-2 text-xl font-semibold tracking-tight sm:text-2xl">Your case can be checked any time.</h2>
          <p className="mt-2 text-sm leading-6 text-white/75">Have your tracking number and passcode ready to view the latest available status.</p>
        </div>
        <Button asChild variant="secondary" className="min-h-11 shrink-0 bg-university-gold px-5 font-semibold text-slate-950 hover:brightness-95">
          <Link href="/track">Track my complaint <ArrowRight aria-hidden="true" className="ml-2 size-4" /></Link>
        </Button>
      </section>
    </div>
  );
}
