import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getStudentAffairsContext } from '@/features/staff/auth/actions';

export const metadata: Metadata = {
  title: 'CMS · Unity Student Support',
};

export default async function AdminCmsLayout({ children }: { children: React.ReactNode }) {
  const staff = await getStudentAffairsContext();
  if (!staff) {
    redirect('/admin/login');
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="border-b border-white/10 bg-[#17233f] text-white shadow-md print:hidden">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="flex h-7 w-7 items-center justify-center rounded-full border border-university-gold/60 bg-white/10 text-xs font-bold">
              UU
            </div>
            <div>
              <p className="text-xs font-semibold leading-tight">Unity University</p>
              <p className="text-[10px] leading-tight text-white/70">Student Affairs CMS</p>
            </div>
          </div>

          <nav className="flex items-center gap-6 text-sm">
            <Link href="/admin/dashboard" className="text-white/75 transition-colors hover:text-white">
              Complaints
            </Link>
            <form action="/api/auth/signout" method="POST">
              <button type="submit" className="text-sm text-white/75 transition-colors hover:text-white">
                Sign out
              </button>
            </form>
          </nav>
        </div>
        <div className="h-0.5 bg-university-gold" aria-hidden="true" />
      </header>

      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6">{children}</main>
    </div>
  );
}
