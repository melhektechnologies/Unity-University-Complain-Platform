import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Unity Student Support',
  description: 'Submit and track student complaints at Unity University.',
};

export default function PortalLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Header */}
      <header className="bg-[#1B365D] text-white shadow-md">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3 hover:opacity-90 transition-opacity">
            {/* University seal placeholder */}
            <div className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center text-xs font-bold tracking-tight">
              UU
            </div>
            <div>
              <p className="text-sm font-semibold leading-tight">Unity University</p>
              <p className="text-xs text-blue-200 leading-tight">Student Support Portal</p>
            </div>
          </Link>
          <Link
            href="/track"
            className="text-xs text-blue-200 hover:text-white transition-colors underline underline-offset-2"
          >
            Track my complaint
          </Link>
        </div>
      </header>

      {/* Page content */}
      <main className="flex-1 max-w-3xl mx-auto w-full px-4 py-8">
        {children}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white mt-auto">
        <div className="max-w-3xl mx-auto px-4 py-4 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-slate-500">
          <span>© {new Date().getFullYear()} Unity University · Ethiopia</span>
          <span>All submissions are handled confidentially by the Office of Student Affairs.</span>
        </div>
      </footer>
    </div>
  );
}

