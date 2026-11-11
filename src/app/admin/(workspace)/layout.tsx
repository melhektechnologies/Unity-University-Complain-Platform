import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowUpRight, BriefcaseBusiness, LogOut } from 'lucide-react';
import { UnitySeal } from '@/components/ui/unity-seal';
import { getCurrentStaffUserContext } from '@/lib/auth/server';
import { redirect } from 'next/navigation';

export const metadata: Metadata = {
  title: 'Staff workspace',
};

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const staffSession = await getCurrentStaffUserContext();

  if (!staffSession) {
    redirect('/admin/login?access=staff-required');
  }

  return (
    <div className="flex min-h-screen flex-col bg-slate-50 text-slate-900">
      <a className="skip-link" href="#staff-main">Skip to main content</a>
      <header className="print:hidden border-b border-white/10 bg-primary text-primary-foreground shadow-sm">
        <div className="content-container flex min-h-[76px] items-center justify-between gap-4 py-3">
          <Link href="/admin/dashboard" className="flex min-w-0 items-center gap-3 rounded-sm" aria-label="Unity University Student Affairs workspace">
            <UnitySeal size={46} />
            <span className="min-w-0">
              <span className="block truncate text-sm font-semibold tracking-wide sm:text-base">Unity University</span>
              <span className="mt-0.5 flex items-center gap-1.5 text-xs text-white/70">
                <BriefcaseBusiness aria-hidden="true" className="size-3.5" />
                Student Affairs workspace
              </span>
            </span>
          </Link>
          <nav aria-label="Staff workspace" className="flex shrink-0 items-center gap-1 sm:gap-3">
            <Link href="/admin/dashboard" className="inline-flex min-h-10 items-center rounded-md px-3 text-sm font-medium text-white/85 transition hover:bg-white/10 hover:text-white">
              Complaint queue
            </Link>
            <form action="/api/auth/signout" method="POST">
              <button type="submit" className="inline-flex min-h-10 items-center gap-2 rounded-md border border-white/20 px-3 text-xs font-medium text-white/85 transition hover:border-university-gold hover:bg-white/10 hover:text-white sm:text-sm">
                <LogOut aria-hidden="true" className="size-4" />
                <span className="hidden sm:inline">Sign out</span>
              </button>
            </form>
          </nav>
        </div>
        <div className="h-1 bg-university-gold" aria-hidden="true" />
      </header>
      <main id="staff-main" className="content-container w-full flex-1 py-7 sm:py-10">
        {children}
      </main>
      <footer className="print:hidden border-t border-border bg-white">
        <div className="content-container flex flex-col gap-2 py-4 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <span>Unity University · Office of Student Affairs</span>
          <Link href="/" className="inline-flex min-h-9 items-center gap-1 self-start rounded-sm transition hover:text-primary sm:self-auto">
            Student support portal <ArrowUpRight aria-hidden="true" className="size-3.5" />
          </Link>
        </div>
      </footer>
    </div>
  );
}
