import Image from 'next/image';
import Link from 'next/link';
import { ArrowUpRight, Search } from 'lucide-react';

export function PortalHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-white/10 bg-[#17233f]/95 text-primary-foreground shadow-lg shadow-slate-950/10 backdrop-blur-xl">
      <div className="content-container flex min-h-[76px] items-center justify-between gap-4 py-3">
        <Link
          href="/"
          className="group flex min-w-0 items-center gap-3 rounded-sm"
          aria-label="Unity University Student Support home"
        >
          <span
            className="inline-flex shrink-0 items-center justify-center rounded-full border-2 border-university-gold bg-white p-0.5 shadow-sm"
            style={{ width: 48, height: 48 }}
          >
            <Image
              src="/images/unity-seal.jpg"
              alt="Unity University seal"
              width={48}
              height={48}
              className="size-full rounded-full object-contain"
              priority
            />
          </span>
          <span className="min-w-0">
            <span className="block truncate text-sm font-semibold tracking-wide sm:text-base">
              Unity University
            </span>
            <span className="mt-0.5 block text-xs text-white/70">Student support portal</span>
          </span>
        </Link>

        <nav aria-label="Student support" className="flex shrink-0 items-center gap-1 sm:gap-3">
          <Link
            href="/track"
            className="inline-flex min-h-10 items-center gap-2 rounded-md px-2 text-xs font-medium text-white/85 transition hover:bg-white/10 hover:text-white sm:px-3 sm:text-sm"
          >
            <Search className="size-4" aria-hidden="true" />
            <span className="hidden sm:inline">Track a case</span>
            <span className="sm:hidden">Track</span>
          </Link>
          <Link
            href="/submit"
            className="inline-flex min-h-10 items-center gap-2 rounded-md bg-university-gold px-3 text-xs font-semibold text-slate-950 transition hover:brightness-95 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-university-gold sm:px-4 sm:text-sm"
          >
            <span className="sm:hidden">Submit</span>
            <span className="hidden sm:inline">Submit a complaint</span>
            <ArrowUpRight className="hidden size-4 sm:block" aria-hidden="true" />
          </Link>
        </nav>
      </div>
      <div className="h-1 bg-university-gold" aria-hidden="true" />
    </header>
  );
}
