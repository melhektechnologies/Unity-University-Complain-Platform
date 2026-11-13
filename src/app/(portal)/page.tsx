import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight, FileText, Phone, Search, ClipboardList } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { COMPLAINT_CATEGORIES } from '@/lib/complaints/categories';

const STEPS = [
  {
    id: '01',
    title: 'Submit your complaint',
    description:
      'Share your name, student ID, phone number, the category, and what happened on campus.',
    icon: FileText,
  },
  {
    id: '02',
    title: 'Student Affairs reviews it',
    description:
      'The Student Affairs officer receives your case and moves it through review to a solution.',
    icon: ClipboardList,
  },
  {
    id: '03',
    title: 'Track with your passcode',
    description:
      'After submit you get a tracking number and passcode. Use them anytime to see your latest status.',
    icon: Search,
  },
] as const;

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
              Report a campus issue.{' '}
              <span className="font-serif font-normal italic text-primary">Get it handled.</span>
            </h1>
            <p className="max-w-xl text-base leading-7 text-slate-600 sm:text-lg sm:leading-8">
              A simple way for Unity University students to submit campus complaints to Student
              Affairs and follow the status until it is solved.
            </p>
          </div>

          <div className="flex flex-col gap-3 pt-1 sm:flex-row">
            <Button
              asChild
              className="group h-10 min-h-12 rounded-full bg-primary px-6 text-primary-foreground shadow-lg shadow-primary/20 transition duration-300 hover:-translate-y-0.5 hover:bg-university-indigo-deep"
            >
              <Link href="/submit">
                <FileText className="mr-2 size-4" aria-hidden="true" />
                Submit a complaint
                <ArrowRight
                  className="ml-2 size-4 transition-transform group-hover:translate-x-1"
                  aria-hidden="true"
                />
              </Link>
            </Button>
            <Button
              asChild
              variant="outline"
              className="h-10 min-h-12 rounded-full border-primary/20 bg-white/70 px-6 text-primary shadow-sm transition duration-300 hover:-translate-y-0.5 hover:bg-white"
            >
              <Link href="/track">
                <Search className="mr-2 size-4" aria-hidden="true" />
                Track a complaint
              </Link>
            </Button>
          </div>

          <div className="flex items-center gap-2.5 pt-1 text-sm text-slate-500">
            <span className="inline-flex size-8 items-center justify-center rounded-full bg-white text-primary shadow-sm">
              <Phone className="size-4" aria-hidden="true" />
            </span>
            Name, student ID, and phone are required so Student Affairs can contact you.
          </div>
        </div>

        <div className="enter-up-delay relative min-h-[350px] sm:min-h-[440px]">
          <div
            className="absolute -right-4 -top-5 size-28 rounded-full bg-university-gold/25 blur-3xl"
            aria-hidden="true"
          />
          <div className="relative isolate h-[350px] overflow-hidden rounded-[2rem] bg-[#d7d8d0] shadow-2xl shadow-[#17233f]/15 sm:h-[440px]">
            <Image
              src="/images/student-support-campus.png"
              alt="Students on the Unity University campus"
              fill
              priority
              sizes="(min-width: 1024px) 48vw, 100vw"
              className="hero-image object-cover"
            />
            <div
              className="absolute inset-0 bg-gradient-to-t from-[#101b32]/85 via-[#101b32]/10 to-transparent"
              aria-hidden="true"
            />
            <div className="absolute inset-x-0 bottom-0 p-6 text-white sm:p-8">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/70">
                Office of Student Affairs
              </p>
              <p className="mt-2 max-w-sm font-serif text-2xl leading-tight sm:text-3xl">
                One clear place for campus complaints.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section aria-labelledby="categories-heading" className="space-y-7">
        <div className="enter-up max-w-2xl">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary/70">
            What you can report
          </p>
          <h2
            id="categories-heading"
            className="mt-3 font-serif text-3xl leading-tight tracking-tight text-[#17233f] sm:text-4xl"
          >
            Common campus issues, clearly classified.
          </h2>
          <p className="mt-3 text-sm leading-6 text-slate-600 sm:text-base">
            Pick the category that best matches your situation when you submit.
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {COMPLAINT_CATEGORIES.map((category) => (
            <div
              key={category}
              className="rounded-2xl border border-slate-200/80 bg-white/85 px-5 py-4 text-sm font-medium text-[#17233f] shadow-sm shadow-slate-900/[0.03]"
            >
              {category}
            </div>
          ))}
        </div>
      </section>

      <section
        aria-labelledby="steps-heading"
        className="grid gap-9 rounded-[2rem] bg-[#17233f] p-6 text-white shadow-xl shadow-[#17233f]/10 sm:p-10 lg:grid-cols-[0.7fr_1.3fr] lg:gap-14 lg:p-12"
      >
        <div className="max-w-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-university-gold">
            How it works
          </p>
          <h2
            id="steps-heading"
            className="mt-3 font-serif text-3xl leading-tight tracking-tight sm:text-4xl"
          >
            Three simple steps.
          </h2>
          <p className="mt-4 text-sm leading-6 text-white/65">
            Submit once. Student Affairs manages the rest.
          </p>
        </div>

        <div className="grid gap-6 sm:grid-cols-3 sm:gap-5">
          {STEPS.map(({ id, title, description, icon: Icon }) => (
            <div key={id} className="border-t border-white/15 pt-5">
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs tracking-widest text-white/45">{id}</span>
                <Icon className="size-5 text-university-gold" aria-hidden="true" />
              </div>
              <h3 className="mt-5 text-base font-semibold leading-snug">{title}</h3>
              <p className="mt-2 text-sm leading-6 text-white/65">{description}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mb-2 flex flex-col gap-6 rounded-[2rem] border border-primary/10 bg-white p-6 shadow-sm sm:flex-row sm:items-center sm:justify-between sm:p-9">
        <div className="max-w-2xl">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary/70">
            Already submitted?
          </p>
          <h2 className="mt-2 font-serif text-2xl leading-tight tracking-tight text-[#17233f] sm:text-3xl">
            Check whether your case is still open.
          </h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            Statuses are simple: Submitted, On Review, Solved, or Closed.
          </p>
        </div>
        <Button
          asChild
          className="group h-10 min-h-12 shrink-0 rounded-full bg-primary px-6 text-primary-foreground shadow-md shadow-primary/15 transition hover:bg-university-indigo-deep"
        >
          <Link href="/track">
            Track my complaint
            <ArrowRight
              className="ml-2 size-4 transition-transform group-hover:translate-x-1"
              aria-hidden="true"
            />
          </Link>
        </Button>
      </section>
    </div>
  );
}
