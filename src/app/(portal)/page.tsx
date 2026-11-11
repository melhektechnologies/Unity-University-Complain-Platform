import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight, FileText, LockKeyhole, Search, ShieldCheck } from 'lucide-react';
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
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-16 sm:gap-24">
      <section className="grid items-center gap-8 md:grid-cols-[1fr_0.94fr] md:gap-10 lg:gap-14">
        <div className="enter-up space-y-7">
          <div className="inline-flex items-center gap-2.5 rounded-full border border-primary/10 bg-white/80 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-primary shadow-sm shadow-slate-900/5 backdrop-blur">
            <span className="relative flex size-2.5">
              <span className="absolute inline-flex size-full animate-ping rounded-full bg-university-gold opacity-40" />
              <span className="relative inline-flex size-2.5 rounded-full bg-university-gold" />
            </span>
            Unity University · Student Affairs
          </div>
          <div className="space-y-5">
            <h1 className="max-w-2xl text-5xl font-semibold leading-[0.98] tracking-[-0.055em] text-[#17233f] sm:text-6xl lg:text-[4.5rem]">
              A better campus begins with <span className="font-serif font-normal italic text-primary">being heard.</span>
            </h1>
            <p className="max-w-xl text-base leading-7 text-slate-600 sm:text-lg sm:leading-8">
              A thoughtful, confidential way to raise a concern with Student Affairs—and stay informed as it moves forward.
            </p>
          </div>
          <div className="flex flex-col gap-3 pt-1 sm:flex-row">
            <Button asChild size="lg" className="group min-h-12 rounded-full bg-primary px-6 text-primary-foreground shadow-lg shadow-primary/20 transition duration-300 hover:-translate-y-0.5 hover:bg-university-indigo-deep">
              <Link href="/submit">
                <FileText aria-hidden="true" className="mr-2 size-4" />
                Share a concern
                <ArrowRight aria-hidden="true" className="ml-2 size-4 transition-transform group-hover:translate-x-1" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="min-h-12 rounded-full border-primary/20 bg-white/70 px-6 text-primary transition duration-300 hover:-translate-y-0.5 hover:bg-white">
              <Link href="/track">
                <Search aria-hidden="true" className="mr-2 size-4" />
                Track a case
              </Link>
            </Button>
          </div>
          <div className="flex items-center gap-2.5 pt-1 text-sm text-slate-500">
            <span className="inline-flex size-8 items-center justify-center rounded-full bg-white text-primary shadow-sm"><LockKeyhole aria-hidden="true" className="size-4" /></span>
            Your privacy is always your choice.
          </div>
        </div>

        <div className="enter-up-delay relative min-h-[350px] sm:min-h-[440px]">
          <div className="absolute -right-4 -top-5 size-28 rounded-full bg-university-gold/25 blur-3xl" aria-hidden="true" />
          <div className="relative isolate h-[350px] overflow-hidden rounded-[2rem] bg-[#d7d8d0] shadow-2xl shadow-[#17233f]/15 sm:h-[440px]">
            <Image
              src="/images/student-support-campus.png"
              alt="Students sharing a conversation on a leafy university campus"
              fill
              priority
              sizes="(min-width: 1024px) 48vw, 100vw"
              className="hero-image object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#101b32]/85 via-[#101b32]/10 to-transparent" aria-hidden="true" />
            <div className="absolute inset-x-0 bottom-0 p-6 text-white sm:p-8">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/70">A space to speak up</p>
              <p className="mt-2 max-w-sm font-serif text-2xl leading-tight sm:text-3xl">Every concern deserves to be taken seriously.</p>
            </div>
          </div>
          <div className="float-card absolute left-4 top-4 flex max-w-[calc(100%-2rem)] items-center gap-3 rounded-2xl border border-white/80 bg-white/95 p-4 shadow-xl shadow-slate-900/10 backdrop-blur sm:left-auto sm:right-7 sm:top-7 sm:p-5">
            <span className="inline-flex size-11 shrink-0 items-center justify-center rounded-xl bg-university-gold-soft text-primary"><ShieldCheck aria-hidden="true" className="size-5" /></span>
            <span>
              <span className="block text-sm font-semibold text-[#17233f]">Your privacy, your choice</span>
              <span className="mt-0.5 block text-xs text-slate-500">Choose how your concern is shared.</span>
            </span>
          </div>
        </div>
      </section>

      <section aria-labelledby="privacy-heading" className="space-y-7">
        <div className="max-w-2xl enter-up">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary/70">Before you begin</p>
          <h2 id="privacy-heading" className="mt-3 font-serif text-3xl leading-tight tracking-tight text-[#17233f] sm:text-4xl">Speak up in the way that feels right.</h2>
          <p className="mt-3 text-sm leading-6 text-slate-600 sm:text-base">Choose a privacy level before you share. You can review exactly what each option means.</p>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          {privacyOptions.map(({ title, description }, index) => (
            <Card key={title} className="privacy-card group relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white/85 shadow-sm shadow-slate-900/[0.03]">
              <CardContent className="flex h-full flex-col gap-5 p-6 sm:p-7">
                <div className="flex items-center justify-between">
                  <span className="inline-flex size-11 items-center justify-center rounded-xl bg-university-gold-soft text-primary transition-transform duration-300 group-hover:rotate-[-6deg] group-hover:scale-105">
                    {index === 1 ? <LockKeyhole aria-hidden="true" className="size-5" /> : <ShieldCheck aria-hidden="true" className="size-5" />}
                  </span>
                  <span className="font-mono text-xs tracking-widest text-slate-400">0{index + 1}</span>
                </div>
                <div>
                  <h3 className="text-lg font-semibold tracking-tight text-[#17233f]">{title}</h3>
                  <p className="mt-2 text-sm leading-6 text-slate-600">{description}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section aria-labelledby="steps-heading" className="grid gap-9 rounded-[2rem] bg-[#17233f] p-6 text-white shadow-xl shadow-[#17233f]/10 sm:p-10 lg:grid-cols-[0.7fr_1.3fr] lg:gap-14 lg:p-12">
        <div className="max-w-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-university-gold">Clear from the start</p>
          <h2 id="steps-heading" className="mt-3 font-serif text-3xl leading-tight tracking-tight sm:text-4xl">A simple path forward.</h2>
          <p className="mt-4 text-sm leading-6 text-white/65">You decide what to share. We make it easier to understand what happens next.</p>
        </div>
        <div className="grid gap-6 sm:grid-cols-3 sm:gap-5">
          {steps.map(({ number, title, description, icon: Icon }) => (
            <div key={number} className="border-t border-white/15 pt-5">
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs tracking-widest text-white/45">{number}</span>
                <Icon aria-hidden="true" className="size-5 text-university-gold" />
              </div>
              <h3 className="mt-5 text-base font-semibold leading-snug">{title}</h3>
              <p className="mt-2 text-sm leading-6 text-white/65">{description}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mb-2 flex flex-col gap-6 rounded-[2rem] border border-primary/10 bg-white p-6 shadow-sm sm:flex-row sm:items-center sm:justify-between sm:p-9">
        <div className="max-w-2xl">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary/70">Already reached out?</p>
          <h2 className="mt-2 font-serif text-2xl leading-tight tracking-tight text-[#17233f] sm:text-3xl">Your case is still within reach.</h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">Use your tracking number and passcode to see the latest available update.</p>
        </div>
        <Button asChild size="lg" className="group min-h-12 shrink-0 rounded-full bg-primary px-6 text-primary-foreground shadow-md shadow-primary/15 transition hover:bg-university-indigo-deep">
          <Link href="/track">Track my case <ArrowRight aria-hidden="true" className="ml-2 size-4 transition-transform group-hover:translate-x-1" /></Link>
        </Button>
      </section>
    </div>
  );
}
