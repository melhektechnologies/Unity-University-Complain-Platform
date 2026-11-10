import type { Metadata } from 'next';
import Link from 'next/link';
import { createServerClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';

export const metadata: Metadata = {
  title: 'CMS · Unity Student Support',
};

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  // Server-side session check — redirect to login if unauthenticated
  const supabase = await createServerClient();
  const { data: { session } } = await supabase.auth.getSession();

  if (!session) {
    redirect('/admin/login');
  }

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col">
      {/* Top nav */}
      <header className="bg-[#1B365D] text-white shadow-md print:hidden">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 rounded-full bg-white/20 flex items-center justify-center text-xs font-bold">
              UU
            </div>
            <div>
              <p className="text-xs font-semibold leading-tight">Unity University</p>
              <p className="text-[10px] text-blue-200 leading-tight">Student Affairs CMS</p>
            </div>
          </div>

          <nav className="flex items-center gap-6 text-sm">
            <Link href="/admin/dashboard" className="text-blue-200 hover:text-white transition-colors">
              Complaints
            </Link>
            <form action="/api/auth/signout" method="POST">
              <button
                type="submit"
                className="text-blue-200 hover:text-white transition-colors text-sm"
              >
                Sign out
              </button>
            </form>
          </nav>
        </div>
      </header>

      {/* Page */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 py-6">
        {children}
      </main>
    </div>
  );
}

