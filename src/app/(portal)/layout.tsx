import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowUpRight, Search } from 'lucide-react';
import { UnitySeal } from '@/components/ui/unity-seal';

export const metadata: Metadata = {
  title: 'Student Support',
  description: 'Submit a complaint or follow its progress through Unity University Student Affairs.',
};

export default function PortalLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <a className="skip-link" href="#main-content">Skip to main content</a>

      <header className="relative z-10 border-b border-white/10 bg-primary text-primary-foreground shadow-sm">
        <div className="content-container flex min-h-[76px] items-center justify-between gap-4 py-3">
          <Link href="/" className="group flex min-w-0 items-center gap-3 rounded-sm" aria-label="Unity University Student Support home">
            <UnitySeal size={48} />
            <span className="min-w-0">
              <span className="block truncate text-sm font-semibold tracking-wide sm:text-base">Unity University</span>
              <span className="mt-0.5 block text-xs text-white/70">Student support portal</span>
            </span>
          </Link>

          <nav aria-label="Student support" className="flex shrink-0 items-center gap-1 sm:gap-3">
            <Link
              href="/track"
              className="inline-flex min-h-10 items-center gap-2 rounded-md px-2 text-xs font-medium text-white/85 transition hover:bg-white/10 hover:text-white sm:px-3 sm:text-sm"
            >
              <Search aria-hidden="true" className="size-4" />
              <span className="hidden sm:inline">Track a case</span>
              <span className="sm:hidden">Track</span>
            </Link>
            <Link
              href="/submit"
              className="inline-flex min-h-10 items-center gap-2 rounded-md bg-university-gold px-3 text-xs font-semibold text-slate-950 transition hover:brightness-95 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-university-gold sm:px-4 sm:text-sm"
            >
              <span className="sm:hidden">Submit</span>
              <span className="hidden sm:inline">Submit a complaint</span>
              <ArrowUpRight aria-hidden="true" className="hidden size-4 sm:block" />
            </Link>
          </nav>
        </div>
        <div className="h-1 bg-university-gold" aria-hidden="true" />
      </header>

      <main id="main-content" className="content-container w-full flex-1 py-8 sm:py-12 lg:py-14">
        {children}
      </main>

      <footer className="mt-auto border-t border-border bg-white">
        <div className="content-container flex flex-col gap-3 py-5 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} Unity University · Ethiopia</p>
          <p>Office of Student Affairs</p>
          <Link href="/admin/login" className="min-h-9 self-start rounded-sm underline-offset-4 transition hover:text-primary hover:underline sm:self-auto">
            Staff sign in
          </Link>
        </div>
      </footer>
    </div>
  );
}
